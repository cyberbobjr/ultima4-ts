// Assembles generated tiles (one PNG per tile index, e.g. from comfy-hd.mjs) into a tile pack.
//   node tools/packs/assemble.mjs [--dir test-output/hd] [--name hd-derived] [--title "HD (generated)"]
// Missing tiles fall back to the original tile, enlarged. Output: assets/packs/<name>/ (git-ignored when
// the name ends with "-derived").
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const dir = path.resolve(arg("--dir", "test-output/hd"));
const name = arg("--name", "hd-derived");
const title = arg("--title", "HD (generated)");
const orig = JSON.parse(fs.readFileSync("assets/original/tiles/original/pack.json", "utf8"));
const atlas = PNG.sync.read(fs.readFileSync("assets/original/tiles/original/tiles.png"));
const first = fs.readdirSync(dir).find((f) => /^\d+\.png$/.test(f));
const size = first ? PNG.sync.read(fs.readFileSync(path.join(dir, first))).width : 64;
const out = new PNG({ width: 16 * size, height: 16 * size });
let generated = 0;
for (let t = 0; t < 256; t++) {
  const file = path.join(dir, `${t}.png`);
  const ox = (t % 16) * size, oy = (t >> 4) * size;
  if (fs.existsSync(file)) {
    const img = PNG.sync.read(fs.readFileSync(file));
    for (let y = 0; y < size; y++) img.data.copy(out.data, ((oy + y) * out.width + ox) * 4, y * img.width * 4, (y * img.width + size) * 4);
    generated++;
  } else {
    const k = size / 16, sx = (t % 16) * 16, sy = (t >> 4) * 16;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const s = ((sy + Math.floor(y / k)) * atlas.width + sx + Math.floor(x / k)) * 4, d = ((oy + y) * out.width + ox + x) * 4;
      atlas.data.copy(out.data, d, s, s + 4);
    }
  }
}
const target = path.resolve("assets/packs", name);
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, "tiles.png"), PNG.sync.write(out));
fs.writeFileSync(path.join(target, "pack.json"), JSON.stringify({ ...orig, name: title, tileSize: size, columns: 16, image: "tiles.png", indexed: false }, null, 2));
console.log(`${name}: ${generated} generated tiles, ${256 - generated} original (enlarged), ${size}px`);
