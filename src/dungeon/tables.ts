// Dungeon tables read from the unpacked AVATAR.EXE data segment (DS:x = image offset 0xF0D0 + x).
// Arrays indexed by dungeon are in location order: Deceit, Despise, Destard, Wrong, Covetous, Shame,
// Hythloth, Abyss (location ids 17..24).

export const FIRST_DUNGEON = 17;
export const ABYSS = 24;

/** Combat arena by cell type (high nibble): DS:256E -> file names DS:258E (FUN_1000_7d50). */
export const DUNGEON_ARENAS = [
  "DNG0.CON", "DNG1.CON", "DNG2.CON", "DNG3.CON", "DNG4.CON", "DNG0.CON", "DNG0.CON", "DNG0.CON",
  "DNG0.CON", "DNG0.CON", "DNG0.CON", "DNG0.CON", "DNG5.CON", "DNG0.CON", "DNG6.CON", "DNG0.CON",
];

/** Magic orbs (FUN_1000_b795): damage x100 (DS:2E4C), STR/DEX/INT +5 flags (DS:2E5C/2E6C/2E7C). */
export const ORB_DAMAGE = [2, 2, 2, 4, 4, 4, 6, 6];
export const ORB_STR = [0, 0, 5, 0, 5, 5, 5, 0];
export const ORB_DEX = [0, 5, 0, 5, 5, 0, 5, 0];
export const ORB_INT = [5, 0, 0, 5, 0, 5, 5, 0];
/** Stats raised by orbs are capped at 50 (FUN_1000_b770). */
export const ORB_STAT_CAP = 50;

/** Stone found on each dungeon's altar cell (DS:0862); Hythloth and the Abyss have none (FUN_1000_b93f). */
export const STONE_NAMES = ["Blue", "Yellow", "Red", "Green", "Orange", "Purple", "White", "Black"];

/** Altar rooms (room 15 outside the Abyss): virtue by party x when entering (FUN_1000_7ffd). */
export const ALTAR_NAMES = ["Truth", "Love", "Courage"];
/** Dungeon reached when leaving altar room `a` heading N/E/S/W: DS:261A[a*4 + ((dir-1)&3)] (FUN_1000_837a). */
export const ALTAR_EXITS = [17, 22, 23, 20, 18, 20, 23, 21, 19, 21, 23, 22];

/** Item bits needed to enter the Abyss (FUN_1000_3fb9): candle, book, bell and their "used" flags. */
export const ABYSS_ITEMS = (1 << 2) | (1 << 3) | (1 << 4) | (1 << 10) | (1 << 11) | (1 << 12);

/** Peer at a gem in a dungeon: CHARSET glyph per cell type (DS:2FF2, FUN_1000_c23b). */
export const PEER_GLYPHS = [0x20, 0x06, 0x05, 0x04, 0x24, 0x20, 0x20, 0x0f, 0x54, 0x46, 0x5e, 0x00, 0x0e, 0x0e, 0x02, 0x03];

/** Monster table index (FUN_1000_7c25). */
export function monsterIndex(t: number): number {
  if (t < 0x80) return (t & 0x1f) + 0x24;
  const i = (t & 0x7f) >> 1;
  return i > 7 ? ((t & 0x7f) >> 2) + 4 : i;
}

/** "Leader" upgrade per monster index (DS:2406), used when a group is generated (FUN_1000_7e7e). */
export const MONSTER_UPGRADE = [
  0xc8, 0xc8, 0x8a, 0x88, 0x86, 0x84, 0x8c, 0x8e, 0xc4, 0xe9, 0x90, 0xe4, 0xa0, 0xd0, 0xa8, 0xac, 0xb0, 0x90,
  0xbc, 0x9c, 0xa4, 0xe0, 0xc8, 0x90, 0xf0, 0xb8, 0xec, 0xbc, 0xf0, 0xf0, 0xf4, 0xb8, 0xfc, 0xf8, 0xfc, 0xfc,
];

/** Monsters that leave no chest behind when beaten in a corridor: bat, insect swarm, slime (FUN_1000_8283). */
export const NO_CHEST_MONSTERS = [0x94, 0xb4, 0xa0];
/** Wandering monsters that never move: mimic, reaper (FUN_1000_9414). */
export const STATIC_MONSTERS = [0xac, 0xb0];
