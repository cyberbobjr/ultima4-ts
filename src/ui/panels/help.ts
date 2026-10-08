// Help panel: four sections in tabs (Left/Right or 1-4 to switch, Up/Down/PageUp/PageDown to scroll):
// the commands of the current mode, every command by context, the controls (keyboard, mouse, touch)
// and a short spoiler-light guide to the quest. Command lists come from the registry plus the keys the
// dungeon and combat loops handle themselves (the same list as the command bar).
import type { CommandContext } from "../../game/commands";
import type { Game } from "../../game/game";
import { t } from "../../i18n/i18n";
import { EXTRA } from "../dom/commandBar";
import { h } from "../dom/dom";
import type { Panel } from "../dom/panels";
import "./help.css";

const CONTEXTS: readonly CommandContext[] = ["world", "town", "dungeon", "combat"];
const TABS = ["here", "all", "controls", "quest"] as const;
type Tab = (typeof TABS)[number];

/** Commands whose description changes in some contexts (key "help.desc.<id>.<ctx>"). */
const VARIANTS: Record<string, readonly CommandContext[]> = {
  pass: ["combat"], attack: ["combat"], cast: ["combat"], ready: ["combat"], use: ["combat"],
  descend: ["dungeon"], klimb: ["dungeon"], getChest: ["dungeon"], ignite: ["dungeon"], peer: ["dungeon"], search: ["dungeon"],
};

const descKey = (id: string, ctx: CommandContext) => VARIANTS[id]?.includes(ctx) ? `help.desc.${id}.${ctx}` : `help.desc.${id}`;
const keyLabel = (k: string) => k === " " ? t("help.space") : k.toUpperCase();
const kbd = (s: string) => h("kbd", { class: "help-key" }, s);

/** Commands of a context, in key order: the registry, then the dungeon/combat loop keys. */
function commandsFor(g: Game, ctx: CommandContext): { key: string; id: string }[] {
  return [...g.commands.forContext(ctx).map((c) => ({ key: c.key, id: c.id })), ...(EXTRA[ctx] ?? [])]
    .filter((c, i, all) => all.findIndex((o) => o.key === c.key) === i)
    .sort((a, b) => a.key.localeCompare(b.key));
}

function hereSection(g: Game): HTMLElement {
  const mode: CommandContext = g.save ? g.mode : "world";
  const rows = commandsFor(g, mode).map((c) =>
    h("tr", {}, h("td", {}, kbd(keyLabel(c.key))), h("th", { scope: "row" }, t(`cmd.${c.id}`)), h("td", {}, t(descKey(c.id, mode)))));
  return h("div", {},
    h("p", { class: "help-lead" }, h("span", { class: "help-ctx" }, t(`help.ctx.${mode}`)), " ", t(g.save ? `help.here.${mode}` : "help.here.title")),
    h("table", { class: "help-table" },
      h("tbody", {},
        h("tr", {}, h("td", {}, kbd("↑↓←→")), h("th", { scope: "row" }, t("help.move")), h("td", {}, t(`help.move.${mode}`))),
        rows)));
}

function allSection(g: Game): HTMLElement {
  const byId = new Map<string, { key: string; contexts: CommandContext[] }>();
  for (const ctx of CONTEXTS)
    for (const c of commandsFor(g, ctx)) {
      const e = byId.get(c.id) ?? { key: c.key, contexts: [] };
      e.contexts.push(ctx);
      byId.set(c.id, e);
    }
  const items = [...byId].sort(([, a], [, b]) => a.key === " " ? 1 : b.key === " " ? -1 : a.key.localeCompare(b.key)).map(([id, e]) => {
    // contexts sharing a description are listed together
    const groups = new Map<string, CommandContext[]>();
    for (const ctx of e.contexts) groups.set(descKey(id, ctx), [...(groups.get(descKey(id, ctx)) ?? []), ctx]);
    return h("li", { class: "help-cmd" },
      h("div", { class: "help-cmd-head" }, kbd(keyLabel(e.key)), h("strong", {}, t(`cmd.${id}`))),
      [...groups].map(([key, ctxs]) => h("div", { class: "help-cmd-line" },
        h("span", { class: "help-tags" }, ctxs.map((c) => h("span", { class: `help-tag help-tag-${c}` }, t(`help.ctx.${c}`)))),
        h("span", {}, t(key)))));
  });
  return h("div", {}, h("p", { class: "help-lead" }, t("help.allIntro")), h("ul", { class: "help-cmds" }, items));
}

function controlsSection(): HTMLElement {
  const dl = (rows: [Node | string, string][]) =>
    h("dl", { class: "help-dl" }, rows.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, v)]));
  const keys = (...ks: string[]) => h("span", {}, ks.map((k) => kbd(k)));
  return h("div", {},
    h("h3", {}, t("help.ctl.keyboard")),
    dl([
      [keys("A", "…", "Z"), t("help.ctl.keys.desc")],
      [keys("↑↓←→"), t("help.ctl.arrows.desc")],
      [keys(t("help.space")), t("help.desc.pass")],
      [keys(t("ui.enter"), t("ui.escape")), t("help.ctl.enterEsc.desc")],
      [keys("F1"), t("help.ctl.f1")],
      [keys("F2"), t("help.ctl.f2")],
      [keys("F3"), t("help.ctl.f3")],
      [keys("F10"), t("help.ctl.f10")],
    ]),
    h("h3", {}, t("help.ctl.mouse")),
    dl([
      [t("help.ctl.mouse.bar"), t("help.ctl.mouse.bar.desc")],
      [t("ui.type"), t("help.ctl.mouse.type.desc")],
    ]),
    h("h3", {}, t("help.ctl.touch")),
    dl([
      [t("help.ctl.touch.tap"), t("help.ctl.touch.tap.desc")],
      [t("help.ctl.touch.person"), t("help.ctl.touch.person.desc")],
      [t("help.ctl.touch.swipe"), t("help.ctl.touch.swipe.desc")],
      [t("help.ctl.mouse.bar"), t("help.ctl.touch.bar.desc")],
    ]));
}

function questSection(): HTMLElement {
  return h("div", { class: "help-quest" },
    ["goal", "virtues", "talk", "shrines", "runes", "moons", "save", "tips"].flatMap((k) =>
      [h("h3", {}, t(`help.q.${k}.h`)), h("p", {}, t(`help.q.${k}`))]));
}

export function createHelpPanel(g: Game): Panel {
  let tab: Tab = "here";
  let tabButtons: HTMLButtonElement[] = [];
  let content: HTMLElement | null = null;

  const show = (next: Tab, focus = false) => {
    tab = next;
    tabButtons.forEach((b, i) => {
      const on = TABS[i] === tab;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    if (!content) return;
    content.replaceChildren(tab === "here" ? hereSection(g) : tab === "all" ? allSection(g) : tab === "controls" ? controlsSection() : questSection());
    content.scrollTop = 0;
  };

  return {
    id: "help",
    title: () => t("menu.help"),
    render(body) {
      body.classList.add("help-body");
      tabButtons = TABS.map((id) => h("button", { class: "help-tab", role: "tab", id: `help-tab-${id}`, "aria-controls": "help-content",
        onclick: () => show(id, true) }, t(`help.tab.${id}`)));
      content = h("div", { class: "help-content", id: "help-content", role: "tabpanel", tabindex: -1 });
      body.append(
        h("div", { class: "help-tabs", role: "tablist", "aria-label": t("menu.help") }, tabButtons),
        content,
        h("p", { class: "help-nav" }, t("help.nav")));
      show(tab);
    },
    onKey(e) {
      const i = TABS.indexOf(tab);
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { show(TABS[(i + (e.key === "ArrowLeft" ? TABS.length - 1 : 1)) % TABS.length], true); return true; }
      if (e.key === "Home" || e.key === "End") { show(e.key === "Home" ? TABS[0] : TABS[TABS.length - 1], true); return true; }
      if (/^[1-4]$/.test(e.key)) { show(TABS[+e.key - 1], true); return true; }
      if (!content) return false;
      const step = { ArrowUp: -40, ArrowDown: 40, PageUp: -content.clientHeight * 0.9, PageDown: content.clientHeight * 0.9 }[e.key];
      if (step === undefined) return false;
      content.scrollBy({ top: step });
      return true;
    },
  };
}
