// Two cheap PixelLab tests: bitforge image-to-image on original tiles with the EGA palette forced.
import fs from "node:fs";
import { PNG } from "pngjs";
import { b64, call, save } from "../pixellab.mjs";

const EGA = [[0,0,0],[0,0,170],[0,170,0],[0,170,170],[170,0,0],[170,0,170],[170,85,0],[170,170,170],[85,85,85],[85,85,255],[85,255,85],[85,255,255],[255,85,85],[255,85,255],[255,255,85],[255,255,255]];
const atlas = PNG.sync.read(fs.readFileSync("assets/original/tiles/original/tiles.png"));
const tile = (t, size) => {
  const out = new PNG({ width: size, height: size }), k = size / 16;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const s = (((t >> 4) * 16 + Math.floor(y / k)) * atlas.width + (t % 16) * 16 + Math.floor(x / k)) * 4, d = (y * size + x) * 4;
    atlas.data.copy(out.data, d, s, s + 4);
  }
  return PNG.sync.write(out);
};
const pal = new PNG({ width: 16, height: 1 });
EGA.forEach(([r, g, b], i) => pal.data.set([r, g, b, 255], i * 4));
const palette = b64(PNG.sync.write(pal));

const tests = [
  { t: 11, desc: "small white stone castle with battlements, two towers with blue bases, red flag on top, dark gate, top-down RPG overworld tile, black background" },
  { t: 192, desc: "green orc warrior with small red horns and blue eyes, arms raised, front view, full body, black background, retro RPG sprite" },
];
const K = process.env.STRENGTH || "500";
for (const { t, desc } of tests.filter((x) => !fs.existsSync(`test-output/pixellab/out-${x.t}-${K}.png`))) {
  fs.writeFileSync(`test-output/pixellab/in-${t}.png`, tile(t, 64));
  const r = await call("POST", "/create-image-bitforge", {
    description: desc,
    image_size: { width: 64, height: 64 },
    init_image: b64(tile(t, 64)),
    init_image_strength: Number(process.env.STRENGTH||500),
    color_image: palette,
    outline: "single color black outline",
    shading: "basic shading",
    detail: "medium detail",
    view: "high top-down",
    seed: 1,
  });
  save(r.image, `test-output/pixellab/out-${t}-${K}.png`);
  console.log(t, JSON.stringify(r.usage));
}
console.log(JSON.stringify(await call("GET", "/balance")));
