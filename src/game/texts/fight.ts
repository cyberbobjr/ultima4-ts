// Messages of the fight modules, by location in AVATAR.EXE (or port() for texts written for this port,
// in src/i18n/game/<lang>/fight.json). See src/data/text.ts.
// In the original strings \x12 is printed as a blank and \b moves back one column.
import { defineTexts, port } from "../../data/text";

export const MSG_FIGHT = defineTexts("msg.fight", {
  // ---- combat (1000:5A6B main loop, 61D1 attack, 5DAB monster damage, 96B9/978C monster hits, 837A end)
  /** " with " between member and weapon in the turn prompt (1000:5AE4). */
  with: 0x1fe6,
  /** "Pass\n" */
  pass: 0x04ca,
  /** "Bad command\n" (combat loop 1000:5BF1). */
  badCommand: 0x1fed,
  /** "Cast Spell!\n" */
  castSpell: 0x213a,
  /** "Fleeing!\n" (also a wound state) */
  fleeing: 0x2009,
  /** "Blocked!\n" */
  blocked: 0x0929,
  /** "Slow progress!\n" */
  slowProgress: 0x062b,
  /** "Poisoned!\n" */
  poisoned: 0x29d7,
  /** "Slept!\n" */
  slept: 0x2a05,
  /** Burned by a fire field or lava under a member (not in the original). */
  burned: port(),
  /** "Dir: " (1000:61E5) */
  dir: 0x2060,
  /** "Missed!\n" */
  missed: 0x2042,
  /** "None left!\n" */
  noneLeft: 0x063b,
  /** "Range:\x12\x12\b" (flaming oil) */
  range: 0x204b,
  /** "Last one!\n" */
  lastOne: 0x2055,
  /** "Killed!\n" after the monster name (1000:5DDB). */
  killed: 0x1ffa,
  /** "Exp. " */
  exp: 0x2003,
  /** Wound states (1000:5E5D..5E93): "Critical!\n", "Heavily "/"Lightly "/"Barely " + "Wounded!\n". */
  critical: 0x2013,
  heavily: 0x201e,
  lightly: 0x2027,
  barely: 0x2030,
  wounded: 0x2038,
  /** Sleep spell cast by a monster (not in the original). */
  sleep: port(),
  /** " Flees!\n" after the monster name (1000:9C6E). */
  flees: 0x2a35,
  /** Stolen by a monster (not in the original). */
  foodStolen: port(),
  goldStolen: port(),
  /** "\nAttacked by " (1000:5333) */
  attackedBy: 0x1fd8,
  /** " is Killed!\n" after a member's name (1000:9743). */
  isKilled: 0x29ca,
  /** "Hit!\n" */
  hit: 0x2a2f,
  /** "Failed.\n" */
  failed: 0x29e2,
  electrified: 0x29eb,
  fieryHit: 0x29f9,
  lavaHit: 0x2a16,
  magicalHit: 0x2a21,
  /** "Battle is lost!\n" */
  battleLost: 0x25e3,
  /** "\nVictory!\n" */
  victory: 0x260f,

  /** Direction names DS:064A.. (1000:1317, also the DIR_NAMES of src/game/maps.ts). */
  north: 0x064a,
  south: 0x0650,
  east: 0x0656,
  west: 0x065b,

  // ---- dungeon (1000:84D2 loop, 3E17 frame, 89DB/8A1F klimb/descend, 9209 cells, 7FFD/837A rooms,
  //      72EC/7150 chests, 7525 torch, B9B2 search, C41D peer, 3F03 entry)
  /** "DIR:" frame label (1000:3E17). */
  dirLabel: 0x167c,
  /** Facing names padded to 6 (DS:1632..): " North", " South", "  East", "  West". */
  north6: 0x1632,
  south6: 0x1639,
  east6: 0x1640,
  west6: 0x1647,
  /** Level number in the frame, "L{n}" (not a string in the original). */
  level: port(),
  /** Party wiped out underground (not in the original). */
  allLost: port(),
  /** "Zzzzz\n" (dungeon loop) */
  zzz: 0x2633,
  turnLeft: 0x2666,
  turnRight: 0x2671,
  /** "Not Here!\n" */
  notHere: 0x0606,
  /** "Bad command\n" (dungeon loop 1000:8562) */
  dngBadCommand: 0x2626,
  advance: 0x2654,
  retreat: 0x265d,
  /** "Klimb " */
  klimb: 0x267d,
  /** "What?\n" */
  what: 0x05f7,
  /** "up!\n" */
  up: 0x2684,
  /** "To level " */
  toLevel: 0x2689,
  /** "Descend " */
  descend: 0x2693,
  /** "down to level " */
  downToLevel: 0x269c,
  /** "\nWinds!\n", "\nFalling Rocks!\n", "\nPit!\n" */
  winds: 0x29a9,
  fallingRocks: 0x29b2,
  pit: 0x29c3,
  /** "It's Dark!\n" */
  dark: 0x2648,
  /** "\nThe Altar Room of " */
  altarRoom: 0x25b9,
  /** "Leave Room!\n", "into Dungeon\n" */
  leaveRoom: 0x25f4,
  intoDungeon: 0x2601,
  /** "Get Chest!\n" (1000:730D), "Who opens?\x12\x12\b" */
  getChest: 0x228c,
  whoOpens: 0x2298,
  /** "Disabled!\n" */
  disabled: 0x0611,
  /** "The Chest Holds:\n", " Gold\n" (1000:70F1) */
  chestHolds: 0x2240,
  gold: 0x2252,
  /** Trap names (1000:7150) and " Trap!\n", "Evaded!\n" */
  trapAcid: 0x2259,
  trapSleep: 0x225e,
  trapPoison: 0x2264,
  trapBomb: 0x226b,
  trap: 0x2270,
  evaded: 0x2278,
  /** "Ignite Torch!\n" */
  ignite: 0x22da,
  /** "Search...\n", "\nYou find Nothing!\n" */
  search: 0x2f52,
  findNothing: 0x2f26,
  /** Orbs (1000:B795) */
  orb: 0x2e06,
  whoTouches: 0x2e23,
  disabledNl: 0x2e33,
  strength: 0x2e3f,
  dexterity: 0x2e4d,
  intelligence: 0x2e5c,
  /** Fountains (1000:B863) */
  fountain: 0x2eae,
  whoDrinks: 0x2ec4,
  disabledNl2: 0x2ed3,
  refreshing: 0x2edf,
  nasty: 0x2ef1,
  delicious: 0x2f01,
  choke: 0x2f13,
  noEffect: 0x2df0,
  /** Altar stone (1000:B93F): "\nYou find the " + color + " stone!\n" */
  findThe: 0x2f3a,
  stone: 0x2f49,
  /** "Peer at ", "a Gem!\n" (1000:C41D) */
  peerAt: 0x3012,
  aGem: 0x301b,
  /** Dungeon entry (1000:3F03/3FB9): "Only on foot!\n", "Can't!\n" */
  onlyOnFoot: 0x061c,
  cant: 0x05fe,
});
