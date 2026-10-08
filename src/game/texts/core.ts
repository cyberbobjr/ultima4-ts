// Messages of the core modules, by location in AVATAR.EXE (or port() for texts written for this port,
// in src/i18n/game/<lang>/core.json). See src/data/text.ts.
import { defineTexts, port } from "../../data/text";

export const MSG_CORE = defineTexts("msg.core", {
  // generic answers (shared by many commands)
  /** "What?\n" */
  what: 0x05f7,
  /** "Can't!\n" */
  cant: 0x05fe,
  /** "Not Here!\n" */
  notHere: 0x0606,
  /** "Disabled!\n" */
  disabled: 0x0611,
  /** "Only on foot!\n" */
  onlyOnFoot: 0x061c,
  /** "Slow progress!\n" */
  slowProgress: 0x062b,
  /** "None left!\n" */
  noneLeft: 0x063b,
  /** "Bad command!\n" */
  badCommand: 0x0683,
  /** "\nStarving!!!\n" */
  starving: 0x0698,
  /** "Pass\n" */
  pass: 0x04ca,
  /** "Dir: " */
  dir: 0x1825,

  // movement and transport (1000:2A5A)
  /** "Blocked!\n" */
  blocked: 0x0929,
  /** "Drift Only!\n" */
  driftOnly: 0x0933,
  turnNorth: 0x0940,
  sailNorth: 0x094d,
  turnSouth: 0x0961,
  sailSouth: 0x096e,
  turnWest: 0x0982,
  sailWest: 0x098e,
  turnEast: 0x09a0,
  sailEast: 0x09ac,
  /** "X-it " */
  exit: 0x17ac,
  /** "Mount Horse!\n" */
  mountHorse: 0x17ba,
  /** "Board " */
  board: 0x17c8,
  balloon: 0x17cf,
  frigate: 0x17d9,
  /** "Yell " */
  yell: 0x17e3,
  giddyup: 0x17e9,

  // places
  /** "Enter " */
  enter: 0x1765,
  enterDungeon: 0x176c,
  enterTowne: 0x1777,
  enterCastle: 0x1780,
  enterVillage: 0x178a,
  enterRuin: 0x1795,
  /** "the Shrine of\n" */
  shrineOf: 0x179d,
  /** "!\n" */
  bang: 0x2900,
  /** "Leaving...\n" */
  leaving: 0x08d2,
  /** "Open: " */
  open: 0x1807,
  /** "\nOpened!\n" */
  opened: 0x180e,
  /** "Jimmy lock!\n" */
  jimmy: 0x1818,
  noKeysLeft: 0x182b,
  /** Not in the original: the door simply turns unlocked. */
  unlocked: port(),
  /** "Klimb " */
  klimb: 0x183a,
  altitude: 0x1841,
  toSecondFloor: 0x184b,
  /** "Descend " */
  descend: 0x1886,
  toFirstFloor: 0x18aa,
  /** "Talk\n" */
  talk: 0x2d68,
  /** "Dir: " of T)alk */
  talkDir: 0x2d6e,

  // party commands
  /** "Attack: " */
  attack: 0x206e,
  /** "Nothing to Attack!\n" */
  nothingToAttack: 0x2077,
  /** "Ztats for:\x12\x12\b" */
  ztatsFor: 0x19e3,
  statMp: 0x18d6,
  statLv: 0x18da,
  statStr: 0x18de,
  statHp: 0x18e3,
  statDex: 0x18e7,
  statHm: 0x18ec,
  statInt: 0x18f0,
  statEx: 0x18f5,
  statWeapon: 0x18f9,
  statArmour: 0x18fc,
  /** "Ready a weapon\n" */
  readyWeapon: 0x235b,
  readyFor: 0x236b,
  /** "Weapon:\x12\x12\b" */
  weapon: 0x2373,
  /** "Wear Armour\n" */
  wearArmour: 0x237e,
  wearFor: 0x238b,
  /** "Armour:\x12\x12\b" */
  armour: 0x2393,
  /** "\nA " ... class ... " may NOT use " ... item */
  mayNotUseA: 0x2322,
  mayNotUse: 0x2326,
  /** "Hole up & Camp\n" */
  holeUp: 0x26c0,
  resting: 0x26e2,
  ambushed: 0x26ac,
  noEffect: 0x26ee,
  playersHealed: 0x26fa,
  /** "Get Chest!\n" */
  getChest: 0x228c,
  /** "Who opens?\x12\x12\b" */
  whoOpens: 0x2298,
  /** " Trap!\n" after the trap name */
  trap: 0x2270,
  evaded: 0x2278,
  chestHolds: 0x2240,
  /** " Gold\n" */
  gold: 0x2252,
  /** "Locate position with " */
  locate: 0x22ea,
  /** "sextant\n Latitude: " */
  latitude: 0x2300,
  /** "\"\nLongitude: " */
  longitude: 0x2314,
  /** "Quit & Save...\n" */
  quitSave: 0x21a2,
  /** " moves\n" */
  moves: 0x21b2,
  /** Not in the original (which returns to DOS): how to leave the browser game. */
  quitHint: port(),
  /** Name given to a party leader with none (dev start without the intro). */
  defaultName: port(),

  // overworld monsters and death (1000:0EB1)
  /** "\nBridge Trolls!\n" */
  bridgeTrolls: 0x2998,
  /** "\nAttacked by " */
  attackedBy: 0x1fd8,
  allIsDark: 0x04f9,
  butWait: 0x050c,
  whereAmI: 0x051a,
  amIDead: 0x052a,
  afterlife: 0x0539,
  youHear: 0x0548,
  feelMotion: 0x0553,
  lordBritishRevives: 0x0584,
});
