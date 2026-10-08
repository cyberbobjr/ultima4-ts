// Data-segment readers for the two original executables (used only by the extractor and tests).
import { unpackExepack } from "./exepack";

export interface DataSegment {
  /** The load image (unpacked for AVATAR.EXE). */
  image: Uint8Array;
  /** Image offset of DS:0000. */
  base: number;
  byte(off: number): number;
  word(off: number): number;
  bytes(off: number, n: number): Uint8Array;
  words(off: number, n: number): number[];
  /** NUL-terminated string, one char per byte (the game's own 8-bit codes are kept). */
  str(off: number): string;
  /** `count` word pointers, each to a string; a null pointer gives "". */
  ptrs(off: number, count: number): string[];
}

export function dataSegment(image: Uint8Array, base: number): DataSegment {
  const at = (off: number) => base + off;
  const word = (off: number) => image[at(off)] | (image[at(off) + 1] << 8);
  const str = (off: number) => {
    let s = "";
    for (let i = at(off); i < image.length && image[i] !== 0; i++) s += String.fromCharCode(image[i]);
    return s;
  };
  return {
    image, base,
    byte: (off) => image[at(off)],
    word,
    bytes: (off, n) => image.slice(at(off), at(off) + n),
    words: (off, n) => Array.from({ length: n }, (_, k) => word(off + 2 * k)),
    str,
    ptrs: (off, n) => Array.from({ length: n }, (_, k) => { const p = word(off + 2 * k); return p ? str(p) : ""; }),
  };
}

/** AVATAR.EXE: EXEPACK-unpacked, DGROUP = paragraph 0x0F0D (docs/RE_NOTES.md). */
export function avatarSegment(exe: Uint8Array): DataSegment {
  const ds = dataSegment(unpackExepack(exe).image, 0xf0d0);
  if (ds.str(0x19f3) !== "Pirate" || ds.str(0x1ae9) !== "Hands") throw new Error("AVATAR.EXE: unexpected version (expected the DOS/GOG release)");
  return ds;
}

/** TITLE.EXE: not packed, DGROUP at image 0x3FD0 (src/intro/data.ts). */
export function titleSegment(exe: Uint8Array): DataSegment {
  const hdr = (exe[8] | (exe[9] << 8)) * 16;
  const ds = dataSegment(exe.subarray(hdr), 0x3fd0);
  if (!ds.str(0xef).startsWith("In another world")) throw new Error("TITLE.EXE: unexpected version (expected the DOS/GOG release)");
  return ds;
}
