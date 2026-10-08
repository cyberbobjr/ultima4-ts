// Shared helpers for spells, items, shrines and the endgame: original prompt routines, game mode,
// timed waits and extra drawing layers (pictures OR-ed over the screen, small tiles in the viewport).
import { assets } from "../../assets/store";
import { EGA_PALETTE } from "../../formats/ega";
import type { PlayerRecord } from "../../formats/save";
import type { Renderer } from "../../render/renderer";
import { TILE, VIEW_TILES, VIEW_X, VIEW_Y } from "../../render/renderer";
import type { Game } from "../game";

/** Game mode DS:946A: 1 overworld, 2 town, 3 dungeon, 4 combat (6 = dungeon room, reported as 4 here). */
export function gameMode(g: Game): number {
  if (g.activeMember >= 0) return 4;
  const loc = g.save.location;
  if (loc >= 17 && loc <= 24) return 3;
  return g.map.kind === "town" ? 2 : 1;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** One unit of FUN_1000_16cd (the overworld input wait is 0x19 units = 8 s). */
export const TICK_MS = 320;

/** FUN_1000_16cd(n, 0): uninterruptible delay. */
export const ticks = (n: number) => sleep(n * TICK_MS);

/** FUN_1000_2F7E: wait up to 15 units or until a key, which is consumed. */
export async function pause(g: Game) { await g.input.next(15 * TICK_MS); }

/** FUN_1000_1804: flush the keyboard buffer. */
export function flushKeys(g: Game) { g.input.clear(); }

/**
 * FUN_1000_11F9: prompt for one key in [lo, hi] (letters folded to upper case), echoed with a newline.
 * Returns its char code, -1 for Enter/Space, -2 for Escape. Other keys are ignored.
 */
export async function askKey(g: Game, prompt: string, lo: string, hi: string): Promise<number> {
  g.con.print(prompt);
  for (;;) {
    const k = await g.getKey();
    if (k === "Enter" || k === " ") { g.con.println(""); return -1; }
    if (k === "Escape") { g.con.println(""); return -2; }
    if (k.length !== 1) continue;
    const c = k.toUpperCase();
    if (c >= lo && c <= hi) { g.con.println(c); return c.charCodeAt(0); }
  }
}

/** FUN_1000_1287: "Who:" style party member prompt; a party of one answers 1 automatically. */
export async function askPlayer(g: Game, prompt: string): Promise<number> {
  if (g.save.members === 1) { g.con.println(prompt + "1"); return 0; }
  const c = await askKey(g, prompt, "0", String(g.save.members));
  if (c === 0x30) return -2;
  if (c < 0) return -1;
  return c - 0x31;
}

/** FUN_1000_0E82: member able to act (Good or Poisoned). */
export const canAct = (p: PlayerRecord) => p.status === "G" || p.status === "P";
/** FUN_1000_0E4E: member alive (Good, Poisoned or Sleeping). */
export const isAlive = (p: PlayerRecord) => p.status === "G" || p.status === "P" || p.status === "S";

/** FUN_1000_097D */
export function addXp(p: PlayerRecord, n: number) { p.xp = Math.min(9999, p.xp + n); }

/** Case-insensitive compare of typed text (FUN_1000_EC39 on n characters). */
export const sameText = (a: string, b: string, n = 16) => a.slice(0, n).toLowerCase() === b.slice(0, n).toLowerCase();

// ------------------------------------------------------------------ drawing layers

/**
 * Adds a drawing pass after Game.draw (same instance-wrapping technique as dungeon.ts).
 * Returns a function restoring the previous draw.
 */
export function addDrawHook(g: Game, fn: (r: Renderer) => void): () => void {
  const own = Object.prototype.hasOwnProperty.call(g, "draw");
  const prev = g.draw;
  g.draw = () => { prev.call(g); fn(g.r); };
  return () => { if (own) g.draw = prev; else Reflect.deleteProperty(g, "draw"); };
}

const BLACK_VIEW: number[] = new Array(VIEW_TILES * VIEW_TILES).fill(-1);

/** FUN_1000_2246: blank map viewport (also hides the dungeon 3D view). Returns the restore function. */
export function blankView(g: Game): () => void {
  const prevView = g.viewOverride, prev3d = g.r.view3d;
  g.viewOverride = () => BLACK_VIEW;
  g.r.view3d = null;
  return () => { g.viewOverride = prevView; g.r.view3d = prev3d; };
}

/** Shows an arbitrary 11x11 tile view (e.g. SHRINE.CON) in the viewport. Returns the restore function. */
export function showTiles(g: Game, tiles: ArrayLike<number>): () => void {
  const prevView = g.viewOverride, prev3d = g.r.view3d;
  const view = Array.from(tiles);
  g.viewOverride = () => view;
  g.r.view3d = null;
  return () => { g.viewOverride = prevView; g.r.view3d = prev3d; };
}

/** A 320x200 indexed layer drawn over the screen; colour 0 is transparent (pictures are OR-ed by EGA.DRV). */
export class PixelLayer {
  readonly px = new Uint8Array(320 * 200);
  private readonly canvas = document.createElement("canvas");
  private dirty = true;
  constructor() { this.canvas.width = 320; this.canvas.height = 200; }
  /** EGA.DRV picture blit (driver entry 0x10): sets the colour planes of every non-black pixel. */
  or(pixels: Uint8Array) { for (let i = 0; i < pixels.length; i++) if (pixels[i]) this.px[i] |= pixels[i]; this.dirty = true; }
  set(x: number, y: number, c: number) { this.px[y * 320 + x] = c; this.dirty = true; }
  xor(x: number, y: number, c: number) { this.px[y * 320 + x] ^= c; this.dirty = true; }
  clear() { this.px.fill(0); this.dirty = true; }
  draw(r: Renderer) {
    if (this.dirty) {
      const ctx = this.canvas.getContext("2d")!;
      const img = ctx.createImageData(320, 200);
      for (let i = 0; i < this.px.length; i++) {
        const c = this.px[i];
        if (!c) continue;
        const [R, G, B] = EGA_PALETTE[c];
        img.data[i * 4] = R; img.data[i * 4 + 1] = G; img.data[i * 4 + 2] = B; img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      this.dirty = false;
    }
    r.ui.drawImage(this.canvas, 0, 0);
  }
}

/** Loads a full-screen .EGA picture (RLE) as 64000 colour indices. */
export async function loadPicture(name: string): Promise<Uint8Array> {
  return (await assets.screen(name)).pixels;
}

/** Draws a tile over viewport cell (vx, vy) (projectiles, flashes). */
export function drawViewTile(r: Renderer, t: number, vx: number, vy: number) {
  if (vx < 0 || vy < 0 || vx >= VIEW_TILES || vy >= VIEW_TILES) return;
  r.drawTileUI(t, VIEW_X + vx * TILE, VIEW_Y + vy * TILE);
}

/** FUN_1000_095E: screen shake. */
export async function shake(g: Game) {
  const el = g.r.gl.domElement;
  for (const dx of [-3, 3, -2, 2, -1, 1, 0]) { el.style.transform = dx ? `translate(${dx}px, ${-dx}px)` : ""; await sleep(40); }
}

/** Title drawn in the top frame row over the status area (FUN_1000_45D6 with row 0). */
export function drawStatusTitle(r: Renderer, title: string) {
  const len = Math.min(12, title.length), even = len - (len & 1);
  const col = (even > 7 ? 1 : 0) + Math.floor((12 - even) / 2) + 0x19;
  r.drawGlyph(0x10, col - 1, 0);
  r.drawText(title, col, 0);
  r.drawGlyph(0x11, col + title.length, 0);
}

/** Clears the 8 member rows of the status area (cols 24..39). */
export function clearStatusRows(r: Renderer) { r.fillRect(24 * 8, 8, 16 * 8, 8 * 8, 0); }
