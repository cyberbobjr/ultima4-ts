// Finds where strings live in the original AVATAR.EXE data segment, to declare texts by location
// (src/data/text.ts) instead of copying them into the source.
//
//   npx tsx tools/find-strings.ts [--game-dir <dir>] [--json <file.json>] [--loose] "Pirate" "Mandrake" ...
//
// For each string: every DS offset where it occurs NUL-terminated, and every DS word that points to
// that offset (pointer tables show up as runs of consecutive words). --loose also reports
// case-insensitive occurrences that are not NUL-terminated (substrings, other casing).
// The JSON file may hold an array of strings. Default game dir: $U4_GAME_DIR or the GOG location.
import fs from "node:fs";
import path from "node:path";
import { avatarSegment } from "./exe/image";

const argv = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const flag = (name: string): boolean => {
  const i = argv.indexOf(name);
  if (i >= 0) argv.splice(i, 1);
  return i >= 0;
};

const gameDir = opt("--game-dir") ?? process.env.U4_GAME_DIR ?? "C:/Program Files/GOG Galaxy/Games/Ultima 4";
const jsonFile = opt("--json");
const loose = flag("--loose");
const wanted: string[] = [...argv];
if (jsonFile) wanted.push(...(JSON.parse(fs.readFileSync(jsonFile, "utf8")) as string[]));
if (!wanted.length) {
  console.error("usage: npx tsx tools/find-strings.ts [--game-dir <dir>] [--json <file>] [--loose] <string>...");
  process.exit(1);
}

const seg = avatarSegment(new Uint8Array(fs.readFileSync(path.join(gameDir, "AVATAR.EXE"))));
const img = seg.image;
const dsEnd = Math.min(img.length, seg.base + 0x10000);
const hex = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");

/** DS offsets where `bytes` starts (exact, or case-insensitive when `ci`). */
function occurrences(s: string, ci: boolean): number[] {
  const low = (c: number) => (ci && c >= 0x41 && c <= 0x5a ? c | 0x20 : c);
  const b = Array.from(s, (ch) => low(ch.charCodeAt(0) & 0xff));
  const out: number[] = [];
  for (let i = seg.base; i + b.length <= dsEnd; i++) {
    let k = 0;
    while (k < b.length && low(img[i + k]) === b[k]) k++;
    if (k === b.length) out.push(i - seg.base);
  }
  return out;
}

/** DS words (even or odd offsets) equal to `off`. */
function pointersTo(off: number): number[] {
  const out: number[] = [];
  for (let i = seg.base; i + 1 < dsEnd; i++) if ((img[i] | (img[i + 1] << 8)) === off) out.push(i - seg.base);
  return out;
}

for (const s of wanted) {
  const exact = occurrences(s, false).filter((o) => seg.byte(o + s.length) === 0);
  console.log(`${JSON.stringify(s)}`);
  if (!exact.length) console.log("  (no NUL-terminated occurrence)");
  for (const o of exact) {
    const p = pointersTo(o);
    console.log(`  DS:${hex(o)}${p.length ? `  <- ptrs at ${p.map((x) => `DS:${hex(x)}`).join(", ")}` : ""}`);
  }
  if (loose) {
    for (const o of occurrences(s, true)) {
      if (exact.includes(o)) continue;
      // start of the enclosing NUL-terminated string
      let st = o;
      while (st > 0 && seg.byte(st - 1) !== 0) st--;
      console.log(`  ~ DS:${hex(o)} inside DS:${hex(st)} ${JSON.stringify(seg.str(st))}`);
    }
  }
}
