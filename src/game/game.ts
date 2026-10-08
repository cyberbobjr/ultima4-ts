// Core game loop: state, map switching, movement, commands and screen composition.
import { readSave, writeSave } from "../io/gamefs";
import { assets } from "../assets/store";
import { encodeSave, type PlayerRecord, type SaveGame } from "../formats/save";
import { EGA_PALETTE } from "../formats/ega";
import { Renderer, TILE, VIEW_TILES, VIEW_X, VIEW_Y } from "../render/renderer";
import { Console, CON_COL, CON_H, CON_ROW } from "./console";
import { Input, type Key } from "./input";
import { LocKind, LOCATIONS, locationAt, SHRINES, VIRTUES, type LocationDef } from "./locations";
import { DIR_NAMES, DIRS, setTile, tileAt, type Dir, type MapCtx, type Npc, type TownMap, type WorldMap } from "./maps";
import { animFrame, isOpaque, isTalkOver, slowChance, T, tileFlags, Walk } from "./tiles";
import { ARMOURS, COMBAT_MAP_RULES, MAP_ENTRY, MAX_MP_BY_CLASS, MONSTER_SPAWN, MOON_RULES, MOONGATES, WEAPONS, WIND_RULES } from "../data/tables";
import { talkTo } from "./talk";
import { creatureInfo, isNonEvil, rand8, runCombat, spawnGroup, type CombatApi, type CombatRequest, type CombatResult } from "./combat";
import { loadArena } from "./arenas";
import { HORN_EFFECT } from "./items";
import { LayerStack, type StatusPanel } from "../ui/layers";
import { CommandRegistry, type Command, type CommandContext } from "./commands";
import { meditateAt } from "./shrine";
import type { DungeonHooks } from "./magic";
import { runDungeon } from "./dungeon";

export const CLASS_NAMES = ["Mage", "Bard", "Fighter", "Druid", "Tinker", "Paladin", "Ranger", "Shepherd"];

import { rand } from "./rng";
export { rand };

/** Class maximum MP (1000:13B6), capped at 99. */
export function maxMp(p: PlayerRecord): number {
  return Math.min(99, Math.floor(p.int * (MAX_MP_BY_CLASS[p.klass]?.mult ?? 0)));
}

/** Overworld objects (ships, horses, the balloon, monsters, chests) not baked into WORLD.MAP. */
export interface WorldObject { tile: number; x: number; y: number; }

/** OUTMONST.SAV: 32 slots stored as arrays of 32 bytes (tile, x, y, then previous tile/x/y, 2 unused). */
export function encodeObjects(objs: WorldObject[]): Uint8Array {
  const out = new Uint8Array(256);
  objs.slice(0, 32).forEach((o, i) => {
    out[i] = o.tile; out[32 + i] = o.x; out[64 + i] = o.y;
    out[96 + i] = o.tile; out[128 + i] = o.x; out[160 + i] = o.y;
  });
  return out;
}

export function decodeObjects(src: Uint8Array): WorldObject[] {
  const objs: WorldObject[] = [];
  for (let i = 0; i < 32; i++) if (src[i]) objs.push({ tile: src[i], x: src[32 + i], y: src[64 + i] });
  return objs;
}

export class Game {
  save!: SaveGame;
  world!: WorldMap;
  map!: MapCtx;
  /** party position on the current map (mirrors save.x/y on the overworld) */
  px = 0; py = 0;
  objects: WorldObject[] = [];
  readonly con = new Console();
  /** Animation clock: +1 per 250 ms tick (main.ts). */
  private animTick = 0;
  get frame() { return this.animTick; }
  /** Modes (intro, combat, dungeon, shops, visions, endgame) draw through layers over the game screen. */
  readonly layers = new LayerStack();
  /** Key commands by context; modules register theirs (magic.ts, items.ts). */
  readonly commands = new CommandRegistry();
  /** Level access for spells and items while in a dungeon (set by dungeon.ts, all null elsewhere). */
  readonly dungeon: DungeonHooks = { cell: null, setCell: null, exit: null, refresh: null, peer: null };
  private frameCanvas: HTMLCanvasElement;
  private openedDoors: { x: number; y: number; turns: number }[] = [];

  constructor(readonly r: Renderer, readonly input: Input) {
    this.frameCanvas = document.createElement("canvas");
    this.frameCanvas.width = 320; this.frameCanvas.height = 200;
    const ctx = this.frameCanvas.getContext("2d")!;
    const img = ctx.createImageData(320, 200);
    r.assets.frame.pixels.forEach((c, i) => img.data.set([...EGA_PALETTE[c], 255], i * 4));
    ctx.putImageData(img, 0, 0);
    this.registerCommands();
  }

  /** Overworld/town context of the key commands. */
  get context(): CommandContext { return this.map?.kind === "town" ? "town" : "world"; }

  /** Commands of this module (1000:1C06 dispatch); C, M, U, S, P, N, F, I come from magic.ts and items.ts. */
  private registerCommands() {
    const out: readonly CommandContext[] = ["world", "town"], all: readonly CommandContext[] = ["world", "town", "dungeon"];
    const cmd = (key: string, id: string, contexts: readonly CommandContext[], run: () => unknown): Command => ({ key, id, contexts, run: async () => { await run(); } });
    this.commands.register(
      cmd(" ", "pass", out, () => { this.con.println("Pass"); this.endTurn(); }),
      cmd("a", "attack", out, () => this.attack()),
      cmd("b", "board", out, () => this.board()),
      cmd("d", "descend", out, () => this.descend()),
      cmd("e", "enter", out, () => this.enter()),
      cmd("g", "getChest", out, () => this.getChest()),
      cmd("h", "holeUp", out, () => this.holeUp()),
      cmd("j", "jimmy", out, () => this.jimmy()),
      cmd("k", "klimb", out, () => this.klimb()),
      cmd("l", "locate", out, () => this.locate()),
      cmd("o", "open", out, () => this.open()),
      cmd("q", "quitSave", out, () => this.quitSave()),
      cmd("r", "ready", all, () => this.readyWeapon()),
      cmd("t", "talk", out, () => this.talk()),
      cmd("w", "wear", all, () => this.wearArmour()),
      cmd("x", "exit", out, () => this.exitTransport()),
      cmd("y", "yell", out, () => this.yell()),
      cmd("z", "ztats", all, () => this.ztats()),
    );
  }

  // ---------------------------------------------------------------- setup

  async start(save: SaveGame) {
    this.save = save;
    const world = await assets.world();
    this.world = { kind: "world", width: 256, height: 256, tiles: world };
    this.map = this.world;
    this.px = save.x; this.py = save.y;
    if (save.members === 0) save.members = 1;
    const objs = await readSave("OUTMONST.SAV");
    this.objects = objs ? decodeObjects(objs) : [];
    this.con.clear();
    await this.mainLoop();
  }

  get members() { return this.save.players.slice(0, this.save.members); }
  get onFoot() { return this.save.transport === T.AVATAR || this.save.transport === 0; }
  get onShip() { return this.save.transport >= T.SHIP_W && this.save.transport <= T.SHIP_S; }
  get onHorse() { return this.save.transport === T.HORSE_W || this.save.transport === T.HORSE_E; }
  get inBalloon() { return this.save.transport === T.BALLOON; }

  // ---------------------------------------------------------------- loop

  private async mainLoop() {
    for (;;) {
      const k = await this.input.next(this.map.kind === "world" ? 8000 : 6000);
      if (!k) { this.con.println("Pass"); this.endTurn(); }
      else await this.command(k);
      if (this.pendingShrine >= 0) {
        const v = this.pendingShrine;
        this.pendingShrine = -1;
        await this.enterShrine(v);
      }
      if (this.pendingAttack) {
        const m = this.pendingAttack;
        this.pendingAttack = null;
        await this.worldFight(m, this.map.kind === "town" ? "town" : "world");
      }
      if (this.members.every((p) => p.status === "D")) await this.partyDeath();
    }
  }

  async command(k: Key) {
    const dir = Input.direction(k);
    if (dir) { await this.move(dir); return; }
    const ctx = this.context;
    const c = this.commands.get(k.key, ctx);
    if (c) await c.run({ g: this, ctx });
    else this.con.println("Bad command!");
  }

  // ---------------------------------------------------------------- prompts

  async askDir(prompt = "Dir: "): Promise<Dir | null> {
    this.con.print(prompt);
    for (;;) {
      const k = await this.input.next();
      if (!k) continue;
      const d = Input.direction(k);
      if (d) { this.con.println(DIR_NAMES[d]); return d; }
      if (k.key === "Escape" || k.key === "Enter" || k.key === " ") { this.con.println(""); return null; }
    }
  }

  async getLine(maxLen = 15): Promise<string> {
    let s = "";
    for (;;) {
      const k = await this.input.next();
      if (!k) continue;
      if (k.key === "Enter") { this.con.newline(); return s; }
      if (k.key === "Backspace") { if (s) { s = s.slice(0, -1); this.con.backspace(); } continue; }
      if (k.key === "Escape") { this.con.newline(); return ""; }
      if (k.key.length === 1 && s.length < maxLen && k.key >= " " && k.key <= "~") { s += k.key; this.con.print(k.key); }
    }
  }

  async getKey(): Promise<string> {
    for (;;) { const k = await this.input.next(); if (k) return k.key; }
  }

  async waitKey() { await this.getKey(); }

  // ---------------------------------------------------------------- turn

  /** End of an overworld/town turn (1000:1C53). */
  endTurn() {
    const s = this.save;
    s.moves++;
    // Food: party size hundredths per turn (1000:138B).
    if (s.food >= s.members) s.food -= s.members;
    else {
      s.food = 0;
      this.con.println("Starving!!!");
      for (const p of this.members) if (p.status !== "D") this.damagePlayer(p, 2);
    }
    for (const p of this.members) {
      if (p.status === "P") this.damagePlayer(p, 2);
      else if (p.status === "S" && rand(8) === 0) p.status = "G";
      // MP regen +1 up to the class maximum (1000:13B6)
      if (p.status !== "D") p.mp = Math.min(maxMp(p), p.mp + 1);
    }
    if (this.onShip && s.shipHull < 50 && rand(4) === 0) s.shipHull++;
    this.tickEffects();
    if (this.map.kind === "town") this.moveNpcs(this.map);
    if (this.map.kind === "world" && !(this.save.location >= 17 && this.save.location <= 24)) this.moveWorldMonsters();
    for (const d of this.openedDoors) if (--d.turns === 0) setTile(this.map, d.x, d.y, T.DOOR);
    this.openedDoors = this.openedDoors.filter((d) => d.turns > 0);
  }

  // ---------------------------------------------------------------- party helpers

  /** 1000:1135 */
  damagePlayer(p: PlayerRecord, n: number) {
    if (p.status === "D") return;
    p.hp = Math.max(0, p.hp - n);
    if (p.hp === 0) p.status = "D";
  }

  damage(p: PlayerRecord, n: number) { this.damagePlayer(p, n); }

  /** karma_inc (1000:09F8): elevated virtues (0) never rise; cap 99. */
  karmaInc(v: number, n: number) {
    const k = this.save.karma;
    if (k[v] === 0 || n <= 0) return;
    k[v] = Math.min(99, k[v] + n);
  }

  /** karma_dec (1000:0A17): an elevated virtue is lost; floor 1. */
  karmaDec(v: number, n: number) {
    const k = this.save.karma;
    if (k[v] === 0) { k[v] = 99; this.con.println("\nThou hast lost\nan Eighth!"); }
    k[v] = k[v] - n <= 0 ? 1 : k[v] - n;
  }

  /** Active timed spell effect DS:0x95A4 ('P','J','N','Q' or null) and its countdown DS:0x946E. */
  spellEffect: string | null = null;
  /** Party member whose combat turn it is (-1 outside combat). */
  activeMember = -1;
  private spellTurns = 0;
  setSpellEffect(e: string, turns: number) { this.spellEffect = e; this.spellTurns = turns; }
  tickEffects() { if (this.spellEffect && --this.spellTurns <= 0) this.spellEffect = null; }

  /** Meditation at a shrine (shrine.ts), from E)nter or a moongate. */
  async enterShrine(virtue: number) { await meditateAt(this, virtue); }

  private moveNpcs(town: TownMap) {
    for (const n of town.npcs) {
      if (n.movement === 0) continue;
      // hostile townsfolk (guards after a crime, movement 0xFF) attack when adjacent
      if ((n.hostile || n.movement === 0xff) && Math.abs(n.x - this.px) + Math.abs(n.y - this.py) === 1) {
        this.pendingAttack = { tile: n.tile, x: n.x, y: n.y };
        continue;
      }
      let dx = 0, dy = 0;
      if (n.movement === 1) {
        if (rand(2)) continue;
        const d = (["N", "S", "E", "W"] as Dir[])[rand(4)];
        [dx, dy] = DIRS[d];
      } else {
        // follow / attack: step towards the party
        const ddx = Math.sign(this.px - n.x), ddy = Math.sign(this.py - n.y);
        if (Math.abs(this.px - n.x) > Math.abs(this.py - n.y)) dx = ddx; else dy = ddy;
      }
      const nx = n.x + dx, ny = n.y + dy;
      if (nx < 0 || ny < 0 || nx >= 32 || ny >= 32) continue;
      if (!(tileFlags(tileAt(town, nx, ny)) & Walk.Foot) || tileAt(town, nx, ny) === T.DOOR) continue;
      if (nx === this.px && ny === this.py) continue;
      if (town.npcs.some((o) => o !== n && o.x === nx && o.y === ny)) continue;
      n.x = nx; n.y = ny;
    }
  }

  npcAt(x: number, y: number): Npc | undefined {
    return this.map.kind === "town" ? this.map.npcs.find((n) => n.x === x && n.y === y) : undefined;
  }

  // ---------------------------------------------------------------- movement

  async move(dir: Dir) {
    const [dx, dy] = DIRS[dir];
    if (this.onShip) { this.sail(dir); return; }
    if (this.inBalloon) { this.con.println("Drift Only!"); return; }
    if (this.onHorse) this.save.transport = dx < 0 ? T.HORSE_W : dx > 0 ? T.HORSE_E : this.save.transport;
    this.con.println(DIR_NAMES[dir]);
    const nx = this.px + dx, ny = this.py + dy;
    if (this.map.kind === "town" && (nx < 0 || ny < 0 || nx >= 32 || ny >= 32)) {
      await this.leaveTown();
      this.endTurn();
      return;
    }
    const t = tileAt(this.map, nx, ny);
    const need = this.onHorse ? Walk.Horse : Walk.Foot;
    if (!(tileFlags(t) & need) || this.npcAt(nx, ny)) { this.con.println("Blocked!"); this.endTurn(); return; }
    if (this.map.kind === "world" && this.onFoot && this.objects.some((o) => o.x === (nx & 255) && o.y === (ny & 255) && o.tile >= 0x80)) {
      this.con.println("Blocked!"); this.endTurn(); return;
    }
    if (rand(1000) < slowChance(t) * 1000) { this.con.println("Slow progress!"); this.endTurn(); return; }
    this.setPos(nx, ny);
    this.endTurn();
    this.checkMoongate();
    // 1000:27D9: walking south into the approach of the Shrine of Humility summons daemons, unless the horn was blown
    if (this.map.kind === "world" && dir === "S" && this.px >= 229 && this.px <= 233 && this.py >= 212 && this.py <= 216 &&
        this.spellEffect !== HORN_EFFECT && !this.pendingAttack) {
      this.pendingAttack = { tile: 0xf0, x: this.px, y: this.py + 1 };
    }
  }

  setPos(x: number, y: number) {
    if (this.map.kind === "world") { x &= 255; y &= 255; this.save.x = x; this.save.y = y; }
    this.px = x; this.py = y;
  }

  private sail(dir: Dir) {
    const shipTile = { W: T.SHIP_W, N: T.SHIP_N, E: T.SHIP_E, S: T.SHIP_S }[dir];
    if (this.save.transport !== shipTile) {
      this.save.transport = shipTile;
      this.con.println(`Turn ${DIR_NAMES[dir]}!`);
      this.endTurn();
      return;
    }
    const [dx, dy] = DIRS[dir];
    const t = tileAt(this.map, this.px + dx, this.py + dy);
    this.con.println(`Sail ${DIR_NAMES[dir]}!`);
    if (!(tileFlags(t) & Walk.Ship) || this.worldMonsterAt(this.px + dx, this.py + dy)) { this.con.println("Blocked!"); this.endTurn(); return; }
    // Wind (1000:2A5A): into the wind only 1 turn in 4, with the wind 3 in 4.
    const d = { W: 0, N: 1, E: 2, S: 3 }[dir];
    const T4 = this.save.moves & 3;
    if ((d === this.wind && T4 !== 0) || (d === ((this.wind + 2) & 3) && T4 === 0)) {
      this.con.println("Slow progress!"); this.endTurn(); return;
    }
    this.setPos(this.px + dx, this.py + dy);
    this.endTurn();
  }

  // ---------------------------------------------------------------- moons, moongates, wind (1000:3A80, 1000:35C7)

  private moonSub = 0;
  private trammelByte = -1;
  private feluccaByte = 0;
  private moonDelay = 0;
  /** 0 West, 1 North, 2 East, 3 South (DS:96F2) */
  wind = 1;

  private tickMoons() {
    const s = this.save;
    if (!s) return;
    if (this.trammelByte < 0) { this.trammelByte = s.trammelPhase << 5; this.feluccaByte = s.feluccaPhase << 5; }
    if (++this.moonDelay < 2) return; // the original's rate depends on CPU calibration; ~2 ticks of 250 ms
    this.moonDelay = 0;
    this.moonSub = (this.moonSub + MOON_RULES.subStepAdd) & 0xff;
    if (this.moonSub === 0) {
      this.trammelByte = (this.trammelByte + MOON_RULES.trammelAdd) & 0xff;
      this.feluccaByte = (this.feluccaByte + MOON_RULES.feluccaAdd) & 0xff;
      s.trammelPhase = this.trammelByte >> MOON_RULES.phaseShift;
      s.feluccaPhase = this.feluccaByte >> MOON_RULES.phaseShift;
    }
    if ((rand8() & WIND_RULES.changeChanceMask) === 0) this.wind = (this.wind + (rand8() & 2) - 1) & 3;
  }

  /** Tile of the open moongate at (x,y), or -1. Gate = MOONGATES[trammel phase]. */
  private moongateTile(x: number, y: number): number {
    const g = MOONGATES[this.save.trammelPhase];
    if (!g || g.x !== (x & 255) || g.y !== (y & 255)) return -1;
    const low = this.trammelByte & 0x1f, step = this.moonSub >> 6;
    if (low === 0) return T.MOONGATE0 + step;             // opening
    if (low === 0x1e) return T.MOONGATE0 + (step ^ 3);    // closing
    return T.MOONGATE3;
  }

  /** Stepping into the open gate sends the party to the gate of Felucca's phase (1000:2A91). */
  private checkMoongate() {
    if (this.map.kind !== "world" || this.moongateTile(this.px, this.py) !== T.MOONGATE3) return;
    if (this.save.trammelPhase === 4 && this.save.feluccaPhase === 4) {
      // both moons full: the gate leads to the Shrine of Spirituality (1000:2A91)
      this.pendingShrine = 6;
      return;
    }
    const dest = MOONGATES[this.save.feluccaPhase];
    this.setPos(dest.x, dest.y);
  }

  // ---------------------------------------------------------------- transports

  private board() {
    this.con.print("Board ");
    if (!this.onFoot) { this.con.println("\nCan't!"); return; }
    const i = this.objects.findIndex((o) => o.x === this.px && o.y === this.py && o.tile < 0x80);
    if (i < 0 || this.map.kind !== "world") { this.con.println("\nWhat?"); return; }
    const o = this.objects[i];
    this.objects.splice(i, 1);
    this.save.transport = o.tile;
    this.con.println(o.tile === T.BALLOON ? "Balloon!" : this.onHorse ? "\nMount Horse!" : "Frigate!");
    this.endTurn();
  }

  private exitTransport() {
    this.con.print("X-it ");
    if (this.onFoot) { this.con.println("\nWhat?"); return; }
    if (this.onShip && !(tileFlags(tileAt(this.map, this.px, this.py)) & Walk.Foot)) {
      // leaving a ship is only possible onto land; the original lets you exit onto the ship's square
    }
    this.objects.push({ tile: this.save.transport, x: this.px, y: this.py });
    this.save.transport = T.AVATAR;
    this.con.println("");
    this.endTurn();
  }

  private yell() {
    if (!this.onHorse) { this.con.println("Yell what?"); return; }
    this.con.println("Yell Giddyup!");
  }

  // ---------------------------------------------------------------- overworld monsters (1000:5851, 1000:5712)

  /** Monster that will attack at the end of this turn. */
  private pendingAttack: WorldObject | null = null;
  /** Shrine reached through a moongate, entered at the end of the turn (-1 = none). */
  private pendingShrine = -1;

  worldMonsterAt(x: number, y: number): WorldObject | undefined {
    return this.objects.find((o) => o.tile >= 0x80 && o.x === (x & 255) && o.y === (y & 255));
  }

  private moveWorldMonsters() {
    const s = this.save;
    const wrap = (v: number) => ((v % 256) + 256) % 256;
    const delta = (a: number, b: number) => { const d = wrap(a - b); return d > 127 ? d - 256 : d; };
    const monsters = this.objects.filter((o) => o.tile >= 0x80);
    // despawn monsters that are far away
    this.objects = this.objects.filter((o) => o.tile < 0x80 || (Math.abs(delta(o.x, this.px)) < 16 && Math.abs(delta(o.y, this.py)) < 16));
    for (const m of monsters) {
      if (!this.objects.includes(m)) continue;
      const info = creatureInfo(m.tile);
      const flags = info.def?.flags ?? [];
      const dx = delta(this.px, m.x), dy = delta(this.py, m.y);
      if (Math.abs(dx) + Math.abs(dy) === 1 && !flags.includes("randomMove")) {
        if (!(isNonEvil(m.tile) && rand(2))) { this.pendingAttack = m; return; }
      }
      let sx = 0, sy = 0;
      if (flags.includes("randomMove") || rand(4) === 0) {
        [sx, sy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][rand(4)];
      } else if (Math.abs(dx) >= Math.abs(dy)) sx = Math.sign(dx); else sy = Math.sign(dy);
      const nx = wrap(m.x + sx), ny = wrap(m.y + sy);
      if (nx === this.px && ny === this.py) continue;
      const t = tileAt(this.world, nx, ny);
      const ok = flags.includes("sea") ? t < 3 || (flags.includes("flies") && (tileFlags(t) & Walk.Foot) !== 0)
        : flags.includes("flies") ? (tileFlags(t) & (Walk.Foot | Walk.Ship)) !== 0
        : (tileFlags(t) & Walk.Foot) !== 0 && t !== T.TOWN && t !== T.CASTLE && t !== T.VILLAGE && t !== T.LCB_ENTRANCE && t !== T.DUNGEON && t !== T.SHRINE;
      if (ok && !this.objects.some((o) => o.x === nx && o.y === ny)) { m.x = nx; m.y = ny; }
    }
    // spawning: 1/16 per turn, up to 4 monsters, away from the party
    if (this.objects.filter((o) => o.tile >= 0x80).length < MONSTER_SPAWN.overworldSlots && rand(16) === 0) {
      const ox = rand(32) - 16, oy = rand(32) - 16;
      if (Math.abs(ox) > 5 && Math.abs(oy) > 5) {
        const x = wrap(this.px + ox), y = wrap(this.py + oy);
        const t = tileAt(this.world, x, y);
        let tile = -1;
        if (t < 2 && rand(8) === 0) tile = MONSTER_SPAWN.seaTiles[rand(8)];
        else if (t >= T.GRASS && t <= T.HILLS) {
          const mask = MONSTER_SPAWN.landMaskByMoves.find((e) => s.moves < e.below)!.mask;
          tile = MONSTER_SPAWN.landBaseTile + 4 * (rand8() & rand8() & mask);
        }
        if (tile >= 0 && !this.objects.some((o) => o.x === x && o.y === y)) this.objects.push({ tile, x, y });
      }
    }
    // bridge trolls (1000:9209)
    if (tileAt(this.world, this.px, this.py) === T.BRIDGE && rand(8) === 0) {
      this.con.println("Bridge Trolls!");
      this.pendingAttack = { tile: 0xa4, x: this.px, y: this.py };
    }
  }

  /** Overworld (or town) combat against one creature; the arena depends on the terrain (1000:7C65). */
  async worldFight(m: WorldObject, context: CombatRequest["context"] = "world") {
    const info = creatureInfo(m.tile);
    this.con.println(`\nAttacked by\n${info.name}`);
    const partyTile = tileAt(this.map, this.px, this.py);
    const monsterTile = tileAt(this.map, m.x, m.y);
    const onShip = this.onShip;
    const rules = COMBAT_MAP_RULES;
    let file: string;
    if (onShip) file = m.tile === T.PIRATE_SHIP ? rules.onShip.vsPirateShip : monsterTile < 3 ? rules.onShip.enemyOnWater : rules.onShip.otherwise;
    else if (m.tile === T.PIRATE_SHIP) file = rules.onLand.vsPirateShip;
    else if (monsterTile < 3) file = rules.onLand.enemyOnWater;
    else file = rules.onLand.byPartyTile[partyTile] ?? rules.onLand.default;
    const arena = await loadArena(file);
    const fightTile = m.tile === T.PIRATE_SHIP ? rules.pirateCrewTile : m.tile;
    const monsters = context === "town" ? [{ tile: m.tile, x: arena.monsterPos[0][0], y: arena.monsterPos[0][1] }] : spawnGroup(fightTile, arena, this.save.members);
    const res = await this.fight({ arena, monsters, context: onShip ? "ship" : context });
    if (res.outcome === "won") {
      this.objects = this.objects.filter((o) => o !== m);
      if (context === "town" && this.map.kind === "town") this.map.npcs = this.map.npcs.filter((n) => !(n.x === m.x && n.y === m.y));
      if (m.tile === T.PIRATE_SHIP) this.objects.push({ tile: T.SHIP_W, x: m.x, y: m.y }); // the captured ship
      else if (res.chest && context === "world" && (tileFlags(tileAt(this.map, m.x, m.y)) & Walk.Foot)) this.objects.push({ tile: T.CHEST, x: m.x, y: m.y });
    }
  }

  /** "All is Dark..." — Lord British resurrects the party (1000:0EB1). */
  private async partyDeath() {
    const lines = ["\n\nAll is Dark...", "\nBut wait...", "Where am I?...", "Am I dead?...", "Afterlife?...", "You hear:", "I feel motion..."];
    for (const l of lines) { this.con.println(l); await new Promise((r) => setTimeout(r, 1200)); }
    for (const p of this.members) { p.status = "G"; p.hp = p.hpMax; }
    this.map = this.world;
    this.save.location = 0;
    this.save.transport = T.AVATAR;
    this.objects = [];
    this.setPos(LOCATIONS[1].x, LOCATIONS[1].y + 1);
    this.con.println("\nLord British says: I have pulled thy spirit and some possessions from the void.  Be more careful in the future!");
  }

  private async attack() {
    this.con.print("Attack: ");
    const d = await this.askDir("");
    if (!d) return;
    const [dx, dy] = DIRS[d];
    const x = this.px + dx, y = this.py + dy;
    if (this.map.kind === "world") {
      const m = this.worldMonsterAt(x, y);
      if (!m) { this.con.println("Nothing to\nattack!"); return; }
      if (isNonEvil(m.tile)) { this.karmaDec(1, 5); this.karmaDec(3, 5); this.karmaDec(5, 5); }
      await this.worldFight(m);
      return;
    }
    const npc = this.npcAt(x, y);
    if (!npc) { this.con.println("Nothing to\nattack!"); return; }
    // Attacking townsfolk (1000:628F): Compassion, Justice, Honor -5; guards and Lord British turn hostile.
    this.karmaDec(1, 5); this.karmaDec(3, 5); this.karmaDec(5, 5);
    if (this.map.kind === "town") for (const n of this.map.npcs) if (n.tile === T.GUARD || n.tile === T.LORD_BRITISH) { n.movement = 0xff; n.hostile = true; }
    await this.worldFight({ tile: npc.tile, x, y }, "town");
  }

  async ztatsFor(i: number) {
    const p = this.save.players[i];
    this.con.println(`${p.name}`);
    this.con.println(`${p.sex === 0x0b ? "M" : "F"} ${CLASS_NAMES[p.klass]}  ${p.status}`);
    this.con.println(`MP:${p.mp} LV:${Math.floor(p.hpMax / 100)}`);
    this.con.println(`STR:${p.str} HP:${p.hp}`);
    this.con.println(`DEX:${p.dex} HM:${p.hpMax}`);
    this.con.println(`INT:${p.int} EX:${p.xp}`);
    this.con.println(`W:${WEAPONS[p.weapon].name}`);
    this.con.println(`A:${ARMOURS[p.armour].name}`);
  }

  async askMember(prompt: string): Promise<number> {
    this.con.print(prompt);
    const n = parseInt(await this.getKey(), 10);
    if (!(n >= 1 && n <= this.save.members)) { this.con.println(""); return -1; }
    this.con.println(String(n));
    return n - 1;
  }

  /** R)eady a weapon (1000:7631): letter A..P from the inventory, class mask bit 0x80 >> class. */
  async readyWeapon(member?: number) {
    this.con.print("Ready a weapon\n");
    const i = member ?? await this.askMember("for: ");
    if (i < 0) return;
    const p = this.save.players[i];
    this.con.print("Weapon: ");
    const k = (await this.getKey()).toUpperCase();
    const w = k.charCodeAt(0) - 65;
    if (!(w >= 0 && w < 16)) { this.con.println(""); return; }
    this.con.println(WEAPONS[w].name);
    if (w !== 0 && this.save.weapons[w] <= 0) { this.con.println("None left!"); return; }
    if (!(WEAPONS[w].classMask & (0x80 >> p.klass))) { this.con.println(`A ${CLASS_NAMES[p.klass]} may NOT use a ${WEAPONS[w].name}!`); return; }
    if (p.weapon !== 0) this.save.weapons[p.weapon]++;
    if (w !== 0) this.save.weapons[w]--;
    p.weapon = w;
  }

  /** W)ear armour (1000:7732). */
  async wearArmour() {
    this.con.print("Wear Armour\n");
    const i = await this.askMember("for: ");
    if (i < 0) return;
    const p = this.save.players[i];
    this.con.print("Armour: ");
    const k = (await this.getKey()).toUpperCase();
    const a = k.charCodeAt(0) - 65;
    if (!(a >= 0 && a < 8)) { this.con.println(""); return; }
    this.con.println(ARMOURS[a].name);
    if (a !== 0 && this.save.armour[a] <= 0) { this.con.println("None left!"); return; }
    if (!(ARMOURS[a].classMask & (0x80 >> p.klass))) { this.con.println(`A ${CLASS_NAMES[p.klass]} may NOT use ${ARMOURS[a].name}!`); return; }
    if (p.armour !== 0) this.save.armour[p.armour]++;
    if (a !== 0) this.save.armour[a]--;
    p.armour = a;
  }

  /** H)ole up & camp (1000:8AB0). */
  private async holeUp() {
    this.con.println("Hole up & Camp");
    if (!this.onFoot || this.map.kind !== "world") { this.con.println("Not Here!"); return; }
    this.con.println("Resting...");
    for (let k = 0; k < 4; k++) { this.endTurn(); await new Promise((r) => setTimeout(r, 300)); }
    if (rand(8) === 0) {
      this.con.println("Ambushed!");
      const tiles = [0xc0, 0xc8, 0xa4, 0xd0];
      const arena = await loadArena("CAMP.CON");
      const res = await this.fight({ arena, monsters: spawnGroup(tiles[rand(4)], arena, this.save.members), context: "world" });
      void res;
      return;
    }
    if (Math.floor(this.save.moves / 100) === this.save.lastCamp) { this.con.println("No effect."); return; }
    this.save.lastCamp = Math.floor(this.save.moves / 100) & 0xffff;
    for (const p of this.members) {
      if (p.status === "D") continue;
      if (p.status === "S") p.status = "G";
      p.hp = Math.min(p.hpMax, p.hp + (rand8() & 0x77) + 99);
      p.mp = maxMp(p);
    }
    this.con.println("Players Healed!");
  }

  // ---------------------------------------------------------------- locations

  async enter() {
    this.con.print("Enter ");
    if (this.map.kind !== "world" || !this.onFoot && !this.onHorse) { this.con.println("what?"); return; }
    // shrines (1000:4018: tile 0x1E under the party)
    const shrine = SHRINES.find((s) => s.x === this.px && s.y === this.py);
    if (shrine && tileAt(this.world, this.px, this.py) === T.SHRINE) {
      this.con.println(`the Shrine of\n${VIRTUES[shrine.virtue]}!\n`);
      if (!this.onFoot) { this.con.println("Only on foot!"); return; }
      await this.enterShrine(shrine.virtue);
      return;
    }
    const loc = locationAt(this.px, this.py);
    if (!loc) { this.con.println("what?"); return; }
    const t = tileAt(this.world, this.px, this.py);
    const kindName = t === T.RUINS ? "ruin!" : loc.kind === LocKind.Castle ? "castle!" : loc.kind === LocKind.Village ? "village!" : loc.kind === LocKind.Dungeon ? "dungeon!" : "towne!";
    this.con.println(kindName);
    this.con.println("");
    this.con.println(loc.name);
    if (loc.kind === LocKind.Dungeon) {
      this.save.location = loc.id;
      await runDungeon(this, loc);
      this.save.location = 0;
      return;
    }
    await this.enterTown(loc, 0);
  }

  async enterTown(loc: LocationDef, level: number, at?: [number, number]) {
    const file = level === 0 ? loc.map! : loc.map2!;
    const { tiles, npcs } = await assets.town(file);
    const dialogues = await assets.talk(loc.talk!);
    const town: TownMap = {
      kind: "town", loc, level, width: 32, height: 32, tiles, dialogues,
      npcs: npcs
        // 1000:3F4A: in the virtue towns the companion (slot 31) is gone if that class is already in the party
        .filter((n) => !(n.index === 31 && loc.id >= 5 && loc.id <= 12 && this.members.some((p) => p.klass === loc.id - 5)))
        .map((n) => ({ index: n.index, tile: n.tile, x: n.x, y: n.y, movement: n.movement, talk: n.talk, dialogue: n.talk ? dialogues[n.talk - 1] ?? null : null })),
    };
    this.map = town;
    this.save.location = loc.id;
    const [x, y] = at ?? this.townEntry(town);
    this.px = x; this.py = y;
    this.openedDoors = [];
  }

  /** Entry square (1000:3F4A): castles at the south edge, towns/villages at the west edge. */
  private townEntry(town: TownMap): [number, number] {
    const e = town.loc.kind === LocKind.Castle ? MAP_ENTRY.castle : MAP_ENTRY.towne;
    return [e.x, e.y];
  }

  async leaveTown() {
    const loc = (this.map as TownMap).loc;
    this.map = this.world;
    this.save.location = 0;
    this.setPos(loc.x, loc.y);
    this.con.println("Leaving...");
  }

  private async klimb() {
    this.con.print("Klimb ");
    if (this.map.kind === "town" && tileAt(this.map, this.px, this.py) === T.LADDER_UP && this.map.loc.map2) {
      this.con.println("to second floor!");
      await this.enterTown(this.map.loc, 1, [this.px, this.py]);
      return;
    }
    if (this.inBalloon) { this.con.println("altitude"); return; }
    this.con.println("\nWhat?");
  }

  private async descend() {
    this.con.print("Descend ");
    if (this.map.kind === "town" && tileAt(this.map, this.px, this.py) === T.LADDER_DOWN && this.map.level === 1) {
      this.con.println("to first floor!");
      await this.enterTown(this.map.loc, 0, [this.px, this.py]);
      return;
    }
    this.con.println("\nWhat?");
  }

  // ---------------------------------------------------------------- interactions

  private async talk() {
    this.con.print("Talk\n"); // DS:2D68, then "Dir: " (DS:2D6E)
    const d = await this.askDir("Dir: ");
    if (!d) return;
    const [dx, dy] = DIRS[d];
    let npc = this.npcAt(this.px + dx, this.py + dy);
    let counter: { x: number; y: number } | null = null;
    if (!npc && isTalkOver(tileAt(this.map, this.px + dx, this.py + dy))) {
      npc = this.npcAt(this.px + 2 * dx, this.py + 2 * dy);
      if (npc) counter = { x: this.px + dx, y: this.py + dy };
    }
    if (!npc) { this.con.println("Funny, no\nresponse!"); this.endTurn(); return; }
    await talkTo(this, npc, counter);
    this.endTurn();
  }

  private async open() {
    this.con.print("Open: ");
    const d = await this.askDir("");
    if (!d) return;
    const [dx, dy] = DIRS[d];
    const x = this.px + dx, y = this.py + dy, t = tileAt(this.map, x, y);
    if (t === T.DOOR) {
      setTile(this.map, x, y, T.BRICK_FLOOR);
      this.openedDoors.push({ x, y, turns: 4 });
      this.con.println("Opened!");
    } else if (t === T.LOCKED_DOOR) this.con.println("Can't!");
    else this.con.println("Not Here!");
    this.endTurn();
  }

  private async jimmy() {
    this.con.print("Jimmy lock! ");
    const d = await this.askDir("Dir: ");
    if (!d) return;
    const [dx, dy] = DIRS[d];
    const x = this.px + dx, y = this.py + dy;
    if (tileAt(this.map, x, y) !== T.LOCKED_DOOR) { this.con.println("Not Here!"); this.endTurn(); return; }
    if (this.save.keys <= 0) { this.con.println("No keys left!"); this.endTurn(); return; }
    this.save.keys--;
    setTile(this.map, x, y, T.DOOR);
    this.con.println("Unlocked!");
    this.endTurn();
  }

  /** G)et chest (1000:72EC -> 722F): chests on the town map are stolen; dropped chests are free. */
  private async getChest() {
    this.con.print("Get Chest!\n");
    const obj = this.map.kind === "world" ? this.objects.find((o) => o.tile === T.CHEST && o.x === this.px && o.y === this.py) : undefined;
    const onMap = tileAt(this.map, this.px, this.py) === T.CHEST;
    if (!obj && !onMap) { this.con.println("Not Here!"); return; }
    const who = await this.askMember("Who opens?");
    if (who < 0) return;
    if (this.save.players[who].status === "D" || this.save.players[who].status === "S") { this.con.println("Disabled!"); return; }
    if (obj) this.objects = this.objects.filter((o) => o !== obj);
    else {
      setTile(this.map, this.px, this.py, T.BRICK_FLOOR);
      if (this.map.kind === "town") { this.karmaDec(0, 1); this.karmaDec(3, 1); this.karmaDec(5, 1); }
    }
    await this.openChest(who);
    this.endTurn();
  }

  /** Chest trap and contents (1000:7150, 1000:70F1). `who` = -1 never triggers traps (Open spell). */
  async openChest(who: number) {
    const r1 = rand8();
    if ((r1 & 1) === 0) {
      const kind = r1 & 3 & rand8();
      this.con.print(["Acid", "Sleep", "Poison", "Bomb"][kind] + " Trap!\n");
      const p = who >= 0 ? this.save.players[who] : null;
      if (!p || rand8() % 100 <= p.dex + 25) this.con.print("Evaded!\n");
      else if (kind === 0) this.damagePlayer(p, rand8() % 30);
      else if (kind === 1) p.status = "S";
      else if (kind === 2) p.status = "P";
      else for (const m of this.members) if (m.status !== "D" && rand8() & 1) this.damagePlayer(m, 10 + (rand8() % 15));
    }
    const gold = (rand8() % 80) + (rand8() & 7) + 10;
    this.con.print(`The Chest Holds:\n${gold} Gold\n`);
    this.save.gold = Math.min(9999, this.save.gold + gold);
  }

  /** Runs a tactical combat; see combat.ts. */
  fight(req: CombatRequest): Promise<CombatResult> { return runCombat(this, req); }

  /** Signed convenience wrapper over karmaInc/karmaDec. */
  adjustKarma(virtue: number, delta: number) {
    if (delta >= 0) this.karmaInc(virtue, delta); else this.karmaDec(virtue, -delta);
  }

  private locate() {
    this.con.println("Locate position");
    if (this.save.sextants <= 0) { this.con.println("with what?"); return; }
    const L = (v: number) => String.fromCharCode(65 + (v >> 4)) + "'" + String.fromCharCode(65 + (v & 15)) + '"';
    this.con.println(`with sextant\n Latitude: ${L(this.py)}\nLongitude: ${L(this.px)}`);
  }

  private async ztats() {
    this.con.print("Ztats for: ");
    const k = await this.getKey();
    const n = parseInt(k, 10);
    if (!(n >= 1 && n <= this.save.members)) { this.con.println(""); return; }
    this.con.println(String(n));
    const p = this.save.players[n - 1];
    this.con.println(`${p.name}`);
    this.con.println(`${p.sex === 0x0b ? "M" : "F"} ${CLASS_NAMES[p.klass]}  ${p.status}`);
    this.con.println(`MP:${p.mp} LV:${Math.floor(p.hpMax / 100)}`);
    this.con.println(`STR:${p.str} HP:${p.hp}`);
    this.con.println(`DEX:${p.dex} HM:${p.hpMax}`);
    this.con.println(`INT:${p.int} EX:${p.xp}`);
  }

  private async quitSave() {
    this.con.println("Quit & Save...");
    if (this.map.kind !== "world") { this.con.println("Not Here!"); return; }
    await writeSave("PARTY.SAV", encodeSave(this.save));
    await writeSave("OUTMONST.SAV", encodeObjects(this.objects));
    this.con.println(`${this.save.moves} moves`);
    this.con.println("Press Alt-x to\nquit.");
  }

  // ---------------------------------------------------------------- drawing

  /** Tiles shown in the 11x11 viewport, with line of sight applied. */
  private viewTiles(): number[] {
    const out: number[] = new Array(VIEW_TILES * VIEW_TILES);
    const half = VIEW_TILES >> 1;
    const frame = this.animTick;
    const raw = (x: number, y: number) => {
      const t = tileAt(this.map, x, y);
      return t < 0 ? T.GRASS : t;
    };
    const opaque = (dx: number, dy: number) => isOpaque(raw(this.px + dx, this.py + dy));
    for (let vy = 0; vy < VIEW_TILES; vy++)
      for (let vx = 0; vx < VIEW_TILES; vx++) {
        const dx = vx - half, dy = vy - half;
        const x = this.px + dx, y = this.py + dy;
        let t = this.visible(dx, dy, opaque) ? raw(x, y) : -1;
        if (t >= 0) {
          const npc = this.npcAt(x, y);
          if (npc) t = animFrame(npc.tile, frame + npc.x);
          if (this.map.kind === "world") {
            const o = this.objects.find((ob) => ob.x === (x & 255) && ob.y === (y & 255));
            if (o) t = animFrame(o.tile, frame);
          }
          if (this.map.kind === "world") { const gt = this.moongateTile(x, y); if (gt >= 0) t = gt; }        }
        out[vy * VIEW_TILES + vx] = t;
      }
    out[half * VIEW_TILES + half] = this.onFoot ? T.AVATAR : this.save.transport;
    return out;
  }

  /** Bresenham ray from the centre: a square is visible if no opaque square lies strictly between. */
  private visible(dx: number, dy: number, opaque: (dx: number, dy: number) => boolean): boolean {
    let x = 0, y = 0;
    const sx = Math.sign(dx), sy = Math.sign(dy), ax = Math.abs(dx), ay = Math.abs(dy);
    let err = ax - ay;
    while (!(x === dx && y === dy)) {
      const e2 = 2 * err;
      if (e2 > -ay) { err -= ay; x += sx; }
      if (e2 < ax) { err += ax; y += sy; }
      if (x === dx && y === dy) break;
      if (opaque(x, y)) return false;
    }
    return true;
  }

  tick() { this.animTick++; this.r.animateTiles(); this.tickMoons(); }

  draw() {
    const r = this.r;
    const { base, layers } = this.layers.visible();
    const drawLayers = () => { for (const l of layers) l.draw?.(r); };
    if (!base || !this.save || !this.map) {
      r.setView(null);
      r.view3d = null;
      if (base) r.ui.drawImage(this.frameCanvas, 0, 0);
      drawLayers();
      return;
    }
    r.ui.drawImage(this.frameCanvas, 0, 0);
    r.clearRect(VIEW_X, VIEW_Y, VIEW_TILES * TILE, VIEW_TILES * TILE);
    // viewport: the topmost layer providing tiles or a 3D scene, else the map
    let viewLayer = null;
    for (let i = layers.length - 1; i >= 0 && !viewLayer; i--) if (layers[i].view || layers[i].scene3d) viewLayer = layers[i];
    r.view3d = viewLayer?.scene3d?.() ?? null;
    r.setView(viewLayer ? viewLayer.view?.() ?? null : this.viewTiles());

    // moons
    r.drawGlyph(0x14 + this.save.trammelPhase, 11, 0);
    r.drawGlyph(0x14 + this.save.feluccaPhase, 12, 0);
    // party list, or an inventory panel set by shops (title on row 0, 8 rows of 16 chars)
    const sv: StatusPanel | null = this.layers.top("status")?.() ?? null;
    if (sv) {
      r.fillRect(CON_COL * 8, 0, 16 * 8, 8, 0);
      r.drawText(sv.title.slice(0, 16), CON_COL + ((16 - Math.min(16, sv.title.length)) >> 1), 0);
    }
    for (let i = 0; i < 8; i++) {
      const row = 1 + i;
      r.fillRect(CON_COL * 8, row * 8, 16 * 8, 8, 0);
      if (sv) { r.drawText((sv.rows[i] ?? "").slice(0, 16), CON_COL, row); continue; }
      if (i >= this.save.members) continue;
      const p = this.save.players[i];
      r.drawText(`${i + 1}-${p.name.slice(0, 9)}`, CON_COL, row);
      const hp = String(p.hp);
      r.drawText(hp + p.status, 40 - hp.length - 1, row);
      if (i === this.activeMember) {
        // highlight the member whose turn it is (black background becomes blue)
        r.ui.globalCompositeOperation = "lighter";
        r.fillRect(CON_COL * 8, row * 8, 16 * 8, 8, 1);
        r.ui.globalCompositeOperation = "source-over";
      }
    }
    r.fillRect(CON_COL * 8, 10 * 8, 16 * 8, 8, 0);
    const pad = (n: number) => String(n).padStart(4, "0");
    r.drawText(`F:${pad(Math.floor(this.save.food / 100))}   G:${pad(this.save.gold)}`, CON_COL, 10);
    // active spell effect letter after the food counter (1000:0CF7)
    if (this.spellEffect && this.spellEffect >= "A") r.drawText(this.spellEffect, CON_COL + 7, 10);
    // console
    r.fillRect(CON_COL * 8, CON_ROW * 8, 16 * 8, CON_H * 8, 0);
    this.con.lines.forEach((line, i) => r.drawText(line, CON_COL, CON_ROW + i));
    const last = this.con.lines.length - 1;
    if (this.con.cursor && this.con.lines[last].length < 16) r.drawGlyph(0x1c + (this.animTick & 3), CON_COL + this.con.lines[last].length, CON_ROW + last);
    drawLayers();
  }
}
