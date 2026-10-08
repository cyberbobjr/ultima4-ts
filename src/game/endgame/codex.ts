// The Chamber of the Codex (1000:31F4) and the ending (1000:3025), reached by using the Black stone on the
// altar of the 8th Abyss level. Failures eject the party to the overworld (1000:2F9D, positions DS:0BF0/0BFE).
import { CODEX_EJECT_POSITIONS, CODEX_FINAL_ANSWER, CODEX_QUESTIONS, CODEX_WORD_OF_PASSAGE } from "../../data/tables";
import type { Game } from "../game";
import { addDrawHook, blankView, loadPicture, PixelLayer, shake } from "./ui";
import { flushKeys, pauseUnits as pause, sameText, ticks } from "../prompts";

/** Thrown to unwind the codex after an ejection (the original longjmps back to the main loop). */
class Ejected extends Error {}

class Codex {
  private readonly layer = new PixelLayer();
  private restoreDraw: (() => void) | null = null;
  private restoreView: (() => void) | null = null;
  private partySize: number;

  constructor(private readonly g: Game) { this.partySize = g.save.members; }

  private say(s: string) { this.g.con.print(s); }

  /** FUN_1000_227B: picture OR-ed over the screen. */
  private async picture(name: string) { this.layer.or(await loadPicture(name)); }

  /** 1000:2F9D: back to the overworld at position i, party size restored. */
  private async eject(i: number): Promise<never> {
    const g = this.g, s = g.save, pos = CODEX_EJECT_POSITIONS[i];
    await ticks(5);
    s.members = this.partySize;
    s.dngX = pos.x; s.dngY = pos.y;
    s.balloonState = 0;
    g.spellEffect = null;
    this.cleanup();
    if (g.dungeon.exit) g.dungeon.exit();
    else { s.location = 0; g.setPos(pos.x, pos.y); }
    flushKeys(g);
    throw new Ejected();
  }

  private cleanup() {
    this.restoreDraw?.(); this.restoreDraw = null;
    this.restoreView?.(); this.restoreView = null;
  }

  /** 1000:310F: three tries. */
  private async ask(answer: string, question: string): Promise<boolean> {
    for (let k = 0; k < 3; k++) {
      if (k > 0) { await ticks(1); this.say("\nThy thoughts are not pure.\nI ask again.\n"); await ticks(2); }
      this.say(question + "\n");
      const typed = await this.g.getLine(15);
      if (sameText(typed, answer, 16)) return true;
    }
    return false;
  }

  private async passageNotGranted(): Promise<never> { // 1000:3010
    this.say("\nPassage is not granted.\n");
    return this.eject(12);
  }

  async run() {
    const g = this.g, s = g.save;
    s.members = 1;
    this.restoreView = blankView(g);
    this.restoreDraw = addDrawHook(g, (r) => this.layer.draw(r));
    this.say("\n\n\nThere is a sudden darkness, and you find yourself alone in an empty chamber.\n");
    await ticks(4);
    await this.picture("KEY7.EGA");
    if ((s.items & 0xe0) !== 0xe0) {
      this.say("\nThou dost not have the Key of Three Parts.\n");
      await this.eject(12);
    }
    this.say("\nYou use your Key of Three Parts.\n");
    await ticks(3);
    this.say("\nA voice rings out:\n");
    if (!(await this.ask(CODEX_WORD_OF_PASSAGE, '"What is the Word of Passage?"'))) await this.passageNotGranted();
    if (this.partySize !== 8) {
      this.say("\nThou hast not proved thy leadership in all eight virtues.\n");
      await ticks(8);
      await this.passageNotGranted();
    }
    if (s.karma.some((k) => k !== 0)) { this.say("\nThou art not ready.\n"); await this.passageNotGranted(); }
    this.say("\nPassage is granted.\n");
    await ticks(5);
    this.layer.clear();
    const pics = ["HONESTY", "COMPASSN", "VALOR", "JUSTICE", "SACRIFIC", "HONOR", "SPIRIT", "HUMILITY", "TRUTH", "LOVE", "COURAGE"]; // DS:1620/161A
    for (let i = 0; i < 11; i++) {
      await ticks(2);
      this.say("\n\nThe voice asks:\n\n");
      await ticks(2);
      const q = CODEX_QUESTIONS[i];
      if (!(await this.ask(q.answer, q.question))) {
        await ticks(1);
        this.say("\nThy quest is not yet complete.\n");
        await this.eject(i);
      }
      await this.picture(pics[i] + ".EGA");
      if (i === 7) {
        await ticks(3);
        this.say("\nThou art well versed in the virtues of the Avatar.\n");
        await ticks(5);
      }
    }
    this.say("\n\nThe floor rumbles beneath your feet.\n");
    await shake(g); await shake(g);
    await ticks(5);
    this.say("\nAbove the din, the voice asks:\n\nIf all eight virtues of the Avatar combine into and are derived from the Three Principles of Truth, Love and Courage...");
    await pause(g);
    const question = "What is the one thing which encompasses and is the whole of all undeniable Truth, unending Love, and unyielding Courage?\n\n";
    this.say("\n\nThen " + question.charAt(0).toLowerCase() + question.slice(1));
    let ok = false;
    for (let k = 0; k < 3 && !ok; k++) {
      if (k > 0) { this.say("\nThy thoughts are not pure.\nI ask again.\n"); await ticks(3); this.say("\n\n" + question); }
      ok = sameText(await g.getLine(15), CODEX_FINAL_ANSWER, 16);
    }
    if (!ok) {
      await ticks(1);
      this.say("\nThou dost not know the true nature of the Universe.\n");
      await this.eject(11);
    }
    await this.ending();
  }

  /** 1000:3025: the game ends here (the original loops forever). */
  private async ending(): Promise<never> {
    const g = this.g;
    await ticks(2);
    for (let k = 0; k < 4; k++) await shake(g);
    await ticks(3);
    const texts = [
      "\n\nThe boundless knowledge of the Codex of Ultimate Wisdom is revealed unto thee.",
      "\n\nThe voice says: Thou hast proven thyself to be truly good in nature.",
      "\n\nThou must know that thy quest to become an Avatar is the endless quest of a lifetime.",
      "\n\nAvatarhood is a living gift.  It must always and forever be nurtured to flourish.",
      "\n\nFor if thou dost stray from the paths of virtue, thy way may be lost forever.",
      "\n\nReturn now unto thine own world. Live there as an example to thy people, as our memory of thy gallant deeds serves us.",
    ];
    for (const t of texts) { this.say(t); await pause(g); }
    this.layer.clear();
    this.say("\n\nAs the sound of the voice trails off, darkness seems to rise around you. There is a moment of intense, wrenching vertigo.");
    await pause(g);
    await this.picture("STONCRCL.EGA");
    for (const t of [
      "\n\nYou open your eyes to a familiar circle of stones.  You wonder of your recent adventures.",
      "\n\nIt seems a time and place very distant.  You wonder if it really happened. Then you realize that in your hand you hold The Ankh.",
      "\n\nYou walk away from the circle, knowing that you can always return from whence you came, since you now know the secret of the gates.",
    ]) { this.say(t); await pause(g); }
    this.say(`\n\nCONGRATULATIONS!\n   Thou hast\n   completed\n   ULTIMA IV\n  Quest of the\n    AVATAR\n  in ${g.save.moves}\n turns! Report\n thy feat unto\nLord British at\nOrigin Systems!`);
    g.con.cursor = false;
    return new Promise<never>(() => { /* the end */ });
  }
}

/** Use of the Black stone at the last Abyss altar (1000:0311 -> 1000:31F4). Returns after an ejection. */
export async function runCodex(g: Game) {
  const codex = new Codex(g);
  try {
    await codex.run();
  } catch (e) {
    if (!(e instanceof Ejected)) throw e;
  }
}
