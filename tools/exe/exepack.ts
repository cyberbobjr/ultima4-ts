// Microsoft EXEPACK decompressor (AVATAR.EXE is packed, see docs/RE_NOTES.md).
//
// The MZ entry point (CS:IP) lands in a stub segment whose first bytes are the EXEPACK header:
//   +0 real IP, +2 real CS, +4 (scratch), +6 stub size, +8 real SP, +A real SS, +C dest length (paragraphs),
//   then optionally +E skip length, and the "RB" signature.
// Everything in the load image before that segment is the packed program, decompressed backwards:
// trailing 0xFF padding is skipped, then commands are read from the end towards the start —
//   opcode byte, 16-bit length, and 0xB0 = fill with the next byte, 0xB2 = copy that many bytes.
// The low bit of the opcode marks the last command. The untouched prefix stays in place.

export interface Unpacked {
  /** Unpacked load image (no MZ header): code segment at 0, DS = 0x0F0D paragraphs for AVATAR.EXE. */
  image: Uint8Array;
  ip: number; cs: number; sp: number; ss: number;
}

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);

/**
 * Load-image offset of the EXEPACK header, or -1. Usually it is at the entry CS, but the GOG
 * AVATAR.EXE enters through a small stub (CS=0x1788) that jumps to the real header at 0x17720,
 * so paragraph-aligned offsets below the entry point are scanned too.
 * "RB" sits at +0x0E or +0x10 depending on the EXEPACK version.
 */
function findHeader(load: Uint8Array, entry: number): number {
  const sig = (at: number) => (load[at + 0x0e] === 0x52 && load[at + 0x0f] === 0x42) || (load[at + 0x10] === 0x52 && load[at + 0x11] === 0x42);
  for (let at = Math.min(entry, load.length - 0x12) & ~0xf; at >= 0 && at >= entry - 0x1000; at -= 16) if (sig(at)) return at;
  return -1;
}

const loadImage = (exe: Uint8Array) => exe.subarray(u16(exe, 8) * 16);

export function isExepacked(exe: Uint8Array): boolean {
  return exe[0] === 0x4d && exe[1] === 0x5a && findHeader(loadImage(exe), u16(exe, 0x16) * 16) >= 0;
}

export function unpackExepack(exe: Uint8Array): Unpacked {
  if (exe[0] !== 0x4d || exe[1] !== 0x5a) throw new Error("not an MZ executable");
  const load = loadImage(exe);
  const stub = findHeader(load, u16(exe, 0x16) * 16);
  if (stub < 0) throw new Error("not an EXEPACK executable");
  const h = load.subarray(stub);
  const destLen = u16(h, 0x0c) * 16;
  const src = load.subarray(0, stub);
  const dst = new Uint8Array(Math.max(destLen, src.length));
  dst.set(src);

  let s = src.length;
  while (s > 0 && src[s - 1] === 0xff) s--;
  let d = destLen;
  for (;;) {
    if (s < 3) throw new Error("EXEPACK: truncated stream");
    const op = src[--s];
    let len = src[--s] << 8;
    len |= src[--s];
    switch (op & 0xfe) {
      case 0xb0: {
        const v = src[--s];
        for (let i = 0; i < len; i++) dst[--d] = v;
        break;
      }
      case 0xb2:
        for (let i = 0; i < len; i++) dst[--d] = src[--s];
        break;
      default:
        throw new Error(`EXEPACK: bad opcode ${op.toString(16)} at ${s}`);
    }
    if (op & 1) break;
  }
  // The remaining prefix is stored uncompressed; it must line up with where the output stopped.
  if (d !== s) dst.copyWithin(d - s, 0, s);
  return { image: dst.subarray(0, destLen), ip: u16(h, 0), cs: u16(h, 2), sp: u16(h, 8), ss: u16(h, 0x0a) };
}
