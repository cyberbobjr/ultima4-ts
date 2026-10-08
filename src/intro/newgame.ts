// "Initiate New Game" of TITLE.EXE: name and sex (FUN_1000_3030), the story (FUN_1000_2883),
// the gypsy's casting (FUN_1000_2c12) and the new PARTY.SAV (FUN_1000_2e04).
import { random } from "../game/rng";
import { decodeScreen } from "../formats/ega";
import { decodeSave, type SaveGame } from "../formats/save";
import { loadGameFile } from "../io/gamefs";
import { OFF, type TitleData } from "./data";
import { Abort, Keys, Screen } from "./screen";

const pics = new Map<string, Uint8Array>();
async function picture(name: string): Promise<Uint8Array> {
  const key = name.toUpperCase();
  let p = pics.get(key);
  if (!p) { p = decodeScreen(await loadGameFile(key)).pixels; pics.set(key, p); }
  return p;
}

const rnd8 = () => Math.floor(random() * 8);
const isEsc = (k: { key: string }) => k.key === "Escape";

export class NewGame {
  /** `leaveTitle` stops the title animations (FUN_1000_3030 clears DS:6E80 before the story). */
  constructor(private readonly scr: Screen, private readonly keys: Keys, private readonly d: TitleData,
    private readonly leaveTitle: () => void) {}

  /** Returns the new save, or null when the player backs out (empty name, Escape...). */
  async run(): Promise<SaveGame | null> {
    try {
      const who = await this.askName();
      if (!who) return null;
      this.leaveTitle();
      await this.story();
      const result = await this.casting();
      return await this.buildSave(who.name, who.sex, result);
    } catch (e) {
      if (e instanceof Abort) return null;
      throw e;
    }
  }

  private async key(): Promise<string> {
    const k = await this.keys.get();
    if (isEsc(k)) throw new Abort();
    return k.key;
  }

  /** FUN_1000_3030 + FUN_1000_2656 (line input: 11 characters, leading/trailing blanks removed). */
  private async askName(): Promise<{ name: string; sex: "M" | "F" } | null> {
    const s = this.scr, d = this.d;
    s.clearBox();
    s.printAt(d.str(OFF.namePrompt1), 4, 0x10);
    s.printAt(d.str(OFF.namePrompt2), 4, 0x11);
    s.col = 0xc; s.row = 0x13;
    let buf = "";
    for (;;) {
      const k = await this.keys.get();
      if (isEsc(k)) return null; // the original only beeps here
      if (k.key === "Enter") break;
      if (k.key === "Backspace" || k.key === "ArrowLeft") {
        if (buf) { s.putc("\b"); buf = buf.slice(0, -1); }
        continue;
      }
      if (k.key.length === 1 && k.key >= " " && k.key < "\x7f" && buf.length < 0xc - 1) { buf += k.key; s.putc(k.key); }
    }
    const name = buf.trim();
    if (!name) return null;
    s.clearBox();
    s.printAt(d.str(OFF.sexPrompt), 4, 0x11);
    for (;;) {
      const k = await this.keys.get();
      const c = k.key.toUpperCase();
      if (c === "M" || c === "F") { s.putc(c); return { name, sex: c }; }
      if (isEsc(k) || k.key === "Enter" || k.key === " ") return null;
    }
  }

  /** FUN_1000_2883: story pages 0x1D..0x34 of the text table with their pictures and animations. */
  private async story() {
    const s = this.scr, d = this.d;
    // picture file names (EGA variants), DS offsets used by the jump table at 1000:2AED
    const name = (off: number) => d.str(off);
    let buf = await picture(name(0x2f75)); // tree
    s.clear();
    s.blit(buf, 0x28, 0x98, 0, 0, 0, 0);
    const show = async (next: number) => { s.blit(buf, 0x28, 0x98, 0, 0, 0, 0); buf = await picture(name(next)); };
    for (let p = 0x1d; p < 0x35; p++) {
      s.clearText();
      s.print(d.text(p));
      switch (p) {
        case 0x20: await this.portalRise(buf); break;
        case 0x22: await this.portalSink(buf); buf = await picture(name(0x2f89)); break; // portal
        case 0x23: await show(0x2f9d); break; // shows portal, loads tree
        case 0x28: await show(0x2fb2); break; // tree -> outside
        case 0x2c: await show(0x2fc9); break; // outside -> inside
        case 0x2e: await show(0x2fde); break; // inside -> wagon
        case 0x31: await show(0x2ff2); break; // wagon -> gypsy
        case 0x32: await show(0x3007); break; // gypsy -> abacus
        case 0x34: s.blit(buf, 0x28, 0x98, 0, 0, 0, 0); break;
      }
      this.keys.flush();
      await this.key();
    }
    this.abacus = buf;
  }
  private abacus!: Uint8Array;

  /** FUN_1000_273e: the moongate rises (sprite below the scene in TREE.EGA). */
  private async portalRise(t: Uint8Array) {
    for (let u = 1; u < 0x18; u++) {
      this.scr.blit(t, 3, u, 0, 0x98, 0x5c - u, 9);
      this.scr.blit(t, 3, 0x18 - u, 9, 0x44, 0x44, 9);
      await this.keys.delay(40);
    }
    this.scr.blit(t, 3, 0x18, 0, 0x98, 0x44, 9);
  }

  /** FUN_1000_27e0: the moongate sinks into the ground. */
  private async portalSink(t: Uint8Array) {
    for (let u = 1; u < 0x18; u++) {
      this.scr.blit(t, 3, u, 3, 0x98, 0x44, 9);
      this.scr.blit(t, 3, 0x18 - u, 0, 0x98, u + 0x44, 9);
      await this.keys.delay(40);
    }
    this.scr.blit(t, 3, 0x18, 3, 0x98, 0x44, 9);
  }

  /** FUN_1000_2b6d: one card from the pair picture (HONCOM, VALJUS, SACHONOR, SPIRHUM). */
  private async card(side: 0 | 1, v: number) {
    const file = this.d.str(this.d.words(OFF.cardPics, 4)[v >> 1]);
    const pic = await picture(file);
    this.scr.blit(pic, 0xc, 0x7c, v & 1 ? 0x1b : 1, 0xc, 0xc, side ? 0x1b : 1);
  }

  /** FUN_1000_2b2a: bead on the abacus (column = virtue, row = round). */
  private bead(round: number, v: number, won: boolean) {
    this.scr.blit(this.abacus, 1, 0xc, won ? 1 : 3, 0xbb, this.d.words(OFF.beadY, 7)[round], v + 0x10);
  }

  /** FUN_1000_2c12: seven dilemmas between random pairs of cards, winners meet again (4, 2, 1). */
  private async casting() {
    const s = this.scr, d = this.d;
    const names = d.words(OFF.virtueNames, 8).map((o) => d.str(o));
    const qBase = d.bytes(OFF.questionBase, 8);
    const bonus = [d.bytes(OFF.strBonus, 8), d.bytes(OFF.dexBonus, 8), d.bytes(OFF.intBonus, 8)];
    const stats = [15, 15, 15]; // str, dex, int
    const karma = new Array(8).fill(50);
    const mark = new Uint8Array(8); // 0 free, 1 winner, 0xFF eliminated
    let last = 0;
    for (let round = 0; round < 7; round++) {
      if (round === 4 || round === 6) for (let v = 0; v < 8; v++) if (mark[v] < 0x80) mark[v] = 0;
      s.clearText();
      let a: number, b: number;
      do a = rnd8(); while (mark[a]);
      do b = rnd8(); while (mark[b] || b === a);
      if (b < a) [a, b] = [b, a];
      s.print(d.str(d.words(round === 0 ? OFF.placeFirst : round === 6 ? OFF.placeLast : OFF.placeMore, 1)[0]));
      s.print(d.str(d.words(OFF.upon, 1)[0]));
      await this.card(0, a);
      s.print(names[a]);
      s.print(d.str(OFF.and));
      await this.card(1, b);
      s.print(names[b]);
      s.print(d.str(OFF.consider));
      this.keys.flush();
      await this.key();
      s.clearText();
      s.print(d.text(qBase[a] + b));
      for (;;) {
        const c = (await this.key()).toLowerCase();
        if (c === "a") break;
        if (c === "b") { [a, b] = [b, a]; break; }
      }
      last = a;
      mark[a] = 1;
      karma[a] += 5;
      for (let i = 0; i < 3; i++) stats[i] += bonus[i][a];
      this.bead(round, a, true);
      mark[b] = 0xff;
      this.bead(round, b, false);
    }
    for (const off of d.words(OFF.finalTexts, 2)) { // FUN_1000_271d
      s.clearText();
      s.print(d.str(off));
      await this.key();
    }
    return { virtue: last, karma, str: stats[0], dex: stats[1], int: stats[2] };
  }

  /** FUN_1000_2e04: PARTY.NEW with the avatar swapped into slot 0 (class = final virtue). */
  private async buildSave(name: string, sex: "M" | "F", r: { virtue: number; karma: number[]; str: number; dex: number; int: number }): Promise<SaveGame> {
    const d = this.d, cls = r.virtue;
    const save = decodeSave(await loadGameFile("PARTY.NEW"));
    save.x = d.bytes(OFF.startX, 8)[cls];
    save.y = d.bytes(OFF.startY, 8)[cls];
    save.members = 1;
    save.karma = r.karma;
    [save.players[0], save.players[cls]] = [save.players[cls], save.players[0]];
    const p = save.players[0];
    // strcpy into the 16-byte name field: bytes after the terminator keep the template's content
    for (let i = 0; i <= name.length; i++) p.nameBuf[i] = i < name.length ? name.charCodeAt(i) : 0;
    p.name = name;
    p.str = r.str; p.dex = r.dex; p.int = r.int;
    p.sex = sex === "M" ? 0x0b : 0x0c;
    return save;
  }
}
