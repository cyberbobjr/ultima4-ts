// Runtime map contexts.
import type { Dialogue } from "../formats/tlk";
import type { LocationDef } from "./locations";

export type Dir = "N" | "S" | "E" | "W";
export const DIRS: Record<Dir, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
export const DIR_NAMES: Record<Dir, string> = { N: "North", S: "South", E: "East", W: "West" };

export interface Npc {
  index?: number;    // slot in the .ULT NPC table (0..31)
  tile: number;      // base tile (animation frames are derived)
  x: number; y: number;
  movement: number;  // 0 fixed, 1 wander, 0x80 follow, 0xff attack
  talk: number;      // 1-based dialogue index, 0 = none
  dialogue: Dialogue | null;
  hostile?: boolean;
}

export interface TownMap {
  kind: "town";
  loc: LocationDef;
  level: number; // 0 or 1 (Lord British's castle has two floors)
  width: 32; height: 32;
  tiles: Uint8Array;
  npcs: Npc[];
  dialogues: (Dialogue | null)[];
}

export interface WorldMap {
  kind: "world";
  width: 256; height: 256;
  tiles: Uint8Array;
}

export type MapCtx = TownMap | WorldMap;

export function tileAt(map: MapCtx, x: number, y: number): number {
  if (map.kind === "world") return map.tiles[((y & 255) << 8) | (x & 255)];
  if (x < 0 || y < 0 || x >= 32 || y >= 32) return -1;
  return map.tiles[y * 32 + x];
}

export function setTile(map: MapCtx, x: number, y: number, t: number) {
  if (map.kind === "world") map.tiles[((y & 255) << 8) | (x & 255)] = t;
  else if (x >= 0 && y >= 0 && x < 32 && y < 32) map.tiles[y * 32 + x] = t;
}
