// Title sequence and character creation (TITLE.EXE), see src/intro/.
import { now } from "./clock";
import { readSave, writeSave } from "../io/gamefs";
import { assets } from "../assets/store";
import { decodeSave, encodeSave, type SaveGame } from "../formats/save";
import { loadTitleData } from "../intro/data";
import { NewGame } from "../intro/newgame";
import { Keys, Screen } from "../intro/screen";
import { Title } from "../intro/title";
import type { Game } from "./game";
import { MSG_INTRO } from "./texts/intro";

/** Returns the save to play: a continued game or a freshly created character. */
export async function runIntro(g: Game): Promise<SaveGame> {
  const data = await loadTitleData();
  const scr = new Screen(g.r.assets);
  const keys = new Keys(g.input, scr);
  const title = new Title(scr, keys, data);
  await title.load();
  const layer = g.layers.push({ name: "intro", fullscreen: true, draw: (r) => scr.draw(r, now()) });
  try {
    let mode: "start" | "redraw" | "menu" = "start";
    for (;;) {
      const choice = await title.run(mode);
      if (choice === "journey") {
        // The original just starts AVATAR.EXE; an empty party (PARTY.SAV members = 0) has no game to resume.
        const own = await readSave("PARTY.SAV");
        const save = own ? decodeSave(own) : await assets.originalSave();
        if (save && save.members > 0) return save;
        await title.notice([...MSG_INTRO.noSave]);  // not in TITLE.EXE
        mode = "menu";
        continue;
      }
      const save = await new NewGame(scr, keys, data, () => title.stop()).run();
      if (save) {
        await writeSave("PARTY.SAV", encodeSave(save));
        return save;
      }
      mode = "redraw";
    }
  } finally {
    title.stop();
    layer.remove();
  }
}
