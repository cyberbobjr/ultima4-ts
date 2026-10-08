import { describe, expect, it } from "vitest";
import { rleDecode, lzwDecode } from "../src/formats/compression";
import { decodeTiles, decodeCharset, decodeScreen, unpack4bpp } from "../src/formats/ega";
import { decodeWorld, decodeTown, decodeCombat, decodeDungeon } from "../src/formats/maps";
import { decodeSave, encodeSave, SAVE_SIZE } from "../src/formats/save";
import { decodeTalk } from "../src/formats/tlk";
import { hasGame, readGame } from "./gamedir";

describe("formats (synthetic)", () => {
  it("unpacks 4bpp pixels high nibble first", () => {
    expect(Array.from(unpack4bpp(new Uint8Array([0x12, 0xab]), 4))).toEqual([1, 2, 0xa, 0xb]);
  });
  it("rle passes literal bytes through", () => {
    const out = rleDecode(new Uint8Array([1, 2, 3]));
    expect(Array.from(out.slice(0, 3))).toEqual([1, 2, 3]);
  });
});

describe.skipIf(!hasGame)("formats (original files)", () => {
  it("PARTY.SAV and PARTY.NEW round-trip byte for byte", () => {
    for (const f of ["PARTY.NEW", "PARTY.SAV"]) {
      const raw = readGame(f);
      expect(raw.length).toBe(SAVE_SIZE);
      expect(Buffer.compare(Buffer.from(raw), Buffer.from(encodeSave(decodeSave(raw))))).toBe(0);
    }
  });
  it("decodes the 256 tiles and the charset", () => {
    const tiles = decodeTiles(readGame("SHAPES.EGA"));
    expect(tiles.length).toBe(256);
    expect(tiles[0].width).toBe(16);
    expect(decodeCharset(readGame("CHARSET.EGA")).length).toBeGreaterThanOrEqual(128);
  });
  it("decodes full-screen pictures to 320x200", () => {
    const img = decodeScreen(readGame("START.EGA"));
    expect([img.width, img.height]).toEqual([320, 200]);
  });
  it("decodes the world map", () => {
    expect(decodeWorld(readGame("WORLD.MAP")).length).toBe(256 * 256);
  });
  it("decodes Castle Britannia and its dialogues", () => {
    const town = decodeTown(readGame("LCB_1.ULT"));
    expect(town.tiles.length).toBe(32 * 32);
    expect(town.npcs.length).toBeGreaterThan(0);
    const talk = decodeTalk(readGame("LCB.TLK"));
    expect(talk.filter(Boolean).length).toBeGreaterThan(0);
  });
  it("decodes combat maps and dungeons", () => {
    expect(decodeCombat(readGame("GRASS.CON")).tiles.length).toBe(121);
    const d = decodeDungeon(readGame("DECEIT.DNG"));
    expect(d).toBeTruthy();
  });
  it("lzw decodes a title picture", () => {
    expect(lzwDecode(readGame("TITLE.EGA")).length).toBeGreaterThan(0);
  });
});
