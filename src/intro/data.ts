// Tables of the title program (TITLE.EXE), extracted to data/title.json by `npm run extract`
// (offsets in tools/extract/title-data.ts). The texts are in ./texts.ts.
import { assets } from "../assets/store";

export interface TitleData {
  /** FUN_1000_2c12: question base per virtue, stat bonuses per virtue, bead heights of the abacus */
  questionBase: number[]; strBonus: number[]; dexBonus: number[]; intBonus: number[]; beadY: number[];
  /** FUN_1000_2e04: start position per class */
  startX: number[]; startY: number[];
  /** FUN_1000_019a: title creatures (ANIMATE.EGA) */
  seqL: number[]; seqR: number[]; animSrcY: number[]; animSrcXL: number[]; animSrcXR: number[];
  /** FUN_1000_02d1: Lord British signature points */
  signature: number[];
  /** FUN_1000_041a: title map vignette (19x5 tiles), its script and object base tiles */
  baseMap: number[]; script: number[]; objBase: number[];
  /** FUN_1000_173f (EGA) dissolve masks (one byte every 2) */
  dissolve: number[];
}

export async function loadTitleData(): Promise<TitleData> {
  return (await assets.titleTables()) as unknown as TitleData;
}

/** FUN_1000_0b45: (col, row) of the menu lines TITLE.menu0..menu6. */
export const MENU_POS: readonly (readonly [number, number])[] = [[2, 14], [15, 16], [11, 17], [11, 18], [11, 19], [3, 21], [5, 22]];
