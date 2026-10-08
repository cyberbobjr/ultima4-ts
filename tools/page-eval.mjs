// Dev helper: loads the game (?skipintro&seed=1), runs steps like tools/scenarios.mjs and prints
// the result of each "eval:" step.   node tools/page-eval.mjs "eval:..." "a" "wait:500" ...
import puppeteer from "puppeteer-core";
const URL = (process.env.URL ?? "http://127.0.0.1:1420/") + "?skipintro&seed=1" + (process.env.QUERY ? "&" + process.env.QUERY : "");
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 960 });
page.on("pageerror", (e) => console.log(`[pageerror] ${e.stack ?? e.message}`));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warn") console.log(`[${m.type()}] ${m.text()}`); });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.waitForFunction("window.__game && window.__game.map", { timeout: 15000 });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
for (const s of process.argv.slice(2)) {
  if (s.startsWith("wait:")) await pause(+s.slice(5));
  else if (s.startsWith("tick:")) await page.evaluate(`window.__tick(${+s.slice(5)})`);
  else if (s.startsWith("type:")) await page.keyboard.type(s.slice(5), { delay: 60 });
  else if (s.startsWith("eval:")) console.log(s.slice(5, 60), "=>", JSON.stringify(await page.evaluate(s.slice(5))));
  else if (s.startsWith("shot:")) await (await page.$("canvas")).screenshot({ path: s.slice(5) });
  else { const [k, n] = s.split("*"); for (let i = 0; i < (+n || 1); i++) { await page.keyboard.press(k); await pause(150); } }
}
await browser.close();
