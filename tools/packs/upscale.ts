// Builds a tile pack from the extracted original tiles with a pixel-art scaling algorithm. The palette
// stays the original EGA one and every animation frame is scaled the same way, so animations (water,
// moongates, monsters) and readability are kept.
//
//   npx tsx tools/packs/upscale.ts [--algo scale4x|scale3x|scale2x|nearest] [--scale 4] [--name <pack>]
//
// scale2x/scale3x: the AdvMAME/EPX algorithms (smooth diagonals, no new colours); scale4x = scale2x twice.
// Output: assets/packs/<name>/ (pack.json + tiles.png). Derived from the original tiles: keep the
// "-derived" suffix so it stays git-ignored.
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { encodeRGBA } from "../extract/png";

type Img = { w: number; h: number; px: Uint32Array };

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const algo = arg("--algo", "scale4x");
const factor = algo === "scale4x" ? 4 : algo === "scale3x" ? 3 : algo === "scale2x" ? 2 : Number(arg("--scale", "4"));
const name = arg("--name", `${algo === "nearest" ? `upscale${factor}x` : algo}-derived`);

/** Tiles that repeat seamlessly (terrain, floors, fields): their edges wrap around when scaling. */
const SEAMLESS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 22, 62, 63, 68, 69, 70, 71, 72, 76]);

function pixelAt(img: Img, x: number, y: number, wrap: boolean): number {
  if (wrap) { x = (x + img.w) % img.w; y = (y + img.h) % img.h; } else { x = Math.max(0, Math.min(img.w - 1, x)); y = Math.max(0, Math.min(img.h - 1, y)); }
  return img.px[y * img.w + x];
}

function scale2x(src: Img, wrap: boolean): Img {
  const out: Img = { w: src.w * 2, h: src.h * 2, px: new Uint32Array(src.w * src.h * 4) };
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const p = pixelAt(src, x, y, wrap);
      const a = pixelAt(src, x, y - 1, wrap), b = pixelAt(src, x + 1, y, wrap), c = pixelAt(src, x - 1, y, wrap), d = pixelAt(src, x, y + 1, wrap);
      let e0 = p, e1 = p, e2 = p, e3 = p;
      if (c === a && c !== d && a !== b) e0 = a;
      if (a === b && a !== c && b !== d) e1 = b;
      if (d === c && d !== b && c !== a) e2 = c;
      if (b === d && b !== a && d !== c) e3 = d;
      const o = out.w;
      out.px[(2 * y) * o + 2 * x] = e0; out.px[(2 * y) * o + 2 * x + 1] = e1;
      out.px[(2 * y + 1) * o + 2 * x] = e2; out.px[(2 * y + 1) * o + 2 * x + 1] = e3;
    }
  return out;
}

function scale3x(src: Img, wrap: boolean): Img {
  const out: Img = { w: src.w * 3, h: src.h * 3, px: new Uint32Array(src.w * src.h * 9) };
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const g = (dx: number, dy: number) => pixelAt(src, x + dx, y + dy, wrap);
      const A = g(-1, -1), B = g(0, -1), C = g(1, -1), D = g(-1, 0), E = g(0, 0), F = g(1, 0), G = g(-1, 1), H = g(0, 1), I = g(1, 1);
      let e = [E, E, E, E, E, E, E, E, E];
      if (B !== H && D !== F) {
        e = [
          D === B ? D : E,
          (D === B && E !== C) || (B === F && E !== A) ? B : E,
          B === F ? F : E,
          (D === B && E !== G) || (D === H && E !== A) ? D : E,
          E,
          (B === F && E !== I) || (H === F && E !== C) ? F : E,
          D === H ? D : E,
          (D === H && E !== I) || (H === F && E !== G) ? H : E,
          H === F ? F : E,
        ];
      }
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) out.px[(3 * y + j) * out.w + 3 * x + i] = e[j * 3 + i];
    }
  return out;
}

function nearest(src: Img, k: number): Img {
  const out: Img = { w: src.w * k, h: src.h * k, px: new Uint32Array(src.w * src.h * k * k) };
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.px[y * out.w + x] = src.px[Math.floor(y / k) * src.w + Math.floor(x / k)];
  return out;
}

function scaleTile(tile: Img, wrap: boolean): Img {
  switch (algo) {
    case "scale2x": return scale2x(tile, wrap);
    case "scale3x": return scale3x(tile, wrap);
    case "scale4x": return scale2x(scale2x(tile, wrap), wrap);
    default: return nearest(tile, factor);
  }
}

const src = path.resolve("assets/original/tiles/original");
const pack = JSON.parse(fs.readFileSync(path.join(src, "pack.json"), "utf8"));
const atlas = PNG.sync.read(fs.readFileSync(path.join(src, pack.image)));
const T = pack.tileSize, N = T * factor;
const out = new Uint8Array(16 * N * 16 * N * 4);
const view = new DataView(atlas.data.buffer, atlas.data.byteOffset, atlas.data.byteLength);
for (let t = 0; t < pack.count; t++) {
  const tile: Img = { w: T, h: T, px: new Uint32Array(T * T) };
  const ox = (t % pack.columns) * T, oy = Math.floor(t / pack.columns) * T;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) tile.px[y * T + x] = view.getUint32(((oy + y) * atlas.width + ox + x) * 4);
  const big = scaleTile(tile, SEAMLESS.has(t));
  const dx = (t % 16) * N, dy = (t >> 4) * N;
  const outView = new DataView(out.buffer);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) outView.setUint32(((dy + y) * 16 * N + dx + x) * 4, big.px[y * N + x]);
}
const dir = path.resolve("assets/packs", name);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "tiles.png"), encodeRGBA(16 * N, 16 * N, out));
fs.writeFileSync(path.join(dir, "pack.json"), JSON.stringify({ ...pack, name: `${pack.name} ${algo} x${factor}`, tileSize: N, columns: 16, indexed: false }, null, 2));
console.log(`pack ${name}: ${pack.count} tiles of ${N}px (${algo})`);
