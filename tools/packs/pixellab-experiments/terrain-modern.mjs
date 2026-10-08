// Terrain, second try: free palette, no init image (text only), detailed modern style; 3x3 seam preview.
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { call, save } from "../pixellab.mjs";

const OUT = path.resolve("test-output/pixellab/terrain2"), SIZE = 64;
const STYLE = "top-down game terrain tile, seamless tileable texture filling the whole square edge to edge, modern high quality pixel art like Stardew Valley or Eastward, vibrant natural colors, soft shading, no border, no frame, no objects";
const TILES = [
  [4, "lush grass meadow with small tufts and a few tiny flowers"],
  [1, "ocean water, deep blue with subtle wave highlights"],
  [6, "dense forest canopy, round tree crowns in several greens, dark gaps between them"],
];
fs.mkdirSync(OUT, { recursive: true });
for (const [t, desc] of TILES) {
  const file = path.join(OUT, `${t}.png`);
  if (fs.existsSync(file)) continue;
  const r = await call("POST", "/create-image-bitforge", {
    description: `${desc}, ${STYLE}`,
    image_size: { width: SIZE, height: SIZE },
    outline: "lineless", shading: "detailed shading", detail: "highly detailed", view: "high top-down", seed: 3,
  });
  save(r.image, file);
  console.log(`tile ${t} done`);
}
const done = TILES.map(([t]) => t);
const P = SIZE * 3, g = 8;
const sheet = new PNG({ width: done.length * (P + g) + g, height: P + 2 * g });
sheet.data.fill(60);
done.forEach((t, i) => {
  const img = PNG.sync.read(fs.readFileSync(path.join(OUT, `${t}.png`)));
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
    const s = ((y % SIZE) * img.width + (x % SIZE)) * 4, d = ((g + y) * sheet.width + g + i * (P + g) + x) * 4;
    img.data.copy(sheet.data, d, s, s + 4); sheet.data[d + 3] = 255;
  }
});
fs.writeFileSync(path.join(OUT, "sheet.png"), PNG.sync.write(sheet));
console.log(JSON.stringify(await call("GET", "/balance")));
