// Texts of the title program, by DS offset in TITLE.EXE (DS:x = image 0x3FD0 + x).
// The texts come from the extracted catalog (see src/data/text.ts); the routine that prints
// each one is cited next to it.
import { defineTexts, ptrs, str } from "../data/text";

const t = (ds: number) => str(ds, "title");

export const TITLE = defineTexts("title", {
  /** FUN_1000_0b45: main menu lines (positions in src/intro/title.ts) */
  menu0: t(0xef), menu1: t(0x114), menu2: t(0x11d), menu3: t(0x130), menu4: t(0x13f), menu5: t(0x151), menu6: t(0x173),
  /** FUN_1000_3030: name and sex prompts */
  namePrompt1: t(0x3169), namePrompt2: t(0x318a), sexPrompt: t(0x31a2),
  /** FUN_1000_2c12: gypsy card rounds */
  placeFirst: ptrs(0x2f4e, 1, "title"), placeMore: ptrs(0x2f50, 1, "title"), placeLast: ptrs(0x2f52, 1, "title"),
  upon: ptrs(0x2f54, 1, "title"), virtueNames: ptrs(0x2f56, 8, "title"),
  and: t(0x308e), consider: t(0x3094),
  /** FUN_1000_271d */
  finalTexts: ptrs(0x2f68, 2, "title"),
  /** 0x2ee4: text pointers; [1..28] dilemmas, [29..52] story pages */
  pages: ptrs(0x2ee4, 53, "title"),
  /** FUN_1000_2b6d: card pair picture files */
  cardPics: ptrs(0x307e, 4, "title"),
  /** FUN_1000_2883 (jump table at 1000:2AED): story pictures, in order tree, portal, tree, outside, inside, wagon, gypsy, abacus */
  pic0: t(0x2f75), pic1: t(0x2f89), pic2: t(0x2f9d), pic3: t(0x2fb2), pic4: t(0x2fc9), pic5: t(0x2fde), pic6: t(0x2ff2), pic7: t(0x3007),
});
