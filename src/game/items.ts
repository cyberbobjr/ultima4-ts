// Items and miscellaneous commands: U)se, S)earch, P)eer, N)ew order, F)ire, I)gnite.
// Ported from AVATAR.EXE (unpacked): use 1000:07AE (table DS:0434) with handlers 1000:01E1..05CE,
// search 1000:913A (table DS:2920) and finds 1000:8D4B..90C5, peer 1000:C41D/C403/B9EF, new order 1000:7034,
// fire 1000:73C9, ignite 1000:7525.
import { loadGameFile } from "../io/gamefs";
import { decodeTown } from "../formats/maps";
import { ALTAR_STONE_MASKS, STONE_COLORS } from "../data/tables";
import { rand8 } from "./combat";
import type { Game } from "./game";
import { LOCATIONS, VIRTUES } from "./locations";
import { DIRS, tileAt } from "./maps";
import { T } from "./tiles";
import {
  addDrawHook, addXp, askKey, askPlayer, blankView, drawViewTile, flushKeys, gameMode, PixelLayer, sameText, shake, sleep,
} from "./endgame/ui";
import { addDungeonLight, dungeonSpellHooks } from "./magic";
import { runCodex } from "./endgame/codex";

/**
 * Combat context for U)se (set by combat.ts around g.useItem() during a member's turn):
 * position of the member using the item, altar of a dungeon altar room (0 Truth, 1 Love, 2 Courage; DS:943E,
 * -1 elsewhere), whether the fight is in a dungeon room (mode 6), and a callback killing every monster
 * except Lord British (skull used in combat).
 */
export const useContext: {
  pos: { x: number; y: number } | null;
  altar: number;
  room: boolean;
  killAll: (() => void) | null;
} = { pos: null, altar: -1, room: false, killAll: null };

/** Horn effect char (1000:0553 sets DS:95A4 = 1 for 10 turns): no daemons spawn near the Humility shrine. */
export const HORN_EFFECT = "\u0001";

const say = (g: Game, s: string) => g.con.print(s);
const NONE_OWNED = "None owned!\n", NO_EFFECT = "Hmm...No effect!\n", NOTHING = "Nothing Here!\n";

// ------------------------------------------------------------------ peer at a gem (1000:B9EF)

/** Pattern kind per tile (DS:2F72); tiles >= 0x80 use kind 5. */
const PEER_KIND = [
  12, 11, 10, 1, 1, 9, 2, 8, 7, 5, 5, 5, 5, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 4, 5, 4, 4, 5, 5, 6, 6, 5,
  6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 5, 5, 7, 6, 6, 5, 0, 3, 4,
  3, 3, 3, 3, 3, 3, 3, 3, 3, 7, 3, 3, 3, 3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
  4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 0, 7,
];
/** 4x4 pixel patterns (dy, dx, colour 1..3) decoded from the switch at 1000:BA40 (kind 12 is computed). */
const PEER_PATTERNS: [number, number, number][][] = [
  [],
  [[0, 1, 1], [1, 3, 1], [2, 1, 1], [3, 3, 1]],
  [[0, 3, 1], [1, 1, 1], [2, 3, 1], [3, 1, 1], [0, 1, 1], [1, 3, 1], [2, 1, 1], [3, 3, 1]],
  [[0, 0, 2], [1, 0, 2], [2, 0, 2], [3, 0, 2], [0, 2, 2], [1, 2, 2], [2, 2, 2], [3, 2, 2]],
  [[0, 0, 3], [0, 1, 3], [0, 2, 3], [0, 3, 3], [3, 0, 3], [3, 1, 3], [3, 2, 3], [3, 3, 3]],
  [[1, 1, 3], [2, 1, 3], [1, 2, 3], [2, 2, 3]],
  [[1, 0, 3], [2, 0, 3], [1, 3, 3], [2, 3, 3], [0, 0, 3], [0, 1, 3], [0, 2, 3], [0, 3, 3], [3, 0, 3], [3, 1, 3], [3, 2, 3], [3, 3, 3]],
  [[1, 1, 3], [2, 1, 3], [1, 2, 3], [2, 2, 3], [1, 0, 3], [2, 0, 3], [1, 3, 3], [2, 3, 3], [0, 0, 3], [0, 1, 3], [0, 2, 3], [0, 3, 3], [3, 0, 3], [3, 1, 3], [3, 2, 3], [3, 3, 3]],
  [[0, 0, 3], [1, 0, 3], [0, 1, 3], [1, 1, 3], [2, 2, 3], [3, 2, 3], [2, 3, 3], [3, 3, 3]],
  [[0, 1, 1], [1, 1, 1], [2, 1, 1], [0, 3, 1], [2, 3, 1], [3, 3, 1]],
  [[0, 0, 2], [2, 0, 2], [1, 2, 2], [3, 2, 2]],
  [[0, 0, 2], [2, 2, 2]],
];
/** EGA.DRV colour -> plane mask (driver data at 0x1F3): 1 green, 2 blue, 3 light grey. */
const PEER_COLOR = [0, 2, 1, 7];
const PEER_ORG = 0x20;

/** 32x32 overview, each tile a 4x4 pattern at (32,32) (centre of the viewport); `marker` blinks (XOR bar). */
async function showPeer(g: Game, tile: (x: number, y: number) => number, marker: { x: number; y: number } | null) {
  const layer = new PixelLayer();
  for (let row = 0; row < 32; row++)
    for (let col = 0; col < 32; col++) {
      const t = tile(col, row);
      const kind = t >= 0x80 ? 5 : PEER_KIND[t];
      const ox = PEER_ORG + col * 4, oy = PEER_ORG + row * 4;
      if (kind === 12) layer.set(ox + 2, oy + (col & 1) * 2, PEER_COLOR[3]);
      else for (const [dy, dx, c] of PEER_PATTERNS[kind] ?? []) layer.set(ox + dx, oy + dy, PEER_COLOR[c]);
    }
  const start = performance.now();
  const restoreView = blankView(g);
  const restoreDraw = addDrawHook(g, (r) => {
    layer.draw(r);
    if (!marker) return;
    // 1000:C17x: each step XORs one pixel column of the party's cell with colour 3 (light grey)
    const n = Math.floor((performance.now() - start) / 50);
    for (let c = 0; c < 4; c++) {
      if (n < c || ((Math.floor((n - c) / 4) + 1) & 1) === 0) continue;
      const x = PEER_ORG + marker.x * 4 + c;
      for (let dy = 0; dy < 4; dy++) {
        const y = PEER_ORG + marker.y * 4 + dy;
        r.fillRect(x, y, 1, 1, layer.px[y * 320 + x] ^ 7);
      }
    }
  });
  try {
    flushKeys(g);
    await g.getKey();
  } finally {
    restoreDraw();
    restoreView();
  }
}

/** Peer 1000:C403 for towns and the overworld (B9EF with the party marker). Also used by the View spell. */
export async function peerAtMap(g: Game) {
  if (g.map.kind === "town") {
    const town = g.map;
    await showPeer(g, (x, y) => town.tiles[y * 32 + x], { x: g.px, y: g.py });
    return;
  }
  // the overworld is kept as a 32x32 window of 16x16 chunks around the party (1000:26B6)
  const s = g.save;
  const wx = (s.x & 15) < 8 ? (s.x & 15) + 16 : s.x & 15, wy = (s.y & 15) < 8 ? (s.y & 15) + 16 : s.y & 15;
  await showPeer(g, (x, y) => tileAt(g.world, s.x - wx + x, s.y - wy + y), { x: wx, y: wy });
}

// ------------------------------------------------------------------ U)se

/** Stones at a dungeon altar room (1000:01E1): the member must stand on the altar square (5,5). */
async function altarStones(g: Game) {
  const s = g.save, ctx = useContext;
  if (ctx.pos && ctx.pos.x === 5 && ctx.pos.y === 5 && ctx.altar >= 0) {
    say(g, "\nThere are holes for 4 stones. What colors:\n");
    let used = 0;
    for (let i = 1; i < 5; i++) {
      say(g, String.fromCharCode(0x40 + i) + ":");
      const name = await g.getLine(11);
      const idx = STONE_COLORS.findIndex((c) => sameText(c, name, 12));
      if (idx < 0 || !(s.stones & (1 << idx))) { if (name) say(g, NONE_OWNED); return; }
      if (used & (1 << idx)) { say(g, "Already used!\n"); return; }
      used |= 1 << idx;
    }
    const bit = [0x80, 0x40, 0x20][ctx.altar];
    if (ALTAR_STONE_MASKS[ctx.altar] === used && !(s.items & bit)) {
      s.items |= bit;
      say(g, "Thou doth find one third of the Three Part Key!\n");
      return;
    }
  }
  say(g, NO_EFFECT);
}

/** Stones 1000:0311: altar rooms, or the altars of the Abyss (cell 0xB0 on each level). */
async function useStone(g: Game) {
  const s = g.save, mode = gameMode(g);
  if (s.stones === 0) { say(g, NONE_OWNED); return; }
  const inRoom = mode === 4 && useContext.room;
  if (!inRoom && mode !== 3) say(g, "No place to Use them!\n");
  if (mode !== 3) { await altarStones(g); return; }
  const h = dungeonSpellHooks, level = s.dngLevel;
  if (s.location === 24 && h.cell?.(s.x, s.y, level) === 0xb0) {
    const QUESTION = ["Truth", "Love", "Courage", "Truth and Love", "Love and Courage", "Courage and Truth", "Truth, Love and Courage",
      "\nA voice rings out:  What Virtue exists independently of Truth, Love and Courage"]; // DS:0284
    if (level !== 7) say(g, "\nAs thou doth approach, a voice rings out: What virtue dost stem from ");
    say(g, QUESTION[level] + "?\n\n");
    let answer = await g.getLine(13);
    if (sameText(answer, VIRTUES[level], 14)) {
      say(g, "\nThe Voice says: Use thy Stone.\n\nColor:\n");
      answer = await g.getLine(11);
      const idx = STONE_COLORS.findIndex((c) => sameText(answer, c, 12));
      if (idx >= 0) {
        if (!(s.stones & (1 << idx))) { say(g, "\nYou have none!\n\n"); return; }
        if (idx === level) {
          if (level === 7) { await runCodex(g); return; }
          h.setCell?.(s.x, s.y, level, 0x20); // the altar becomes a ladder down
          h.refresh?.();
          say(g, "\nThe altar changes before thyne eyes!\n");
          return;
        }
        say(g, NO_EFFECT);
        return;
      }
    }
    if (!answer) return;
  }
  say(g, NO_EFFECT);
}

const atAbyss = (g: Game) => g.save.location === 0 && g.px === 0xe9 && g.py === 0xe9;

/** Skull 1000:05CE */
async function useSkull(g: Game) {
  const s = g.save;
  if (!(s.items & 1)) { say(g, NONE_OWNED); return; }
  if (atAbyss(g)) {
    say(g, "\nYou cast the Skull of Mondain into the Abyss!\n");
    s.items |= 2;
    for (let v = 0; v < 8; v++) g.karmaInc(v, 10);
    for (let k = 0; k < 3; k++) await shake(g);
  } else {
    say(g, "\nYou hold the evil Skull of Mondain the Wizard aloft....\n");
    for (let k = 0; k < 3; k++) await shake(g);
    // every creature on the map dies except Lord British (monster slots 0..7 outdoors, all 32 slots in towns)
    const mode = gameMode(g);
    if (mode < 4) {
      if (g.map.kind === "world") g.objects = g.objects.filter((o) => o.tile < 0x80);
      else g.map.npcs = g.map.npcs.filter((n) => n.tile === T.LORD_BRITISH);
    } else {
      if (g.map.kind === "world") g.objects = g.objects.filter((o) => o.tile === T.LORD_BRITISH);
      else g.map.npcs = g.map.npcs.filter((n) => n.tile === T.LORD_BRITISH);
      useContext.killAll?.();
    }
    for (let v = 0; v < 8; v++) g.karmaDec(v, 5);
  }
  s.items &= ~1;
}

/** Bell 1000:0487, book 1000:04C0, candle 1000:0501 at the Abyss entrance (233,233), in that order. */
async function useAbyssItem(g: Game, have: number, needs: number, sets: number, msg: string) {
  const s = g.save;
  if (!(s.items & have)) { say(g, NONE_OWNED); return; }
  if (atAbyss(g) && (needs === 0 || s.items & needs)) {
    s.items |= sets;
    say(g, msg);
    if (sets === 0x400) await shake(g);
    return;
  }
  say(g, NO_EFFECT);
}

const USE_TABLE: [string, (g: Game) => Promise<void> | void][] = [
  ["stone", useStone], ["stones", useStone],
  ["bell", (g) => useAbyssItem(g, 0x10, 0, 0x1000, "The Bell rings on and on!\n")],
  ["book", (g) => useAbyssItem(g, 0x08, 0x1000, 0x800, "The words resonate with the ringing!\n")],
  ["candle", (g) => useAbyssItem(g, 0x04, 0x800, 0x400, "As you light the Candle the Earth Trembles!\n")],
  ["key", useKey], ["keys", useKey],
  // Horn 1000:0553: overworld only
  ["horn", (g) => {
    if (!(g.save.items & 0x100)) { say(g, NONE_OWNED); return; }
    if (g.save.location !== 0) { say(g, NO_EFFECT); return; }
    say(g, "The Horn sounds an eerie tone!\n");
    g.setSpellEffect(HORN_EFFECT, 10);
  }],
  // Wheel 1000:058C: overworld, on a ship with a full hull (50) -> 99
  ["wheel", (g) => {
    if (!(g.save.items & 0x200)) { say(g, NONE_OWNED); return; }
    if (g.save.location !== 0 || !g.onShip || g.save.shipHull !== 50) { say(g, NO_EFFECT); return; }
    say(g, "Once mounted, the Wheel glows with a blue light!\n");
    g.save.shipHull = 99;
  }],
  ["skull", useSkull],
];

/** Key 1000:044C */
function useKey(g: Game) { say(g, g.save.items & 0xe0 ? "No place to Use them!\n" : NONE_OWNED); }

async function useItem(g: Game) {
  say(g, "Use which item:\n");
  const name = await g.getLine(11);
  const entry = name ? USE_TABLE.find(([n]) => sameText(n, name, 12)) : undefined;
  if (!entry) { say(g, "Not a Usable item!\n"); return; }
  await entry[1](g);
}

// ------------------------------------------------------------------ S)earch

/** 1000:8D4B: every find gives Honor +5 and restarts the reagent timer (DS:932C = moves & 0xF0). */
function found(g: Game) {
  say(g, "You find...\n");
  g.karmaInc(5, 5);
  g.save.lastReagent = g.save.moves & 0xf0;
}

const newMoons = (g: Game) => g.save.trammelPhase === 0 && g.save.feluccaPhase === 0;

/** Reagents (1000:8D6D): +2..9, capped at 99. */
function findReagent(g: Game, i: number, name: string) {
  const s = g.save;
  if (!newMoons(g) || (s.moves & 0xf0) === s.lastReagent) { say(g, NOTHING); return; }
  found(g);
  say(g, name);
  s.reagents[i] += (rand8() & 7) + 2;
  if (s.reagents[i] > 99) { s.reagents[i] = 99; say(g, "Dropped some!\n"); }
}

/** Quest item flag in save.items: bit set -> already found. */
function findItem(g: Game, bit: number, name: string, xp: number, extra = true) {
  const s = g.save;
  if (s.items & bit || !extra) { say(g, NOTHING); return; }
  s.items |= bit;
  found(g);
  say(g, name);
  addXp(s.players[0], xp);
}

function findStone(g: Game, bit: number, name: string, extra = true) {
  const s = g.save;
  if (s.stones & bit || !extra) { say(g, NOTHING); return; }
  s.stones |= bit;
  found(g);
  say(g, name);
  addXp(s.players[0], 200);
}

const allElevated = (g: Game) => g.save.karma.every((k) => k === 0);

/** Telescope 1000:8FB1: overview of any town A-P (no party marker). */
async function telescope(g: Game) {
  say(g, "You see a knob on the Telescope marked A-P\n");
  const k = await askKey(g, "You Select:", "A", "P");
  if (k < 0) return;
  const loc = LOCATIONS[k - 0x40];
  const { tiles } = decodeTown(await loadGameFile(loc.map!));
  await showPeer(g, (x, y) => tiles[y * 32 + x], null);
}

/** Runes 1000:90C5: table DS:2904 (location, rune bit). */
const RUNE_TOWNS = [5, 6, 7, 8, 9, 10, 1, 13];

function findRune(g: Game) {
  const s = g.save, i = RUNE_TOWNS.indexOf(s.location);
  if (i < 0 || s.runes & (1 << i)) { say(g, NOTHING); return; }
  s.runes |= 1 << i;
  found(g);
  say(g, `The rune of ${VIRTUES[i]}!\n`);
  addXp(s.players[0], 100);
}

/** Search table DS:2920 {location, x, y, handler}. */
const SEARCH_TABLE: [number, number, number, (g: Game) => Promise<void> | void][] = [
  [0, 182, 54, (g) => findReagent(g, 7, "Mandrake Root!\n")],
  [0, 100, 165, (g) => findReagent(g, 7, "Mandrake Root!\n")],
  [0, 46, 149, (g) => findReagent(g, 6, "Nightshade!\n")],
  [0, 205, 44, (g) => findReagent(g, 6, "Nightshade!\n")],
  [0, 176, 208, (g) => findItem(g, 0x10, "The Bell of Courage!\n", 400)],
  [0, 45, 173, (g) => findItem(g, 0x100, "A Silver Horn!\n", 400)],
  [0, 96, 215, (g) => findItem(g, 0x200, "The Wheel from the H.M.S. Cape!\n", 400)],
  [0, 197, 245, (g) => findItem(g, 0x01, "The Skull of Mondain the Wizard!\n", 400, newMoons(g) && !(g.save.items & 2))],
  [0, 224, 133, (g) => findStone(g, 0x80, "The Black Stone!\n", newMoons(g))],
  [0, 64, 80, (g) => findStone(g, 0x40, "The White Stone!\n")],
  [2, 6, 6, (g) => findItem(g, 0x08, "The Book of Truth!\n", 400)],
  [16, 22, 1, (g) => findItem(g, 0x04, "The Candle of Love!\n", 400)],
  [2, 22, 3, telescope],
  // Mystic armour / weapons 1000:9027 / 9076: all virtues elevated and none owned yet -> 8 of them
  [3, 22, 4, (g) => {
    if (g.save.armour[7] !== 0 || !allElevated(g)) { say(g, NOTHING); return; }
    g.save.armour[7] = 8; found(g); say(g, "Mystic Armour!\n"); addXp(g.save.players[0], 400);
  }],
  [4, 8, 15, (g) => {
    if (g.save.weapons[15] !== 0 || !allElevated(g)) { say(g, NOTHING); return; }
    g.save.weapons[15] = 8; found(g); say(g, "Mystic Weapons!\n"); addXp(g.save.players[0], 400);
  }],
  [5, 8, 6, findRune], [6, 25, 1, findRune], [7, 30, 30, findRune], [8, 13, 6, findRune],
  [9, 28, 30, findRune], [10, 2, 29, findRune], [1, 17, 8, findRune], [13, 29, 29, findRune],
];

async function search(g: Game) {
  say(g, "Search...\n");
  if (gameMode(g) < 3 && g.inBalloon && g.save.balloonState !== 0) { say(g, "Drift Only!\n"); return; }
  const loc = g.save.location, x = g.px, y = g.py;
  const spot = SEARCH_TABLE.find(([l, sx, sy]) => l === loc && sx === x && sy === y);
  if (!spot) { say(g, NOTHING); return; }
  await spot[3](g);
}

// ------------------------------------------------------------------ N)ew order, F)ire, I)gnite, P)eer

/** New order 1000:7034: the Avatar (member 1) always leads. */
async function newOrder(g: Game) {
  say(g, "New Order!\n");
  const s = g.save;
  const a = await askPlayer(g, "Exchange #");
  if (a < 0) return;
  if (a !== 0) {
    const b = await askPlayer(g, "    with #");
    if (b < 0) return;
    if (b !== 0) {
      if (a === b) { say(g, "What?\n"); return; }
      [s.players[a], s.players[b]] = [s.players[b], s.players[a]];
      return;
    }
  }
  say(g, `${s.players[0].name}, You must lead!\n`);
}

/** Fire cannon 1000:73C9: broadsides only, 3 squares; monsters are sunk 1 time in 4, other objects always. */
async function fireCannon(g: Game) {
  say(g, "Fire ");
  if (!g.onShip || g.map.kind !== "world") { say(g, "What?\n"); return; }
  say(g, "Cannon!\n");
  const d = await g.askDir("Dir: ");
  if (!d) return;
  const [dx, dy] = DIRS[d], tr = g.save.transport;
  const broadside = dx === 0 ? tr === T.SHIP_W || tr === T.SHIP_E : tr === T.SHIP_N || tr === T.SHIP_S;
  if (!broadside) { say(g, "Broadsides Only!\n"); return; }
  let shot: { t: number; vx: number; vy: number } | null = null;
  const restore = addDrawHook(g, (r) => { if (shot) drawViewTile(r, shot.t, shot.vx, shot.vy); });
  try {
    let hit = null;
    for (let k = 1; k < 4; k++) {
      const x = (g.px + dx * k) & 255, y = (g.py + dy * k) & 255;
      const o = g.objects.find((ob) => ob.x === x && ob.y === y);
      // cannonballs fly over whirlpools and balloons
      if (o && (o.tile & ~1) !== 0x8c && o.tile !== T.BALLOON) { hit = { o, k }; break; }
      shot = { t: T.MISSILE, vx: 5 + dx * k, vy: 5 + dy * k };
      await sleep(80);
    }
    shot = null;
    if (!hit) return;
    shot = { t: T.HIT_FLASH, vx: 5 + dx * hit.k, vy: 5 + dy * hit.k };
    await sleep(150);
    shot = null;
    const o = hit.o;
    if (o.tile >= 0x80 && rand8() & 3) return;
    if (o.tile === T.LORD_BRITISH) return;
    g.objects = g.objects.filter((ob) => ob !== o);
  } finally {
    restore();
  }
}

/** Ignite 1000:7525: torches only light the dungeons. */
function igniteTorch(g: Game) {
  say(g, "Ignite Torch!\n");
  if (gameMode(g) !== 3) { say(g, "Not Here!\n"); return; }
  if (g.save.torches === 0) { say(g, "None left!\n"); return; }
  g.save.torches--;
  addDungeonLight(g, 100);
}

/** Peer 1000:C41D */
async function peerGem(g: Game) {
  say(g, "Peer at ");
  if (g.save.gems === 0) { say(g, "What?\n"); return; }
  say(g, "a Gem!\n");
  g.save.gems--;
  if (g.save.location < 0x11) await peerAtMap(g);
  else await dungeonSpellHooks.peer?.();
}

export function installItems(g: Game) {
  // every command ends the turn on the overworld and in towns (1000:1C06); combat/dungeon loops do their own
  const turn = (fn: (g: Game) => Promise<void> | void) => async () => {
    await fn(g);
    if (gameMode(g) < 3) g.endTurn();
  };
  g.useItem = turn(useItem);
  g.search = turn(search);
  g.peerGem = turn(peerGem);
  g.newOrder = turn(newOrder);
  g.fireCannon = turn(fireCannon);
  g.igniteTorch = turn(igniteTorch);
}
