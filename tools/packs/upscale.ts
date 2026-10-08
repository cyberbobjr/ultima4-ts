// Builds a tile pack by scaling the extracted original tiles (nearest neighbour), e.g. as the base
// for hand-made or generated HD packs, and to test the pack system at other tile sizes.
//
//   npx tsx tools/packs/upscale.ts [--scale 4] [--name upscale4x-derived]
//
// Output: assets/packs/<name>/ (pack.json + tiles.png). Derived from the original tiles: keep the
// "-derived" suffix so it stays git-ignored.
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { encodeRGBA } from "../extract/png";

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const scale = Number(arg("--scale", "4"));
const name = arg("--name", `upscale${scale}x-derived`);
const src = path.resolve("assets/original/tiles/original");
const pack = JSON.parse(fs.readFileSync(path.join(src, "pack.json"), "utf8"));
const img = PNG.sync.read(fs.readFileSync(path.join(src, pack.image)));

const w = img.width * scale, h = img.height * scale;
const out = new Uint8Array(w * h * 4);
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const s = ((Math.floor(y / scale) * img.width) + Math.floor(x / scale)) * 4, d = (y * w + x) * 4;
    out.set(img.data.subarray(s, s + 4), d);
  }
const dir = path.resolve("assets/packs", name);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "tiles.png"), encodeRGBA(w, h, out));
fs.writeFileSync(path.join(dir, "pack.json"), JSON.stringify({ ...pack, name: `${pack.name} x${scale}`, tileSize: pack.tileSize * scale, indexed: false }, null, 2));
console.log(`pack ${name}: ${pack.count} tiles of ${pack.tileSize * scale}px`);
