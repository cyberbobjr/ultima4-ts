// The 16x12 message area on the lower right of the screen.
export const CON_COL = 24, CON_ROW = 12, CON_W = 16, CON_H = 12;

export class Console {
  lines: string[] = [""];
  cursor = true;

  /** Appends text; "\n" breaks lines, words wrap at 16 columns like the original. */
  print(text: string) {
    for (const ch of text) {
      if (ch === "\n") { this.newline(); continue; }
      let cur = this.lines[this.lines.length - 1];
      if (cur.length >= CON_W) {
        // move the current word to the next line
        const sp = cur.lastIndexOf(" ");
        if (ch !== " " && sp > 0) {
          this.lines[this.lines.length - 1] = cur.slice(0, sp);
          this.newline();
          this.lines[this.lines.length - 1] = cur.slice(sp + 1);
        } else {
          this.newline();
          if (ch === " ") continue;
        }
        cur = this.lines[this.lines.length - 1];
      }
      this.lines[this.lines.length - 1] = cur + ch;
    }
  }

  println(text = "") { this.print(text); this.newline(); }

  newline() {
    this.lines.push("");
    if (this.lines.length > CON_H) this.lines.splice(0, this.lines.length - CON_H);
  }

  /** Removes the last character on the current line (for line editing). */
  backspace() {
    const i = this.lines.length - 1;
    this.lines[i] = this.lines[i].slice(0, -1);
  }

  clear() { this.lines = [""]; }
}
