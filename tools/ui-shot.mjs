// Full-page screenshots of the running dev server (HTML interface included), in several layouts.
//   node tools/ui-shot.mjs <name> [query] [steps...]
// Writes test-output/ui/<name>-land.png (1400x900 desktop) and <name>-port.png (iPad portrait, touch).
// Steps as in tools/scenarios.mjs: keys, "type:", "wait:", "tick:", "eval:", plus "click:<css selector>".
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const [name = "shot", query = "skipintro&seed=1", ...steps] = process.argv.slice(2);
const URL = (process.env.URL ?? "http://127.0.0.1:1420/") + "?" + query;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
fs.mkdirSync("test-output/ui", { recursive: true });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [suffix, vp] of [["land", { width: 1400, height: 900 }], ["port", { width: 820, height: 1180, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }]]) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`[${suffix}] pageerror ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) console.log(`[${suffix}] ${m.text()}`); });
  await page.setViewport(vp);
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.waitForFunction("window.__game", { timeout: 15000 });
  await pause(1500);
  for (const s of steps) {
    if (s.startsWith("wait:")) await pause(+s.slice(5));
    else if (s.startsWith("tick:")) await page.evaluate(`window.__tick && window.__tick(${+s.slice(5)})`);
    else if (s.startsWith("type:")) await page.keyboard.type(s.slice(5), { delay: 50 });
    else if (s.startsWith("eval:")) console.log(`[${suffix}]`, JSON.stringify(await page.evaluate(s.slice(5))));
    else if (s.startsWith("click:")) { await page.click(s.slice(6)); await pause(300); }
    else { const [k, n] = s.split("*"); for (let i = 0; i < (+n || 1); i++) { await page.keyboard.press(k); await pause(150); } }
  }
  await pause(500);
  await page.screenshot({ path: `test-output/ui/${name}-${suffix}.png` });
  await page.close();
}
await browser.close();
console.log(`test-output/ui/${name}-land.png, -port.png`);
