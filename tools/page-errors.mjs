// Prints the console errors and the error screen of a page load (dev helper).
//   node tools/page-errors.mjs [query]
import puppeteer from "puppeteer-core";
const URL = (process.env.URL ?? "http://127.0.0.1:1420/") + (process.argv[2] ?? "?skipintro&seed=1");
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() !== "debug") console.log(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", (e) => console.log(`[pageerror] ${e.stack ?? e.message}`));
await page.goto(URL, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 3000));
console.log("body:", (await page.evaluate("document.body.innerText")).slice(0, 2000));
await browser.close();
