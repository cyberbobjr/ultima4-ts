// Non-text tables of TITLE.EXE used by the intro routines (DS offsets, see src/intro/*.ts).
// Extracted to data/title.json under the same names.
export const TITLE_DATA: Record<string, readonly ["bytes" | "words", number, number]> = {
  /** FUN_1000_2c12: question base per virtue pair, stat bonuses per virtue, bead heights of the abacus */
  questionBase: ["bytes", 0x30ca, 8],
  strBonus: ["bytes", 0x30b2, 8],
  dexBonus: ["bytes", 0x30ba, 8],
  intBonus: ["bytes", 0x30c2, 8],
  beadY: ["words", 0x3012, 7],
  /** FUN_1000_2e04: start position per class */
  startX: ["bytes", 0x30dc, 8],
  startY: ["bytes", 0x30e4, 8],
  /** FUN_1000_019a: title creatures (ANIMATE.EGA): left/right sequences and sprite sources */
  seqL: ["bytes", 0x3380, 0x78],
  seqR: ["bytes", 0x33f8, 0x40],
  animSrcY: ["bytes", 0x3438, 18],
  animSrcXL: ["bytes", 0x344a, 18],
  animSrcXR: ["bytes", 0x345c, 18],
  /** FUN_1000_02d1: Lord British signature points */
  signature: ["bytes", 0x346e, 1024],
  /** FUN_1000_041a: title map vignette (19x5 tiles), its script and object base tiles */
  baseMap: ["bytes", 0x3683, 19 * 5],
  script: ["bytes", 0x36e2, 1024],
  objBase: ["bytes", 0xc8, 16],
  /** FUN_1000_173f (EGA): dissolve masks (one byte every 2) */
  dissolve: ["bytes", 0x32d0, 128],
};
