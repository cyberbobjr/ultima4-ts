// The 11x11 map viewport: tiles around the party with line of sight, townsfolk, objects and moongates.
import { VIEW_TILES } from "../render/renderer";
import type { Game } from "./game";
import { tileAt } from "./maps";
import { animFrame, isOpaque, T } from "./tiles";

/** Tiles shown in the 11x11 viewport, with line of sight applied (-1 = black). */
export function viewTiles(g: Game): number[] {
  const out: number[] = new Array(VIEW_TILES * VIEW_TILES);
  const half = VIEW_TILES >> 1;
  const frame = g.frame;
  const raw = (x: number, y: number) => {
    const t = tileAt(g.map, x, y);
    return t < 0 ? T.GRASS : t;
  };
  const opaque = (dx: number, dy: number) => isOpaque(raw(g.px + dx, g.py + dy));
  for (let vy = 0; vy < VIEW_TILES; vy++)
    for (let vx = 0; vx < VIEW_TILES; vx++) {
      const dx = vx - half, dy = vy - half;
      const x = g.px + dx, y = g.py + dy;
      let t = visible(dx, dy, opaque) ? raw(x, y) : -1;
      if (t >= 0) {
        const npc = g.npcAt(x, y);
        if (npc) t = animFrame(npc.tile, frame + npc.x);
        if (g.map.kind === "world") {
          const o = g.objects.find((ob) => ob.x === (x & 255) && ob.y === (y & 255));
          if (o) t = animFrame(o.tile, frame);
          const gt = g.sky.moongateTile(g.save, x, y);
          if (gt >= 0) t = gt;
        }
      }
      out[vy * VIEW_TILES + vx] = t;
    }
  out[half * VIEW_TILES + half] = g.onFoot ? T.AVATAR : g.save.transport;
  return out;
}

/** Bresenham ray from the centre: a square is visible if no opaque square lies strictly between. */
function visible(dx: number, dy: number, opaque: (dx: number, dy: number) => boolean): boolean {
  let x = 0, y = 0;
  const sx = Math.sign(dx), sy = Math.sign(dy), ax = Math.abs(dx), ay = Math.abs(dy);
  let err = ax - ay;
  while (!(x === dx && y === dy)) {
    const e2 = 2 * err;
    if (e2 > -ay) { err -= ay; x += sx; }
    if (e2 < ax) { err += ax; y += sy; }
    if (x === dx && y === dy) break;
    if (opaque(x, y)) return false;
  }
  return true;
}
