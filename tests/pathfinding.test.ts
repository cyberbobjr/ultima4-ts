import { describe, expect, it } from "vitest";
import { findPath, findPathNextTo, walkMask, wrapDelta, type PathGrid } from "../src/game/pathfinding";
import type { Dir } from "../src/game/maps";
import { T, Walk } from "../src/game/tiles";

/** Grid from rows of text: "." floor, "#" wall, "~" slow. */
function grid(rows: string[], extra: Partial<PathGrid> = {}): PathGrid {
  return {
    width: rows[0].length, height: rows.length,
    passable: (x, y) => rows[y][x] !== "#",
    cost: (x, y) => (rows[y][x] === "~" ? 3 : 0),
    ...extra,
  };
}

/** End square of a path. */
function walk(sx: number, sy: number, path: Dir[], w?: number, h?: number): [number, number] {
  const D = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] } as const;
  let x = sx, y = sy;
  for (const d of path) { x += D[d][0]; y += D[d][1]; if (w) { x = (x + w) % w; y = (y + h!) % h!; } }
  return [x, y];
}

describe("pathfinding", () => {
  it("goes straight on an open map", () => {
    const g = grid([".....", ".....", "....."]);
    expect(findPath(g, 0, 1, 3, 1)).toEqual(["E", "E", "E"]);
    expect(findPath(g, 2, 2, 2, 2)).toEqual([]);
  });

  it("goes around walls", () => {
    const g = grid([
      ".....",
      ".###.",
      ".#...",
      ".#.#.",
      ".....",
    ]);
    const p = findPath(g, 0, 0, 2, 2)!;
    expect(p).not.toBeNull();
    expect(p.length).toBe(8);
    expect(walk(0, 0, p)).toEqual([2, 2]);
  });

  it("returns null for a wall or an unreachable square", () => {
    const g = grid(["..#..", "..#..", "..#.."]);
    expect(findPath(g, 0, 0, 4, 0)).toBeNull();
    expect(findPath(g, 0, 0, 2, 1)).toBeNull();
  });

  it("limits the search length", () => {
    const g = grid([".".repeat(40)]);
    expect(findPath(g, 0, 0, 39, 0, { maxSteps: 64 })!.length).toBe(39);
    expect(findPath(g, 0, 0, 39, 0, { maxSteps: 20 })).toBeNull();
  });

  it("prefers cheaper squares", () => {
    const g = grid([
      "...",
      ".~.",
      "...",
    ]);
    const p = findPath(g, 1, 0, 1, 2)!;
    expect(p.length).toBe(4); // around the slow square rather than through it (2 steps, cost 5)
  });

  it("wraps around the world edges", () => {
    const rows = Array.from({ length: 8 }, () => "........");
    const g = grid(rows, { wrap: true });
    expect(findPath(g, 7, 3, 1, 3)).toEqual(["E", "E"]);
    expect(findPath(g, 2, 0, 2, 6)).toEqual(["N", "N"]);
    const p = findPath(g, 7, 7, 0, 0)!;
    expect(p.length).toBe(2);
    expect(walk(7, 7, p, 8, 8)).toEqual([0, 0]);
  });

  it("leaves a town through the edge but does not cross outside", () => {
    const g = grid([
      "#####",
      "#...#",
      "#....",
      "#####",
    ], { exits: true });
    const out = findPath(g, 1, 1, 5, 2)!;
    expect(out.length).toBe(5);
    expect(walk(1, 1, out)).toEqual([5, 2]);
    // outside squares are ends, not corridors
    expect(findPath(g, 3, 2, 5, 0)).toBeNull();
    expect(findPath(grid(["...."]), 0, 0, 4, 0)).toBeNull();
  });

  it("reaches a square next to a blocked target", () => {
    const g = grid([
      ".....",
      ".....",
      "..#..",
    ]);
    const npc = (x: number, y: number) => x === 4 && y === 0;
    const blocked = { ...g, passable: (x: number, y: number) => g.passable(x, y) && !npc(x, y) };
    const p = findPathNextTo(blocked, 0, 0, 4, 0)!;
    expect(p).toEqual(["E", "E", "E"]);
    expect(findPathNextTo(blocked, 3, 0, 4, 0)).toEqual([]);
  });

  it("walkability by transport", () => {
    expect(walkMask(T.AVATAR)).toBe(Walk.Foot);
    expect(walkMask(T.HORSE_E)).toBe(Walk.Horse);
    expect(walkMask(T.SHIP_N)).toBe(Walk.Ship);
    expect(walkMask(T.BALLOON)).toBeNull();
    expect(wrapDelta(250, 3, 256)).toBe(9);
    expect(wrapDelta(3, 250, 256)).toBe(-9);
  });
});
