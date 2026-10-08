// Decompressors for the original image files.
// RLE: byte 0x02 is a marker followed by <count> <value>.
export function rleDecode(src: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < src.length; ) {
    if (src[i] === 0x02 && i + 2 < src.length) {
      const count = src[i + 1], value = src[i + 2];
      for (let k = 0; k < count; k++) out.push(value);
      i += 3;
    } else out.push(src[i++]);
  }
  return Uint8Array.from(out);
}

// LZW: 12-bit codes in a 4096-slot hash table, reimplemented from TITLE.EXE
// (decoder at 1000:22d5, hash probe at 1000:21e5, code reader at 1000:2290).
// Codes < 0x100 are literals; the table is cleared after 0xccd insertions.
export function lzwDecode(src: Uint8Array): Uint8Array {
  const n = src.length;
  let p = 0, half = false, last = 0;
  const nextCode = (): number => {
    if (half) {
      if (p >= n) return -1;
      const b = src[p++];
      half = false;
      return ((last & 0xf) << 8) | b;
    }
    if (p + 1 >= n) return -1;
    const b0 = src[p], b1 = src[p + 1];
    p += 2; last = b1; half = true;
    return (b0 << 4) | (b1 >> 4);
  };
  const root = new Uint16Array(0x1000), chr = new Uint8Array(0x1000);
  let used = new Uint8Array(0x1000);
  const free = (h: number, r: number, c: number) => !used[h] || (root[h] === r && chr[h] === c);
  const slot = (r: number, c: number): number => {
    let h = ((c << 4) ^ r) & 0xfff;
    if (h >= 0x100 && free(h, r, c)) return h;
    const t = ((c * 2 + r) | 0x800) >>> 0;
    h = Number((BigInt(t) * BigInt(t)) >> 6n) & 0xfff;
    if (h >= 0x100 && free(h, r, c)) return h;
    for (;;) {
      h = (h + 0x1fd) & 0xfff;
      if (h >= 0x100 && free(h, r, c)) return h;
    }
  };
  const out: number[] = [];
  const stack: number[] = [];
  let first = nextCode();
  if (first < 0) return new Uint8Array(0);
  out.push(first);
  let old = first, cnt = 0;
  for (;;) {
    let code = nextCode();
    if (code < 0) break;
    if (code < 0x100) {
      out.push(code);
      first = code;
    } else {
      stack.length = 0;
      let c = code;
      if (!used[code]) { stack.push(first); c = old; }
      while (c >= 0x100) { stack.push(chr[c]); c = root[c]; }
      stack.push(c);
      first = c;
      for (let i = stack.length - 1; i >= 0; i--) out.push(stack[i]);
    }
    const h = slot(old, first);
    used[h] = 1; root[h] = old; chr[h] = first;
    if (++cnt > 0xccc) {
      cnt = 0;
      used = new Uint8Array(0x1000);
      first = nextCode();
      if (first < 0) break;
      out.push(first);
      code = first;
    }
    old = code;
  }
  return Uint8Array.from(out);
}
