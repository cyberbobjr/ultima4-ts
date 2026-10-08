// Party commands: A)ttack, R)eady, W)ear, H)ole up, G)et chest, L)ocate, Z)tats, Q)uit & save.
import { writeSave } from "../io/gamefs";
import { encodeSave } from "../formats/save";
import { ARMOURS, WEAPONS } from "../data/tables";
import { isNonEvil, spawnGroup } from "./combat";
import { loadArena } from "./arenas";
import { CLASS_NAMES, maxMp, type Game } from "./game";
import { DIRS, setTile, tileAt } from "./maps";
import { rand, rand8 } from "./rng";
import { T } from "./tiles";
import { encodeObjects } from "./world/objects";
import { worldFight, worldMonsterAt } from "./world/monsters";

export async function attack(g: Game) {
  g.con.print("Attack: ");
  const d = await g.askDir("");
  if (!d) return;
  const [dx, dy] = DIRS[d];
  const x = g.px + dx, y = g.py + dy;
  if (g.map.kind === "world") {
    const m = worldMonsterAt(g, x, y);
    if (!m) { g.con.println("Nothing to\nattack!"); return; }
    if (isNonEvil(m.tile)) { g.karmaDec(1, 5); g.karmaDec(3, 5); g.karmaDec(5, 5); }
    await worldFight(g, m);
    return;
  }
  const npc = g.npcAt(x, y);
  if (!npc) { g.con.println("Nothing to\nattack!"); return; }
  // Attacking townsfolk (1000:628F): Compassion, Justice, Honor -5; guards and Lord British turn hostile.
  g.karmaDec(1, 5); g.karmaDec(3, 5); g.karmaDec(5, 5);
  if (g.map.kind === "town") for (const n of g.map.npcs) if (n.tile === T.GUARD || n.tile === T.LORD_BRITISH) { n.movement = 0xff; n.hostile = true; }
  await worldFight(g, { tile: npc.tile, x, y }, "town");
}

/** Z)tats of one member, as shown in combat (with weapon and armour). */
export async function ztatsFor(g: Game, i: number) {
  const p = g.save.players[i];
  g.con.println(`${p.name}`);
  g.con.println(`${p.sex === 0x0b ? "M" : "F"} ${CLASS_NAMES[p.klass]}  ${p.status}`);
  g.con.println(`MP:${p.mp} LV:${Math.floor(p.hpMax / 100)}`);
  g.con.println(`STR:${p.str} HP:${p.hp}`);
  g.con.println(`DEX:${p.dex} HM:${p.hpMax}`);
  g.con.println(`INT:${p.int} EX:${p.xp}`);
  g.con.println(`W:${WEAPONS[p.weapon].name}`);
  g.con.println(`A:${ARMOURS[p.armour].name}`);
}

export async function ztats(g: Game) {
  g.con.print("Ztats for: ");
  const k = await g.getKey();
  const n = parseInt(k, 10);
  if (!(n >= 1 && n <= g.save.members)) { g.con.println(""); return; }
  g.con.println(String(n));
  const p = g.save.players[n - 1];
  g.con.println(`${p.name}`);
  g.con.println(`${p.sex === 0x0b ? "M" : "F"} ${CLASS_NAMES[p.klass]}  ${p.status}`);
  g.con.println(`MP:${p.mp} LV:${Math.floor(p.hpMax / 100)}`);
  g.con.println(`STR:${p.str} HP:${p.hp}`);
  g.con.println(`DEX:${p.dex} HM:${p.hpMax}`);
  g.con.println(`INT:${p.int} EX:${p.xp}`);
}

/** R)eady a weapon (1000:7631): letter A..P from the inventory, class mask bit 0x80 >> class. */
export async function readyWeapon(g: Game, member?: number) {
  g.con.print("Ready a weapon\n");
  const i = member ?? await g.askMember("for: ");
  if (i < 0) return;
  const p = g.save.players[i];
  g.con.print("Weapon: ");
  const k = (await g.getKey()).toUpperCase();
  const w = k.charCodeAt(0) - 65;
  if (!(w >= 0 && w < 16)) { g.con.println(""); return; }
  g.con.println(WEAPONS[w].name);
  if (w !== 0 && g.save.weapons[w] <= 0) { g.con.println("None left!"); return; }
  if (!(WEAPONS[w].classMask & (0x80 >> p.klass))) { g.con.println(`A ${CLASS_NAMES[p.klass]} may NOT use a ${WEAPONS[w].name}!`); return; }
  if (p.weapon !== 0) g.save.weapons[p.weapon]++;
  if (w !== 0) g.save.weapons[w]--;
  p.weapon = w;
}

/** W)ear armour (1000:7732). */
export async function wearArmour(g: Game) {
  g.con.print("Wear Armour\n");
  const i = await g.askMember("for: ");
  if (i < 0) return;
  const p = g.save.players[i];
  g.con.print("Armour: ");
  const k = (await g.getKey()).toUpperCase();
  const a = k.charCodeAt(0) - 65;
  if (!(a >= 0 && a < 8)) { g.con.println(""); return; }
  g.con.println(ARMOURS[a].name);
  if (a !== 0 && g.save.armour[a] <= 0) { g.con.println("None left!"); return; }
  if (!(ARMOURS[a].classMask & (0x80 >> p.klass))) { g.con.println(`A ${CLASS_NAMES[p.klass]} may NOT use ${ARMOURS[a].name}!`); return; }
  if (p.armour !== 0) g.save.armour[p.armour]++;
  if (a !== 0) g.save.armour[a]--;
  p.armour = a;
}

/** H)ole up & camp (1000:8AB0). */
export async function holeUp(g: Game) {
  g.con.println("Hole up & Camp");
  if (!g.onFoot || g.map.kind !== "world") { g.con.println("Not Here!"); return; }
  g.con.println("Resting...");
  for (let k = 0; k < 4; k++) { g.endTurn(); await new Promise((r) => setTimeout(r, 300)); }
  if (rand(8) === 0) {
    g.con.println("Ambushed!");
    const tiles = [0xc0, 0xc8, 0xa4, 0xd0];
    const arena = await loadArena("CAMP.CON");
    const res = await g.fight({ arena, monsters: spawnGroup(tiles[rand(4)], arena, g.save.members), context: "world" });
    void res;
    return;
  }
  if (Math.floor(g.save.moves / 100) === g.save.lastCamp) { g.con.println("No effect."); return; }
  g.save.lastCamp = Math.floor(g.save.moves / 100) & 0xffff;
  for (const p of g.members) {
    if (p.status === "D") continue;
    if (p.status === "S") p.status = "G";
    p.hp = Math.min(p.hpMax, p.hp + (rand8() & 0x77) + 99);
    p.mp = maxMp(p);
  }
  g.con.println("Players Healed!");
}

/** G)et chest (1000:72EC -> 722F): chests on the town map are stolen; dropped chests are free. */
export async function getChest(g: Game) {
  g.con.print("Get Chest!\n");
  const obj = g.map.kind === "world" ? g.objects.find((o) => o.tile === T.CHEST && o.x === g.px && o.y === g.py) : undefined;
  const onMap = tileAt(g.map, g.px, g.py) === T.CHEST;
  if (!obj && !onMap) { g.con.println("Not Here!"); return; }
  const who = await g.askMember("Who opens?");
  if (who < 0) return;
  if (g.save.players[who].status === "D" || g.save.players[who].status === "S") { g.con.println("Disabled!"); return; }
  if (obj) g.objects = g.objects.filter((o) => o !== obj);
  else {
    setTile(g.map, g.px, g.py, T.BRICK_FLOOR);
    if (g.map.kind === "town") { g.karmaDec(0, 1); g.karmaDec(3, 1); g.karmaDec(5, 1); }
  }
  await openChest(g, who);
  g.endTurn();
}

/** Chest trap and contents (1000:7150, 1000:70F1). `who` = -1 never triggers traps (Open spell). */
export async function openChest(g: Game, who: number) {
  const r1 = rand8();
  if ((r1 & 1) === 0) {
    const kind = r1 & 3 & rand8();
    g.con.print(["Acid", "Sleep", "Poison", "Bomb"][kind] + " Trap!\n");
    const p = who >= 0 ? g.save.players[who] : null;
    if (!p || rand8() % 100 <= p.dex + 25) g.con.print("Evaded!\n");
    else if (kind === 0) g.damagePlayer(p, rand8() % 30);
    else if (kind === 1) p.status = "S";
    else if (kind === 2) p.status = "P";
    else for (const m of g.members) if (m.status !== "D" && rand8() & 1) g.damagePlayer(m, 10 + (rand8() % 15));
  }
  const gold = (rand8() % 80) + (rand8() & 7) + 10;
  g.con.print(`The Chest Holds:\n${gold} Gold\n`);
  g.save.gold = Math.min(9999, g.save.gold + gold);
}

export function locate(g: Game) {
  g.con.println("Locate position");
  if (g.save.sextants <= 0) { g.con.println("with what?"); return; }
  const L = (v: number) => String.fromCharCode(65 + (v >> 4)) + "'" + String.fromCharCode(65 + (v & 15)) + '"';
  g.con.println(`with sextant\n Latitude: ${L(g.py)}\nLongitude: ${L(g.px)}`);
}

export async function quitSave(g: Game) {
  g.con.println("Quit & Save...");
  if (g.map.kind !== "world") { g.con.println("Not Here!"); return; }
  await writeSave("PARTY.SAV", encodeSave(g.save));
  await writeSave("OUTMONST.SAV", encodeObjects(g.objects));
  g.con.println(`${g.save.moves} moves`);
  g.con.println("Press Alt-x to\nquit.");
}
