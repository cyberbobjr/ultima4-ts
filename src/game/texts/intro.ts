// Messages of the intro modules, by location in AVATAR.EXE (or port() for texts written for this port,
// in src/i18n/game/<lang>/intro.json). See src/data/text.ts.
import { defineTexts, portList } from "../../data/text";

export const MSG_INTRO = defineTexts("msg.intro", {
  /** Notice of when there is no saved game (not in TITLE.EXE: it just starts AVATAR.EXE) */
  noSave: portList(3),
});
