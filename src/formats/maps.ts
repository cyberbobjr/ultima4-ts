// Map file formats (layouts verified against the GOG data files).

/** WORLD.MAP: 256x256, stored as 8x8 chunks of 32x32 tiles. Returns row-major tiles. */
export function decodeWorld(src: Uint8Array): Uint8Array {
  const out = new Uint8Array(256 * 256);
  let i = 0;
  for (let cy = 0; cy < 8; cy++)
    for (let cx = 0; cx < 8; cx++)
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) out[(cy * 32 + y) * 256 + cx * 32 + x] = src[i++];
  return out;
}

export interface NpcDef {
  index: number;
  tile: number;      // first animation tile
  tile2: number;
  x: number; y: number;
  movement: number;  // 0 fixed, 1 wander, 0x80 follow, 0xff attack
  talk: number;      // 1-based index into the .TLK file, 0 = none
}

/** *.ULT: 32x32 map then 8 arrays of 32 bytes describing the NPCs. */
export function decodeTown(src: Uint8Array): { tiles: Uint8Array; npcs: NpcDef[] } {
  const tiles = src.slice(0, 1024);
  const t = (k: number, i: number) => src[1024 + k * 32 + i];
  const npcs: NpcDef[] = [];
  for (let i = 0; i < 32; i++) {
    if (t(0, i) === 0) continue;
    npcs.push({ index: i, tile: t(0, i), x: t(1, i), y: t(2, i), tile2: t(3, i), movement: t(6, i), talk: t(7, i) });
  }
  return { tiles, npcs };
}

export interface CombatMap {
  tiles: Uint8Array; // 11x11
  monsterPos: [number, number][]; // 16
  partyPos: [number, number][];   // 8
}

/** *.CON: 16 monster x, 16 monster y, 8 party x, 8 party y, 16 unused, 11x11 map. */
export function decodeCombat(src: Uint8Array): CombatMap {
  const monsterPos: [number, number][] = [];
  const partyPos: [number, number][] = [];
  for (let i = 0; i < 16; i++) monsterPos.push([src[i], src[16 + i]]);
  for (let i = 0; i < 8; i++) partyPos.push([src[32 + i], src[40 + i]]);
  return { tiles: src.slice(64, 64 + 121), monsterPos, partyPos };
}

export interface DungeonRoom {
  triggers: { tile: number; x: number; y: number; change: [number, number][] }[];
  monsters: { tile: number; x: number; y: number }[];
  /** party start positions for entry from north, east, south, west */
  partyPos: [number, number][][];
  tiles: Uint8Array; // 11x11
}

export interface Dungeon {
  levels: Uint8Array[]; // 8 levels of 8x8
  rooms: DungeonRoom[];
}

/** *.DNG: 8 levels of 8x8, then 256-byte rooms (16, or 64 for the Abyss). */
export function decodeDungeon(src: Uint8Array): Dungeon {
  const levels: Uint8Array[] = [];
  for (let l = 0; l < 8; l++) levels.push(src.slice(l * 64, l * 64 + 64));
  const rooms: DungeonRoom[] = [];
  for (let off = 512; off + 256 <= src.length; off += 256) {
    const r = src.subarray(off, off + 256);
    const triggers = [];
    for (let k = 0; k < 4; k++) {
      const b = r.subarray(k * 4, k * 4 + 4);
      if (b[0] === 0) continue;
      triggers.push({ tile: b[0], x: b[1] >> 4, y: b[1] & 0xf, change: [[b[2] >> 4, b[2] & 0xf], [b[3] >> 4, b[3] & 0xf]] as [number, number][] });
    }
    const monsters = [];
    for (let i = 0; i < 16; i++) if (r[16 + i]) monsters.push({ tile: r[16 + i], x: r[32 + i], y: r[48 + i] });
    const partyPos: [number, number][][] = [];
    for (let d = 0; d < 4; d++) {
      const dir: [number, number][] = [];
      for (let i = 0; i < 8; i++) dir.push([r[64 + d * 16 + i], r[64 + d * 16 + 8 + i]]);
      partyPos.push(dir);
    }
    rooms.push({ triggers, monsters, partyPos, tiles: r.slice(128, 128 + 121) });
  }
  return { levels, rooms };
}
