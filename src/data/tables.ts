/* eslint-disable */
// =============================================================================
// Ultima IV (DOS, GOG release) game-rule tables, extracted from AVATAR.EXE.
//
// Provenance:
//   AVATAR.EXE is EXEPACKed. It was unpacked (header at image 0x17720, clean
//   decompression) and the unpacked image analysed with Ghidra. All offsets
//   below refer to the UNPACKED image:
//     - code: segment 0, cited as 1000:xxxx (Ghidra base) == image offset xxxx
//     - data: DGROUP paragraph 0x0F0D => DS:0000 == image offset 0xF0D0
//       (DS was read from the MSC startup at 1000:E94A, reloc at 0xE961;
//        "C Library - (C)Copyright Microsoft Corp 1986" sits at DS:0x0008).
//     - Note: offsets in the ORIGINAL packed file differ (e.g. "Pirate" is
//       image 0x10AA6 packed vs 0x10AC3 unpacked = DS:0x19F3).
//   Values marked // UNVERIFIED were not confirmed against the binary.
//   rand8 = the game's byte RNG (1000:1771).
// =============================================================================

// ---------------------------------------------------------------------------
// Monsters, weapons, armour, combat. Source: AVATAR.EXE (GOG), EXEPACK-unpacked.
// ---------------------------------------------------------------------------

export type MonsterFlag =
  | 'sea'               // tiles 0x80-0x8F: water-only movement (1000:98E4: needs tile < 3)
  | 'nonEvil'           // 1000:0AFE: tile<0x80 or 0x8A,0x90,0x94,0x98,0xB4,0xCC
  | 'undead'            // 1000:636D: 0x9C,0xBC,0xC4,0xE4 (Undead spell target, sleep immune)
  | 'flies'             // 1000:98E4: 0x8E,0x94,0xB4,0xF0,0xF8,0xFC may also cross water tiles (<3)
  | 'passesWalls'       // 1000:98E4: 0x9C,0xEC may enter any tile except water (<3) and energy field 0x45
  | 'fireImmune'        // 1000:9F7B: Lava Lizard 0xE8 and tiles >= 0xF0 unharmed by fire/lava fields
  | 'stationary'        // 1000:9CBC / 1000:9414: Mimic 0xAC and Reaper 0xB0 never move
  | 'mimic'             // 1000:9CBC: drawn as chest tile 0x3C until the nearest member is at distance < 5
  | 'stealsFood'        // 1000:9B6B: Gremlin adjacent: food -= 2500 (25 rations), then melee
  | 'stealsGold'        // 1000:9BA6: Rogue adjacent: 1/4 chance gold -= rand8&0x3F, then melee
  | 'teleports'         // 1000:9F7B: Wisp 1/8 chance per turn to jump to a random valid square
  | 'negatesMagic'      // 1000:9F7B: Zorn each turn sets the active effect to 'N' (Negate) for 2 turns
  | 'castsSleep'        // 1000:9CBC: Reaper/Balron 1/4 chance (unless Negate): every awake member 50% -> asleep
  | 'breathesOverworld' // 1000:5712: on the world map 0x88,0xE8,>=0xF4 shoot a 0x4F bolt (50%) when |dx|,|dy| < 5
  | 'cannons'           // 1000:5712: pirate ship (0x80) fires cannons on the world map
  | 'randomMove'        // 1000:5712: Whirlpool/Twister always move randomly on the world map
  | 'noChest';          // 1000:8283: no chest is left after victory

/** Ranged attack kind (1000:9A41 returns a projectile/field tile, resolved in 1000:978C). */
export type MonsterRanged =
  | 'poison'      // 'D' 0x44 -> "Poisoned!" 50% if status Good, else "Failed."
  | 'energy'      // 'E' 0x45 -> "Electrified!" + damage
  | 'fire'        // 'F' 0x46 -> "Fiery Hit!" + damage
  | 'sleep'       // 'G' 0x47 -> "Slept!" 50% if status Good, else "Failed."
  | 'lava'        // 'L' 0x4C -> "Lava Hit!" + damage; on a miss lava is left on the target square
  | 'missile'     // 'M' 0x4D -> "Hit!" + damage
  | 'magic'       // 'N' 0x4E -> "Magical Hit!" + damage (not used while Negate is active)
  | 'fireball'    // 'O' 0x4F -> "Hit!" + damage
  | 'boulder'     // '7' 0x37 -> "Hit!" + damage
  | 'randomField';// 0x44 + (rand8&3): poison/energy/fire/sleep

export interface MonsterDef {
  index: number;          // monster index = 1000:7C25(tile)
  name: string;           // name table DS:0x1E9A
  tile: number;           // base tile (frames tile..tile+3 for >= 0x90; sea monsters use 2 tiles)
  baseHp: number;         // DS:0x23D2[index]; spawn HP = (baseHp>>1) | (rand8 % baseHp)
  xp: number;             // (baseHp >> 4) + 1, awarded to the killer (1000:5DAB)
  maxDamageRoll: number;  // baseHp >> 2; r = rand8 % maxDamageRoll; dealt = (r>>4)*10 + r%10 (1000:96B9)
  leaderTile: number;     // DS:0x2406[index]: promotion target when building a combat group (1000:7E7E)
  groupTableValue: number;// DS:0x242A[index]: looks like a max-group-size table but is effectively unused (RE_NOTES)
  ranged: MonsterRanged | null;
  flags: MonsterFlag[];
}

// Monster table. Names: DS:0x1E9A (36 near ptrs, image 0x10F6A). Base HP: DS:0x23D2 (image 0x114A2).
// Leader: DS:0x2406 (image 0x114D6). Group table: DS:0x242A (image 0x114FA).
// Tile->index (1000:7C25): tile<0x80 -> (tile&0x1F)+0x24; tile<0x90 -> (tile&0x7F)>>1; else ((tile&0x7F)>>2)+4.
// Ranged kinds: 1000:9A41. Flags: see MonsterFlag. All numeric values read from the binary.
export const MONSTERS: readonly MonsterDef[] = [
  { index: 0, name: 'Pirate', tile: 0x80, baseHp: 255, xp: 16, maxDamageRoll: 63, leaderTile: 0xc8, groupTableValue: 1, ranged: null, flags: ['sea', 'cannons', 'noChest'] },
  { index: 1, name: 'Pirate', tile: 0x82, baseHp: 255, xp: 16, maxDamageRoll: 63, leaderTile: 0xc8, groupTableValue: 1, ranged: null, flags: ['sea', 'noChest'] },
  { index: 2, name: 'Nixie', tile: 0x84, baseHp: 64, xp: 5, maxDamageRoll: 16, leaderTile: 0x8a, groupTableValue: 12, ranged: 'missile', flags: ['sea', 'noChest'] },
  { index: 3, name: 'Squid', tile: 0x86, baseHp: 96, xp: 7, maxDamageRoll: 24, leaderTile: 0x88, groupTableValue: 4, ranged: 'energy', flags: ['sea', 'noChest'] },
  { index: 4, name: 'Serpent', tile: 0x88, baseHp: 128, xp: 9, maxDamageRoll: 32, leaderTile: 0x86, groupTableValue: 4, ranged: 'fireball', flags: ['sea', 'breathesOverworld', 'noChest'] },
  { index: 5, name: 'Seahorse', tile: 0x8a, baseHp: 96, xp: 7, maxDamageRoll: 24, leaderTile: 0x84, groupTableValue: 8, ranged: 'poison', flags: ['sea', 'nonEvil', 'noChest'] },
  { index: 6, name: 'Whirlpool', tile: 0x8c, baseHp: 255, xp: 16, maxDamageRoll: 63, leaderTile: 0x8c, groupTableValue: 1, ranged: null, flags: ['sea', 'randomMove', 'noChest'] },
  { index: 7, name: 'Twister', tile: 0x8e, baseHp: 255, xp: 16, maxDamageRoll: 63, leaderTile: 0x8e, groupTableValue: 1, ranged: null, flags: ['sea', 'flies', 'randomMove', 'noChest'] },
  { index: 8, name: 'Rat', tile: 0x90, baseHp: 48, xp: 4, maxDamageRoll: 12, leaderTile: 0xc4, groupTableValue: 12, ranged: null, flags: ['nonEvil'] },
  { index: 9, name: 'Bat', tile: 0x94, baseHp: 48, xp: 4, maxDamageRoll: 12, leaderTile: 0xe9, groupTableValue: 12, ranged: null, flags: ['nonEvil', 'flies', 'noChest'] },
  { index: 10, name: 'Spider', tile: 0x98, baseHp: 64, xp: 5, maxDamageRoll: 16, leaderTile: 0x90, groupTableValue: 6, ranged: 'poison', flags: ['nonEvil'] },
  { index: 11, name: 'Ghost', tile: 0x9c, baseHp: 80, xp: 6, maxDamageRoll: 20, leaderTile: 0xe4, groupTableValue: 4, ranged: null, flags: ['undead', 'passesWalls'] },
  { index: 12, name: 'Slime', tile: 0xa0, baseHp: 48, xp: 4, maxDamageRoll: 12, leaderTile: 0xa0, groupTableValue: 15, ranged: null, flags: ['noChest'] },
  { index: 13, name: 'Troll', tile: 0xa4, baseHp: 96, xp: 7, maxDamageRoll: 24, leaderTile: 0xd0, groupTableValue: 6, ranged: 'missile', flags: [] },
  { index: 14, name: 'Gremlin', tile: 0xa8, baseHp: 48, xp: 4, maxDamageRoll: 12, leaderTile: 0xa8, groupTableValue: 15, ranged: null, flags: ['stealsFood'] },
  { index: 15, name: 'Mimic', tile: 0xac, baseHp: 192, xp: 13, maxDamageRoll: 48, leaderTile: 0xac, groupTableValue: 1, ranged: 'poison', flags: ['stationary', 'mimic'] },
  { index: 16, name: 'Reaper', tile: 0xb0, baseHp: 255, xp: 16, maxDamageRoll: 63, leaderTile: 0xb0, groupTableValue: 1, ranged: 'randomField', flags: ['stationary', 'castsSleep'] },
  { index: 17, name: 'Insects', tile: 0xb4, baseHp: 48, xp: 4, maxDamageRoll: 12, leaderTile: 0x90, groupTableValue: 15, ranged: null, flags: ['nonEvil', 'flies', 'noChest'] },
  { index: 18, name: 'Gazer', tile: 0xb8, baseHp: 240, xp: 16, maxDamageRoll: 60, leaderTile: 0xbc, groupTableValue: 4, ranged: 'sleep', flags: ['noChest'] },
  { index: 19, name: 'Phantom', tile: 0xbc, baseHp: 128, xp: 9, maxDamageRoll: 32, leaderTile: 0x9c, groupTableValue: 8, ranged: null, flags: ['undead'] },
  { index: 20, name: 'Orc', tile: 0xc0, baseHp: 80, xp: 6, maxDamageRoll: 20, leaderTile: 0xa4, groupTableValue: 10, ranged: null, flags: [] },
  { index: 21, name: 'Skeleton', tile: 0xc4, baseHp: 48, xp: 4, maxDamageRoll: 12, leaderTile: 0xe0, groupTableValue: 12, ranged: null, flags: ['undead'] },
  { index: 22, name: 'Rogue', tile: 0xc8, baseHp: 80, xp: 6, maxDamageRoll: 20, leaderTile: 0xc8, groupTableValue: 10, ranged: null, flags: ['stealsGold'] },
  { index: 23, name: 'Python', tile: 0xcc, baseHp: 48, xp: 4, maxDamageRoll: 12, leaderTile: 0x90, groupTableValue: 12, ranged: 'poison', flags: ['nonEvil'] },
  { index: 24, name: 'Ettin', tile: 0xd0, baseHp: 112, xp: 8, maxDamageRoll: 28, leaderTile: 0xf0, groupTableValue: 6, ranged: 'boulder', flags: [] },
  { index: 25, name: 'Headless', tile: 0xd4, baseHp: 64, xp: 5, maxDamageRoll: 16, leaderTile: 0xb8, groupTableValue: 8, ranged: null, flags: [] },
  { index: 26, name: 'Cyclops', tile: 0xd8, baseHp: 128, xp: 9, maxDamageRoll: 32, leaderTile: 0xec, groupTableValue: 6, ranged: 'boulder', flags: [] },
  { index: 27, name: 'Wisp', tile: 0xdc, baseHp: 64, xp: 5, maxDamageRoll: 16, leaderTile: 0xbc, groupTableValue: 12, ranged: null, flags: ['teleports', 'noChest'] },
  { index: 28, name: 'Mage', tile: 0xe0, baseHp: 176, xp: 12, maxDamageRoll: 44, leaderTile: 0xf0, groupTableValue: 6, ranged: 'magic', flags: [] },
  { index: 29, name: 'Liche', tile: 0xe4, baseHp: 192, xp: 13, maxDamageRoll: 48, leaderTile: 0xf0, groupTableValue: 4, ranged: 'magic', flags: ['undead'] },
  { index: 30, name: 'Lava Lizard', tile: 0xe8, baseHp: 96, xp: 7, maxDamageRoll: 24, leaderTile: 0xf4, groupTableValue: 8, ranged: 'lava', flags: ['fireImmune', 'breathesOverworld'] },
  { index: 31, name: 'Zorn', tile: 0xec, baseHp: 240, xp: 16, maxDamageRoll: 60, leaderTile: 0xb8, groupTableValue: 4, ranged: null, flags: ['passesWalls', 'negatesMagic'] },
  { index: 32, name: 'Daemon', tile: 0xf0, baseHp: 112, xp: 8, maxDamageRoll: 28, leaderTile: 0xfc, groupTableValue: 6, ranged: 'magic', flags: ['flies', 'fireImmune'] },
  { index: 33, name: 'Hydra', tile: 0xf4, baseHp: 208, xp: 14, maxDamageRoll: 52, leaderTile: 0xf8, groupTableValue: 4, ranged: 'fireball', flags: ['fireImmune', 'breathesOverworld'] },
  { index: 34, name: 'Dragon', tile: 0xf8, baseHp: 224, xp: 15, maxDamageRoll: 56, leaderTile: 0xfc, groupTableValue: 4, ranged: 'fireball', flags: ['flies', 'fireImmune', 'breathesOverworld'] },
  { index: 35, name: 'Balron', tile: 0xfc, baseHp: 255, xp: 16, maxDamageRoll: 63, leaderTile: 0xfc, groupTableValue: 1, ranged: 'randomField', flags: ['flies', 'fireImmune', 'castsSleep', 'breathesOverworld'] },
];

export interface PersonCombatDef { name: string; tile: number; hpTableOffset: number; baseHp: number; xp: number; ranged: MonsterRanged | null }

// Humans fought in towns, and party-class tiles. The code indexes the SAME base-HP table DS:0x23D2 with
// index (tile&0x1F)+0x24, so it reads past the 36 monster entries (bytes 0x23F6.., then into the leader
// table at 0x2406). These are the values the original actually uses. Tile 0x5E (Lord British) cannot be
// damaged (1000:5DAB). Ranged 'magic' for 0x20 (mage) and 0x5E (Lord British) per 1000:9A41.
export const PERSON_COMBAT: readonly PersonCombatDef[] = [
  { name: 'Mage', tile: 0x20, hpTableOffset: 0x23f6, baseHp: 112, xp: 8, ranged: 'magic' },
  { name: 'Bard', tile: 0x22, hpTableOffset: 0x23f8, baseHp: 96, xp: 7, ranged: null },
  { name: 'Fighter', tile: 0x24, hpTableOffset: 0x23fa, baseHp: 96, xp: 7, ranged: null },
  { name: 'Druid', tile: 0x26, hpTableOffset: 0x23fc, baseHp: 144, xp: 10, ranged: null },
  { name: 'Tinker', tile: 0x28, hpTableOffset: 0x23fe, baseHp: 128, xp: 9, ranged: null },
  { name: 'Paladin', tile: 0x2a, hpTableOffset: 0x2400, baseHp: 48, xp: 4, ranged: null },
  { name: 'Ranger', tile: 0x2c, hpTableOffset: 0x2402, baseHp: 32, xp: 3, ranged: null },
  { name: 'Shepherd', tile: 0x2e, hpTableOffset: 0x2404, baseHp: 128, xp: 9, ranged: null },
  { name: 'Guard', tile: 0x50, hpTableOffset: 0x2406, baseHp: 200, xp: 13, ranged: null },
  { name: 'Merchant', tile: 0x52, hpTableOffset: 0x2408, baseHp: 138, xp: 9, ranged: null },
  { name: 'Bard', tile: 0x54, hpTableOffset: 0x240a, baseHp: 134, xp: 9, ranged: null },
  { name: 'Jester', tile: 0x56, hpTableOffset: 0x240c, baseHp: 140, xp: 9, ranged: null },
  { name: 'Beggar', tile: 0x58, hpTableOffset: 0x240e, baseHp: 196, xp: 13, ranged: null },
  { name: 'Child', tile: 0x5a, hpTableOffset: 0x2410, baseHp: 144, xp: 10, ranged: null },
  { name: 'Bull', tile: 0x5c, hpTableOffset: 0x2412, baseHp: 160, xp: 11, ranged: null },
  { name: 'Lord British', tile: 0x5e, hpTableOffset: 0x2414, baseHp: 168, xp: 11, ranged: 'magic' },
];

// Class names: DS:0x1F32 (first 8 of 16 ptrs; the other 8 are Guard, Merchant, Bard, Jester, Beggar, Child,
// Bull, Lord British). Class index = party record byte +0x25; bit (0x80 >> class) in the equipment masks.
export const CLASSES: readonly string[] = ['Mage', 'Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'];

/** Where monsters come from (spawn code). */
export const MONSTER_SPAWN = {
  // 1000:5851 (world map, mode 1): once per turn, 1/16 chance; then for each free slot 0..3 pick a random
  // square of the 32x32 window with |dx| > 5 and |dy| > 5 from the party.
  overworldChancePerTurn: 1 / 16,
  overworldSlots: 4,
  // water tile (< 2): extra 1/8 chance; tile = 0x80 + (rand8&7)*2, 0x82 replaced by 0x80
  // => Pirate 2/8, Nixie/Squid/Serpent/Seahorse/Whirlpool/Twister 1/8 each.
  seaChance: 1 / 8,
  seaTiles: [0x80, 0x80, 0x84, 0x86, 0x88, 0x8a, 0x8c, 0x8e],
  // land tile 4..7 (grass, brush, forest, hills): tile = 0xC0 + 4*(rand8 & rand8 & mask)
  // mask = 3 if moves < 10000, 7 if moves < 30000, else 15 (moves = 32-bit counter DS:0x9148).
  landBaseTile: 0xc0,
  landMaskByMoves: [{ below: 10000, mask: 3 }, { below: 30000, mask: 7 }, { below: Infinity, mask: 15 }],
  // 1000:95AA (dungeon, every turn): level L (0..7) owns 2 slots; random empty square of the 8x8 level
  // not on the party's row or column; tile = 0x90 + 4*((rand8&3) + L). Mimic (0xAC) is never spawned.
  dungeonSlotsPerLevel: 2,
  // 1000:9209: world map, party on bridge tile 0x17: 1/8 chance per turn of "Bridge Trolls!" (Troll 0xA4).
  bridgeTrollChance: 1 / 8,
} as const;

export interface WeaponDef {
  index: number; name: string; abbr: string;
  damage: number;      // DS:0x2450; hit damage = rand8 % min(255, STR + damage)
  ranged: boolean;     // DS:0x2468 (0xFF = projectile weapon)
  price: number;       // DS:0x46D2 (word table used by the weapon shops)
  classMask: number;   // DS:0x2334, bit (0x80 >> classIndex)
  classes: string[];
  notes?: string;
}

// Weapons. Names DS:0x1EE2 (16 ptrs), abbreviations DS:0x1F12, damage DS:0x2450 (image 0x11520),
// ranged flag DS:0x2468 (image 0x11538), class mask DS:0x2334 (image 0x11404; read in 1000:7631 as
// [letter+0x22F3]), price DS:0x46D2 (image 0x137A2). All verified.
export const WEAPONS: readonly WeaponDef[] = [
  { index: 0, name: 'Hands', abbr: 'HND', damage: 8, ranged: false, price: 0, classMask: 0xff, classes: ['Mage', 'Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'] },
  { index: 1, name: 'Staff', abbr: 'STF', damage: 16, ranged: false, price: 20, classMask: 0xff, classes: ['Mage', 'Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'] },
  { index: 2, name: 'Dagger', abbr: 'DAG', damage: 24, ranged: false, price: 2, classMask: 0xff, classes: ['Mage', 'Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'], notes: 'thrown when no adjacent target; consumed' },
  { index: 3, name: 'Sling', abbr: 'SLN', damage: 32, ranged: true, price: 25, classMask: 0xff, classes: ['Mage', 'Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'] },
  { index: 4, name: 'Mace', abbr: 'MAC', damage: 40, ranged: false, price: 100, classMask: 0x7f, classes: ['Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'] },
  { index: 5, name: 'Axe', abbr: 'AXE', damage: 48, ranged: false, price: 225, classMask: 0x6f, classes: ['Bard', 'Fighter', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'] },
  { index: 6, name: 'Sword', abbr: 'SWD', damage: 64, ranged: false, price: 300, classMask: 0x6f, classes: ['Bard', 'Fighter', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'] },
  { index: 7, name: 'Bow', abbr: 'BOW', damage: 40, ranged: true, price: 250, classMask: 0x7e, classes: ['Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger'] },
  { index: 8, name: 'Crossbow', abbr: 'XBO', damage: 56, ranged: true, price: 600, classMask: 0x7e, classes: ['Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger'] },
  { index: 9, name: 'Flaming Oil', abbr: 'OIL', damage: 64, ranged: true, price: 5, classMask: 0xff, classes: ['Mage', 'Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'], notes: 'asks range 0-9; consumed; leaves fire field 0x46' },
  { index: 10, name: 'Halberd', abbr: 'HAL', damage: 96, ranged: false, price: 350, classMask: 0x2c, classes: ['Fighter', 'Tinker', 'Paladin'], notes: 'reaches 2 squares' },
  { index: 11, name: 'Magic Axe', abbr: '+AX', damage: 96, ranged: true, price: 1500, classMask: 0x0c, classes: ['Tinker', 'Paladin'], notes: 'returns to thrower' },
  { index: 12, name: 'Magic Sword', abbr: '+SW', damage: 128, ranged: false, price: 2500, classMask: 0x2e, classes: ['Fighter', 'Tinker', 'Paladin', 'Ranger'] },
  { index: 13, name: 'Magic Bow', abbr: '+BO', damage: 80, ranged: true, price: 2000, classMask: 0x5e, classes: ['Bard', 'Druid', 'Tinker', 'Paladin', 'Ranger'] },
  { index: 14, name: 'Magic Wand', abbr: 'WND', damage: 160, ranged: true, price: 5000, classMask: 0xd0, classes: ['Mage', 'Bard', 'Druid'], notes: 'magical projectile tile 0x4E' },
  { index: 15, name: 'Mystic Sword', abbr: '^SW', damage: 255, ranged: false, price: 7000, classMask: 0xff, classes: ['Mage', 'Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'], notes: 'not in any weapon shop item list (WEAPON_SHOPS); price table entry 7000 is never offered' },
];

export interface ArmourDef {
  index: number; name: string;
  defense: number;     // DS:0x2460; a monster melee hit lands only if rand8 > defense (1000:9BE5)
  price: number;       // DS:0x4BDC (word table; index 0 = Skin = 0)
  classMask: number;   // DS:0x2344, bit (0x80 >> classIndex), read in 1000:7732
  classes: string[];
}

// Armour. Names DS:0x1F02, defense DS:0x2460 (image 0x11530), class mask DS:0x2344 (image 0x11414),
// prices DS:0x4BDC (image 0x13CAC). Verified.
export const ARMOURS: readonly ArmourDef[] = [
  { index: 0, name: 'Skin', defense: 96, price: 0, classMask: 0xff, classes: ['Mage', 'Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'] },
  { index: 1, name: 'Cloth', defense: 128, price: 50, classMask: 0xff, classes: ['Mage', 'Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'] },
  { index: 2, name: 'Leather', defense: 144, price: 200, classMask: 0x7f, classes: ['Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'] },
  { index: 3, name: 'Chain Mail', defense: 160, price: 600, classMask: 0x2c, classes: ['Fighter', 'Tinker', 'Paladin'] },
  { index: 4, name: 'Plate Mail', defense: 176, price: 2000, classMask: 0x2c, classes: ['Fighter', 'Tinker', 'Paladin'] },
  { index: 5, name: 'Magic Chain', defense: 192, price: 4000, classMask: 0x24, classes: ['Fighter', 'Paladin'] },
  { index: 6, name: 'Magic Plate', defense: 208, price: 7000, classMask: 0x04, classes: ['Paladin'] },
  { index: 7, name: 'Mystic Robe', defense: 248, price: 9000, classMask: 0xff, classes: ['Mage', 'Bard', 'Fighter', 'Druid', 'Tinker', 'Paladin', 'Ranger', 'Shepherd'] },
];

// Combat maps, chosen by 1000:7C65; file names DS:0x2512 (13 ptrs).
export const COMBAT_MAPS: readonly string[] = [
  'GRASS.CON', 'BRIDGE.CON', 'BRICK.CON', 'DUNGEON.CON', 'HILL.CON', 'FOREST.CON', 'BRUSH.CON',
  'MARSH.CON', 'SHIPSEA.CON', 'SHIPSHOR.CON', 'SHORE.CON', 'SHIPSHIP.CON', 'SHORSHIP.CON',
];
/** 1000:7C65. "On ship" = transport tile < 0x14 or party standing on tile 0x10-0x13. */
export const COMBAT_MAP_RULES = {
  onShip: { vsPirateShip: 'SHIPSHIP.CON', enemyOnWater: 'SHIPSEA.CON', otherwise: 'SHIPSHOR.CON' },
  onLand: {
    vsPirateShip: 'SHORSHIP.CON',
    enemyOnWater: 'SHORE.CON',
    byPartyTile: {
      0x03: 'MARSH.CON', 0x05: 'BRUSH.CON', 0x06: 'FOREST.CON', 0x07: 'HILL.CON', 0x09: 'DUNGEON.CON',
      0x17: 'BRIDGE.CON', 0x19: 'BRIDGE.CON', 0x1a: 'BRIDGE.CON', 0x3e: 'BRICK.CON', 0x3f: 'BRIDGE.CON',
    } as Readonly<Record<number, string>>,
    default: 'GRASS.CON',
  },
  pirateCrewTile: 0xc8, // pirate-ship encounters are fought against Rogues (tile 200)
} as const;

// Walkable tiles for party/monsters: DS:0x0904 (zero-terminated list, tested by 1000:2999).
export const WALKABLE_TILES: readonly number[] = [0x03, 0x04, 0x05, 0x06, 0x07, 0x09, 0x0a, 0x0b, 0x0c, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x3c, 0x3e, 0x3f, 0x43, 0x44, 0x46, 0x47, 0x49, 0x4a, 0x4c, 0x8e, 0x8f];

// Slow terrain, 1000:29EF: probability that a move onto this tile is refused ("Slow progress!").
export const SLOW_TERRAIN: Readonly<Record<number, number>> = { 0x03: 1 / 8, 0x05: 1 / 4, 0x06: 1 / 4, 0x07: 1 / 2, 0x46: 1 / 2 };

export const COMBAT_RULES = {
  // 1000:6012 player attack
  playerHitsIf: 'DEX >= 40 || rand8 <= DEX + 128',
  playerDamage: 'rand8 % min(255, STR + WEAPONS[w].damage)',
  abyssOnlyMagicWeapons: true,     // location 0x18 (Abyss): weapon index must be > 10, otherwise auto-miss
  halberdReach: 2,                 // weapon 10 hits the square 2 away (1000:61D1)
  thrownDaggerConsumed: true,      // dagger (2) with no adjacent target is thrown (1000:60F1); uses one up
  oilConsumedAndAsksRange: true,   // flaming oil (9): asks Range 0-9, uses one up, leaves fire field 0x46
  magicAxeReturns: true,           // weapon 11 animates back to the thrower (1000:5F26)
  rangedWeaponRange: 11,           // projectiles fly up to 11 squares
  // 1000:9BE5 monster melee
  monsterHitsIf: '!(protectionActive && rand8&1) && rand8 > ARMOURS[a].defense',
  monsterDamage: 'r = rand8 % (baseHp>>2); dmg = (r>>4)*10 + r%10',
  monsterRangedChance: 1 / 4,      // 1000:9CBC: 1/4 chance per turn to use its ranged attack (if any)
  monsterFleeHpBelow: 24,          // monsters with HP < 24 move away from the party; leaving the map = "Flees!"
  woundText: 'hp<24 Fleeing; hp<base/4 Critical; hp<base/2 Heavily; hp<3*base/4 Lightly; else Barely Wounded', // 1000:5DAB
  groupCount: 'n = 1 + (rand8&7) for monsters; while (((n-1)>>1) >= partySize) n = 1 + rand8 % (2*partySize)', // 1000:7E7E
  leaderPromotion: 'every monster but the last placed: 1/32 -> leader(leader(tile)); else 1/8 -> leader(tile)',
  spawnHp: '(baseHp>>1) | (rand8 % baseHp)',
  fieldDamageToMonster: { poison: 'rand8 & 0x7F', fire: 'rand8 & 0x7F unless fireImmune', lava: 'rand8 & 0x7F unless fireImmune', sleep: 'not undead: asleep if rand8 <= hp' },
  fieldEffectOnPlayer: { poisonOrSwamp: 'status G -> P', fireOrLava: '16 + rand8 % 32 damage', sleep: 'status G -> S' },
  partyHazardDamage: '1000:1584: on ship hull -= 10 (sinks below 0); otherwise each member 50%: 10 + rand8 % 15',
  sleepingMonsterWakeChance: 1 / 8,
  sleepingPlayerWakeChance: 1 / 8,
  poisonDamagePerTurn: 2,
  xpCap: 9999,                     // 1000:097D
} as const;

// ---------------------------------------------------------------------------
// Spells / reagents / mixing / camping / per-turn upkeep.
// Source: AVATAR.EXE (GOG), EXEPACK-unpacked image; DGROUP (DS) = paragraph 0x0F0D
// => DS:0000 = image offset 0xF0D0 (file offset in unpacked EXE = image + header).
// Function addresses are Ghidra 1000:xxxx == image offset xxxx (code segment base 0).
// ---------------------------------------------------------------------------

export type Reagent =
  | 'Sulfur Ash' | 'Ginseng' | 'Garlic' | 'Spider Silk'
  | 'Blood Moss' | 'Black Pearl' | 'Nightshade' | 'Mandrake';

// Reagent names: pointer table DS:0x1F52 (8 near ptrs). Order == inventory order
// (counts are 8 words at DS:0x92D2) and == mixing bit order (bit 0x80 = index 0).
export const REAGENTS: readonly Reagent[] = [
  'Sulfur Ash', 'Ginseng', 'Garlic', 'Spider Silk',
  'Blood Moss', 'Black Pearl', 'Nightshade', 'Mandrake',
] as const;

/** Where a spell may be cast. 'any' = no context check in the handler. */
export type SpellContext = 'any' | 'combat' | 'outdoors' | 'dungeon' | 'notCombat';

export interface SpellDef {
  letter: string;          // key A..Z
  name: string;            // as in EXE spell-name table
  reagents: Reagent[];     // exact set required (mask must match exactly)
  reagentMask: number;     // raw byte from recipe table (0x80 = Sulfur Ash ... 0x01 = Mandrake)
  mp: number;              // MP cost
  context: SpellContext;
  handler: number;         // 1000:xxxx handler address
  needsDirection?: boolean;
  needsTarget?: 'player' | 'phase' | 'energyType';
  effect: string;
}

// Spell names: DS:0x1F62 (26 ptrs). MP cost: DS:0x208C (26 bytes, image 0x1115C).
// Recipe masks: DS:0x277E (26 bytes; code reads [spellChar + 0x273D] in 1000:8C08).
// Handler dispatch: DS:0x216E (26 near ptrs) called from cast routine 1000:6E4A.
// Context checks: 1000:6409 'Outdoors Only!' (mode==1), 1000:6428 'Combat Only!' (mode>3),
// 1000:6447 'Dungeon Only!' (mode==3). Game mode word DS:0x946A: 1=overworld, 2=town/castle,
// 3=dungeon, 4/5=combat (5 = camp/dungeon room). All verified against binary.
export const SPELLS: readonly SpellDef[] = [
  { letter: 'A', name: 'Awaken', reagentMask: 0x60, reagents: ['Ginseng', 'Garlic'], mp: 5, context: 'any', handler: 0x6558, needsTarget: 'player',
    effect: "Target player status 'S' (asleep) -> 'G'. Fails if target not asleep." },
  { letter: 'B', name: 'Blink', reagentMask: 0x18, reagents: ['Spider Silk', 'Blood Moss'], mp: 15, context: 'outdoors', handler: 0x65aa, needsDirection: true,
    effect: 'Overworld only, not on ship (party tile <0x14) nor balloon (0x18), and fails if (x & y) >= 0xC0 (SE/Abyss corner). Scans in the direction to the edge of the 32x32 loaded window, then steps back toward the party until a passable tile; teleports there. Fails if no passable tile found.' },
  { letter: 'C', name: 'Cure', reagentMask: 0x60, reagents: ['Ginseng', 'Garlic'], mp: 5, context: 'any', handler: 0x669b, needsTarget: 'player',
    effect: "Target status 'P' (poisoned) -> 'G'. Fails otherwise." },
  { letter: 'D', name: 'Dispell', reagentMask: 0xa4, reagents: ['Sulfur Ash', 'Garlic', 'Black Pearl'], mp: 20, context: 'any', handler: 0x66da, needsDirection: true,
    effect: 'Removes an energy field. Dungeon: clears field tile (0xA0-0xAF) directly ahead (no direction prompt). Combat/overworld/town: field tile 0x44-0x47 in chosen direction is replaced (overworld/town: by tile DS:0x9444; combat: by the caster\'s own underlying tile). In overworld/town only allowed when DS:0x9320==0 (meaning unclear).' },
  { letter: 'E', name: 'Energy', reagentMask: 0x94, reagents: ['Sulfur Ash', 'Spider Silk', 'Black Pearl'], mp: 10, context: 'any', handler: 0x6882, needsTarget: 'energyType',
    effect: "Prompts type F(ire)=0x46, L(ightning)=0x45, P(oison)=0x44, S(leep)=0x47. Dungeon: places field 0xA0|(type&3) on the square ahead (bug: still placed after printing Failed if occupied). Combat: placed on adjacent square in chosen direction if passable. Overworld/town: Failed." },
  { letter: 'F', name: 'Fireball', reagentMask: 0x84, reagents: ['Sulfur Ash', 'Black Pearl'], mp: 15, context: 'combat', handler: 0x69d7, needsDirection: true,
    effect: 'Projectile in direction; first monster hit takes (rand8 % 128) | 0x18 damage (24..127). No to-hit roll.' },
  { letter: 'G', name: 'Gate', reagentMask: 0x85, reagents: ['Sulfur Ash', 'Black Pearl', 'Mandrake'], mp: 40, context: 'outdoors', handler: 0x69e5, needsTarget: 'phase',
    effect: "Overworld, not on ship/balloon. 'To Phase:' 1-8 -> teleport to moongate N (coords DS:0x814+N-1 / DS:0x81C+N-1, see GATE_DESTINATIONS)." },
  { letter: 'H', name: 'Heal', reagentMask: 0x50, reagents: ['Ginseng', 'Spider Silk'], mp: 10, context: 'any', handler: 0x6a40, needsTarget: 'player',
    effect: "Target must be G/P/S (alive). HP += (rand8 % 25) + 75 (75..99), capped at max HP (1000:09B1)." },
  { letter: 'I', name: 'Iceball', reagentMask: 0x05, reagents: ['Black Pearl', 'Mandrake'], mp: 20, context: 'combat', handler: 0x6a82, needsDirection: true,
    effect: 'Projectile; damage (rand8 % 224) | 0x20 (32..255).' },
  { letter: 'J', name: 'Jinx', reagentMask: 0x07, reagents: ['Black Pearl', 'Nightshade', 'Mandrake'], mp: 30, context: 'any', handler: 0x6a90,
    effect: "Sets party effect DS:0x95A4='J' for 10 turns (DS:0x946E). While jinxed, a monster that would attack and has another monster in line instead hits that monster for rand8 & 0x3F (1000:9B03)." },
  { letter: 'K', name: 'Kill', reagentMask: 0x06, reagents: ['Black Pearl', 'Nightshade'], mp: 25, context: 'combat', handler: 0x6aa9, needsDirection: true,
    effect: 'Projectile; fixed 232 (0xE8) damage.' },
  { letter: 'L', name: 'Light', reagentMask: 0x80, reagents: ['Sulfur Ash'], mp: 5, context: 'dungeon', handler: 0x6ab7,
    effect: 'Light counter DS:0x9320 += 100 (decrements 1 per dungeon turn; same counter as torches).' },
  { letter: 'M', name: 'Magic Misl', reagentMask: 0x84, reagents: ['Sulfur Ash', 'Black Pearl'], mp: 5, context: 'combat', handler: 0x6adb, needsDirection: true,
    effect: 'Projectile; damage (rand8 % 64) | 0x10 (16..63).' },
  { letter: 'N', name: 'Negate', reagentMask: 0xa1, reagents: ['Sulfur Ash', 'Garlic', 'Mandrake'], mp: 20, context: 'any', handler: 0x6ae9,
    effect: "DS:0x95A4='N' for 10 turns: all party spells fail (checked in 1000:63B4 after MP is paid), monster magic/ranged-spell attacks of type 'N' and the Balron/Reaper sleep attack are suppressed. Zorns re-apply Negate for 2 turns when they act." },
  { letter: 'O', name: 'Open', reagentMask: 0x88, reagents: ['Sulfur Ash', 'Blood Moss'], mp: 5, context: 'any', handler: 0x6b02,
    effect: 'Opens chest under party. Outside combat: always evades trap (passes -1 as opener); a chest that is part of a town/castle map (tile 0x3C) still counts as stealing: -1 Honesty, Justice, Honor (karma words DS:0x928A/0x9290/0x9294, via 1000:0A17). In combat: same as Get Chest by caster (trap evade roll DEX+25). Fails in balloon.' },
  { letter: 'P', name: 'Protection', reagentMask: 0xe0, reagents: ['Sulfur Ash', 'Ginseng', 'Garlic'], mp: 15, context: 'any', handler: 0x6b36,
    effect: "DS:0x95A4='P' for 10 turns: each monster attack on a party member (1000:9BE5) misses outright with 50% chance; otherwise normal miss test rand8 <= ARMOUR_DEF[armour] (DS:0x2460)." },
  { letter: 'Q', name: 'Quickness', reagentMask: 0xc8, reagents: ['Sulfur Ash', 'Ginseng', 'Blood Moss'], mp: 20, context: 'any', handler: 0x6b4f,
    effect: "DS:0x95A4='Q' for 10 turns: in combat, after a party member acts, 50% chance the same member acts again (combat loop ~1000:5Axx, decomp line ~7074)." },
  { letter: 'R', name: 'Resurrect', reagentMask: 0xf9, reagents: ['Sulfur Ash', 'Ginseng', 'Garlic', 'Spider Silk', 'Blood Moss', 'Mandrake'], mp: 45, context: 'notCombat', handler: 0x6b68, needsTarget: 'player',
    effect: "Not in combat. Target status 'D' -> 'G' (HP left at 0 as stored)." },
  { letter: 'S', name: 'Sleep', reagentMask: 0x50, reagents: ['Ginseng', 'Spider Silk'], mp: 15, context: 'combat', handler: 0x6bae,
    effect: 'Each monster except undead (tiles 0x9C ghost,0xBC phantom,0xC4 skeleton,0xE4 liche) and Balron (0xFC): asleep if rand8 > current HP. Sleepers wake with 1/8 chance per round.' },
  { letter: 'T', name: 'Tremor', reagentMask: 0x89, reagents: ['Sulfur Ash', 'Blood Moss', 'Mandrake'], mp: 30, context: 'combat', handler: 0x6bf8,
    effect: 'Each monster with HP < 192: 50% -> 255 damage (killed, XP to caster); else 50% -> HP set to 23.' },
  { letter: 'U', name: 'Undead', reagentMask: 0xa0, reagents: ['Sulfur Ash', 'Garlic'], mp: 15, context: 'combat', handler: 0x6c71,
    effect: 'Each undead monster (ghost, phantom, skeleton, liche): 50% -> HP reduced to 23 if above.' },
  { letter: 'V', name: 'View', reagentMask: 0x03, reagents: ['Nightshade', 'Mandrake'], mp: 15, context: 'any', handler: 0x6cb2,
    effect: 'Same as peering at a gem (1000:C403): overview map of current town/world (location id < 0x11) or dungeon level.' },
  { letter: 'W', name: 'Winds', reagentMask: 0x88, reagents: ['Sulfur Ash', 'Blood Moss'], mp: 10, context: 'outdoors', handler: 0x6cc3, needsDirection: true,
    effect: "'From Dir:' sets wind direction DS:0x96F2 (0=West,1=North,2=East,3=South)." },
  { letter: 'X', name: 'X-it', reagentMask: 0x98, reagents: ['Sulfur Ash', 'Spider Silk', 'Blood Moss'], mp: 15, context: 'dungeon', handler: 0x6d22,
    effect: 'Dungeon level DS:0x9336 = -1 => leave dungeon to surface.' },
  { letter: 'Y', name: 'Y-up', reagentMask: 0x18, reagents: ['Spider Silk', 'Blood Moss'], mp: 10, context: 'dungeon', handler: 0x6d3d,
    effect: 'Up one level (level -1; at level 0 -> leaves dungeon); random empty square (32 tries, else Failed and level restored). Not in the Abyss (location 0x18).' },
  { letter: 'Z', name: 'Z-down', reagentMask: 0x18, reagents: ['Spider Silk', 'Blood Moss'], mp: 5, context: 'dungeon', handler: 0x6dc1,
    effect: 'Down one level (not below level 7 / index 7), random empty square (32 tries). Not in the Abyss.' },
];

// Moongate / Gate-spell destinations, phase 1..8. DS:0x0814 (x[8]) and DS:0x081C (y[8]).
// Read by Gate spell 1000:69E5 as [key + 0x7E3] / [key + 0x7EB] with key '1'..'8'.
export const GATE_DESTINATIONS: readonly { phase: number; x: number; y: number }[] = [
  { phase: 1, x: 224, y: 133 }, // Moonglow
  { phase: 2, x: 96, y: 102 },  // Britain
  { phase: 3, x: 38, y: 224 },  // Jhelom
  { phase: 4, x: 50, y: 37 },   // Yew
  { phase: 5, x: 166, y: 19 },  // Minoc
  { phase: 6, x: 104, y: 194 }, // Trinsic
  { phase: 7, x: 23, y: 126 },  // Skara Brae
  { phase: 8, x: 187, y: 167 }, // Magincia
];

// Damage-spell formulas (1000:6466; rand8 = 1000:1771 byte RNG).
export const SPELL_DAMAGE = {
  magicMissile: { min: 16, max: 63, formula: '(rand8 % 64) | 0x10' },
  fireball: { min: 24, max: 127, formula: '(rand8 % 128) | 0x18' },
  iceball: { min: 32, max: 255, formula: '(rand8 % 224) | 0x20' },
  kill: { min: 232, max: 232, formula: '0xE8' },
  jinxedMonsterHit: { min: 0, max: 63, formula: 'rand8 & 0x3F' },
  tremorKill: 255,
  tremorOrUndeadHpSetTo: 23,
} as const;

export const SPELL_RULES = {
  maxMixturesPerSpell: 99,        // 1000:8C08 clamps to 99
  timedEffectTurns: 10,           // Jinx/Negate/Protection/Quickness (DS:0x946E); only one active at a time (DS:0x95A4)
  zornNegateTurns: 2,
  lightSpellTurns: 100,
  // Cast order (1000:6E4A): choose player (non-combat; must be G or P), choose spell,
  // mixture count must be > 0 ('None left!'), mixture is decremented BEFORE the MP check,
  // so 'M.P. too low!' still consumes the mixture. MP is deducted in 1000:63B4 only after
  // context/target checks pass; Negate makes it fail after MP is paid.
  mixtureConsumedOnLowMp: true,
  // Mixing: reagents are removed as they are added; Enter with wrong set -> 'It Fizzles!'
  // (reagents lost); Esc -> reagents restored; Enter with none -> 'Nothing mixed!'.
  fizzleLosesReagents: true,
} as const;

// Max MP by class (1000:13B6). Class index order = DS:0x1F32 names
// (Mage, Bard, Fighter, Druid, Tinker, Paladin, Ranger, Shepherd). Capped at 99.
// MP regen: +1 per turn for every living (G/P/S) member, up to the class max.
export const MAX_MP_BY_CLASS: readonly { cls: string; formula: string; mult: number }[] = [
  { cls: 'Mage', formula: 'INT*2', mult: 2 },
  { cls: 'Bard', formula: 'INT', mult: 1 },
  { cls: 'Fighter', formula: '0', mult: 0 },
  { cls: 'Druid', formula: 'INT + INT/2', mult: 1.5 },
  { cls: 'Tinker', formula: 'INT/2', mult: 0.5 },
  { cls: 'Paladin', formula: 'INT', mult: 1 },
  { cls: 'Ranger', formula: 'INT', mult: 1 },
  { cls: 'Shepherd', formula: '0', mult: 0 },
];

// Per-turn upkeep (overworld/town 1000:1C53, dungeon 1000:87E2, combat round ~1000:A0xx).
export const TURN_RULES = {
  // Food is a 32-bit value at DS:0x9284 (displayed food = value/100).
  foodPerTurn: 'partySize (units of 1/100 food) per overworld/town/dungeon turn; not per combat round',
  starvingDamagePerMember: 2,     // when food underflows: set to 0, 'Starving!!!', 2 HP to each living member
  poisonDamagePerTurn: 2,         // status 'P'
  sleepWakeChancePerTurn: 1 / 8,  // status 'S' -> 'G'
  shipHullMax: 50,                // DS:0x9326; +1 with 25% chance per turn when < 50
  moveCounter: 'DS:0x9148 (32-bit) incremented every turn',
  torchDecrementPerDungeonTurn: 1, // DS:0x9320, "It's Dark!" when 0
} as const;

// Camp / Hole up (1000:8AB0). Requires on foot (party tile 0x1F) and (dungeon or overworld).
export const CAMP_RULES = {
  ambushChance: 1 / 8,            // -> 'Ambushed!' combat (1000:8A5A)
  // Only one effective rest per 100 moves: if floor(moves/100) == DS:0x932A -> 'No effect.'
  restCooldownMoves: 100,
  // Each living member: wakes, HP += (rand8 & 0x77) + 99 (capped at max), MP = 99 then capped to class max.
  healFormula: '(rand8 & 0x77) + 99',
  restoresFullMp: true,
} as const;

// Chest traps (1000:7150) - used by Get Chest and Open spell.
export const CHEST_TRAPS = {
  trappedChance: 1 / 2,
  // type = (r1 & 3) & r2: 0 Acid, 1 Sleep, 2 Poison, 3 Bomb  (strings DS:0x2259..)
  types: ['Acid', 'Sleep', 'Poison', 'Bomb'] as const,
  evadeRoll: 'rand8 % 100 <= DEX + 25 (always evaded when Open spell is cast outside combat)',
  bombDamage: 'each member 50%: (rand8 % 15) + 10 (1000:1584)',
} as const;

// ---------------------------------------------------------------------------
// Shops / vendors / Lord British / Hawkwind — extracted from AVATAR.EXE (GOG).
// The GOG AVATAR.EXE is EXEPACKed; all offsets below refer to the UNPACKED
// load image (re/AVATAR_UNP.EXE.img). DGROUP (DS) = paragraph 0x0F0D, so
// DS:xxxx  <=>  unpacked image offset 0xF0D0 + xxxx.
// Code addresses are "1000:xxxx" (Ghidra base 0x1000 => image offset xxxx).
// Town ("map") index used by all shop tables = DS:0x9338, 1-based, same order
// as the ULT filename table at DS:0x0824 (ptr[idx-1]):
//   1 LCB(Castle British) 2 Lycaeum 3 Empath Abbey 4 Serpent's Hold 5 Moonglow
//   6 Britain 7 Jhelom 8 Yew 9 Minoc 10 Trinsic 11 Skara Brae 12 Magincia
//   13 Paws 14 Buccaneer's Den 15 Vesper 16 Cove
// ---------------------------------------------------------------------------

export type TownId =
  | 'lcb' | 'lycaeum' | 'empath' | 'serpent' | 'moonglow' | 'britain' | 'jhelom' | 'yew'
  | 'minoc' | 'trinsic' | 'skara' | 'magincia' | 'paws' | 'den' | 'vesper' | 'cove';

/** Index = value of DS:0x9338 (1-based). Index 0 unused. */
export const TOWN_IDS: readonly (TownId | null)[] = [
  null, 'lcb', 'lycaeum', 'empath', 'serpent', 'moonglow', 'britain', 'jhelom', 'yew',
  'minoc', 'trinsic', 'skara', 'magincia', 'paws', 'den', 'vesper', 'cove',
];

export type ShopKind =
  | 'weapons' | 'armour' | 'food' | 'tavern' | 'reagents' | 'healer' | 'inn' | 'guild'
  | 'horses' | 'hawkwind';

// Talk dispatcher 1000:a6f3 -> 1000:a686. Talking across a counter tile
// (tile 0x60..0x7E) to an NPC with tile 'R' (0x52, merchant) looks up the
// Y coordinate of the counter tile in an 8-byte-per-town table at
// DS:0x2CCC + town*8 (one byte per shop kind, 0 = none). Handler pointer table
// DS:0x2D54: [0]weapons 1000:d085 [1]armour d4ae [2]food e088 [3]tavern dfaf
// [4]reagents caf6 [5]healer dc4d [6]inn d8dd [7]guild d61e
// [8]horses d596 (special-case: row 0x18 in town 13 Paws)
// [9]Hawkwind c922 (special-case: row 0x19 in town 1 LCB).
export const SHOP_KIND_ORDER: readonly ShopKind[] = [
  'weapons', 'armour', 'food', 'tavern', 'reagents', 'healer', 'inn', 'guild', 'horses', 'hawkwind',
];

/** DS:0x2CCC — counter-tile row (y) per town per shop kind (0 = none). Verified. */
export const SHOP_COUNTER_ROWS: Readonly<Record<TownId, Partial<Record<ShopKind, number>>>> = {
  lcb:      { healer: 26, hawkwind: 25 },
  lycaeum:  { healer: 12 },
  empath:   { healer: 15 },
  serpent:  { healer: 12 },
  moonglow: { food: 14, reagents: 26, healer: 27, inn: 2 },
  britain:  { weapons: 3, armour: 7, food: 6, tavern: 2, healer: 29, inn: 12 },
  jhelom:   { weapons: 9, armour: 5, tavern: 19, healer: 6, inn: 26 },
  yew:      { food: 24, healer: 25 },
  minoc:    { weapons: 28, inn: 3 },
  trinsic:  { weapons: 20, armour: 24, tavern: 2, inn: 3 },
  skara:    { food: 17, reagents: 4, healer: 27, inn: 13 },
  magincia: {},
  paws:     { armour: 4, food: 26, tavern: 5, reagents: 7, horses: 24 },
  den:      { weapons: 11, armour: 17, tavern: 25, reagents: 8, guild: 7 },
  vesper:   { weapons: 20, tavern: 22, inn: 21, guild: 26 },
  cove:     { healer: 26 },
};

// ---------------------------------------------------------------------------
// Weapons & armour shops
// ---------------------------------------------------------------------------

export interface EquipShopDef {
  town: TownId;
  name: string;
  keeper: string;
  /** Item indices into WEAPON / ARMOUR name tables (DS:0x1EE2 / DS:0x1F02). */
  items: readonly number[];
}

/**
 * Weapon shops — 1000:d085 (menu), 1000:cd80 (buy), 1000:cd1d (pay), 1000:cebe (sell).
 * town->shop DS:0x46F1+town (1-based shop no.), names ptrs DS:0x46A2, keepers DS:0x46AE,
 * items DS:0x46BA (4 bytes/shop), prices DS:0x46D2, sales pitch ptrs DS:0x4700+2*item.
 * Weapon indices: 0 Hands 1 Staff 2 Dagger 3 Sling 4 Mace 5 Axe 6 Sword 7 Bow 8 Crossbow
 * 9 Flaming Oil 10 Halberd 11 Magic Axe 12 Magic Sword 13 Magic Bow 14 Magic Wand 15 Mystic Sword.
 */
export const WEAPON_SHOPS: readonly EquipShopDef[] = [
  { town: 'britain', name: 'Windsor Weaponry',   keeper: 'Winston', items: [1, 2, 3, 6] },
  { town: 'jhelom',  name: "Willard's Weaponry", keeper: 'Willard', items: [5, 6, 8, 10] },
  { town: 'minoc',   name: 'The Iron Works',     keeper: 'Peter',   items: [4, 10, 11, 12] },
  { town: 'trinsic', name: 'Duelling Weapons',   keeper: 'Jumar',   items: [4, 5, 6, 7] },
  { town: 'den',     name: "Hook's Arms",        keeper: 'Hook',    items: [8, 9, 13, 14] },
  { town: 'vesper',  name: 'Village Arms',       keeper: 'Wendy',   items: [2, 3, 7, 9] },
];

/** DS:0x46D2 — weapon price (gp) per weapon index (buy price; sell = floor(price*qty/2)). */
export const WEAPON_PRICES: readonly number[] = [
  0, 20, 2, 25, 100, 225, 300, 250, 600, 5, 350, 1500, 2500, 2000, 5000, 7000,
];

/**
 * Armour shops — 1000:d4ae (menu), 1000:d1d0 (buy), 1000:d16d (pay), 1000:d2f8 (sell).
 * town->shop DS:0x4BEB+town, names DS:0x4BAE, keepers DS:0x4BB8, items DS:0x4BC4 (4/shop,
 * 0 = empty slot), prices DS:0x4BDC, pitch ptrs DS:0x4BFA+2*item.
 * Armour indices: 0 Skin 1 Cloth 2 Leather 3 Chain Mail 4 Plate Mail 5 Magic Chain
 * 6 Magic Plate 7 Mystic Robe.
 * Note: keeper table has a 6th entry "Big John" that no shop index reaches.
 */
export const ARMOUR_SHOPS: readonly EquipShopDef[] = [
  { town: 'britain', name: 'Windsor Armour',   keeper: 'Winston', items: [1, 2, 3] },
  { town: 'jhelom',  name: "Valiant's Armour", keeper: 'Valiant', items: [3, 4, 5, 6] },
  { town: 'trinsic', name: 'Duelling Armour',  keeper: 'Jean',    items: [1, 3, 5] },
  { town: 'paws',    name: 'Light Armour',     keeper: 'Pierre',  items: [1, 2] },
  { town: 'den',     name: 'Basic Armour',     keeper: 'Limpy',   items: [1, 2, 3] },
];

/** DS:0x4BDC — armour price (gp) per armour index. */
export const ARMOUR_PRICES: readonly number[] = [0, 50, 200, 600, 2000, 4000, 7000, 9000];

/** Equipment shop rules (1000:cd1d / cebe / d16d / d2f8). */
export const EQUIP_SHOP_RULES = {
  maxOwnedPerItem: 99,      // inventory count clamped to 99 on buy
  sellDivisor: 2,           // sell value = (price * qty) >> 1
  goldCap: 9999,            // gold clamped to 9999 when selling
  weaponBuyMaxIndex: 14,    // buy prompt accepts B..O (only items listed by the shop)
  weaponSellMaxIndex: 15,   // sell prompt accepts B..P
  armourBuyMaxIndex: 6,     // buy prompt accepts B..G
  armourSellMaxIndex: 7,    // sell prompt accepts B..H
} as const;

// ---------------------------------------------------------------------------
// Reagents — 1000:caf6. town->shop DS:0x416F+town, names DS:0x4180, keepers
// DS:0x4188, prices DS:0x4190 (6 bytes/shop, reagents A..F only:
// Sulfur Ash, Ginseng, Garlic, Spider Silk, Blood Moss, Black Pearl).
// Player types the amount paid. Honesty check (verified):
//   due = price*qty; if paid < due: pen = (due-paid) < 12 ? 4 : floor((due-paid)/3);
//        honesty, justice, honor -= pen
//   if paid <= gold: honesty, justice, honor += 2; gold -= paid; reagent += qty (cap 99)
// (Note: the +2 is applied even when the player underpaid.)
// ---------------------------------------------------------------------------
export interface ReagentShopDef {
  town: TownId;
  name: string;
  keeper: string;
  /** price per unit for [Sulfur Ash, Ginseng, Garlic, Spider Silk, Blood Moss, Black Pearl] */
  prices: readonly [number, number, number, number, number, number];
}
export const REAGENT_SHOPS: readonly ReagentShopDef[] = [
  { town: 'moonglow', name: 'Magical Herbs',   keeper: 'Margot',  prices: [2, 5, 6, 3, 6, 9] },
  { town: 'skara',    name: 'Herbs and Spice', keeper: 'Sasha',   prices: [2, 4, 9, 6, 4, 8] },
  { town: 'paws',     name: 'The Magics',      keeper: 'Shiela',  prices: [3, 4, 2, 9, 6, 7] },
  { town: 'den',      name: 'Magic Mentar',    keeper: 'Shannon', prices: [6, 7, 9, 9, 9, 1] },
];

// ---------------------------------------------------------------------------
// Food (rations) — 1000:e088. town->shop DS:0x636B+town, price per pack of 25
// DS:0x637C, names DS:0x6386, keepers DS:0x6390. Food is stored x100 (32-bit at
// DS:0x9284); one pack adds 2500 (=25 rations); clamp 999900 (=9999 rations).
// ---------------------------------------------------------------------------
export interface FoodShopDef { town: TownId; name: string; keeper: string; pricePer25: number; }
export const FOOD_SHOPS: readonly FoodShopDef[] = [
  { town: 'moonglow', name: 'The Sage Deli',    keeper: 'Shaman',   pricePer25: 25 },
  { town: 'britain',  name: 'Adventure Food',   keeper: 'Windrick', pricePer25: 40 },
  { town: 'yew',      name: 'The Dry Goods',    keeper: 'Donnar',   pricePer25: 35 },
  { town: 'skara',    name: 'Food for Thought', keeper: 'Mintol',   pricePer25: 20 },
  { town: 'paws',     name: 'The Market',       keeper: 'Max',      pricePer25: 30 },
];
export const FOOD_MAX_X100 = 999900;

// ---------------------------------------------------------------------------
// Taverns — 1000:dfaf (menu F/A), 1000:dd24 (food), 1000:de35 (ale + rumours).
// town->tavern DS:0x5EE7+town, names DS:0x5F04, keepers DS:0x5F10, specialty
// DS:0x5F1C, specialty price DS:0x5F28. Each plate = +1 ration (100 in x100
// units), clamp 999900.
// Ale: max 3 per visit (counter DS:0x913E). Player enters amount paid; <2 =>
// "Won't pay, eh", > gold => "not the gold". If paid >= 3 the keeper asks for a
// topic (15-char input, compared on 16 chars vs DS:0x5F34 list). "mandrake root"
// maps to "mandrake". Topic answered only if topicIndex >= tavernIndex (0-based;
// literal binary behaviour at 1000:def6, CMP/JGE — likely meant "==").
// Keeper keeps asking for more gold until the cumulative payment (incl. the ale
// payment) reaches TAVERN_RUMOURS[topic].price.
// ---------------------------------------------------------------------------
export interface TavernDef {
  town: TownId; name: string; keeper: string; specialty: string; specialtyPrice: number;
}
export const TAVERNS: readonly TavernDef[] = [
  { town: 'britain', name: 'Jolly Spirits',        keeper: 'Sam',         specialty: 'Lamb Chops',     specialtyPrice: 4 },
  { town: 'jhelom',  name: 'The Bloody Pub',       keeper: 'Celestial',   specialty: 'Dragon Tartar',  specialtyPrice: 2 },
  { town: 'trinsic', name: 'The Keg Tap',          keeper: 'Terran',      specialty: 'Brown Beans',    specialtyPrice: 3 },
  { town: 'paws',    name: 'Folley Tavern',        keeper: "Greg 'n Rob", specialty: 'Folley Filet',   specialtyPrice: 2 },
  { town: 'den',     name: 'Captain Black Tavern', keeper: "The Cap'n",   specialty: 'Dog Meat Pie',   specialtyPrice: 4 },
  { town: 'vesper',  name: "Axe 'n Ale",           keeper: 'Arron',       specialty: 'Green Granukit', specialtyPrice: 2 },
];
export const ALE_PRICE = 2;
export const ALE_MAX_PER_VISIT = 3;
/** DS:0x5F34 (topics) / DS:0x5EF8 (gold needed) / DS:0x5F42 (answer text ptrs). */
export interface RumourDef { topic: string; price: number; answer: string; }
export const TAVERN_RUMOURS: readonly RumourDef[] = [
  { topic: 'black stone', price: 20, answer: "Ah, the Black Stone.  Yes I've heard of it. But, the only one who knows where it lies is the wizard Merlin." },
  { topic: 'sextant',     price: 30, answer: 'For navigation a Sextant is vital...  Ask for item "D" in the Guild shops!' },
  { topic: 'white stone', price: 10, answer: 'Hmmm, Now let me see... Yes, it was the old Hermit... Sloven!  He is tough to find, lives near Lock Lake I hear.' },
  { topic: 'mandrake',    price: 40, answer: 'The last person I knew that had any Mandrake was an old alchemist named Calumny.' },
  { topic: 'skull',       price: 99, answer: 'If thou must know of that evilest of all things... find the beggar Jude.  He is very very poor!' },
  { topic: 'nightshade',  price: 25, answer: 'Of Nightshade I know but this... Seek out Virgil or thou shalt miss! Try in Trinsic!' },
];
export const TAVERN_RUMOUR_ALIASES: Readonly<Record<string, string>> = { 'mandrake root': 'mandrake' };

// ---------------------------------------------------------------------------
// Inns — 1000:d8dd (dialog), 1000:d7d6 (sleep), 1000:d7a8 (night ambush).
// town->inn DS:0x5483+town, names DS:0x54AC, keepers DS:0x54BA, pitch DS:0x54C8,
// room x DS:0x5494, room y DS:0x549C, price DS:0x54A4 (bytes).
// Minoc (inn #4) offers 1/2/3-bed rooms: x DS:0x5672, y DS:0x5676, price DS:0x567A.
// Must be on foot (transport tile 0x1F) else "Get that horse out of here!!!".
// Sleep: all living (G/P/S) members -> asleep; then each: status = Good (cures
// poison), HP += 100 + 2*(rand8 % 50), clamp to max. Party placed at room x,y.
// After: if member 0 alive and (rand & 7)==0 -> "In the middle of the night,
// while out for a stroll..." combat vs tile 0xC8 (rogue).
// Else if inn #6 (Skara Brae) and (rand & 3)==0 -> ghost (tile 0x9C) placed
// next to the party. 1/4 chance (rand&3==0) of the "only rats!" remark.
// ---------------------------------------------------------------------------
export interface InnRoom { beds: number; x: number; y: number; price: number; }
export interface InnDef { town: TownId; name: string; keeper: string; rooms: readonly InnRoom[]; }
export const INNS: readonly InnDef[] = [
  { town: 'moonglow', name: 'The Honest Inn',         keeper: 'Scatu',  rooms: [{ beds: 2, x: 28, y: 6,  price: 20 }] },
  { town: 'britain',  name: 'Britannia Manor',        keeper: 'Jason',  rooms: [{ beds: 1, x: 29, y: 6,  price: 15 }] },
  { town: 'jhelom',   name: 'The Inn of Ends',        keeper: 'Smirk',  rooms: [{ beds: 1, x: 10, y: 26, price: 10 }] },
  { town: 'minoc',    name: "Wayfarer's Inn",         keeper: 'Estro',  rooms: [
    { beds: 1, x: 2, y: 6, price: 30 }, { beds: 2, x: 2, y: 2, price: 60 }, { beds: 3, x: 8, y: 2, price: 90 },
  ] },
  { town: 'trinsic',  name: 'Honorable Inn',          keeper: 'Zajac',  rooms: [{ beds: 1, x: 29, y: 2,  price: 15 }] },
  { town: 'skara',    name: 'The Inn of the Spirits', keeper: 'Tyrone', rooms: [{ beds: 1, x: 28, y: 11, price: 5 }] }, // haunted (ghost event); text says "1 bed"
  { town: 'vesper',   name: 'The Sleep Shop',         keeper: 'Tymus',  rooms: [{ beds: 1, x: 25, y: 23, price: 1 }] },
];
/** HP += base + randMul * (rand8 % randMod) */
export const INN_HEAL = { base: 100, randMod: 50, randMul: 2 } as const;

// ---------------------------------------------------------------------------
// Healers — 1000:dc4d (menu), daa2 cure, db29 heal, db93 resurrect, dbf5 blood.
// town->healer DS:0x5787+town, names DS:0x5798, keepers DS:0x57AC.
//   Cure (status 'P' -> 'G'): 100gp; if gold < 100 the cure is FREE
//        ("I will cure thee for free, but give unto others whenever thou may!").
//   Heal (HP -> maxHP, only if HP != max): 200gp (refused if gold < 200).
//   Resurrect (status 'D' -> 'G', HP unchanged): 300gp.
//   On leaving: if member 0 (Avatar) HP >= 400: "give 100pts of thy blood?"
//     Y: sacrifice += 5, avatar HP -= 100.   N: sacrifice -= 5.
// ---------------------------------------------------------------------------
export interface HealerDef { town: TownId; name: string; keeper: string; }
export const HEALERS: readonly HealerDef[] = [
  { town: 'lcb',      name: 'The Royal Healer', keeper: 'Pendragon' },
  { town: 'lycaeum',  name: 'The Truth Healer', keeper: 'Starfire' },
  { town: 'empath',   name: 'The Love Healer',  keeper: "Salle'" },
  { town: 'serpent',  name: 'Courage Healer',   keeper: 'Windwalker' },
  { town: 'moonglow', name: 'The Healer',       keeper: 'Harmony' },
  { town: 'britain',  name: 'Wound Healing',    keeper: 'Celest' },
  { town: 'jhelom',   name: 'Heal and Health',  keeper: 'Triplet' },
  { town: 'yew',      name: 'Just Healing',     keeper: 'Justin' },
  { town: 'skara',    name: 'The Mystic Heal',  keeper: 'Spiran' },
  { town: 'cove',     name: 'The Healer Shop',  keeper: 'Quat' },
];
export const HEALER_PRICES = { cure: 100, heal: 200, resurrect: 300 } as const;
export const BLOOD_DONATION = { minAvatarHp: 400, hpCost: 100, sacrificeYes: 5, sacrificeNo: -5 } as const;

// ---------------------------------------------------------------------------
// Guild — 1000:d61e. town->guild DS:0x5195+town, prices DS:0x51A6,
// quantities DS:0x51AE, names DS:0x51B6, keepers DS:0x51BA. Counts clamp 99.
// ---------------------------------------------------------------------------
export interface GuildShopDef { town: TownId; name: string; keeper: string; }
export const GUILD_SHOPS: readonly GuildShopDef[] = [
  { town: 'den',    name: "Pirate's Guild", keeper: 'One Eyed Willey' },
  { town: 'vesper', name: 'The Guild Shop', keeper: 'Long John Leary' },
];
export interface GuildItemDef {
  key: 'A' | 'B' | 'C' | 'D';
  item: 'torches' | 'gems' | 'keys' | 'sextants';
  qty: number;
  price: number;
}
export const GUILD_ITEMS: readonly GuildItemDef[] = [
  { key: 'A', item: 'torches',  qty: 5, price: 50 },
  { key: 'B', item: 'gems',     qty: 5, price: 60 },
  { key: 'C', item: 'keys',     qty: 6, price: 60 },
  { key: 'D', item: 'sextants', qty: 1, price: 900 },
];

// ---------------------------------------------------------------------------
// Horses — 1000:d596, Paws only (counter row 0x18). Price = 100 * partySize;
// on purchase the party transport (DS:0x931E) becomes tile 0x14 (horse).
// ---------------------------------------------------------------------------
export const HORSE_TOWN: TownId = 'paws';
export const HORSE_PRICE_PER_MEMBER = 100;
export const HORSE_TILE = 0x14;

// ---------------------------------------------------------------------------
// Karma helpers used by shops (1000:09f8 inc, 1000:0a17 dec). Karma array at
// DS:0x928A (honesty, compassion, valor, justice, sacrifice, honor, spirituality,
// humility), uint16 each.
//   inc(v, n): if karma[v]==0 (already partial Avatar) nothing; else min(99, karma+n)
//   dec(v, n): if karma[v]==0 -> karma=99 and print "Thou hast lost an Eighth!";
//              karma -= n; if underflow or result==0 -> 1
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Lord British — 1000:e59b (talk), e4c3 (level check), e498 (stat gain),
// e442 ("health"), e408 (heal party), e21e ("help"), e37e (keyword match, 4 chars
// vs DS:0x6FF0), answers DS:0x7022.
// First visit (flag DS:0x9328==0): long welcome, no level check.
// Later visits: if Avatar dead -> resurrect ("Thou shalt live again!") + heal all
// non-dead members; then level check for every member:
//   target = 100; for (t = 100; t <= xp; t *= 2) target += 100;   (t is uint16)
//   if (maxHp < target) { maxHp = hp = target; status = 'G';
//      str/dex/int each += 1 + (rand & 7), clamped to 50;
//      print "<name> Thou art now Level <target/100>" }
// => level n requires xp >= 100 * 2^(n-2); level 8 (800 HP) at 6400 xp.
// "health": "Art thou well?" N -> all non-dead members status 'G', HP = max.
// ---------------------------------------------------------------------------
/** XP required for level (index+1). Level 1 = 0 xp. Max level 8 (maxHp 800). */
export const LEVEL_XP_THRESHOLDS: readonly number[] = [0, 100, 200, 400, 800, 1600, 3200, 6400];
export const LEVEL_HP_PER_LEVEL = 100;
export const LEVEL_UP_STAT_GAIN = { min: 1, max: 8, cap: 50 } as const;

/** DS:0x6FF0, matched on first 4 chars. */
export const LORD_BRITISH_KEYWORDS: readonly string[] = [
  'bye', 'help', 'health', 'name', 'look', 'job', 'truth', 'love', 'courage', 'honesty',
  'compassion', 'valor', 'justice', 'sacrifice', 'honor', 'spirituality', 'humility', 'pride',
  'avatar', 'quest', 'britannia', 'ankh', 'abyss', 'mondain', 'minax', 'exodus', 'virtue',
];

/**
 * "help" advice (1000:e21e), first matching rule wins. Strings DS:0x7062..0x77FD.
 * moves = 32-bit move counter at DS:0x9148; runes byte DS:0x931B; stones DS:0x931A;
 * items bitfield DS:0x9316.
 */
export const LORD_BRITISH_HELP_RULES: readonly { when: string; text: string }[] = [
  { when: 'moves < 1000', text: 'To survive in this hostile land thou must first know thyself! ...' },
  { when: 'partySize == 1', text: 'Travel not the open lands alone. ... Build thy party unto eight travellers ...' },
  { when: 'runes == 0', text: 'Learn ye the paths of virtue. Seek to gain entry unto the eight shrines! ...' },
  { when: '(AND of all 8 karma) != 0  (i.e. no virtue elevated)', text: 'Visit the Seer Hawkwind often ... seek the Elevation ...' },
  { when: 'stones == 0', text: 'Go ye now into the depths of the dungeons. Therein recover the 8 colored stones ...' },
  { when: 'not all 8 karma == 0', text: 'Thou art doing very well indeed on the path to Avatarhood! ...' },
  { when: 'missing bell/book/candle (items bits 2,3,4)', text: 'Find ye the Bell, Book and Candle! ...' },
  { when: 'missing a key part (items bits 5,6,7)', text: 'Before thou dost enter the Abyss thou shalt need the Key of Three Parts, and the Word of Passage. ...' },
  { when: 'otherwise', text: 'Thou dost now seem ready to make the final journey into the dark Abyss! ...' },
];

// ---------------------------------------------------------------------------
// Hawkwind — 1000:c922 (LCB, counter row 0x19). Needs Avatar alive (status G/P).
// Input: virtue name (4-char match vs DS:0x1FC6); "none"/"bye"/empty ends.
//   karma == 0  -> "Thou hast become a partial Avatar in that attribute..."
//   karma < 20 -> level 0; < 40 -> 1; < 60 -> 2; < 99 -> 3; == 99 -> 4
//   level 4 adds "Go to the Shrine and meditate for three Cycles!"
// Message ptrs DS:0x3F0C + level*16 + virtue*2.
// On leaving: if floor(moves/100) != DS:0x932E -> spirituality += 3, store.
// ---------------------------------------------------------------------------
/** level = number of thresholds <= karma (karma 1..99); karma 0 = elevated. */
export const HAWKWIND_THRESHOLDS: readonly number[] = [20, 40, 60, 99];
export const HAWKWIND_SPIRITUALITY_BONUS = 3; // once per 100 moves

// Ultima IV (DOS, GOG) world / virtue tables, extracted from AVATAR.EXE (EXEPACK-unpacked).
// Offsets: 'DS:xxxx' = data segment offset (DGROUP para 0x0F0D, image offset 0xF0D0 + xxxx in the unpacked image);
// '1000:xxxx' = code address in the unpacked image as loaded by Ghidra at segment 0x1000.

export type Virtue = 'Honesty' | 'Compassion' | 'Valor' | 'Justice' | 'Sacrifice' | 'Honor' | 'Spirituality' | 'Humility';

// DS:1FC6 virtue name pointer table (8). Karma words live at DS:928A + 2*index (save-game party block).
export const VIRTUES: readonly Virtue[] = ["Honesty", "Compassion", "Valor", "Justice", "Sacrifice", "Honor", "Spirituality", "Humility"];

// DS:2BA8 + 2*locationId (locationId 5..12): adjective used by the companion-join refusal (1000:A2BD).
export const VIRTUE_ADJECTIVES: readonly string[] = ["honest", "compassionate", "valiant", "just", "sacrificial", "honorable", "spiritual", "humble"];

// DS:8322 mantra pointer table, compared case-insensitively (1000:EC39, 16 chars) in 1000:E72C.
export const MANTRAS: readonly string[] = ["ahm", "mu", "ra", "beh", "cah", "summ", "om", "lum"];

export type LocationKind = 'castle' | 'towne' | 'village' | 'ruin' | 'dungeon' | 'abyss' | 'shrine';

export interface LocationDef {
  /** value stored in the 'current location' word DS:9338 (1-based; 0 = overworld) */
  id: number;
  name: string;
  kind: LocationKind;
  /** overworld coordinates (x = DS:9318, y = DS:9319 in game state) */
  x: number;
  y: number;
  /** map file (.ULT for towns/castles, .DNG for dungeons) */
  mapFile?: string;
  /** conversation file */
  tlkFile?: string;
  /** virtue index (shrines; and the 8 virtue towns 5..12 = id-5) */
  virtue?: number;
  note?: string;
}

// Coordinates: DS:0844 (x[32]) and DS:0864 (y[32]), searched in Enter handler 1000:4018 (index i -> id i+1).
// Names: DS:1F94 + 2*id. ULT files: DS:0822 + 2*id (ids 1..16). TLK files: DS:1736 + 2*id. DNG files: DS:0872 + 2*id (ids 17..24).
// Kind is decided at runtime by the tile under the party (1000:4018): 0x0A towne, 0x0B/0x0E castle, 0x0C village,
// 0x1D ruin, 0x1E shrine, 0x09 dungeon, 0x46 (or tile 0x4C at 233,233) Abyss. 'kind' below verified against WORLD.MAP tiles at each coordinate (Abyss tile = 0x46; Spirituality (231,216) tile 0x1E).
export const LOCATIONS: readonly LocationDef[] = [
  { id: 1, name: "Britannia", kind: "castle", x: 86, y: 107, mapFile: "LCB_1.ULT", tlkFile: "LCB.TLK", note: "Lord British castle; LCB_2.ULT is the upper floor (Klimb, 1000:4477)" },
  { id: 2, name: "The Lycaeum", kind: "castle", x: 218, y: 107, mapFile: "LYCAEUM.ULT", tlkFile: "LYCAEUM.TLK" },
  { id: 3, name: "Empath Abbey", kind: "castle", x: 28, y: 50, mapFile: "EMPATH.ULT", tlkFile: "EMPATH.TLK" },
  { id: 4, name: "Serpents Hold", kind: "castle", x: 146, y: 241, mapFile: "SERPENT.ULT", tlkFile: "SERPENT.TLK" },
  { id: 5, name: "Moonglow", kind: "towne", x: 232, y: 135, mapFile: "MOONGLOW.ULT", tlkFile: "MOONGLOW.TLK", virtue: 0 },
  { id: 6, name: "Britain", kind: "towne", x: 82, y: 106, mapFile: "BRITAIN.ULT", tlkFile: "BRITAIN.TLK", virtue: 1 },
  { id: 7, name: "Jhelom", kind: "towne", x: 36, y: 222, mapFile: "JHELOM.ULT", tlkFile: "JHELOM.TLK", virtue: 2 },
  { id: 8, name: "Yew", kind: "towne", x: 58, y: 43, mapFile: "YEW.ULT", tlkFile: "YEW.TLK", virtue: 3 },
  { id: 9, name: "Minoc", kind: "towne", x: 159, y: 20, mapFile: "MINOC.ULT", tlkFile: "MINOC.TLK", virtue: 4 },
  { id: 10, name: "Trinsic", kind: "towne", x: 106, y: 184, mapFile: "TRINSIC.ULT", tlkFile: "TRINSIC.TLK", virtue: 5 },
  { id: 11, name: "Skara Brae", kind: "towne", x: 22, y: 128, mapFile: "SKARA.ULT", tlkFile: "SKARA.TLK", virtue: 6 },
  { id: 12, name: "Magincia", kind: "ruin", x: 187, y: 169, mapFile: "MAGINCIA.ULT", tlkFile: "MAGINCIA.TLK", virtue: 7 },
  { id: 13, name: "Paws", kind: "village", x: 98, y: 145, mapFile: "PAWS.ULT", tlkFile: "PAWS.TLK" },
  { id: 14, name: "Buccaneers Den", kind: "village", x: 136, y: 158, mapFile: "DEN.ULT", tlkFile: "DEN.TLK" },
  { id: 15, name: "Vesper", kind: "village", x: 201, y: 59, mapFile: "VESPER.ULT", tlkFile: "VESPER.TLK" },
  { id: 16, name: "Cove", kind: "village", x: 136, y: 90, mapFile: "COVE.ULT", tlkFile: "COVE.TLK" },
  { id: 17, name: "Deceit", kind: "dungeon", x: 240, y: 73, mapFile: "Deceit.Dng" },
  { id: 18, name: "Despise", kind: "dungeon", x: 91, y: 67, mapFile: "Despise.Dng" },
  { id: 19, name: "Destard", kind: "dungeon", x: 72, y: 168, mapFile: "Destard.Dng" },
  { id: 20, name: "Wrong", kind: "dungeon", x: 126, y: 20, mapFile: "Wrong.Dng" },
  { id: 21, name: "Covetous", kind: "dungeon", x: 156, y: 27, mapFile: "Covetous.Dng" },
  { id: 22, name: "Shame", kind: "dungeon", x: 58, y: 102, mapFile: "Shame.Dng" },
  { id: 23, name: "Hythloth", kind: "dungeon", x: 239, y: 240, mapFile: "Hythloth.Dng" },
  { id: 24, name: "The Great Stygian Abyss!", kind: "abyss", x: 233, y: 233, mapFile: "Abyss.Dng" },
  { id: 25, name: "Honesty", kind: "shrine", x: 233, y: 66, virtue: 0 },
  { id: 26, name: "Compassion", kind: "shrine", x: 128, y: 92, virtue: 1 },
  { id: 27, name: "Valor", kind: "shrine", x: 36, y: 229, virtue: 2 },
  { id: 28, name: "Justice", kind: "shrine", x: 73, y: 11, virtue: 3 },
  { id: 29, name: "Sacrifice", kind: "shrine", x: 205, y: 45, virtue: 4 },
  { id: 30, name: "Honor", kind: "shrine", x: 81, y: 207, virtue: 5 },
  { id: 31, name: "Spirituality", kind: "shrine", x: 231, y: 216, virtue: 6, note: "Only reachable through moongates when both moons are in phase 4 (1000:2A91); table coords duplicate Humility" },
  { id: 32, name: "Humility", kind: "shrine", x: 231, y: 216, virtue: 7 },
];

/** Entry positions on the local map (1000:3F4A / 1000:4018 / 1000:3F03 / 1000:3EE4). */
export const MAP_ENTRY = {
  // towne/village/ruin: x=1, y=15 (west edge, middle)
  towne: { x: 1, y: 15 },
  // castle (tiles 0x0B/0x0E): x=15, y=30 (south edge, middle)
  castle: { x: 15, y: 30 },
  // dungeon (must be on foot, transport tile 0x1F): x=1, y=1, level 0, facing DS:9334=2 (east)
  dungeon: { x: 1, y: 1, level: 0, facing: 2 },
} as const;

// Exit rule (1000:2747): leaving a town/castle map off any edge restores the saved overworld x/y (DS:9332/9333 = coords
// of the entrance tile). Special case: returning to (239,240) (Hythloth) places a balloon object (tile 0x18) at (233,242).
// On entering a virtue town (ids 5..12) the town's companion NPC (slot 31) is removed if a party member already has that class (1000:3F4A).

export interface MoongateDef { phase: number; x: number; y: number; nearTown: string }

// DS:0814 (x[8]) / DS:081C (y[8]), indexed by moon phase 0..7. Gate that is OPEN = gate[trammelPhase] (1000:3A4F);
// destination when stepping on the fully-open gate tile 0x43 = gate[feluccaPhase] (1000:2A91).
// Exception: trammel==4 && felucca==4 -> Shrine of Spirituality (location id 31).
export const MOONGATES: readonly MoongateDef[] = [
  { phase: 0, x: 224, y: 133, nearTown: "Moonglow" },
  { phase: 1, x: 96, y: 102, nearTown: "Britain" },
  { phase: 2, x: 38, y: 224, nearTown: "Jhelom" },
  { phase: 3, x: 50, y: 37, nearTown: "Yew" },
  { phase: 4, x: 166, y: 19, nearTown: "Minoc" },
  { phase: 5, x: 104, y: 194, nearTown: "Trinsic" },
  { phase: 6, x: 23, y: 126, nearTown: "Skara Brae" },
  { phase: 7, x: 187, y: 167, nearTown: "Magincia" },
];

/** Moon / moongate clock (1000:3A80). Counters DS:1664 (sub-step), DS:1665 (Trammel), DS:1666 (Felucca). */
export const MOON_RULES = {
  /** one tick every (cpuSpeedCalib >> 1) screen updates (DS:1668 countdown reloaded from DS:8728 >> 1): real-time, not per move */
  subStepAdd: 0x40, // DS:1664 += 0x40 per tick; when it wraps to 0:
  trammelAdd: 2, // DS:1665 += 2
  feluccaAdd: 6, // DS:1666 += 6
  /** phase = byte >> 5 (0..7), saved to DS:9322 (trammel) / DS:9324 (felucca). Trammel cycle = 128 wraps; Felucca ~3x faster */
  phaseShift: 5,
  /** gate tile while opening: 0x40 + (sub >> 6) when (trammel & 0x1F)==0; closing: 0x40 + ((sub >> 6) ^ 3) when (trammel & 0x1F)==0x1E */
  gateTileBase: 0x40,
  gateEnterTile: 0x43,
  spiritualityPhases: { trammel: 4, felucca: 4 },
  /** phases (0,0) gate certain searches: mandrake, nightshade, skull, black stone */
  newMoonPhase: 0,
} as const;

/** Wind (1000:35C7, 1000:353D, 1000:2A5A). DS:96F2 = direction: 0 West, 1 North, 2 East, 3 South. */
export const WIND_RULES = {
  names: ['West', 'North', 'East', 'South'] as const,
  /** every cpuSpeedCalib screen ticks (DS:1654 countdown): if (rand() & 0xFC) == 0 (1/64): dir = (dir + (rand() & 2) - 1) & 3 */
  changeChanceMask: 0xfc,
  /**
   * sailing in direction d (0 W, 1 N, 2 E, 3 S) with move counter T (DS:9148):
   *   d == wind             -> moves only when (T & 3) == 0 (1 in 4 turns), else "Slow progress!"
   *   d == (wind + 2) & 3   -> moves only when (T & 3) != 0 (3 in 4 turns)
   *   otherwise             -> always moves
   * Ship tiles 0x10 W, 0x11 N, 0x12 E, 0x13 S; a direction key first turns the ship ("Turn North!") without moving.
   */
} as const;

export interface ShrineDef { virtue: number; locationId: number; x: number; y: number; mantra: string; runeBit: number; visionPic: string }

// Shrine logic 1000:E72C. Rune bitmask DS:931B (bit = virtue). Vision picture names DS:8362 (+'.pic'/'.ega', shown on elevation, 1000:E6DF).
export const SHRINES: readonly ShrineDef[] = [
  { virtue: 0, locationId: 25, x: 233, y: 66, mantra: "ahm", runeBit: 1, visionPic: "rune_1" },
  { virtue: 1, locationId: 26, x: 128, y: 92, mantra: "mu", runeBit: 2, visionPic: "rune_2" },
  { virtue: 2, locationId: 27, x: 36, y: 229, mantra: "ra", runeBit: 4, visionPic: "rune_0" },
  { virtue: 3, locationId: 28, x: 73, y: 11, mantra: "beh", runeBit: 8, visionPic: "rune_1" },
  { virtue: 4, locationId: 29, x: 205, y: 45, mantra: "cah", runeBit: 16, visionPic: "rune_2" },
  { virtue: 5, locationId: 30, x: 81, y: 207, mantra: "summ", runeBit: 32, visionPic: "rune_1" },
  { virtue: 6, locationId: 31, x: 231, y: 216, mantra: "om", runeBit: 64, visionPic: "rune_3" },
  { virtue: 7, locationId: 32, x: 231, y: 216, mantra: "lum", runeBit: 128, visionPic: "rune_4" },
];

// DS:8330 + virtue*6 + cycles*2 (cycles 1..3): meditation vision text shown after a successful meditation.
export const SHRINE_VISIONS: readonly (readonly string[])[] = [
  [
    "Take not the gold of others found in towns and castles for yours it is not!",
    "Cheat not the merchants and peddlers for tis an evil thing to do!",
    "Second, read the Book of Truth at the entrance to the Great Stygian Abyss!"
  ],
  [
    "Kill not the non-evil beasts of the land, and do not attack the fair people!",
    "Give of thy purse to those who beg and thy deed shall not be forgotten!",
    "Third, light the Candle of Love at the entrance to the Great Stygian Abyss!"
  ],
  [
    "Victories scored over evil creatures help to build a valorous soul!",
    "To flee from battle with less than grievous wounds often shows a coward!",
    "First, ring the Bell of Courage at the entrance to the Great Stygian Abyss!"
  ],
  [
    "To take the gold of others is injustice not soon forgotten. Take only thy due!",
    "Attack not a peaceful citizen for that action deserves strict punishment!",
    "Kill not a non-evil beast for they deserve not death, even if in hunger they attack thee!"
  ],
  [
    "To give thy last gold piece unto the needy shows good measure of self-sacrifice!",
    "For thee to flee and leave thy companions is a self-serving action to be avoided!",
    "To give of thy life's blood so that others may live is a virtue of great praise!"
  ],
  [
    "Take not the gold of others for this shall bring dishonor upon thee!",
    "To strike first a non-evil being is by no means an honorable deed!",
    "Seek ye to solve the many Quests before thee, and honor shall be a reward!"
  ],
  [
    "Seek ye to know thyself.  Visit the seer often for he can see into thy inner being!",
    "Meditation leads to enlightenment Seek ye all Wisdom and Knowledge!",
    "If thou dost seek the White Stone, search ye not under the ground, but in Serpent's Spine!"
  ],
  [
    "Claim not to be that which thou art not.  Humble actions speak well of thee!",
    "Strive not to wield the Great Force of Evil for its power will overcome thee!",
    "If thou dost seek the Black Stone, search ye at the Time and Place of the Gate on the darkest of all nights!"
  ]
];

/**
 * Meditation (1000:E72C):
 *  - need rune bit for the shrine's virtue, else "Thou dost not bear the rune of entry!".
 *  - ask virtue name (must equal shrine virtue, case-insensitive) and cycles 0..3 (0 or wrong virtue -> "unable to focus").
 *  - once per 100 moves: (moves / 100) must differ from DS:932E (shared with Hawkwind), else "mind is still weary".
 *  - each cycle: 16 dots of delay, ask mantra; wrong mantra -> Spirituality -3 and abort.
 *  - after all cycles: if cycles == 3 && karma[virtue] == 99 -> karma[virtue] = 0 (partial Avatar), show rune vision pic;
 *    else Spirituality += 3 * cycles and print SHRINE_VISIONS[virtue][cycles - 1].
 */
export const MEDITATION = { cooldownMoves: 100, wrongMantraSpirituality: -3, spiritualityPerCycle: 3, elevationKarma: 99, maxCycles: 3 } as const;

export interface KarmaDelta { virtue: Virtue | 'ALL'; delta: number }
export interface KarmaEvent { event: string; func: string; changes: KarmaDelta[]; condition?: string }

/**
 * Karma storage: 8 words DS:928A.. (Honesty..Humility). Value 0 = partial Avatar (elevated).
 * inc (1000:09F8): if (k != 0) { k += n; if (k > 99) k = 99 }   -- elevated virtues never rise
 * dec (1000:0A17): if (k == 0) { k = 99; print "Thou hast lost an Eighth!" } k -= n; if (underflow || k == 0) k = 1
 * Some gains are throttled to once per 16 moves: (moves >> 4) != DS:9330.
 * All 47 call sites of inc/dec in the binary are listed below.
 */
export const KARMA_EVENTS: readonly KarmaEvent[] = [
  { event: 'Attack anyone in a town/castle, or a non-evil creature outdoors', func: '1000:628F', changes: [{ virtue: 'Compassion', delta: -5 }, { virtue: 'Justice', delta: -5 }, { virtue: 'Honor', delta: -5 }], condition: 'in town all guards (tile 0x50) and LB (0x5E) turn hostile' },
  { event: 'Open a chest that is part of a town map (tile 0x3C)', func: '1000:722F', changes: [{ virtue: 'Honesty', delta: -1 }, { virtue: 'Justice', delta: -1 }, { virtue: 'Honor', delta: -1 }], condition: 'chests dropped by monsters are free' },
  { event: 'A party member flees combat vs an evil monster while at full HP', func: '1000:7962', changes: [{ virtue: 'Valor', delta: -2 }, { virtue: 'Sacrifice', delta: -2 }], condition: 'hp == maxHp' },
  { event: 'Whole party has left combat vs evil monster', func: '1000:837A', changes: [{ virtue: 'Valor', delta: -2 }], condition: 'prints "Battle is lost!"' },
  { event: 'Whole party has left combat vs non-evil creature', func: '1000:837A', changes: [{ virtue: 'Compassion', delta: 2 }, { virtue: 'Justice', delta: 2 }] },
  { event: 'Victory over evil monsters', func: '1000:837A', changes: [{ virtue: 'Valor', delta: 1 }], condition: 'delta is rand() & 1 (0 or 1)' },
  { event: 'A non-evil monster flees from combat', func: '1000:9C56', changes: [{ virtue: 'Compassion', delta: 1 }, { virtue: 'Justice', delta: 1 }] },
  { event: 'A party member is killed by a monster attack', func: '1000:96B9', changes: [{ virtue: 'Sacrifice', delta: 1 }] },
  { event: 'Give gold to a beggar (tile 0x58)', func: '1000:A3A2', changes: [{ virtue: 'Compassion', delta: 2 }], condition: 'once per 16 moves' },
  { event: 'Answer YES to an NPC humility (pride) question', func: '1000:A163', changes: [{ virtue: 'Humility', delta: -5 }], condition: 'TLK humility-question flag (DS:95CF)' },
  { event: 'Answer NO to an NPC humility (pride) question', func: '1000:A163', changes: [{ virtue: 'Humility', delta: 10 }], condition: 'flag set and once per 16 moves' },
  { event: 'Healer: donate 100 HP of blood (yes)', func: '1000:DBF5', changes: [{ virtue: 'Sacrifice', delta: 5 }], condition: 'avatar HP -= 100' },
  { event: 'Healer: refuse to donate blood (no)', func: '1000:DBF5', changes: [{ virtue: 'Sacrifice', delta: -5 }] },
  { event: 'Reagent shop: completed purchase (gold >= amount paid)', func: '1000:CAF6', changes: [{ virtue: 'Honesty', delta: 2 }, { virtue: 'Justice', delta: 2 }, { virtue: 'Honor', delta: 2 }] },
  { event: 'Reagent shop: pay less than price*qty (blind woman)', func: '1000:CAF6', changes: [{ virtue: 'Honesty', delta: -1 }, { virtue: 'Justice', delta: -1 }, { virtue: 'Honor', delta: -1 }], condition: 'real delta = -(shortfall < 12 ? 4 : floor(shortfall / 3)); the +2 purchase bonus is still applied afterwards' },
  { event: 'Search finds a quest item (see SEARCH_SPOTS)', func: '1000:8D4B', changes: [{ virtue: 'Honor', delta: 5 }] },
  { event: 'Take a colored stone from a dungeon altar room', func: '1000:B93F', changes: [{ virtue: 'Honor', delta: 5 }], condition: 'also +200 XP to party member 0; not in Hythloth/Abyss' },
  { event: 'Consult Hawkwind on a virtue', func: '1000:C922', changes: [{ virtue: 'Spirituality', delta: 3 }], condition: 'once per 100 moves (shared with meditation, DS:932E)' },
  { event: 'Meditate at a shrine (n cycles, correct mantras)', func: '1000:E72C', changes: [{ virtue: 'Spirituality', delta: 3 }], condition: 'real delta = 3*n; not applied when elevation happens' },
  { event: 'Wrong mantra at a shrine', func: '1000:E72C', changes: [{ virtue: 'Spirituality', delta: -3 }] },
  { event: 'Use skull anywhere except the Abyss entrance (kills all monsters/people on map except LB)', func: '1000:05CE', changes: [{ virtue: 'ALL', delta: -5 }] },
  { event: 'Use skull at the Abyss entrance (233,233): skull destroyed', func: '1000:05CE', changes: [{ virtue: 'ALL', delta: 10 }] },
];

/** 'Non-evil' test (1000:0AFE): tile < 0x80 (all people) or tile in this list (seahorse, rat, bat, spider, insects, python). */
export const NON_EVIL_TILES: readonly number[] = [0x8a, 0x90, 0x94, 0x98, 0xb4, 0xcc];

/** Companion join rule (1000:A2BD): NPC is the companion of a virtue town (ids 5..12 -> class id-5) and not the Avatar's class;
 * karma[virtue] in 1..39 -> "Thou art not <adj> enough"; otherwise requires avatar maxHP >= 100 * partySize + 100
 * ("Thou art not experienced enough"). */
export const JOIN_RULES = { minKarma: 40, hpPerMember: 100, hpBase: 100 } as const;

// Hawkwind (1000:C922): text DS:3F0C + virtue*2 + tier*16. tier: karma < 20 -> 0, < 40 -> 1, < 60 -> 2, < 99 -> 3, == 99 -> 4
// (tier 4 adds "Go to the Shrine and meditate for three Cycles!"). karma == 0 -> "Thou hast become a partial Avatar...".
// Input 'none'/'bye'/empty ends the consultation; virtue matched on the first 4 chars.
export const HAWKWIND_TIERS: readonly number[] = [20, 40, 60, 99];
export const HAWKWIND_TEXT: readonly (readonly string[])[] = [
  [
    "Thou art a thief and a scoundrel. Thou may not ever become an Avatar!",
    "Thou art not an honest soul. Thou must live a more honest life to be an Avatar!",
    "Thou hast made little progress on the paths of Honesty. Strive to prove thy worth!",
    "Thou dost seem to be an honest soul.  Continued honesty will reward thee!",
    "Thou art truly an honest soul. Seek ye now to reach Elevation!"
  ],
  [
    "Thou art a cold and cruel brute.  Thou shouldst go to prison for thy crimes!",
    "Thou dost kill where there is no need and give too little unto others!",
    "Thou hast not shown thy compassion well. Be more kind unto others!",
    "Thou dost show thy compassion well.  Continued goodwill should be thy guide!",
    "Compassion is a virtue that thou hast shown well.  Seek ye now Elevation!"
  ],
  [
    "Thou art a coward, thou dost flee from the hint of danger!",
    "Thou dost not display a great deal of Valor. Thou dost flee before the need!",
    "Thou art not yet a valiant warrior.  Fight to defeat evil and prove thyself!",
    "Thou art showing Valor in the face of danger. Strive to become yet more so!",
    "Thou art a truly valiant warrior. Seek ye now Elevation in the virtue of valor!"
  ],
  [
    "Thou art an unjust wretch. Thou are a fulsome meddler!",
    "Thou art cruel and unjust. In time thou will suffer for thy crimes!",
    "Thou hast not proven thyself to be just. Strive to do justice unto all things!",
    "Thou dost seem fair and just. Strive to uphold Justice even more sternly!",
    "Thou art just and fair.  Seek ye now the Elevation!"
  ],
  [
    "Thou art a self-serving Tufthunter. Thou deservest not my help, yet I grant it!",
    "Thou dost need to think more of the life of others and less of thy own!",
    "Thy sacrifice is small. Give of thy life's blood so that others may live.",
    "Thou art giving of thyself in some ways. Seek ye now to find yet more!",
    "Thou art giving and good.  Thy self-sacrifice is great.  Seek now Elevation!"
  ],
  [
    "Thou art a cad and a bounder. Thy presence is an affront. Thou art low as a slug!",
    "Thou dost not fight with honor but with malice and deceit!",
    "Thou dost need to show thyself to be more honorable.  The path lies before thee!",
    "Thou dost seem to be Honorable in nature.  Seek to bring Honor upon others as well!",
    "Thou hast proven thyself to be Honorable. Seek ye now for the Elevation!"
  ],
  [
    "Thy spirit is weak and feeble. Thou dost not strive for Perfection!",
    "Thou dost not take time to care about thy inner being, a must to be an Avatar!",
    "Strive to know and master more of thine inner being. Meditation lights the path!",
    "Thou art doing well on the path to inner sight continue to seek the inner light!",
    "Spirituality is in thy nature. Seek ye now the Elevation!"
  ],
  [
    "Thou art proud and vain. All other virtue in thee is a loss!",
    "Thou art too proud of thy little deeds. Humility is the root of all Virtue!",
    "Thy progress on this path is most uncertain. Without Humility thou art empty!",
    "Thou dost seem a humble soul.  Thou art setting strong stones to build virtues upon!",
    "Thy Humility shines bright upon thy being. Seek ye now for Elevation!"
  ]
];

/** Quest item bit flags in the 16-bit word DS:9316 (Use 1000:01E1..05CE, Search 1000:8E16.., LB 1000:E21E, Abyss 1000:3FB9). */
export const ITEM_FLAGS = {
  skull: 1 << 0,
  skullDestroyed: 1 << 1,
  candle: 1 << 2,
  book: 1 << 3,
  bell: 1 << 4,
  keyCourage: 1 << 5, // from altar 2
  keyLove: 1 << 6, // from altar 1
  keyTruth: 1 << 7, // from altar 0
  horn: 1 << 8,
  wheel: 1 << 9,
  candleLit: 1 << 10, // requires bookRead
  bookRead: 1 << 11, // requires bellRung
  bellRung: 1 << 12,
} as const;
// Stones: DS:931A bitmask (bit = STONE_COLORS index). Runes: DS:931B (bit = virtue index).

// DS:0884 stone color names (Use compares first 12 chars).
export const STONE_COLORS: readonly string[] = ["Blue", "Yellow", "Red", "Green", "Orange", "Purple", "White", "Black"];

// Dungeon altar rooms give stone = color index (location id - 17): Deceit Blue, Despise Yellow, Destard Red, Wrong Green,
// Covetous Orange, Shame Purple (1000:B93F; name DS:0862 + 2*id). White and Black stones are found by Search outdoors.
export interface SearchSpot { locationId: number; x: number; y: number; item: string; requires?: string; xp?: number }
// DS:2920: 5-byte records {locationId, x, y, handler word} scanned by Search (1000:913A). locationId 0 = overworld.
// Every find also gives Honor +5 (1000:8D4B). XP is added to party member 0.
export const SEARCH_SPOTS: readonly SearchSpot[] = [
  { locationId: 0, x: 182, y: 54, item: "mandrake root", requires: "both moons phase 0, once per 16 moves; +2..9 units" },
  { locationId: 0, x: 100, y: 165, item: "mandrake root", requires: "both moons phase 0, once per 16 moves; +2..9 units" },
  { locationId: 0, x: 46, y: 149, item: "nightshade", requires: "both moons phase 0, once per 16 moves; +2..9 units" },
  { locationId: 0, x: 205, y: 44, item: "nightshade", requires: "both moons phase 0, once per 16 moves; +2..9 units" },
  { locationId: 0, x: 176, y: 208, item: "bell of courage", xp: 400 },
  { locationId: 0, x: 45, y: 173, item: "silver horn", xp: 400 },
  { locationId: 0, x: 96, y: 215, item: "wheel of the H.M.S. Cape", xp: 400 },
  { locationId: 0, x: 197, y: 245, item: "skull of Mondain", requires: "both moons phase 0; not after skull destroyed", xp: 400 },
  { locationId: 0, x: 224, y: 133, item: "black stone", requires: "both moons phase 0", xp: 200 },
  { locationId: 0, x: 64, y: 80, item: "white stone", xp: 200 },
  { locationId: 2, x: 6, y: 6, item: "book of truth", xp: 400 },
  { locationId: 16, x: 22, y: 1, item: "candle of love", xp: 400 },
  { locationId: 2, x: 22, y: 3, item: "telescope (view a town A-P)" },
  { locationId: 3, x: 22, y: 4, item: "mystic armour (8 robes)", requires: "all 8 virtues elevated (karma 0)", xp: 400 },
  { locationId: 4, x: 8, y: 15, item: "mystic weapons (8 swords)", requires: "all 8 virtues elevated (karma 0)", xp: 400 },
  { locationId: 5, x: 8, y: 6, item: "rune of Honesty", xp: 100 },
  { locationId: 6, x: 25, y: 1, item: "rune of Compassion", xp: 100 },
  { locationId: 7, x: 30, y: 30, item: "rune of Valor", xp: 100 },
  { locationId: 8, x: 13, y: 6, item: "rune of Justice", xp: 100 },
  { locationId: 9, x: 28, y: 30, item: "rune of Sacrifice", xp: 100 },
  { locationId: 10, x: 2, y: 29, item: "rune of Honor", xp: 100 },
  { locationId: 1, x: 17, y: 8, item: "rune of Spirituality", xp: 100 },
  { locationId: 13, x: 29, y: 29, item: "rune of Humility", xp: 100 },
];

/** Altar rooms (Use stones, 1000:01E1): the 4 named stones must equal mask DS:010E[altar]; grants a third of the Key.
 * Altar index (DS:943E): 0 Truth, 1 Love, 2 Courage. Bits = STONE_COLORS index. */
export const ALTAR_STONE_MASKS: readonly number[] = [0b01101001, 0b01011010, 0b01110100];
// DS:261A[altar*4 + exitIndex], exitIndex = (exitDir - 1) & 3 -> 0 North, 1 East, 2 South, 3 West -> dungeon location id you continue into
// (1000:837A; overworld return coords become that dungeon's coords).
export const ALTAR_EXITS: readonly (readonly number[])[] = [[17, 22, 23, 20], [18, 20, 23, 21], [19, 21, 23, 22]];

export interface AbyssAltarDef { level: number; prompt: string; answer: string; stone: string }
// Abyss altars (1000:0311): on altar tile 0xB0 of Abyss level L (location id 24): "What virtue dost stem from <DS:0284[L]>?" -> answer VIRTUES[L],
// then Use the stone of color L; correct -> altar tile becomes 0x20 (ladder down). Level 7 prompt is the full DS:0284[7] string -> Codex (1000:31F4).
export const ABYSS_ALTARS: readonly AbyssAltarDef[] = [
  { level: 0, prompt: "Truth", answer: "Honesty", stone: "Blue" },
  { level: 1, prompt: "Love", answer: "Compassion", stone: "Yellow" },
  { level: 2, prompt: "Courage", answer: "Valor", stone: "Red" },
  { level: 3, prompt: "Truth and Love", answer: "Justice", stone: "Green" },
  { level: 4, prompt: "Love and Courage", answer: "Sacrifice", stone: "Orange" },
  { level: 5, prompt: "Courage and Truth", answer: "Honor", stone: "Purple" },
  { level: 6, prompt: "Truth, Love and Courage", answer: "Spirituality", stone: "White" },
  { level: 7, prompt: "A voice rings out:  What Virtue exists independently of Truth, Love and Courage", answer: "Humility", stone: "Black" },
];

export interface CodexQuestion { question: string; answer: string; failX: number; failY: number }
// Codex chamber (1000:31F4): requires all 3 key parts (else eject 12), word of passage (3 tries, 1000:310F),
// party of exactly 8 ("not proved thy leadership"), all 8 karma == 0 ("Thou art not ready"). Then 11 questions
// (DS:0BDA), 3 tries each; answers DS:1FC6 (virtues) / DS:161A.. (truth, love, courage). Failure i -> eject to (DS:0BF0[i], DS:0BFE[i]).
// Final question answer 'infinity' (3 tries) else eject 11. Eject 12 = generic failure (Abyss entrance). Party size restored on eject.
export const CODEX_WORD_OF_PASSAGE = 'veramocor';
export const CODEX_FINAL_ANSWER = 'infinity';
export const CODEX_QUESTIONS: readonly CodexQuestion[] = [
  { question: "What dost thou possess if all may rely upon your every word?", answer: "Honesty", failX: 231, failY: 136 },
  { question: "What quality compels one to share in the journeys of others?", answer: "Compassion", failX: 83, failY: 105 },
  { question: "What answers when great deeds are called for?", answer: "Valor", failX: 35, failY: 221 },
  { question: "What should be the same for Lord and Serf alike?", answer: "Justice", failX: 59, failY: 44 },
  { question: "What is loath to place the self above aught else?", answer: "Sacrifice", failX: 158, failY: 21 },
  { question: "What shirks no duty?", answer: "Honor", failX: 105, failY: 183 },
  { question: "What, in knowing the true self, knows all?", answer: "Spirituality", failX: 23, failY: 129 },
  { question: "What is that which Serfs are born with but Nobles must strive to obtain?", answer: "Humility", failX: 186, failY: 172 },
  { question: "If all else is imaginary, this is real...", answer: "truth", failX: 216, failY: 106 },
  { question: "What plunges to the depths, while soaring on the heights?", answer: "love", failX: 29, failY: 48 },
  { question: "What turns not away from any peril?", answer: "courage", failX: 145, failY: 243 },
];
export const CODEX_EJECT_POSITIONS: readonly { x: number; y: number }[] = [{ x: 231, y: 136 }, { x: 83, y: 105 }, { x: 35, y: 221 }, { x: 59, y: 44 }, { x: 158, y: 21 }, { x: 105, y: 183 }, { x: 23, y: 129 }, { x: 186, y: 172 }, { x: 216, y: 106 }, { x: 29, y: 48 }, { x: 145, y: 243 }, { x: 89, y: 106 }, { x: 233, y: 233 }];

/** Abyss entrance sequence (Use; overworld at (233,233)): bell (1000:0487) -> book (1000:04C0, needs bellRung) -> candle (1000:0501, needs bookRead).
 * Entering the Abyss (1000:3FB9) requires bell, book, candle owned AND bellRung, bookRead, candleLit; on foot. */
export const ABYSS_ENTRANCE = { x: 233, y: 233 } as const;

/** Wheel (1000:058C): overworld, on ship (transport < 0x14) with hull == 50 -> hull = 99.
 *  Horn (1000:0553): overworld only, sets DS:95A4=1, DS:946E=10 (UNVERIFIED meaning: 10-turn monster-repel). */
export const ITEM_USE = { wheelHullFrom: 50, wheelHullTo: 99, hornTurns: 10 } as const;

