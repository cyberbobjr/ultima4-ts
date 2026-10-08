// Path search for tap-to-move: A* on a grid of squares (4 directions, like the arrow keys).
// The grid is abstract (pure functions, tested on synthetic maps); `gridFor` builds the one of the
// current map for the party's transport. The overworld wraps at 256; out of a town's 32x32 map is
// the way out (reachable, but nothing beyond it).
import type { Game } from "./game";
import { DIRS, tileAt, type Dir } from "./maps";
import { T, tileFlags, Walk } from "./tiles";

export interface PathGrid {
  width: number;
  height: number;
  /** The map wraps around (overworld). */
  wrap?: boolean;
  /** Squares outside the map can be stepped on (town exits) but not crossed. */
  exits?: boolean;
  /** Whether a square inside the map (wrapped coordinates) can be entered. */
  passable(x: number, y: number): boolean;
  /** Extra cost of entering a square (slow terrain), default 0. */
  cost?(x: number, y: number): number;
}

export interface PathOptions {
  /** Longest path searched, in steps (default 64). */
  maxSteps?: number;
  /** Most squares expanded before giving up (default 8192). */
  maxNodes?: number;
}

const ORDER: Dir[] = ["N", "E", "S", "W"];

const mod = (v: number, n: number) => ((v % n) + n) % n;

/** Shortest signed offset from a to b on an axis of length n (wrapping maps). */
export function wrapDelta(a: number, b: number, n: number): number {
  const d = mod(b - a, n);
  return d > n / 2 ? d - n : d;
}

/** Path from (sx,sy) to any square accepted by `goal`, guided towards (tx,ty). Null when none. */
export function findPathTo(grid: PathGrid, sx: number, sy: number, tx: number, ty: number,
  goal: (x: number, y: number) => boolean, opts: PathOptions = {}): Dir[] | null {
  const maxSteps = opts.maxSteps ?? 64, maxNodes = opts.maxNodes ?? 8192;
  // Work in coordinates relative to the start (unwrapped), so the world seam is invisible.
  const dtx = grid.wrap ? wrapDelta(sx, tx, grid.width) : tx - sx;
  const dty = grid.wrap ? wrapDelta(sy, ty, grid.height) : ty - sy;
  const abs = (rx: number, ry: number): [number, number] =>
    grid.wrap ? [mod(sx + rx, grid.width), mod(sy + ry, grid.height)] : [sx + rx, sy + ry];
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < grid.width && y < grid.height;
  const isGoal = (rx: number, ry: number) => { const [x, y] = abs(rx, ry); return goal(x, y); };
  if (isGoal(0, 0)) return [];

  const key = (rx: number, ry: number) => `${rx},${ry}`;
  const h = (rx: number, ry: number) => Math.abs(dtx - rx) + Math.abs(dty - ry);
  interface Node { rx: number; ry: number; g: number; f: number; steps: number; prev: Node | null; dir: Dir | null }
  const open: Node[] = [{ rx: 0, ry: 0, g: 0, f: h(0, 0), steps: 0, prev: null, dir: null }];
  const best = new Map<string, number>([[key(0, 0), 0]]);
  let expanded = 0;
  while (open.length && expanded < maxNodes) {
    // small open lists: a linear scan for the lowest f (ties: the lowest h) is enough
    let bi = 0;
    for (let i = 1; i < open.length; i++) {
      const a = open[i], b = open[bi];
      if (a.f < b.f || (a.f === b.f && a.f - a.g < b.f - b.g)) bi = i;
    }
    const n = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (n.g > (best.get(key(n.rx, n.ry)) ?? Infinity)) continue;
    if (isGoal(n.rx, n.ry)) {
      const path: Dir[] = [];
      for (let c: Node | null = n; c && c.dir; c = c.prev) path.push(c.dir);
      return path.reverse();
    }
    expanded++;
    const [ax, ay] = abs(n.rx, n.ry);
    if (!grid.wrap && !inside(ax, ay)) continue; // an exit: the path can end here, not go on
    if (n.steps >= maxSteps) continue;
    for (const d of ORDER) {
      const [dx, dy] = DIRS[d];
      const rx = n.rx + dx, ry = n.ry + dy;
      const [x, y] = abs(rx, ry);
      const onMap = grid.wrap || inside(x, y);
      if (!(onMap ? grid.passable(x, y) : !!grid.exits)) continue;
      const g = n.g + 1 + (onMap ? grid.cost?.(x, y) ?? 0 : 0);
      const k = key(rx, ry);
      if (g >= (best.get(k) ?? Infinity)) continue;
      best.set(k, g);
      open.push({ rx, ry, g, f: g + h(rx, ry), steps: n.steps + 1, prev: n, dir: d });
    }
  }
  return null;
}

/** Path to the square (tx,ty), which must be passable. */
export function findPath(grid: PathGrid, sx: number, sy: number, tx: number, ty: number, opts?: PathOptions): Dir[] | null {
  const W = grid.width, H = grid.height;
  const same = (x: number, y: number) => grid.wrap ? mod(x, W) === mod(tx, W) && mod(y, H) === mod(ty, H) : x === tx && y === ty;
  return findPathTo(grid, sx, sy, tx, ty, same, opts);
}

/** Path to a square next to (tx,ty) (to talk to or fight what stands there). */
export function findPathNextTo(grid: PathGrid, sx: number, sy: number, tx: number, ty: number, opts?: PathOptions): Dir[] | null {
  const W = grid.width, H = grid.height;
  const near = (x: number, y: number) => {
    const dx = grid.wrap ? wrapDelta(tx, x, W) : x - tx, dy = grid.wrap ? wrapDelta(ty, y, H) : y - ty;
    return Math.abs(dx) + Math.abs(dy) === 1;
  };
  return findPathTo(grid, sx, sy, tx, ty, near, opts);
}

/** Squares the party can enter with its transport: on foot, on horse, by ship; null in the balloon (it drifts). */
export function walkMask(transport: number): number | null {
  if (transport === T.BALLOON) return null;
  if (transport >= T.SHIP_W && transport <= T.SHIP_S) return Walk.Ship;
  if (transport === T.HORSE_W || transport === T.HORSE_E) return Walk.Horse;
  return Walk.Foot;
}

/** Grid of the current overworld or town map for the party's transport, avoiding townsfolk and monsters. */
export function gridFor(g: Game): PathGrid | null {
  const mask = walkMask(g.save.transport);
  if (mask === null) return null;
  const map = g.map;
  const isWorld = map.kind === "world";
  return {
    width: map.width, height: map.height, wrap: isWorld, exits: !isWorld,
    passable: (x, y) => {
      if (!(tileFlags(tileAt(map, x, y)) & mask)) return false;
      if (g.npcAt(x, y)) return false;
      // monsters always block; ships and horses only block a ship
      if (isWorld && g.objects.some((o) => o.x === x && o.y === y && (o.tile >= 0x80 || mask === Walk.Ship))) return false;
      return true;
    },
  };
}
