// Overworld objects (ships, horses, the balloon, monsters, chests) not baked into WORLD.MAP,
// saved in OUTMONST.SAV.

export interface WorldObject { tile: number; x: number; y: number; }

/** OUTMONST.SAV: 32 slots stored as arrays of 32 bytes (tile, x, y, then previous tile/x/y, 2 unused). */
export function encodeObjects(objs: WorldObject[]): Uint8Array {
  const out = new Uint8Array(256);
  objs.slice(0, 32).forEach((o, i) => {
    out[i] = o.tile; out[32 + i] = o.x; out[64 + i] = o.y;
    out[96 + i] = o.tile; out[128 + i] = o.x; out[160 + i] = o.y;
  });
  return out;
}

export function decodeObjects(src: Uint8Array): WorldObject[] {
  const objs: WorldObject[] = [];
  for (let i = 0; i < 32; i++) if (src[i]) objs.push({ tile: src[i], x: src[32 + i], y: src[64 + i] });
  return objs;
}
