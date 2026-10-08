// Checks the extracted assets against the engine: every declared text exists, and (during the
// migration) the tables fed by the catalog equal the snapshot taken before texts left the source.
import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { setGameText, textSpecs } from "../src/data/text";
import "../src/data/all-texts";
import * as tables from "../src/data/tables";
import * as strings from "../src/game/town/strings";
import * as dungeon from "../src/dungeon/tables";
import { unpackExepack } from "../tools/exe/exepack";
import { hasGame, readGame } from "./gamedir";

const ASSETS = path.resolve("assets/original");
const SNAPSHOT = path.resolve("test-output/tables-snapshot.json");
const hasAssets = fs.existsSync(path.join(ASSETS, "manifest.json"));
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(ASSETS, rel), "utf8"));

describe.skipIf(!hasGame)("EXEPACK", () => {
  it("unpacks AVATAR.EXE to the documented image", () => {
    const u = unpackExepack(readGame("AVATAR.EXE"));
    expect(u.image.length).toBe(0x1821 * 16);
    expect([u.cs, u.ip, u.ss, u.sp]).toEqual([0, 0xe94a, 0x1885, 0x800]);
  });
});

describe.skipIf(!hasAssets)("extracted assets", () => {
  beforeAll(() => setGameText(readJson("i18n/en/game.json")));

  it("has a text for every declared key", () => {
    const cat = readJson("i18n/en/game.json");
    const missing = [...textSpecs()].filter(([k, s]) => s.kind !== "port" && cat[k] === undefined).map(([k]) => k);
    expect(missing).toEqual([]);
  });

  it("lists every written file in the manifest", () => {
    const m = readJson("manifest.json");
    for (const f of m.files) expect(fs.existsSync(path.join(ASSETS, f)), f).toBe(true);
  });

  it.skipIf(!fs.existsSync(SNAPSHOT))("feeds the tables with the same values as before the migration", () => {
    const snap = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
    const plain = (v: unknown) => JSON.parse(JSON.stringify(v));
    expect(plain(strings)).toEqual(snap.strings);
    expect(plain(tables)).toEqual(snap.tables);
    expect(plain(dungeon)).toEqual(snap.dungeon);
  });
});
