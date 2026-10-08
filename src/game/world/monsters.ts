// Overworld monsters (1000:5851, 1000:5712), their fights and the party's death (1000:0EB1).
import { COMBAT_MAP_RULES, MONSTER_SPAWN } from "../../data/tables";
import { creatureInfo, isNonEvil, spawnGroup, type CombatRequest } from "../combat";
import { loadArena } from "../arenas";
import type { Game } from "../game";
import { LOCATIONS } from "../locations";
import { tileAt } from "../maps";
import { rand, rand8 } from "../rng";
import { T, tileFlags, Walk } from "../tiles";
import type { WorldObject } from "./objects";
import { MSG_CORE } from "../texts/core";

export function worldMonsterAt(g: Game, x: number, y: number): WorldObject | undefined {
  return g.objects.find((o) => o.tile >= 0x80 && o.x === (x & 255) && o.y === (y & 255));
}

export function moveWorldMonsters(g: Game) {
  const s = g.save;
  const wrap = (v: number) => ((v % 256) + 256) % 256;
  const delta = (a: number, b: number) => { const d = wrap(a - b); return d > 127 ? d - 256 : d; };
  const monsters = g.objects.filter((o) => o.tile >= 0x80);
  // despawn monsters that are far away
  g.objects = g.objects.filter((o) => o.tile < 0x80 || (Math.abs(delta(o.x, g.px)) < 16 && Math.abs(delta(o.y, g.py)) < 16));
  for (const m of monsters) {
    if (!g.objects.includes(m)) continue;
    const info = creatureInfo(m.tile);
    const flags = info.def?.flags ?? [];
    const dx = delta(g.px, m.x), dy = delta(g.py, m.y);
    if (Math.abs(dx) + Math.abs(dy) === 1 && !flags.includes("randomMove")) {
      if (!(isNonEvil(m.tile) && rand(2))) { g.pendingAttack = m; return; }
    }
    let sx = 0, sy = 0;
    if (flags.includes("randomMove") || rand(4) === 0) {
      [sx, sy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][rand(4)];
    } else if (Math.abs(dx) >= Math.abs(dy)) sx = Math.sign(dx); else sy = Math.sign(dy);
    const nx = wrap(m.x + sx), ny = wrap(m.y + sy);
    if (nx === g.px && ny === g.py) continue;
    const t = tileAt(g.world, nx, ny);
    const ok = flags.includes("sea") ? t < 3 || (flags.includes("flies") && (tileFlags(t) & Walk.Foot) !== 0)
      : flags.includes("flies") ? (tileFlags(t) & (Walk.Foot | Walk.Ship)) !== 0
      : (tileFlags(t) & Walk.Foot) !== 0 && t !== T.TOWN && t !== T.CASTLE && t !== T.VILLAGE && t !== T.LCB_ENTRANCE && t !== T.DUNGEON && t !== T.SHRINE;
    if (ok && !g.objects.some((o) => o.x === nx && o.y === ny)) { m.x = nx; m.y = ny; }
  }
  // spawning: 1/16 per turn, up to 4 monsters, away from the party
  if (g.objects.filter((o) => o.tile >= 0x80).length < MONSTER_SPAWN.overworldSlots && rand(16) === 0) {
    const ox = rand(32) - 16, oy = rand(32) - 16;
    if (Math.abs(ox) > 5 && Math.abs(oy) > 5) {
      const x = wrap(g.px + ox), y = wrap(g.py + oy);
      const t = tileAt(g.world, x, y);
      let tile = -1;
      if (t < 2 && rand(8) === 0) tile = MONSTER_SPAWN.seaTiles[rand(8)];
      else if (t >= T.GRASS && t <= T.HILLS) {
        const mask = MONSTER_SPAWN.landMaskByMoves.find((e) => s.moves < e.below)!.mask;
        tile = MONSTER_SPAWN.landBaseTile + 4 * (rand8() & rand8() & mask);
      }
      if (tile >= 0 && !g.objects.some((o) => o.x === x && o.y === y)) g.objects.push({ tile, x, y });
    }
  }
  // bridge trolls (1000:9209)
  if (tileAt(g.world, g.px, g.py) === T.BRIDGE && rand(8) === 0) {
    g.con.print(MSG_CORE.bridgeTrolls);
    g.pendingAttack = { tile: 0xa4, x: g.px, y: g.py };
  }
}

/** Overworld (or town) combat against one creature; the arena depends on the terrain (1000:7C65). */
export async function worldFight(g: Game, m: WorldObject, context: CombatRequest["context"] = "world") {
  const info = creatureInfo(m.tile);
  g.con.print(MSG_CORE.attackedBy + info.name + "\n");
  const partyTile = tileAt(g.map, g.px, g.py);
  const monsterTile = tileAt(g.map, m.x, m.y);
  const onShip = g.onShip;
  const rules = COMBAT_MAP_RULES;
  let file: string;
  if (onShip) file = m.tile === T.PIRATE_SHIP ? rules.onShip.vsPirateShip : monsterTile < 3 ? rules.onShip.enemyOnWater : rules.onShip.otherwise;
  else if (m.tile === T.PIRATE_SHIP) file = rules.onLand.vsPirateShip;
  else if (monsterTile < 3) file = rules.onLand.enemyOnWater;
  else file = rules.onLand.byPartyTile[partyTile] ?? rules.onLand.default;
  const arena = await loadArena(file);
  const fightTile = m.tile === T.PIRATE_SHIP ? rules.pirateCrewTile : m.tile;
  const monsters = context === "town" ? [{ tile: m.tile, x: arena.monsterPos[0][0], y: arena.monsterPos[0][1] }] : spawnGroup(fightTile, arena, g.save.members);
  const res = await g.fight({ arena, monsters, context: onShip ? "ship" : context });
  if (res.outcome === "won") {
    g.objects = g.objects.filter((o) => o !== m);
    if (context === "town" && g.map.kind === "town") g.map.npcs = g.map.npcs.filter((n) => !(n.x === m.x && n.y === m.y));
    if (m.tile === T.PIRATE_SHIP) g.objects.push({ tile: T.SHIP_W, x: m.x, y: m.y }); // the captured ship
    else if (res.chest && context === "world" && (tileFlags(tileAt(g.map, m.x, m.y)) & Walk.Foot)) g.objects.push({ tile: T.CHEST, x: m.x, y: m.y });
  }
}

/** "All is Dark..." — Lord British resurrects the party (1000:0EB1). */
export async function partyDeath(g: Game) {
  const M = MSG_CORE;
  const lines = [M.allIsDark, M.butWait, M.whereAmI, M.amIDead, M.afterlife, M.youHear, M.feelMotion];
  for (const l of lines) { g.con.print(l); await new Promise((r) => setTimeout(r, 1200)); }
  for (const p of g.members) { p.status = "G"; p.hp = p.hpMax; }
  g.map = g.world;
  g.save.location = 0;
  g.save.transport = T.AVATAR;
  g.objects = [];
  g.setPos(LOCATIONS[1].x, LOCATIONS[1].y + 1);
  g.con.print(MSG_CORE.lordBritishRevives);
}
