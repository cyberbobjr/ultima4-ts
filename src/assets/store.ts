// Single access point to the game resources. Everything comes from the extracted asset folder
// (assets/original/, produced by `npm run extract`); the engine never reads the original files.
// Callers still name resources by their original file names ("LCB_1.ULT", "GRASS.CON"...), which the
// store maps to the extracted JSON/PNG files.
import type { IndexedImage } from "../formats/ega";
import type { CombatMap, Dungeon, NpcDef } from "../formats/maps";
import type { Dialogue } from "../formats/tlk";
import type { SaveGame } from "../formats/save";
import { decodeIndexedPng } from "./png";

export interface TownMap { tiles: Uint8Array; npcs: NpcDef[] }
export interface TilePack { name: string; tileSize: number; columns: number; count: number; image: string; indexed?: boolean; animations?: { kind: "scroll"; tiles: number[] }[] }
export type TitleTables = Record<string, number[]>;
export type TextCatalog = Record<string, string | string[]>;

export interface AssetManifest { version: number; files: string[] }

const base = (file: string) => file.replace(/\.[^.]+$/, "").toLowerCase();
const bytes = (a: ArrayLike<number>) => Uint8Array.from(a);

export class AssetStore {
  private cache = new Map<string, Promise<unknown>>();

  /** `root` is the URL of the extracted folder, ending with "/". */
  constructor(readonly root: string) {}

  private memo<T>(key: string, load: () => Promise<T>): Promise<T> {
    let p = this.cache.get(key) as Promise<T> | undefined;
    if (!p) { p = load(); this.cache.set(key, p); p.catch(() => this.cache.delete(key)); }
    return p;
  }

  private async fetch(rel: string): Promise<Response> {
    const res = await fetch(this.root + rel);
    if (!res.ok) throw new Error(`asset ${rel}: HTTP ${res.status}`);
    return res;
  }

  json<T>(rel: string): Promise<T> {
    return this.memo(rel, async () => (await this.fetch(rel)).json() as Promise<T>);
  }

  image(rel: string): Promise<IndexedImage> {
    return this.memo(rel, async () => decodeIndexedPng(await (await this.fetch(rel)).blob()));
  }

  /** Null when the folder has not been extracted yet. */
  async manifest(): Promise<AssetManifest | null> {
    try { return await this.json<AssetManifest>("manifest.json"); } catch { return null; }
  }

  // --- graphics

  tilePack(name = "original"): Promise<TilePack> { return this.json(`tiles/${name}/pack.json`); }

  /** The 16x16 EGA tiles of the original pack, one indexed image per tile. */
  async tiles(): Promise<IndexedImage[]> {
    const pack = await this.tilePack();
    const atlas = await this.image(`tiles/original/${pack.image}`);
    return slice(atlas, pack.tileSize, pack.tileSize, pack.columns, pack.count);
  }

  async glyphs(): Promise<IndexedImage[]> {
    const f = await this.json<{ glyphWidth: number; glyphHeight: number; columns: number; count: number; image: string }>("font/charset.json");
    return slice(await this.image(`font/${f.image}`), f.glyphWidth, f.glyphHeight, f.columns, f.count);
  }

  /** A full-screen 320x200 picture, by original name ("START.EGA"). */
  screen(name: string): Promise<IndexedImage> { return this.image(`screens/${base(name)}.png`); }

  // --- maps and dialogues

  async world(): Promise<Uint8Array> {
    return bytes((await this.json<{ tiles: number[] }>("maps/world.json")).tiles);
  }

  async town(file: string): Promise<TownMap> {
    const t = await this.json<{ tiles: number[]; npcs: NpcDef[] }>(`maps/towns/${base(file)}.json`);
    return { tiles: bytes(t.tiles), npcs: t.npcs.map((n) => ({ ...n })) };
  }

  async talk(file: string): Promise<(Dialogue | null)[]> {
    return this.json(`talk/${base(file)}.json`);
  }

  async combat(file: string): Promise<CombatMap> {
    const c = await this.json<{ tiles: number[]; monsterPos: [number, number][]; partyPos: [number, number][] }>(`maps/combat/${base(file)}.json`);
    return { tiles: bytes(c.tiles), monsterPos: c.monsterPos, partyPos: c.partyPos };
  }

  async shrineMap(): Promise<Uint8Array> {
    return bytes((await this.json<{ tiles: number[] }>("maps/combat/shrine.json")).tiles);
  }

  async dungeon(file: string): Promise<Dungeon> {
    type Room = Omit<Dungeon["rooms"][number], "tiles"> & { tiles: number[] };
    const d = await this.json<{ levels: number[][]; rooms: Room[] }>(`maps/dungeons/${base(file)}.json`);
    return { levels: d.levels.map(bytes), rooms: d.rooms.map((r) => ({ ...r, tiles: bytes(r.tiles) })) };
  }

  // --- tables, texts, saves

  titleTables(): Promise<TitleTables> { return this.json("data/title.json"); }

  gameText(lang: string): Promise<TextCatalog> { return this.json(`i18n/${lang}/game.json`); }

  /** PARTY.NEW: the party template used by character creation. */
  async newParty(): Promise<SaveGame> { return structuredClone(await this.json<SaveGame>("saves/party.new.json")); }

  /** PARTY.SAV of the original install, if it held a game (imported by the extractor). */
  async originalSave(): Promise<SaveGame | null> {
    try { return structuredClone(await this.json<SaveGame>("saves/party.sav.json")); } catch { return null; }
  }
}

function slice(img: IndexedImage, w: number, h: number, columns: number, count: number): IndexedImage[] {
  const out: IndexedImage[] = [];
  for (let i = 0; i < count; i++) {
    const ox = (i % columns) * w, oy = Math.floor(i / columns) * h;
    const pixels = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) pixels.set(img.pixels.subarray((oy + y) * img.width + ox, (oy + y) * img.width + ox + w), y * w);
    out.push({ width: w, height: h, pixels });
  }
  return out;
}

/** Where the extracted assets are served from (Vite dev server / bundled app). */
export const assets = new AssetStore(`${import.meta.env.BASE_URL}assets/original/`);
