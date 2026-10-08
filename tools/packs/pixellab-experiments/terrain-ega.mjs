// PixelLab terrain test: modern-looking terrain tiles (bitforge, low init strength, detailed shading),
// then 3x3 seam previews and a test pack (pilot + these tiles over Scale4x).
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { b64, call, save } from "../pixellab.mjs";

const OUT = path.resolve("test-output/pixellab/terrain"), SIZE = 64;
const EGA = [[0,0,0],[0,0,170],[0,170,0],[0,170,170],[170,0,0],[170,0,170],[170,85,0],[170,170,170],[85,85,85],[85,85,255],[85,255,85],[85,255,255],[255,85,85],[255,85,255],[255,255,85],[255,255,255]];
const STYLE = "modern 2020s indie pixel art, rich detail, soft lighting, seamless tileable top-down terrain texture filling the whole tile edge to edge, no border, no objects cut at the edges";
const TILES = [
  [4, 150, "lush green grassland seen from above, varied grass blades and small flowers, several shades of green"],
  [6, 150, "dense forest seen from above, rounded tree canopies of different greens touching each other, dark shadows between them"],
  [7, 150, "rolling green hills seen from above, soft rounded mounds with light and shadow"],
  [8, 150, "rocky grey mountains seen from above, sharp ridges and peaks with light and shadow, snow on the highest tips"],
  [1, 150, "deep blue sea seen from above, gentle waves and light reflections"],
  [3, 150, "murky swamp seen from above, dark green water, mud patches, reeds and lily pads"],
];
const atlas = PNG.sync.read(fs.readFileSync("assets/original/tiles/original/tiles.png"));
const tile = (t) => {
  const out = new PNG({ width: SIZE, height: SIZE }), k = SIZE / 16;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const s = (((t >> 4) * 16 + Math.floor(y / k)) * atlas.width + (t % 16) * 16 + Math.floor(x / k)) * 4;
    atlas.data.copy(out.data, (y * SIZE + x) * 4, s, s + 4);
  }
  return PNG.sync.write(out);
};
const pal = new PNG({ width: 16, height: 1 });
EGA.forEach(([r, g, b], i) => pal.data.set([r, g, b, 255], i * 4));
const usePalette = process.env.FREE_PALETTE !== "1";

fs.mkdirSync(OUT, { recursive: true });
for (const [t, strength, desc] of TILES) {
  const file = path.join(OUT, `${t}.png`);
  if (fs.existsSync(file)) continue;
  const r = await call("POST", "/create-image-bitforge", {
    description: `${desc}, ${STYLE}`,
    image_size: { width: SIZE, height: SIZE },
    init_image: b64(tile(t)), init_image_strength: strength,
    ...(usePalette ? { color_image: b64(PNG.sync.write(pal)) } : {}),
    outline: "lineless", shading: "detailed shading", detail: "highly detailed", view: "high top-down", seed: 7,
  });
  save(r.image, file);
  console.log(`tile ${t} done`);
}

// 3x3 seam previews, original next to generated
const done = TILES.map(([t]) => t).filter((t) => fs.existsSync(path.join(OUT, `${t}.png`)));
const P = SIZE * 3, g = 8;
const sheet = new PNG({ width: done.length * (P + g) + g, height: 2 * (P + g) + g });
sheet.data.fill(60);
done.forEach((t, i) => {
  for (const [row, img] of [[0, PNG.sync.read(tile(t))], [1, PNG.sync.read(fs.readFileSync(path.join(OUT, `${t}.png`)))]])
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      const s = ((y % SIZE) * img.width + (x % SIZE)) * 4, d = ((g + row * (P + g) + y) * sheet.width + g + i * (P + g) + x) * 4;
      img.data.copy(sheet.data, d, s, s + 4); sheet.data[d + 3] = 255;
    }
});
fs.writeFileSync(path.join(OUT, "sheet.png"), PNG.sync.write(sheet));

// test pack: pixellab-derived (pilot) with these terrain tiles replacing the others
const packDir = path.resolve("assets/packs/pixellab-derived");
const base = PNG.sync.read(fs.readFileSync(path.join(packDir, "tiles.png")));
for (const t of done) {
  const img = PNG.sync.read(fs.readFileSync(path.join(OUT, `${t}.png`)));
  for (let y = 0; y < SIZE; y++) img.data.copy(base.data, (((t >> 4) * SIZE + y) * base.width + (t % 16) * SIZE) * 4, y * SIZE * 4, (y + 1) * SIZE * 4);
}
fs.writeFileSync(path.join(packDir, "tiles.png"), PNG.sync.write(base));
console.log(`${done.length} tiles; balance ${JSON.stringify(await call("GET", "/balance"))}`);
