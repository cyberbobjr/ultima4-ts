// PARTY.SAV / PARTY.NEW (502 bytes, little endian).
export interface PlayerRecord {
  hp: number; hpMax: number; xp: number; str: number; dex: number; int: number; mp: number;
  unknown: number; weapon: number; armour: number;
  name: string; /** original 16-byte name buffer (bytes after the NUL are kept for exact round trips) */ nameBuf: number[];
  sex: number; /* 0x0b male, 0x0c female (tile glyphs) */ klass: number; status: string;
}

export interface SaveGame {
  unknown1: number; moves: number;
  players: PlayerRecord[];
  food: number; gold: number;
  karma: number[];
  torches: number; gems: number; keys: number; sextants: number;
  armour: number[]; weapons: number[]; reagents: number[]; mixtures: number[];
  items: number;
  x: number; y: number;
  stones: number; runes: number;
  members: number; transport: number; balloonState: number;
  trammelPhase: number; feluccaPhase: number;
  shipHull: number; lbIntro: number;
  lastCamp: number; lastReagent: number; lastMeditation: number; lastVirtue: number;
  dngX: number; dngY: number; orientation: number; dngLevel: number; location: number;
}

export const SAVE_SIZE = 502;

class Cursor {
  constructor(public v: DataView, public o = 0) {}
  u8() { return this.v.getUint8(this.o++); }
  u16() { const r = this.v.getUint16(this.o, true); this.o += 2; return r; }
  u32() { const r = this.v.getUint32(this.o, true); this.o += 4; return r; }
  w8(x: number) { this.v.setUint8(this.o++, x & 0xff); }
  w16(x: number) { this.v.setUint16(this.o, x & 0xffff, true); this.o += 2; }
  w32(x: number) { this.v.setUint32(this.o, x >>> 0, true); this.o += 4; }
}

export function decodeSave(src: Uint8Array): SaveGame {
  const c = new Cursor(new DataView(src.buffer, src.byteOffset, src.byteLength));
  const arr = (n: number) => Array.from({ length: n }, () => c.u16());
  const unknown1 = c.u32(), moves = c.u32();
  const players: PlayerRecord[] = [];
  for (let i = 0; i < 8; i++) {
    const hp = c.u16(), hpMax = c.u16(), xp = c.u16(), str = c.u16(), dex = c.u16(), int = c.u16(), mp = c.u16(), unknown = c.u16();
    const weapon = c.u16(), armour = c.u16();
    const nameBuf = Array.from({ length: 16 }, () => c.u8());
    const end = nameBuf.indexOf(0);
    const name = String.fromCharCode(...nameBuf.slice(0, end < 0 ? 16 : end));
    const sex = c.u8(), klass = c.u8(), status = String.fromCharCode(c.u8());
    players.push({ hp, hpMax, xp, str, dex, int, mp, unknown, weapon, armour, name, nameBuf, sex, klass, status });
  }
  const food = c.u32(), gold = c.u16();
  const karma = arr(8);
  const torches = c.u16(), gems = c.u16(), keys = c.u16(), sextants = c.u16();
  const armour = arr(8), weapons = arr(16), reagents = arr(8), mixtures = arr(26);
  const items = c.u16();
  const x = c.u8(), y = c.u8(), stones = c.u8(), runes = c.u8();
  const members = c.u16(), transport = c.u16(), balloonState = c.u16();
  const trammelPhase = c.u16(), feluccaPhase = c.u16(), shipHull = c.u16(), lbIntro = c.u16();
  const lastCamp = c.u16(), lastReagent = c.u16(), lastMeditation = c.u16(), lastVirtue = c.u16();
  const dngX = c.u8(), dngY = c.u8(), orientation = c.u16(), dngLevel = c.u16(), location = c.u16();
  return {
    unknown1, moves, players, food, gold, karma, torches, gems, keys, sextants, armour, weapons, reagents, mixtures,
    items, x, y, stones, runes, members, transport, balloonState, trammelPhase, feluccaPhase, shipHull, lbIntro,
    lastCamp, lastReagent, lastMeditation, lastVirtue, dngX, dngY, orientation, dngLevel, location,
  };
}

export function encodeSave(s: SaveGame): Uint8Array {
  const out = new Uint8Array(SAVE_SIZE);
  const c = new Cursor(new DataView(out.buffer));
  c.w32(s.unknown1); c.w32(s.moves);
  for (const p of s.players) {
    for (const v of [p.hp, p.hpMax, p.xp, p.str, p.dex, p.int, p.mp, p.unknown, p.weapon, p.armour]) c.w16(v);
    const buf = p.nameBuf.slice();
    const end = buf.indexOf(0);
    const stored = String.fromCharCode(...buf.slice(0, end < 0 ? 16 : end));
    if (stored !== p.name) for (let k = 0; k < 16; k++) buf[k] = k < p.name.length ? p.name.charCodeAt(k) : 0;
    for (let k = 0; k < 16; k++) c.w8(buf[k] ?? 0);
    c.w8(p.sex); c.w8(p.klass); c.w8(p.status.charCodeAt(0));
  }
  c.w32(s.food); c.w16(s.gold);
  for (const list of [s.karma, [s.torches, s.gems, s.keys, s.sextants], s.armour, s.weapons, s.reagents, s.mixtures, [s.items]])
    for (const v of list) c.w16(v);
  c.w8(s.x); c.w8(s.y); c.w8(s.stones); c.w8(s.runes);
  for (const v of [s.members, s.transport, s.balloonState, s.trammelPhase, s.feluccaPhase, s.shipHull, s.lbIntro,
    s.lastCamp, s.lastReagent, s.lastMeditation, s.lastVirtue]) c.w16(v);
  c.w8(s.dngX); c.w8(s.dngY); c.w16(s.orientation); c.w16(s.dngLevel); c.w16(s.location);
  return out;
}
