// Keyboard queue consumed by the async game logic.
export interface Key { key: string; code: string; }

const ARROWS: Record<string, string> = { ArrowUp: "N", ArrowDown: "S", ArrowLeft: "W", ArrowRight: "E" };

export class Input {
  private queue: Key[] = [];
  private waiter: ((k: Key | null) => void) | null = null;

  constructor() {
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.length !== 1 && !(e.key in ARROWS) && !["Enter", "Escape", "Backspace", " "].includes(e.key)) return;
      e.preventDefault();
      const k = { key: e.key, code: e.code };
      if (this.waiter) { const w = this.waiter; this.waiter = null; w(k); } else if (this.queue.length < 4) this.queue.push(k);
    });
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
