// Journal of the discovered places: towns, castles, villages, dungeons, shrines and moongates. A place
// is discovered when the party comes within DISCOVER_RADIUS tiles of it on the overworld, or enters
// it. Not in the original game: the journal lives in a sidecar save, EXTRA.json, written with
// PARTY.SAV (Q)uit & save) and read back at the first move or when the world map opens.
import type { Game } from "./game";
import { LOCATIONS, SHRINES, VIRTUES } from "./locations";
import { MOONGATES } from "../data/tables";

export const DISCOVER_RADIUS = 5;
export const EXTRA_SAVE = "EXTRA.json";
const WORLD = 256;

export type PlaceKind = "castle" | "town" | "village" | "ruin" | "dungeon" | "abyss" | "shrine" | "moongate";

export interface Place {
  /** Stable key saved in EXTRA.json: "loc:<id>", "shrine:<virtue>", "gate:<phase>". */
  key: string;
  kind: PlaceKind;
  x: number; y: number;
  /** Location id (1..24) for the places one enters through E)nter. */
  loc?: number;
  /** Shrine virtue / moongate phase. */
  index?: number;
}

const LOC_KINDS: Record<number, PlaceKind> = { 12: "ruin", 24: "abyss" };
function locKind(id: number): PlaceKind {
  if (LOC_KINDS[id]) return LOC_KINDS[id];
  return id <= 4 ? "castle" : id <= 11 ? "town" : id <= 16 ? "village" : "dungeon";
}

/** Every place of the journal (Spirituality has no overworld entrance: it is left out). */
export const PLACES: readonly Place[] = [
  ...LOCATIONS.filter((l) => l.id >= 1 && l.id <= 24).map((l): Place => ({ key: `loc:${l.id}`, kind: locKind(l.id), x: l.x, y: l.y, loc: l.id })),
  ...SHRINES.map((s): Place => ({ key: `shrine:${s.virtue}`, kind: "shrine", x: s.x, y: s.y, index: s.virtue })),
  ...MOONGATES.map((m): Place => ({ key: `gate:${m.phase}`, kind: "moongate", x: m.x, y: m.y, index: m.phase })),
];

export const placeByKey = (key: string) => PLACES.find((p) => p.key === key);

/** Shortest distance on one axis of the wrapping 256x256 world. */
export function wrapDelta(a: number, b: number): number {
  const d = (((b - a) % WORLD) + WORLD) % WORLD;
  return d > WORLD / 2 ? d - WORLD : d;
}

/** Chebyshev distance (tiles) on the wrapping world. */
export function worldDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(wrapDelta(ax, bx)), Math.abs(wrapDelta(ay, by)));
}

/** Places within `radius` tiles of (x, y). */
export function placesNear(x: number, y: number, radius = DISCOVER_RADIUS, places: readonly Place[] = PLACES): Place[] {
  return places.filter((p) => worldDistance(x, y, p.x, p.y) <= radius);
}

/**
 * Where the party stands, as far as the journal is concerned: inside a town or a dungeon, the
 * location entered (save.location 1..24); on the overworld, its position.
 */
export interface PartyState { location: number; x: number; y: number; onWorld: boolean }

/** Keys newly discovered by the party in `state` (not already in `known`). */
export function discover(known: ReadonlySet<string>, state: PartyState, places: readonly Place[] = PLACES): string[] {
  const out: string[] = [];
  const add = (k: string) => { if (!known.has(k) && !out.includes(k)) out.push(k); };
  if (state.location >= 1 && state.location <= 24) {
    const p = places.find((q) => q.loc === state.location);
    if (p) add(p.key);
    return out; // town / dungeon coordinates are not overworld ones
  }
  if (state.onWorld) for (const p of placesNear(state.x, state.y, DISCOVER_RADIUS, places)) add(p.key);
  return out;
}

/** The party's overworld position (the entrance while in a town or a dungeon). */
export function partyWorldPos(state: PartyState): { x: number; y: number } {
  const p = state.location >= 1 && state.location <= 24 ? PLACES.find((q) => q.loc === state.location) : undefined;
  return p ? { x: p.x, y: p.y } : { x: state.x & 255, y: state.y & 255 };
}

// ---------------------------------------------------------------- save file

export interface JournalData { version: 1; moves: number; places: { key: string; moves: number }[] }

export function serializeJournal(entries: ReadonlyMap<string, number>, moves: number): JournalData {
  return { version: 1, moves, places: [...entries].map(([key, m]) => ({ key, moves: m })) };
}

/**
 * Entries of a saved journal, or none when it is unreadable or belongs to another game: a journal
 * saved later than the current save (more moves) comes from a game since replaced by a new one.
 */
export function parseJournal(data: unknown, currentMoves: number): Map<string, number> {
  const out = new Map<string, number>();
  const d = data as Partial<JournalData> | null;
  if (!d || d.version !== 1 || !Array.isArray(d.places) || typeof d.moves !== "number" || d.moves > currentMoves) return out;
  for (const e of d.places) if (e && typeof e.key === "string" && placeByKey(e.key)) out.set(e.key, typeof e.moves === "number" ? e.moves : 0);
  return out;
}

// ---------------------------------------------------------------- names

/** Display name of a place (game texts: already in the game language). */
export function placeName(p: Place, labels: { shrine: (virtue: string) => string; moongate: (near: string) => string }): string {
  if (p.kind === "shrine") return labels.shrine(VIRTUES[p.index!]);
  if (p.kind === "moongate") return labels.moongate(LOCATIONS[p.index! + 5].name);
  return LOCATIONS[p.loc!].name.replace(/[!\s]+$/, "");
}

// ---------------------------------------------------------------- the game's journal

export class Journal {
  /** key -> moves counter at discovery */
  readonly entries = new Map<string, number>();
  private loaded: Promise<void> | null = null;
  private listeners = new Set<() => void>();

  constructor(private readonly g: Game) {}

  has(key: string) { return this.entries.has(key); }

  onChange(fn: () => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  state(): PartyState {
    const s = this.g.save;
    return { location: s.location, x: this.g.px, y: this.g.py, onWorld: this.g.map?.kind === "world" };
  }

  /** Reads EXTRA.json once the save is known (the moves counter tells whether it matches). */
  load(): Promise<void> {
    if (!this.loaded) {
      this.loaded = (async () => {
        const { readSave } = await import("../io/gamefs");
        const bytes = await readSave(EXTRA_SAVE);
        let data: unknown = null;
        try { data = bytes ? JSON.parse(new TextDecoder().decode(bytes)) : null; } catch { data = null; }
        const saved = parseJournal(data, this.g.save?.moves ?? 0);
        for (const [k, m] of saved) if (!this.entries.has(k)) this.entries.set(k, m);
        this.emit();
      })();
    }
    return this.loaded;
  }

  /** Discovers the places around the party; true when something new was found. */
  update(): boolean {
    if (!this.g.save) return false;
    if (!this.loaded) void this.load();
    const found = discover(new Set(this.entries.keys()), this.state());
    for (const k of found) this.entries.set(k, this.g.save.moves);
    if (found.length) this.emit();
    return found.length > 0;
  }

  async save(): Promise<void> {
    await this.load();
    const { writeSave } = await import("../io/gamefs");
    const json = JSON.stringify(serializeJournal(this.entries, this.g.save.moves));
    await writeSave(EXTRA_SAVE, new TextEncoder().encode(json));
  }

  private emit() { for (const l of this.listeners) l(); }
}

const journals = new WeakMap<Game, Journal>();

/** Creates the journal of `g` and follows the party's moves. */
export function installJournal(g: Game): Journal {
  let j = journals.get(g);
  if (j) return j;
  j = new Journal(g);
  journals.set(g, j);
  const jj = j;
  g.onMove(() => { jj.update(); });
  return j;
}

export function journalOf(g: Game): Journal { return installJournal(g); }

/** Save hook of (Q)uit & save (actions.ts). */
export function saveJournal(g: Game): Promise<void> { return journals.get(g)?.save() ?? Promise.resolve(); }
