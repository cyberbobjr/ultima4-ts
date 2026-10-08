// A 320x200 indexed frame buffer emulating TITLE.EXE's EGA driver routines, plus keyboard helpers
// with the original's "kbhit" semantics (a key pressed during an animation skips it and stays pending).
import { random } from "../game/rng";
import type { Assets } from "../render/assets";
import type { Input, Key } from "../game/input";
import type { Renderer } from "../render/renderer";

export const W = 320, H = 200;

export class Screen {
  readonly px = new Uint8Array(W * H);
  /** text cursor (FUN_1000_027a: DS:7088 col, DS:708A row) */
  col = 0; row = 0;
  /** blinking cursor shown while waiting for a key (FUN_1000_3149) */
  cursorOn = false;
  private cursorPhase = 0;
  private lastBlink = 0;
  /** per-frame animations (title creatures, map vignette) */
  animators: ((now: number) => void)[] = [];
  /**
   * Character shown in each 8x8 text cell (-1 none). With the modern font the text is drawn from
   * these cells over the picture instead of from the glyph pixels; any drawing over a cell clears it.
   */
  private readonly cells = new Int16Array(40 * 25).fill(-1);

  constructor(readonly assets: Assets) {}

  /** Forgets the text cells under a pixel rectangle that was drawn over. */
  private dropCells(x: number, y: number, w: number, h: number) {
    for (let r = Math.max(0, y >> 3); r <= Math.min(24, (y + h - 1) >> 3); r++)
      for (let c = Math.max(0, x >> 3); c <= Math.min(39, (x + w - 1) >> 3); c++) this.cells[r * 40 + c] = -1;
  }

  /** FUN_1000_11b8: clear the whole screen. */
  clear() { this.px.fill(0); this.cells.fill(-1); }

  fill(x: number, y: number, w: number, h: number, c = 0) {
    for (let j = y; j < y + h; j++) this.px.fill(c, j * W + x, j * W + x + w);
    this.dropCells(x, y, w, h);
  }

  /** FUN_1000_1190: clear the inside of the title box. */
  clearBox() { this.fill(8, 104, 304, 80); }

  /** FUN_1000_119f: clear the text area (rows 19-24). */
  clearText() { this.fill(0, 152, W, 48); this.col = 0; this.row = 19; }

  /** FUN_1000_1195: copy a rectangle of a picture; x and width in 8-pixel columns, y and height in lines. */
  blit(src: Uint8Array, w: number, h: number, sx: number, sy: number, dy: number, dx: number) {
    for (let j = 0; j < h; j++) {
      const s = (sy + j) * W + sx * 8, d = (dy + j) * W + dx * 8;
      if (sy + j >= H || dy + j >= H || sy + j < 0 || dy + j < 0) continue;
      this.px.set(src.subarray(s, s + w * 8), d);
    }
    this.dropCells(dx * 8, dy, w * 8, h);
  }

  /** FUN_1000_173f: dissolve-in of the non-black 8-pixel groups of a rectangle. */
  blitDissolve(src: Uint8Array, w: number, h: number, sx: number, sy: number, dy: number, dx: number, step: number, masks: Uint8Array) {
    for (let j = 0; j < h; j++)
      for (let c = 0; c < w; c++) {
        const s = (sy + j) * W + (sx + c) * 8, d = (dy + j) * W + (dx + c) * 8;
        let any = 0;
        for (let b = 0; b < 8; b++) any |= src[s + b];
        if (!any) continue;
        const m = masks[(step + Math.floor(random() * 8)) * 2] ?? 0xff;
        for (let b = 0; b < 8; b++) this.px[d + b] = m & (0x80 >> b) ? src[s + b] : 0;
      }
    this.dropCells(dx * 8, dy, w * 8, h);
  }

  /** FUN_1000_118b (EGA): plots a pixel by OR-ing the plane mask of the colour code. */
  plot(y: number, x: number, color: number) {
    const PLANES = [0, 2, 4, 11]; // DS:337A
    this.px[y * W + x] |= PLANES[color];
  }

  tile(t: number, x: number, y: number) {
    const p = this.assets.tiles[t]?.pixels;
    if (!p) return;
    for (let j = 0; j < 16; j++) this.px.set(p.subarray(j * 16, j * 16 + 16), (y + j) * W + x);
    this.dropCells(x, y, 16, 16);
  }

  /** FUN_1000_11b3: draws a character at the cursor without moving it. */
  glyph(code: number, col = this.col, row = this.row) {
    const g = this.assets.glyphs[code & 0x7f]?.pixels; // the original charset has 128 glyphs
    if (!g || col < 0 || col >= 40 || row < 0 || row >= 25) return;
    for (let j = 0; j < 8; j++) this.px.set(g.subarray(j * 8, j * 8 + 8), (row * 8 + j) * W + col * 8);
    this.cells[row * 40 + col] = code;
  }

  /** FUN_1000_027a: character output with backspace handling. */
  putc(ch: string) {
    if (ch === "\b") { this.col--; this.glyph(0x20); } else { this.glyph(ch.charCodeAt(0)); this.col++; }
  }

  /** FUN_1000_0b1e: string at a position. */
  printAt(s: string, col: number, row: number) { this.col = col; this.row = row; for (const ch of s) this.putc(ch); }

  /** FUN_1000_261d: string with newlines (back to column 0). */
  print(s: string) {
    for (const ch of s) {
      if (ch === "\n") { this.row++; this.col = 0; } else this.putc(ch);
    }
  }

  /** Overlay callback: runs the animations and presents the frame. */
  draw(r: Renderer, now: number) {
    for (const a of this.animators) a(now);
    r.drawPicture(this.px);
    if (r.font === "modern") this.cells.forEach((c, i) => { if (c >= 0x20) r.drawGlyph(c, i % 40, Math.floor(i / 40)); });
    if (this.cursorOn) {
      if (now - this.lastBlink > 120) { this.lastBlink = now; this.cursorPhase = (this.cursorPhase - 1) & 3; }
      r.drawGlyph(0x1c + this.cursorPhase, this.col, this.row);
    }
  }
}

/** Thrown when Escape aborts the new-game flow. */
export class Abort extends Error {}

export class Keys {
  private held: Key | null = null;
  constructor(private readonly input: Input, private readonly scr: Screen) {}

  /** FUN_1000_02a3-like delay: waits `ms` unless a key is (or becomes) pending; true if a key is pending. */
  async delay(ms: number): Promise<boolean> {
    if (this.held) return true;
    const k = await this.input.next(Math.max(0, ms));
    if (k) this.held = k;
    return this.held !== null;
  }

  get hit() { return this.held !== null; }

  /** FUN_1000_3280: discard pending keys. */
  flush() { this.held = null; this.input.clear(); }

  /** FUN_1000_3270: waits for a key with the blinking cursor, then blanks the cursor cell. */
  async get(cursor = true): Promise<Key> {
    let k = this.held;
    this.held = null;
    if (!k) {
      this.scr.cursorOn = cursor;
      while (!k) k = await this.input.next();
      this.scr.cursorOn = false;
    }
    if (cursor) this.scr.glyph(0x20);
    return k;
  }
}
