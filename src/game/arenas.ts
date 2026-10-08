// Choice of the combat arena (*.CON) from the terrain, as in the original
// (file names from the AVATAR.EXE string table).
import { assets } from "../assets/store";
import type { CombatMap } from "../formats/maps";
import { T } from "./tiles";

export function arenaFor(partyTile: number, monsterTile: number, onShip: boolean, monsterOnSea: boolean): string {
  if (onShip) return monsterOnSea ? "SHIPSHIP.CON" : "SHIPSHOR.CON";
  if (monsterOnSea) return "SHORSHIP.CON";
  switch (partyTile) {
    case T.SWAMP: return "MARSH.CON";
    case T.SCRUB: return "BRUSH.CON";
    case T.FOREST: return "FOREST.CON";
    case T.HILLS: return "HILL.CON";
    case T.BRIDGE: case T.BRIDGE_N: case T.BRIDGE_S: return "BRIDGE.CON";
    case T.SHALLOWS: case T.SHORE_NE: case T.SHORE_NW: case T.SHORE_SE: case T.SHORE_SW: return "SHORE.CON";
    case T.BRICK_FLOOR: case T.WOOD_FLOOR: return "BRICK.CON";
    case T.DUNGEON_FLOOR: return "DUNGEON.CON";
  }
  if (partyTile <= T.WATER) return "SHIPSEA.CON";
  void monsterTile;
  return "GRASS.CON";
}

export async function loadArena(name: string): Promise<CombatMap> {
  return assets.combat(name);
}
