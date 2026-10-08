// EGA graphics: 16-color palette, 4bpp packed pixels (high nibble first).
import { lzwDecode, rleDecode } from "./compression";

export const EGA_PALETTE: [number, number, number][] = [
  [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170], [170, 0, 0], [170, 0, 170], [170, 85, 0], [170, 170, 170],
  [85, 85, 85], [85, 85, 255], [85, 255, 85], [85, 255, 255], [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255],
];

/** Unpacks 4bpp data into one byte (0..15) per pixel. */
export function unpack4bpp(src: Uint8Array, pixels: number): Uint8Array {
  const out = new Uint8Array(pixels);
  for (let i = 0; i < pixels; i++) {
    const b = src[i >> 1] ?? 0;
    out[i] = i & 1 ? b & 0xf : b >> 4;
  }
  return out;
}

export interface IndexedImage { width: number; height: number; pixels: Uint8Array; }

/** SHAPES.EGA: 256 tiles of 16x16. */
export function decodeTiles(src: Uint8Array): IndexedImage[] {
  const tiles: IndexedImage[] = [];
  for (let t = 0; t < 256; t++) tiles.push({ width: 16, height: 16, pixels: unpack4bpp(src.subarray(t * 128, t * 128 + 128), 256) });
  return tiles;
}

/** CHARSET.EGA: 8x8 glyphs. */
export function decodeCharset(src: Uint8Array): IndexedImage[] {
  const glyphs: IndexedImage[] = [];
  for (let c = 0; c < src.length / 32; c++) glyphs.push({ width: 8, height: 8, pixels: unpack4bpp(src.subarray(c * 32, c * 32 + 32), 64) });
  return glyphs;
}

/** Full-screen 320x200 pictures: RLE (START, rune/virtue pics, KEY7) or LZW (title & intro). */
export function decodeScreen(src: Uint8Array): IndexedImage {
  let raw = rleDecode(src);
  if (raw.length !== 32000) raw = lzwDecode(src);
  return { width: 320, height: 200, pixels: unpack4bpp(raw, 64000) };
}
