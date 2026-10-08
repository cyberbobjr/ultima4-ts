// Clickable/touch command bar: menus, a direction pad, the commands of the current context (from the
// command registry) and the keys prompts need (Enter, Esc, Space, typing). Every button just pushes
// the original key into the game's input, so mouse and touch play exactly like the keyboard.
import type { CommandContext } from "../../game/commands";
import type { Game } from "../../game/game";
import { t } from "../../i18n/i18n";
import { h } from "./dom";

/** Keys handled inside the dungeon and combat loops themselves (not in the registry). */
const EXTRA: Partial<Record<CommandContext, { key: string; id: string }[]>> = {
  dungeon: [
    { key: "k", id: "klimb" }, { key: "d", id: "descend" }, { key: "g", id: "getChest" },
    { key: "s", id: "search" }, { key: "i", id: "ignite" }, { key: "p", id: "peer" }, { key: " ", id: "pass" },
  ],
  combat: [{ key: "a", id: "attack" }, { key: "r", id: "ready" }, { key: "z", id: "ztats" }, { key: " ", id: "pass" }],
};

export interface MenuEntry { id: string; label: () => string; run: () => void; visible?: () => boolean }

export class CommandBar {
  readonly root = h("nav", { class: "bar", "aria-label": "commands" });
  private readonly menus = h("div", { class: "bar-menus" });
  private readonly pad = h("div", { class: "bar-pad" });
  private readonly cmds = h("div", { class: "bar-cmds" });
  private readonly keys = h("div", { class: "bar-keys" });
  private shown = "";

  constructor(private readonly g: Game, private readonly menuEntries: MenuEntry[], private readonly typeText: () => void) {
    const key = (k: string) => () => g.input.push({ key: k, code: k, source: "pointer" });
    const arrow = (k: string, label: string, area: string) =>
      h("button", { class: `pad-${area}`, "aria-label": t(`ui.${area}`), onclick: key(k) }, label);
    this.pad.append(arrow("ArrowUp", "▲", "north"), arrow("ArrowLeft", "◀", "west"), arrow("ArrowRight", "▶", "east"), arrow("ArrowDown", "▼", "south"));
    this.keys.append(
      h("button", { onclick: key("Enter"), title: "Enter" }, t("ui.enter")),
      h("button", { onclick: key("Escape"), title: "Esc" }, t("ui.escape")),
      h("button", { onclick: () => this.typeText(), title: t("ui.typeHint") }, t("ui.type")),
    );
    this.root.append(this.menus, this.pad, this.cmds, this.keys);
    this.update(true);
    setInterval(() => this.update(), 300);
  }

  /** Rebuilds the command buttons when the context changes. */
  update(force = false) {
    const g = this.g;
    const mode: CommandContext = g.save ? g.mode : "world";
    const sig = `${mode}|${this.menuEntries.map((m) => (m.visible?.() ?? true) ? m.id : "").join()}`;
    if (!force && sig === this.shown) return;
    this.shown = sig;
    this.menus.replaceChildren(...this.menuEntries.filter((m) => m.visible?.() ?? true)
      .map((m) => h("button", { class: "menu", onclick: m.run }, m.label())));
    const list = [...g.commands.forContext(mode).map((c) => ({ key: c.key, id: c.id })), ...(EXTRA[mode] ?? [])]
      .filter((c, i, all) => all.findIndex((o) => o.key === c.key) === i)
      .sort((a, b) => a.key.localeCompare(b.key));
    this.cmds.replaceChildren(...list.map((c) =>
      h("button", { class: "cmd", title: `${c.key === " " ? "Space" : c.key.toUpperCase()}`, onclick: () => g.input.push({ key: c.key, code: c.key, source: "pointer" }) },
        h("span", { class: "cmd-key" }, c.key === " " ? "SP" : c.key.toUpperCase()), t(`cmd.${c.id}`))));
  }
}
