// Dumps every exported value of the data/text modules to test-output/tables-snapshot.json.
// Used once before moving texts out of the source: tests/extracted.test.ts compares the engine
// tables (fed by the extracted assets) with this snapshot. The output contains original-game text
// and stays in the git-ignored test-output/ folder.
import fs from "node:fs";
import path from "node:path";
import * as tables from "../src/data/tables";
import * as strings from "../src/game/town/strings";
import * as dungeon from "../src/dungeon/tables";

const plain = (v: unknown): unknown => JSON.parse(JSON.stringify(v));
const out = { tables: plain(tables), strings: plain(strings), dungeon: plain(dungeon) };
fs.mkdirSync("test-output", { recursive: true });
fs.writeFileSync(path.join("test-output", "tables-snapshot.json"), JSON.stringify(out, null, 1));
console.log("snapshot written:", Object.keys(tables).length, "tables,", Object.keys(strings).length, "string groups");
