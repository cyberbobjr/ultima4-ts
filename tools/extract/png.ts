// Minimal PNG encoder for the extractor: 8-bit palette images (exact EGA indices survive the
// round trip, see src/assets/png.ts) and 8-bit RGBA.
import zlib from "node:zlib";

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf: Uint8Array): number {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  out.set(data, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function png(width: number, height: number, colorType: 3 | 6, rows: Uint8Array, extra: Buffer[] = []): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = colorType;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), ...extra,
    chunk("IDAT", zlib.deflateSync(rows, { level: 9 })),
    chunk("IEND", new Uint8Array(0)),
  ]);
}
/** Prefixes each scanline with filter type 0. */
function scanlines(pixels: Uint8Array, stride: number, height: number): Uint8Array {
  const rows = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) rows.set(pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  return rows;
}

/** Palette PNG; `transparent` makes that index fully transparent (tRNS). */
export function encodeIndexed(width: number, height: number, pixels: Uint8Array, palette: readonly (readonly [number, number, number])[], transparent?: number): Buffer {
  const plte = Buffer.from(palette.flatMap((c) => [c[0], c[1], c[2]]));
  const extra = [chunk("PLTE", plte)];
  if (transparent !== undefined) extra.push(chunk("tRNS", Uint8Array.from(palette.map((_, i) => (i === transparent ? 0 : 255)))));
  return png(width, height, 3, scanlines(pixels, width, height), extra);
}

export function encodeRGBA(width: number, height: number, rgba: Uint8Array): Buffer {
  return png(width, height, 6, scanlines(rgba, width * 4, height));
}
