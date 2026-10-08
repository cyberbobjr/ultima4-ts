// Headless regression scenarios: replays scripted inputs on a seeded game and compares
// canvas screenshots against a reference run.
//
//   node tools/scenarios.mjs --ref        record references   (test-output/scenarios/ref)
//   node tools/scenarios.mjs              compare a new run   (test-output/scenarios/run)
//   node tools/scenarios.mjs world town   only these scenarios
//
// Needs a running dev server (npm run dev) and a local Chrome. Screenshots contain original-game
// graphics, so test-output/ is git-ignored.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { PNG } from "pngjs";

const URL = process.env.URL ?? "http://127.0.0.1:1420/";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = path.resolve("test-output/scenarios");

// step: key name ("ArrowUp", "a", "Enter"), "key*n", "type:text", "tick:n", "wait:ms", "eval:js", "shot"
export const SCENARIOS = {
  world: ["tick:4", "shot", "ArrowRight*3", "tick:2", "shot", "ArrowUp*2", "shot"],
  ztats: ["z", "wait:300", "shot", "1", "wait:300", "shot"],
  castle: ["eval:__game.setPos(86,107)", "shot", "e", "wait:800", "tick:2", "shot", "ArrowUp*4", "tick:2", "shot"],
  dungeon: ["eval:__toDungeon(17)", "e", "wait:1500", "shot", "i", "wait:600", "shot", "ArrowUp", "wait:600", "shot", "ArrowLeft", "wait:600", "shot"],
  combat: ["eval:void __game.worldFight({ tile: 0xc0, x: __game.px, y: __game.py - 1 })", "wait:1200", "shot",
    "a", "ArrowUp", "wait:1500", "shot", "Space", "wait:1500", "shot"],
  locate: ["l", "wait:300", "shot", "p", "wait:300", "shot"],
};

const args = process.argv.slice(2);
const isRef = args.includes("--ref");
const only = args.filter((a) => !a.startsWith("--"));
const names = only.length ? only : Object.keys(SCENARIOS);

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--window-size=1280,960"],
});

let failures = 0;
for (const name of names) {
  const steps = SCENARIOS[name];
  if (!steps) { console.log(`?? unknown scenario ${name}`); failures++; continue; }
  const dir = path.join(OUT, isRef ? "ref" : "run", name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 720 });
  const logs = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`[${m.type()}] ${m.text()}`); });
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(`${URL}?skipintro&seed=1`, { waitUntil: "networkidle0" });
  await page.waitForFunction("window.__game && window.__game.map", { timeout: 15000 });
  await pause(800);
  let n = 0;
  for (const s of steps) {
    if (s === "shot") {
      await pause(250);
      const canvas = await page.$("canvas");
      await canvas.screenshot({ path: path.join(dir, `${String(n++).padStart(2, "0")}.png`) });
    } else if (s.startsWith("wait:")) await pause(+s.slice(5));
    else if (s.startsWith("tick:")) await page.evaluate(`window.__tick(${+s.slice(5)})`);
    else if (s.startsWith("type:")) await page.keyboard.type(s.slice(5), { delay: 60 });
    else if (s.startsWith("eval:")) await page.evaluate(s.slice(5));
    else {
      const [k, times] = s.split("*");
      for (let i = 0; i < (+times || 1); i++) { await page.keyboard.press(k); await pause(150); }
    }
  }
  await page.close();
  let status = "recorded";
  if (!isRef) {
    const refDir = path.join(OUT, "ref", name);
    const diffs = [];
    for (const f of fs.readdirSync(dir)) {
      const refFile = path.join(refDir, f);
      if (!fs.existsSync(refFile)) { diffs.push(`${f}: no reference`); continue; }
      const a = PNG.sync.read(fs.readFileSync(refFile)), b = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
      if (a.width !== b.width || a.height !== b.height) { diffs.push(`${f}: size`); continue; }
      let d = 0;
      for (let i = 0; i < a.data.length; i += 4)
        if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) d++;
      if (d) diffs.push(`${f}: ${d} px`);
    }
    status = diffs.length ? `DIFF ${diffs.join(", ")}` : "same";
    if (diffs.length) failures++;
  }
  console.log(`${name.padEnd(10)} ${status}${logs.length ? "\n  " + logs.join("\n  ") : ""}`);
}
await browser.close();
process.exit(failures ? 1 : 0);
