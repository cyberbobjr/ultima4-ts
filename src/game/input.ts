// Input queue consumed by the async game logic. Keys come from the keyboard or from any other
// source (command bar, touch gestures, tap-to-move, scripts) through `push`, so every control
// scheme drives the game exactly like the original keyboard.
export type KeySource = "keyboard" | "pointer" | "touch" | "script";
export interface Key { key: string; code: string; source?: KeySource }

const ARROWS: Record<string, string> = { ArrowUp: "N", ArrowDown: "S", ArrowLeft: "W", ArrowRight: "E" };
const SPECIAL = ["Enter", "Escape", "Backspace", " "];
/** Keys kept while the game is busy (the BIOS buffer of the original is small too). */
const QUEUE_MAX = 4;

export class Input {
  private queue: Key[] = [];
  private waiter: ((k: Key | null) => void) | null = null;
  private blockers = 0;
  private listeners = new Set<(k: Key) => void>();

  constructor() {
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey || this.blockers > 0) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (!Input.accepts(e.key)) return;
      e.preventDefault();
      this.push({ key: e.key, code: e.code, source: "keyboard" });
    });
  }

  /** Keys the game understands: printable characters, arrows, Enter, Escape, Backspace. */
  static accepts(key: string): boolean {
    return key.length === 1 || key in ARROWS || SPECIAL.includes(key);
  }

  /** Feeds a key from any source; dropped when the queue is full. */
  push(k: Key): void {
    for (const l of this.listeners) l(k);
    if (this.waiter) { const w = this.waiter; this.waiter = null; w(k); } else if (this.queue.length < QUEUE_MAX) this.queue.push(k);
  }

  /** Types a string (one key per character, then Enter if asked), e.g. from an on-screen keyboard. */
  type(text: string, source: KeySource = "pointer", enter = false): void {
    for (const ch of text) this.push({ key: ch, code: "", source });
    if (enter) this.push({ key: "Enter", code: "Enter", source });
  }

  /** True while the game logic is waiting for a key (nothing queued). */
  get waiting(): boolean { return this.waiter !== null; }

  /** Called for every key pushed, whatever its source (UI feedback). Returns the unsubscribe function. */
  onKey(fn: (k: Key) => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** Stops keyboard events from reaching the game (a DOM panel has the focus). Returns the release. */
  block(): () => void {
    this.blockers++;
    let done = false;
    return () => { if (!done) { done = true; this.blockers--; } };
  }

  /** Resolves with the next key, or null after `timeoutMs`. */
  next(timeoutMs?: number): Promise<Key | null> {
    const k = this.queue.shift();
    if (k) return Promise.resolve(k);
    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      this.waiter = (key) => { if (timer) clearTimeout(timer); resolve(key); };
      if (timeoutMs !== undefined) timer = setTimeout(() => { this.waiter = null; resolve(null); }, timeoutMs);
    });
  }

  clear() { this.queue = []; }

  static direction(k: Key): "N" | "S" | "E" | "W" | null {
    const a = ARROWS[k.key];
    if (a) return a as "N" | "S" | "E" | "W";
    return null;
  }
}
