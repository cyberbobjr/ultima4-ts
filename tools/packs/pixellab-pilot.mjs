// PixelLab pilot: redraws a sample of tiles per category with bitforge (EGA palette forced, init image =
// original tile x4, strength per category), then builds a test pack where the other tiles come from the
// Scale4x pack. See docs/PIXELLAB.md.
//
//   node tools/packs/pixellab-pilot.mjs            (skips tiles already generated)
//
// Output: test-output/pixellab/pilot/<tile>.png, a review sheet, and assets/packs/pixellab-derived/
// (derived from the original tiles: local only).
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { b64, call, save } from "./pixellab.mjs";

const OUT = path.resolve("test-output/pixellab/pilot");
const SIZE = 64;
const EGA = [[0,0,0],[0,0,170],[0,170,0],[0,170,170],[170,0,0],[170,0,170],[170,85,0],[170,170,170],[85,85,85],[85,85,255],[85,255,85],[85,255,255],[255,85,85],[255,85,255],[255,255,85],[255,255,255]];

/** Category settings: how much of the original is kept, and the camera. */
const CAT = {
  terrain: { strength: 350, view: "high top-down", extra: "seamless tileable top-down terrain texture filling the whole tile" },
  place: { strength: 350, view: "high top-down", extra: "single map icon centered on black background" },
  object: { strength: 300, view: "high top-down", extra: "single object centered on black background" },
  person: { strength: 220, view: "side", extra: "full body, front view, centered, black background, retro RPG sprite" },
  monster: { strength: 220, view: "side", extra: "full body, front view, centered, black background, retro RPG sprite" },
};

const PILOT = [
  [4, "terrain", "grassland, black ground with small bright green grass tufts"],
  [6, "terrain", "dense forest of round green tree crowns seen from above"],
  [8, "terrain", "grey rocky mountain ridges with white snowy edges"],
  [1, "terrain", "blue sea water with short horizontal wave lines"],
  [3, "terrain", "swamp, dark green mud with murky puddles and reeds"],
  [10, "place", "small walled medieval town with two orange roofed towers and a gate"],
  [11, "place", "small white stone castle with battlements, two towers with blue bases, red flag, dark gate"],
  [12, "place", "three small red roofed huts"],
  [9, "place", "dark cave entrance in a grey rocky hill"],
  [30, "place", "small circle of grey standing stones"],
  [67, "place", "glowing blue magic portal between two pillars"],
  [60, "object", "wooden treasure chest with iron bands"],
  [61, "object", "white ankh symbol"],
  [16, "object", "sailing frigate seen from above, facing west"],
  [31, "person", "young hero with a brown hat, green tunic, red trousers, white shield with a cross, short sword"],
  [32, "person", "mage in a long blue robe with a pointed hat and a staff"],
  [80, "person", "town guard in grey armour with a helmet and a long spear"],
  [94, "person", "king with a golden crown and a purple royal robe"],
  [192, "monster", "green orc warrior with small red horns and blue eyes, arms raised"],
  [196, "monster", "white skeleton warrior with a sword"],
  [248, "monster", "green dragon seen from the side, wings raised"],
];
/** Animation test: these frames reuse their first frame as style image. */
const FRAMES = [[193, 192]];

const atlas = PNG.sync.read(fs.readFileSync("assets/original/tiles/original/tiles.png"));
function tile(t, size) {
  const out = new PNG({ width: size, height: size }), k = size / 16;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const s = (((t >> 4) * 16 + Math.floor(y / k)) * atlas.width + (t % 16) * 16 + Math.floor(x / k)) * 4, d = (y * size + x) * 4;
    atlas.data.copy(out.data, d, s, s + 4);
  }
  return PNG.sync.write(out);
}
const pal = new PNG({ width: 16, height: 1 });
EGA.forEach(([r, g, b], i) => pal.data.set([r, g, b, 255], i * 4));
const palette = b64(PNG.sync.write(pal));

async function gen(t, cat, desc, style) {
  const file = path.join(OUT, `${t}.png`);
  if (fs.existsSync(file)) return;
  const c = CAT[cat];
  const r = await call("POST", "/create-image-bitforge", {
    description: `${desc}, ${c.extra}`,
    image_size: { width: SIZE, height: SIZE },
    init_image: b64(tile(t, SIZE)),
    init_image_strength: c.strength,
    color_image: palette,
    ...(style ? { style_image: b64(style), style_strength: 60 } : {}),
    outline: "single color black outline",
    shading: "basic shading",
    detail: "medium detail",
    view: c.view,
    seed: 1,
  });
  save(r.image, file);
  console.log(`tile ${t} (${cat}) done`);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [t, cat, desc] of PILOT) {
  try { await gen(t, cat, desc); } catch (e) { console.log(`tile ${t}: ${e.message}`); }
}
for (const [t, first] of FRAMES) {
  const [, cat, desc] = PILOT.find(([x]) => x === first);
  const ref = path.join(OUT, `${first}.png`);
  if (fs.existsSync(ref)) try { await gen(t, cat, `${desc}, same character as the style image, next animation frame`, fs.readFileSync(ref)); } catch (e) { console.log(`tile ${t}: ${e.message}`); }
}

// review sheet: original x4 | generated, for every pilot tile
const done = [...PILOT.map(([t]) => t), ...FRAMES.map(([t]) => t)].filter((t) => fs.existsSync(path.join(OUT, `${t}.png`)));
const Z = 2, S = SIZE * Z, g = 6, cols = 4;
const sheet = new PNG({ width: cols * (2 * S + 3 * g), height: Math.ceil(done.length / cols) * (S + 2 * g) });
sheet.data.fill(60);
done.forEach((t, i) => {
  const x0 = (i % cols) * (2 * S + 3 * g) + g, y0 = Math.floor(i / cols) * (S + 2 * g) + g;
  for (const [img, dx] of [[PNG.sync.read(tile(t, SIZE)), 0], [PNG.sync.read(fs.readFileSync(path.join(OUT, `${t}.png`))), S + g]])
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const s = (Math.floor(y / Z) * img.width + Math.floor(x / Z)) * 4, d = ((y0 + y) * sheet.width + x0 + dx + x) * 4;
      img.data.copy(sheet.data, d, s, s + 4);
      if (img.data[s + 3] === 0) { sheet.data[d] = sheet.data[d + 1] = sheet.data[d + 2] = 0; sheet.data[d + 3] = 255; }
    }
});
fs.writeFileSync(path.join(OUT, "sheet.png"), PNG.sync.write(sheet));

// test pack: Scale4x base with the generated tiles pasted in (transparent pixels -> black)
const basePack = path.resolve("assets/packs/scale4x-derived");
if (fs.existsSync(path.join(basePack, "tiles.png"))) {
  const base = PNG.sync.read(fs.readFileSync(path.join(basePack, "tiles.png")));
  for (const t of done) {
    const img = PNG.sync.read(fs.readFileSync(path.join(OUT, `${t}.png`)));
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const s = (y * img.width + x) * 4, d = (((t >> 4) * SIZE + y) * base.width + (t % 16) * SIZE + x) * 4;
      const a = img.data[s + 3];
      base.data[d] = a ? img.data[s] : 0; base.data[d + 1] = a ? img.data[s + 1] : 0; base.data[d + 2] = a ? img.data[s + 2] : 0; base.data[d + 3] = 255;
    }
  }
  const dir = path.resolve("assets/packs/pixellab-derived");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "tiles.png"), PNG.sync.write(base));
  const meta = JSON.parse(fs.readFileSync(path.join(basePack, "pack.json"), "utf8"));
  fs.writeFileSync(path.join(dir, "pack.json"), JSON.stringify({ ...meta, name: "PixelLab pilot (Scale4x elsewhere)" }, null, 2));
}
console.log(`${done.length} tiles; balance ${JSON.stringify(await call("GET", "/balance"))}`);
