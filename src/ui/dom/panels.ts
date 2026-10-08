// Modal panels (inventory, world map, help, settings, debug) shown over the game. While a panel is
// open the keyboard belongs to it (Input.block); Escape or the close button closes it. Only one panel
// at a time: opening another replaces it.
import type { Game } from "../../game/game";
import { t } from "../../i18n/i18n";
import { h } from "./dom";

export interface PanelContext {
  g: Game;
  /** Closes this panel. */
  close(): void;
  /** Re-runs render() (after the game state changed). */
  refresh(): void;
}

export interface Panel {
  /** Stable id ("inventory", "map"...), also the ui catalog prefix. */
  id: string;
  /** Title shown in the header (already translated). */
  title(): string;
  /** Fills the body. Called on open and on refresh(). */
  render(body: HTMLElement, ctx: PanelContext): void;
  /** Keys while open (after Escape handling). Return true when handled. */
  onKey?(e: KeyboardEvent, ctx: PanelContext): boolean;
  /** Called once when the panel closes. */
  dispose?(): void;
  /** CSS class for the panel size: "wide" (map), default otherwise. */
  size?: "normal" | "wide";
}

export class Panels {
  private current: { panel: Panel; root: HTMLElement; release: () => void; keys: (e: KeyboardEvent) => void; done: () => void } | null = null;
  private listeners = new Set<(id: string | null) => void>();

  constructor(private readonly host: HTMLElement, private readonly g: Game) {}

  get openId(): string | null { return this.current?.panel.id ?? null; }

  onChange(fn: (id: string | null) => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** Opens a panel; resolves when it is closed. */
  open(panel: Panel): Promise<void> {
    this.close();
    return new Promise((resolve) => {
      const body = h("div", { class: "panel-body" });
      const ctx: PanelContext = {
        g: this.g,
        close: () => this.close(),
        refresh: () => { body.replaceChildren(); panel.render(body, ctx); },
      };
      const root = h("section", { class: `panel panel-${panel.size ?? "normal"}`, role: "dialog", "aria-modal": "true", "aria-label": panel.title() },
        h("header", { class: "panel-head" },
          h("h2", {}, panel.title()),
          h("button", { class: "panel-close", "aria-label": t("ui.close"), title: t("ui.close"), onclick: () => this.close() }, "✕")),
        body);
      const keys = (e: KeyboardEvent) => {
        if (e.key === "Escape") { e.preventDefault(); this.close(); return; }
        if (panel.onKey?.(e, ctx)) e.preventDefault();
      };
      const release = this.g.input.block();
      window.addEventListener("keydown", keys);
      this.host.append(root);
      this.host.classList.add("open");
      panel.render(body, ctx);
      (root.querySelector("button, [tabindex]") as HTMLElement | null)?.focus();
      this.current = { panel, root, release, keys, done: resolve };
      for (const l of this.listeners) l(panel.id);
    });
  }

  close(): void {
    const c = this.current;
    if (!c) return;
    this.current = null;
    window.removeEventListener("keydown", c.keys);
    c.release();
    c.panel.dispose?.();
    c.root.remove();
    this.host.classList.remove("open");
    for (const l of this.listeners) l(null);
    c.done();
  }

  /** Opens the panel, or closes it if it is the one open (toolbar buttons). */
  toggle(panel: Panel): void {
    if (this.openId === panel.id) this.close(); else void this.open(panel);
  }
}
