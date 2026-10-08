// Texts and tables of the title program, read at runtime from the original TITLE.EXE
// (never copied into this repository). Offsets are relative to its data segment.
import { loadGameFile } from "../io/gamefs";

/** DGROUP starts at image offset 0x3fd0 (DS:00EF holds the first menu string at image 0x40bf). */
const DS = 0x3fd0;

export interface TitleData {
  str(off: number): string;
  bytes(off: number, n: number): Uint8Array;
  words(off: number, n: number): number[];
  /** 0x2ee4: word table of text pointers; [1..28] dilemmas, [29..52] story pages. */
  text(i: number): string;
}

export async function loadTitleData(): Promise<TitleData> {
  const exe = await loadGameFile("TITLE.EXE");
  const hdr = (exe[8] | (exe[9] << 8)) * 16;
  const img = exe.subarray(hdr);
  const at = (off: number) => DS + off;
  const word = (off: number) => img[at(off)] | (img[at(off) + 1] << 8);
  const str = (off: number) => {
    let s = "";
    for (let i = at(off); img[i] !== 0 && i < img.length; i++) s += String.fromCharCode(img[i]);
    return s;
  };
  const data: TitleData = {
    str,
    bytes: (off, n) => img.slice(at(off), at(off) + n),
    words: (off, n) => Array.from({ length: n }, (_, k) => word(off + 2 * k)),
    text: (i) => str(word(0x2ee4 + 2 * i)),
  };
  if (!str(0xef).startsWith("In another world")) throw new Error("TITLE.EXE: unexpected version");
  return data;
}

// --- DS offsets used by the ported routines (see src/intro/*.ts) ---
export const OFF = {
  /** FUN_1000_0b45: menu strings with their (col,row) */
  menu: [[0xef, 2, 14], [0x114, 15, 16], [0x11d, 11, 17], [0x130, 11, 18], [0x13f, 11, 19], [0x151, 3, 21], [0x173, 5, 22]] as const,
  /** FUN_1000_3030 prompts */
  namePrompt1: 0x3169, namePrompt2: 0x318a, sexPrompt: 0x31a2,
  /** FUN_1000_2c12 */
  placeFirst: 0x2f4e, placeMore: 0x2f50, placeLast: 0x2f52, upon: 0x2f54, virtueNames: 0x2f56,
  and: 0x308e, consider: 0x3094, finalTexts: 0x2f68,
  questionBase: 0x30ca, strBonus: 0x30b2, dexBonus: 0x30ba, intBonus: 0x30c2, beadY: 0x3012,
  /** FUN_1000_2b6d: card pair picture names (EGA) */
  cardPics: 0x307e,
  /** FUN_1000_2e04: start position per class */
  startX: 0x30dc, startY: 0x30e4,
  /** FUN_1000_019a: title creatures (ANIMATE.EGA) */
  seqL: 0x3380, seqR: 0x33f8, animSrcY: 0x3438, animSrcXL: 0x344a, animSrcXR: 0x345c,
  /** FUN_1000_02d1: Lord British signature points */
  signature: 0x346e,
  /** FUN_1000_041a: title map vignette (19x5 tiles), its script and object base tiles */
  baseMap: 0x3683, script: 0x36e2, objBase: 0xc8,
  /** FUN_1000_173f (EGA) dissolve masks (one byte every 2) */
  dissolve: 0x32d0,
} as const;
