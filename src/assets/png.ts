// Decodes the extractor's palette PNGs back to EGA colour indices (the browser only gives RGBA).
import { EGA_PALETTE, type IndexedImage } from "../formats/ega";

const INDEX = new Map(EGA_PALETTE.map(([r, g, b], i) => [(r << 16) | (g << 8) | b, i]));

export async function decodeIndexedPng(blob: Blob): Promise<IndexedImage> {
  const bmp = await createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  const rgba = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
  const pixels = new Uint8Array(bmp.width * bmp.height);
  for (let i = 0; i < pixels.length; i++) {
    const key = (rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2];
    const idx = INDEX.get(key);
    if (idx === undefined) throw new Error(`PNG colour #${key.toString(16).padStart(6, "0")} is not an EGA colour`);
    pixels[i] = idx;
  }
  const { width, height } = bmp;
  bmp.close(); // a closed bitmap reports 0x0
  return { width, height, pixels };
}
