// Location numbering follows the order of the map-file tables in AVATAR.EXE (strings at 0xf77f.. and 0x1073d..).
export const enum LocKind { World, Town, Castle, Village, Dungeon, Shrine }

export interface LocationDef {
  id: number;
  name: string;
  kind: LocKind;
  x: number; y: number; // overworld entrance (verified against WORLD.MAP tiles)
  map?: string; map2?: string; talk?: string; dungeon?: string;
}

export const LOCATIONS: LocationDef[] = [
  { id: 0, name: "Britannia", kind: LocKind.World, x: 0, y: 0 },
  { id: 1, name: "Castle of Lord British", kind: LocKind.Castle, x: 86, y: 107, map: "LCB_1.ULT", map2: "LCB_2.ULT", talk: "LCB.TLK" },
  { id: 2, name: "The Lycaeum", kind: LocKind.Castle, x: 218, y: 107, map: "LYCAEUM.ULT", talk: "LYCAEUM.TLK" },
  { id: 3, name: "Empath Abbey", kind: LocKind.Castle, x: 28, y: 50, map: "EMPATH.ULT", talk: "EMPATH.TLK" },
  { id: 4, name: "Serpents Hold", kind: LocKind.Castle, x: 146, y: 241, map: "SERPENT.ULT", talk: "SERPENT.TLK" },
  { id: 5, name: "Moonglow", kind: LocKind.Town, x: 232, y: 135, map: "MOONGLOW.ULT", talk: "MOONGLOW.TLK" },
  { id: 6, name: "Britain", kind: LocKind.Town, x: 82, y: 106, map: "BRITAIN.ULT", talk: "BRITAIN.TLK" },
  { id: 7, name: "Jhelom", kind: LocKind.Town, x: 36, y: 222, map: "JHELOM.ULT", talk: "JHELOM.TLK" },
  { id: 8, name: "Yew", kind: LocKind.Town, x: 58, y: 43, map: "YEW.ULT", talk: "YEW.TLK" },
  { id: 9, name: "Minoc", kind: LocKind.Town, x: 159, y: 20, map: "MINOC.ULT", talk: "MINOC.TLK" },
  { id: 10, name: "Trinsic", kind: LocKind.Town, x: 106, y: 184, map: "TRINSIC.ULT", talk: "TRINSIC.TLK" },
  { id: 11, name: "Skara Brae", kind: LocKind.Town, x: 22, y: 128, map: "SKARA.ULT", talk: "SKARA.TLK" },
  { id: 12, name: "Magincia", kind: LocKind.Village, x: 187, y: 169, map: "MAGINCIA.ULT", talk: "MAGINCIA.TLK" },
  { id: 13, name: "Paws", kind: LocKind.Village, x: 98, y: 145, map: "PAWS.ULT", talk: "PAWS.TLK" },
  { id: 14, name: "Buccaneers Den", kind: LocKind.Village, x: 136, y: 158, map: "DEN.ULT", talk: "DEN.TLK" },
  { id: 15, name: "Vesper", kind: LocKind.Village, x: 201, y: 59, map: "VESPER.ULT", talk: "VESPER.TLK" },
  { id: 16, name: "Cove", kind: LocKind.Village, x: 136, y: 90, map: "COVE.ULT", talk: "COVE.TLK" },
  { id: 17, name: "Deceit", kind: LocKind.Dungeon, x: 240, y: 73, dungeon: "DECEIT.DNG" },
  { id: 18, name: "Despise", kind: LocKind.Dungeon, x: 91, y: 67, dungeon: "DESPISE.DNG" },
  { id: 19, name: "Destard", kind: LocKind.Dungeon, x: 72, y: 168, dungeon: "DESTARD.DNG" },
  { id: 20, name: "Wrong", kind: LocKind.Dungeon, x: 126, y: 20, dungeon: "WRONG.DNG" },
  { id: 21, name: "Covetous", kind: LocKind.Dungeon, x: 156, y: 27, dungeon: "COVETOUS.DNG" },
  { id: 22, name: "Shame", kind: LocKind.Dungeon, x: 58, y: 102, dungeon: "SHAME.DNG" },
  { id: 23, name: "Hythloth", kind: LocKind.Dungeon, x: 239, y: 240, dungeon: "HYTHLOTH.DNG" },
  { id: 24, name: "The Great Stygian Abyss!", kind: LocKind.Dungeon, x: 233, y: 233, dungeon: "ABYSS.DNG" },
];

export const VIRTUES = ["Honesty", "Compassion", "Valor", "Justice", "Sacrifice", "Honor", "Spirituality", "Humility"];

/** Shrines on the overworld (Spirituality is only reachable through a moongate). */
export const SHRINES: { virtue: number; x: number; y: number }[] = [
  { virtue: 0, x: 233, y: 66 }, { virtue: 1, x: 128, y: 92 }, { virtue: 2, x: 36, y: 229 }, { virtue: 3, x: 73, y: 11 },
  { virtue: 4, x: 205, y: 45 }, { virtue: 5, x: 81, y: 207 }, { virtue: 7, x: 231, y: 216 },
];

export function locationAt(x: number, y: number): LocationDef | undefined {
  return LOCATIONS.find((l) => l.id > 0 && l.x === x && l.y === y);
}
