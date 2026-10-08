// Shrines and meditation: 1000:E72C (meditation), 1000:E6DF (vision picture).
import { assets } from "../assets/store";
import { MANTRAS, MEDITATION, SHRINE_VISIONS, SHRINES } from "../data/tables";
import type { Game } from "./game";
import { VIRTUES } from "./locations";
import { addDrawHook, askKey, blankView, flushKeys, loadPicture, PixelLayer, sameText, showTiles, ticks } from "./endgame/ui";

const SPIRITUALITY = 6;

async function meditate(g: Game, virtue: number) {
  const s = g.save, say = (t: string) => g.con.print(t);
  if (!(s.runes & (1 << virtue))) {
    say("\nThou dost not bear the rune of entry!  A strange force keeps you out!\n");
    return;
  }
  // SHRINE.CON: the first 121 bytes are the 11x11 view shown while in the shrine (mode 7)
  const restoreView = showTiles(g, await assets.shrineMap());
  try {
    say("\nYou enter the ancient shrine and sit before the altar...\nUpon what virtue dost thou meditate?\n");
    const subject = await g.getLine(15);
    say("\nFor how many\n");
    const k = await askKey(g, "Cycles (0-3)?", "0", "3");
    if (k < 0) return;
    const cycles = k - 0x30;
    if (cycles === 0 || !sameText(subject, VIRTUES[virtue], 16)) {
      say("\nThou art unable to focus thy thoughts on this subject!\n");
      return;
    }
    // one meditation (or Hawkwind visit) per 100 moves, DS:932E
    const period = Math.floor(s.moves / MEDITATION.cooldownMoves) & 0xffff;
    if (period === s.lastMeditation) { say("\nThy mind is still weary from thy last Meditation!\n"); return; }
    s.lastMeditation = period;
    say("Begin Meditation\n");
    for (let c = 0; c < cycles; c++) {
      for (let d = 0; d < 16; d++) { await ticks(1); say("."); }
      flushKeys(g);
      say("\nMantra: ");
      const mantra = await g.getLine(15);
      if (!sameText(mantra, MANTRAS[virtue], 16)) {
        say("\nThou art not able to focus thy thoughts with that Mantra!\n");
        g.karmaDec(SPIRITUALITY, 3);
        return;
      }
    }
    if (cycles === MEDITATION.maxCycles && s.karma[virtue] === MEDITATION.elevationKarma) {
      say(`\nThou hast achieved partial Avatarhood in the Virtue of\n${VIRTUES[virtue]}`);
      g.con.println("");
      s.karma[virtue] = 0;
      flushKeys(g);
      await g.getKey();
      say("\n\nThou art granted a vision!\n");
      // 1000:E6DF: blank viewport, rune picture OR-ed over it, until a key is pressed
      const layer = new PixelLayer();
      layer.or(await loadPicture(SHRINES[virtue].visionPic.toUpperCase() + ".EGA"));
      const restoreBlank = blankView(g);
      const restoreDraw = addDrawHook(g, (r) => layer.draw(r));
      try {
        flushKeys(g);
        await g.getKey();
      } finally {
        restoreDraw();
        restoreBlank();
      }
    } else {
      say("\nThy thoughts are pure. Thou art granted a vision!\n");
      g.karmaInc(SPIRITUALITY, MEDITATION.spiritualityPerCycle * cycles);
      flushKeys(g);
      await g.getKey();
      g.con.println("");
      say(SHRINE_VISIONS[virtue][cycles - 1]);
      await g.getKey();
      g.con.println("");
    }
  } finally {
    restoreView();
  }
}

/** Entering a shrine (E)nter on its tile, or the moongate to Spirituality). */
export async function meditateAt(g: Game, virtue: number) {
  g.save.location = 25 + virtue; // DS:9338 while inside
  try {
    await meditate(g, virtue);
  } finally {
    g.save.location = 0;
  }
  g.endTurn();
}
