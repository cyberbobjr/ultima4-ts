// Generates HD versions of tiles with a local ComfyUI (Qwen-Image-Edit-2511 + Lightning LoRA):
// each original 16x16 tile is enlarged (nearest), redrawn by the model with the same composition,
// then reduced to the pack size.
//
//   node tools/packs/comfy-hd.mjs --tiles 4,6,0,31 | --all  [--size 64] [--out test-output/hd] [--seed 1] [--force]
//
// hd-prompts.json: a base prompt, one description per tile, "copy" ranges [first, count] that are only
// enlarged (sign letters), and animation "groups" [first, count]: the frames after the first are redrawn
// with the first frame's HD version as a second reference image, so the frames stay consistent.
// Existing outputs are kept unless --force (the run can be resumed).
//
// Reads assets/original/tiles/original/tiles.png; writes <out>/<tile>.png (pack size) and
// <out>/raw/<tile>.png (model output). The result is derived from the original tiles: keep it out of
// the public branches (assets/packs/*-derived).
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const COMFY = process.env.COMFY ?? "http://127.0.0.1:8188";
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const SIZE = Number(arg("--size", "64"));
const OUT = path.resolve(arg("--out", "test-output/hd"));
const SEED = Number(arg("--seed", "1"));
const STEPS = Number(arg("--steps", "8"));
const tiles = process.argv.includes("--all") ? Array.from({ length: 256 }, (_, i) => i) : arg("--tiles", "4").split(",").map((s) => Number(s));
const FORCE = process.argv.includes("--force");
const PROMPTS = JSON.parse(fs.readFileSync(path.resolve(arg("--prompts", "tools/packs/hd-prompts.json")), "utf8"));

const atlas = PNG.sync.read(fs.readFileSync("assets/original/tiles/original/tiles.png"));
const BIG = 1024, K = BIG / 16;

function tileImage(t) {
  const out = new PNG({ width: BIG, height: BIG });
  const ox = (t % 16) * 16, oy = (t >> 4) * 16;
  for (let y = 0; y < BIG; y++)
    for (let x = 0; x < BIG; x++) {
      const s = ((oy + Math.floor(y / K)) * atlas.width + ox + Math.floor(x / K)) * 4, d = (y * BIG + x) * 4;
      out.data[d] = atlas.data[s]; out.data[d + 1] = atlas.data[s + 1]; out.data[d + 2] = atlas.data[s + 2]; out.data[d + 3] = 255;
    }
  return PNG.sync.write(out);
}

/** Area average down to SIZE x SIZE. */
function reduce(buf) {
  const src = PNG.sync.read(buf), out = new PNG({ width: SIZE, height: SIZE });
  const fx = src.width / SIZE, fy = src.height / SIZE;
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const acc = [0, 0, 0]; let n = 0;
      for (let j = Math.floor(y * fy); j < Math.floor((y + 1) * fy); j++)
        for (let i = Math.floor(x * fx); i < Math.floor((x + 1) * fx); i++) {
          const s = (j * src.width + i) * 4;
          acc[0] += src.data[s]; acc[1] += src.data[s + 1]; acc[2] += src.data[s + 2]; n++;
        }
      const d = (y * SIZE + x) * 4;
      out.data[d] = acc[0] / n; out.data[d + 1] = acc[1] / n; out.data[d + 2] = acc[2] / n; out.data[d + 3] = 255;
    }
  return PNG.sync.write(out);
}

async function upload(name, buf) {
  const fd = new FormData();
  fd.append("image", new Blob([buf], { type: "image/png" }), name);
  fd.append("overwrite", "true");
  const r = await fetch(`${COMFY}/upload/image`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(`upload: ${r.status}`);
  return (await r.json()).name;
}

function workflow(image, prompt, seed, ref) {
  return {
    unet: { class_type: "UNETLoader", inputs: { unet_name: "qwen_image_edit_2511_fp8mixed.safetensors", weight_dtype: "default" } },
    lora: { class_type: "LoraLoaderModelOnly", inputs: { model: ["unet", 0], lora_name: "QWEN EDIT\\Qwen-Image-Edit-2511-Lightning-8steps-V1.0-bf16.safetensors", strength_model: 1 } },
    shift: { class_type: "ModelSamplingAuraFlow", inputs: { model: ["lora", 0], shift: 3.1 } },
    clip: { class_type: "CLIPLoader", inputs: { clip_name: "QWEN\\qwen_2.5_vl_7b_fp8_scaled.safetensors", type: "qwen_image", device: "default" } },
    vae: { class_type: "VAELoader", inputs: { vae_name: "qwen_image_vae.safetensors" } },
    img: { class_type: "LoadImage", inputs: { image } },
    ...(ref ? { ref: { class_type: "LoadImage", inputs: { image: ref } } } : {}),
    pos: { class_type: "TextEncodeQwenImageEditPlus", inputs: { clip: ["clip", 0], prompt, vae: ["vae", 0], image1: ["img", 0], ...(ref ? { image2: ["ref", 0] } : {}) } },
    neg: { class_type: "TextEncodeQwenImageEditPlus", inputs: { clip: ["clip", 0], prompt: "", vae: ["vae", 0], image1: ["img", 0], ...(ref ? { image2: ["ref", 0] } : {}) } },
    lat: { class_type: "VAEEncode", inputs: { pixels: ["img", 0], vae: ["vae", 0] } },
    ks: { class_type: "KSampler", inputs: { model: ["shift", 0], positive: ["pos", 0], negative: ["neg", 0], latent_image: ["lat", 0], seed, steps: STEPS, cfg: 1, sampler_name: "euler", scheduler: "simple", denoise: 1 } },
    dec: { class_type: "VAEDecode", inputs: { samples: ["ks", 0], vae: ["vae", 0] } },
    save: { class_type: "SaveImage", inputs: { images: ["dec", 0], filename_prefix: "u4hd" } },
  };
}

const inRanges = (t, ranges) => ranges.find(([a, n]) => t >= a && t < a + n);

/** Only enlarged (letters of signs): nearest neighbour to SIZE. */
function copyTile(t) {
  const out = new PNG({ width: SIZE, height: SIZE }), k = SIZE / 16, ox = (t % 16) * 16, oy = (t >> 4) * 16;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const s = ((oy + Math.floor(y / k)) * atlas.width + ox + Math.floor(x / k)) * 4, d = (y * SIZE + x) * 4;
    out.data[d] = atlas.data[s]; out.data[d + 1] = atlas.data[s + 1]; out.data[d + 2] = atlas.data[s + 2]; out.data[d + 3] = 255;
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${t}.png`), PNG.sync.write(out));
}

async function run(t) {
  if (inRanges(t, PROMPTS.copy ?? [])) { copyTile(t); return; }
  const group = inRanges(t, PROMPTS.groups ?? []);
  const first = group ? group[0] : t;
  let ref = null;
  if (group && t !== first) {
    const rawFirst = path.join(OUT, "raw", `${first}.png`);
    if (!fs.existsSync(rawFirst)) await run(first);
    ref = await upload(`u4hd_${first}.png`, fs.readFileSync(rawFirst));
  }
  const name = await upload(`u4tile_${t}.png`, tileImage(t));
  const kind = PROMPTS.tiles[String(t)] ?? PROMPTS.tiles[String(first)] ?? "";
  const prompt = [PROMPTS.base, kind, ref ? PROMPTS.frame : ""].filter(Boolean).join(" ");
  const r = await fetch(`${COMFY}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: workflow(name, prompt, SEED + first, ref) }) });
  if (!r.ok) throw new Error(`prompt: ${r.status} ${await r.text()}`);
  const { prompt_id } = await r.json();
  for (;;) {
    await new Promise((res) => setTimeout(res, 1000));
    const h = await (await fetch(`${COMFY}/history/${prompt_id}`)).json();
    const entry = h[prompt_id];
    if (!entry) continue;
    if (entry.status?.status_str === "error") throw new Error(`tile ${t}: ${JSON.stringify(entry.status.messages).slice(0, 400)}`);
    const img = entry.outputs?.save?.images?.[0];
    if (!img) continue;
    const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder, type: img.type });
    const buf = Buffer.from(await (await fetch(`${COMFY}/view?${q}`)).arrayBuffer());
    fs.mkdirSync(path.join(OUT, "raw"), { recursive: true });
    fs.writeFileSync(path.join(OUT, "raw", `${t}.png`), buf);
    fs.writeFileSync(path.join(OUT, `${t}.png`), reduce(buf));
    return;
  }
}

for (const t of tiles) {
  if (!FORCE && fs.existsSync(path.join(OUT, `${t}.png`))) continue;
  const t0 = Date.now();
  await run(t);
  console.log(`tile ${t}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
