// Journal of discovered places: discovery radius on the wrapping world, entered locations, save file.
import { describe, expect, it } from "vitest";
import { discover, parseJournal, partyWorldPos, PLACES, placesNear, serializeJournal, worldDistance, wrapDelta } from "../src/game/journal";

const world = (x: number, y: number) => ({ location: 0, x, y, onWorld: true });

describe("journal", () => {
  it("lists every location 1..24, the 7 overworld shrines and the 8 moongates", () => {
    expect(PLACES.filter((p) => p.loc !== undefined)).toHaveLength(24);
    expect(PLACES.filter((p) => p.kind === "shrine")).toHaveLength(7);
    expect(PLACES.filter((p) => p.kind === "moongate")).toHaveLength(8);
    expect(new Set(PLACES.map((p) => p.key)).size).toBe(PLACES.length);
  });

  it("measures distances on the wrapping world", () => {
    expect(wrapDelta(10, 15)).toBe(5);
    expect(wrapDelta(254, 2)).toBe(4);
    expect(wrapDelta(2, 254)).toBe(-4);
    expect(worldDistance(0, 0, 255, 3)).toBe(3);
  });

  it("discovers places within 5 tiles", () => {
    // Britain (86,107 castle; 82,106 town) and the moongate 96,102
    const near = placesNear(84, 107).map((p) => p.key).sort();
    expect(near).toEqual(["loc:1", "loc:6"]);
    expect(discover(new Set(), world(86, 112))).toEqual(["loc:1"]);
    expect(discover(new Set(), world(86, 113))).toEqual([]);
    expect(discover(new Set(["loc:1"]), world(86, 112))).toEqual([]);
  });

  it("discovers the entered location, not the places around town coordinates", () => {
    expect(discover(new Set(), { location: 17, x: 1, y: 1, onWorld: true })).toEqual(["loc:17"]);
    expect(discover(new Set(), { location: 6, x: 86, y: 107, onWorld: false })).toEqual(["loc:6"]);
    expect(discover(new Set(), { location: 0, x: 86, y: 107, onWorld: false })).toEqual([]);
  });

  it("places the party at the entrance while inside", () => {
    expect(partyWorldPos({ location: 17, x: 3, y: 4, onWorld: true })).toEqual({ x: 240, y: 73 });
    expect(partyWorldPos(world(12, 34))).toEqual({ x: 12, y: 34 });
  });

  it("round-trips the save file and drops a journal from a newer game", () => {
    const data = JSON.parse(JSON.stringify(serializeJournal(new Map([["loc:1", 3], ["gate:2", 40]]), 50)));
    expect([...parseJournal(data, 60)]).toEqual([["loc:1", 3], ["gate:2", 40]]);
    expect(parseJournal(data, 10).size).toBe(0);
    expect(parseJournal({ version: 1, moves: 0, places: [{ key: "bogus", moves: 1 }] }, 5).size).toBe(0);
    expect(parseJournal(null, 5).size).toBe(0);
  });
});
