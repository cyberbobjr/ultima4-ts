// Location numbering follows the order of the map-file tables in AVATAR.EXE (strings at 0xf77f.. and 0x1073d..).
// Names and file names are read from the extracted catalog (src/data/text.ts), by DS offset.
import { defineTexts, lazyList, ptrs, withGetters, port } from "../data/text";
import { HAWKWIND } from "./town/strings";

export const enum LocKind { World, Town, Castle, Village, Dungeon, Shrine }

export interface LocationDef {
  id: number;
  name: string;
  kind: LocKind;
  x: number; y: number; // overworld entrance (verified against WORLD.MAP tiles)
  map?: string; map2?: string; talk?: string; dungeon?: string;
}

/** Location texts: names DS:1F94 + 2*id, ULT files DS:0822 + 2*id, TLK files DS:1736 + 2*id, DNG files DS:0872 + 2*id. */
export const LOCATION_TEXT = defineTexts("locations", {
  /** ids 1..32 */
  names: ptrs(0x1f96, 32),
  /** ids 1..16 */
  ult: ptrs(0x0824, 16),
  /** ids 1..16 */
  tlk: ptrs(0x1738, 16),
  /** ids 17..24 */
  dng: ptrs(0x0894, 8),
  /** upper floor of Lord British's castle (Klimb, 1000:4477) */
  lcbUpper: 0x185d,
  /** shown when entering Lord British's castle (the original prints the table name) */
  lcbName: port(),
});

const L = LOCATION_TEXT;
type Row = Omit<LocationDef, "name" | "map" | "map2" | "talk" | "dungeon">;
const town = (r: Row) => r.id >= 1 && r.id <= 16;
const dungeon = (r: Row) => r.id >= 17 && r.id <= 24;

const ROWS: Row[] = [
  { id: 0, kind: LocKind.World, x: 0, y: 0 },
  { id: 1, kind: LocKind.Castle, x: 86, y: 107 },
  { id: 2, kind: LocKind.Castle, x: 218, y: 107 },
  { id: 3, kind: LocKind.Castle, x: 28, y: 50 },
  { id: 4, kind: LocKind.Castle, x: 146, y: 241 },
  { id: 5, kind: LocKind.Town, x: 232, y: 135 },
  { id: 6, kind: LocKind.Town, x: 82, y: 106 },
  { id: 7, kind: LocKind.Town, x: 36, y: 222 },
  { id: 8, kind: LocKind.Town, x: 58, y: 43 },
  { id: 9, kind: LocKind.Town, x: 159, y: 20 },
  { id: 10, kind: LocKind.Town, x: 106, y: 184 },
  { id: 11, kind: LocKind.Town, x: 22, y: 128 },
  { id: 12, kind: LocKind.Village, x: 187, y: 169 },
  { id: 13, kind: LocKind.Village, x: 98, y: 145 },
  { id: 14, kind: LocKind.Village, x: 136, y: 158 },
  { id: 15, kind: LocKind.Village, x: 201, y: 59 },
  { id: 16, kind: LocKind.Village, x: 136, y: 90 },
  { id: 17, kind: LocKind.Dungeon, x: 240, y: 73 },
  { id: 18, kind: LocKind.Dungeon, x: 91, y: 67 },
  { id: 19, kind: LocKind.Dungeon, x: 72, y: 168 },
  { id: 20, kind: LocKind.Dungeon, x: 126, y: 20 },
  { id: 21, kind: LocKind.Dungeon, x: 156, y: 27 },
  { id: 22, kind: LocKind.Dungeon, x: 58, y: 102 },
  { id: 23, kind: LocKind.Dungeon, x: 239, y: 240 },
  { id: 24, kind: LocKind.Dungeon, x: 233, y: 233 },
];

// The world (id 0) shares the name of id 1 in the table; id 1 shows a port-written name.
const withNames = withGetters(ROWS, {
  name: (r: Row) => (r.id === 0 ? L.names[0] : r.id === 1 ? L.lcbName : L.names[r.id - 1]),
});
// Optional file fields only exist on the rows that have them (towns: map/talk, LCB: map2, dungeons: dungeon).
export const LOCATIONS: LocationDef[] = withNames.map((r) => {
  const o = r as LocationDef;
  const def = (k: keyof LocationDef, get: () => string) => Object.defineProperty(o, k, { enumerable: true, configurable: true, get });
  if (town(r)) {
    def("map", () => L.ult[r.id - 1]);
    if (r.id === 1) def("map2", () => L.lcbUpper);
    def("talk", () => L.tlk[r.id - 1]);
  }
  if (dungeon(r)) def("dungeon", () => L.dng[r.id - 17].toUpperCase());
  return o;
});

/** DS:1FC6 virtue names. */
export const VIRTUES: readonly string[] = lazyList(8, (i) => HAWKWIND.virtues[i]);

/** Shrines on the overworld (Spirituality is only reachable through a moongate). */
export const SHRINES: { virtue: number; x: number; y: number }[] = [
  { virtue: 0, x: 233, y: 66 }, { virtue: 1, x: 128, y: 92 }, { virtue: 2, x: 36, y: 229 }, { virtue: 3, x: 73, y: 11 },
  { virtue: 4, x: 205, y: 45 }, { virtue: 5, x: 81, y: 207 }, { virtue: 7, x: 231, y: 216 },
];

export function locationAt(x: number, y: number): LocationDef | undefined {
  return LOCATIONS.find((l) => l.id > 0 && l.x === x && l.y === y);
}
