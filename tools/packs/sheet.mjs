// Contact sheet: original tile (nearest) next to its HD version, for review.
//   node tools/packs/sheet.mjs --dir test-output/hd --tiles 4,6 [--zoom 2] [--out test-output/hd/sheet.png]
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const dir = path.resolve(arg("--dir", "test-output/hd"));
const zoom = Number(arg("--zoom", "2"));
const tiles = (arg("--tiles", "") || fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).map((f) => f.slice(0, -4)).join(","))
  .split(",").map(Number).sort((a, b) => a - b);
const atlas = PNG.sync.read(fs.readFileSync("assets/original/tiles/original/tiles.png"));
const first = PNG.sync.read(fs.readFileSync(path.join(dir, `${tiles[0]}.png`)));
const S = first.width * zoom, cols = 4, gap = 8;
const cellW = 2 * S + gap * 3, cellH = S + gap * 2;
const rows = Math.ceil(tiles.length / cols);
const out = new PNG({ width: cols * cellW, height: rows * cellH });
out.data.fill(40);
const put = (x0, y0, get) => {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const [r, g, b] = get(x, y), d = ((y0 + y) * out.width + x0 + x) * 4;
    out.data[d] = r; out.data[d + 1] = g; out.data[d + 2] = b; out.data[d + 3] = 255;
  }
};
tiles.forEach((t, i) => {
  const x0 = (i % cols) * cellW + gap, y0 = Math.floor(i / cols) * cellH + gap;
  const ox = (t % 16) * 16, oy = (t >> 4) * 16;
  put(x0, y0, (x, y) => { const s = ((oy + Math.floor(y * 16 / S)) * atlas.width + ox + Math.floor(x * 16 / S)) * 4; return [atlas.data[s], atlas.data[s + 1], atlas.data[s + 2]]; });
  const hd = PNG.sync.read(fs.readFileSync(path.join(dir, `${t}.png`)));
  put(x0 + S + gap, y0, (x, y) => { const s = (Math.floor(y / zoom) * hd.width + Math.floor(x / zoom)) * 4; return [hd.data[s], hd.data[s + 1], hd.data[s + 2]]; });
});
const file = path.resolve(arg("--out", path.join(dir, "sheet.png")));
fs.writeFileSync(file, PNG.sync.write(out));
console.log(file);
