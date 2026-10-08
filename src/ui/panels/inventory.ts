// Inventory panel: the party (stats, weapon and armour, changeable when the game is idle outside
// combat), the stock of weapons and armour, reagents and mixtures, quest items, stones and runes,
// and the supplies. Item names come from the game texts; labels from the ui catalog (inv.*).
import { ARMOURS, CLASSES, ITEM_FLAGS, REAGENTS, SPELLS, STONE_COLORS, VIRTUES, WEAPONS } from "../../data/tables";
import { gameText } from "../../data/text";
import type { PlayerRecord } from "../../formats/save";
import { armourChoices, equipArmour, equipWeapon, weaponChoices } from "../../game/equipment";
import type { Game } from "../../game/game";
import { MSG_MAGIC } from "../../game/texts/magic";
import { t } from "../../i18n/i18n";
import { h } from "../dom/dom";
import type { Panel, PanelContext } from "../dom/panels";
import "./inventory.css";

const TABS = ["party", "equipment", "reagents", "items", "stones"] as const;
type Tab = (typeof TABS)[number];

/** EGA-ish colours of the eight stones (STONE_COLORS order). */
const STONE_CSS = ["#5555ff", "#ffff55", "#ff5555", "#55ff55", "#ffaa00", "#aa00aa", "#ffffff", "#000000"];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function createInventoryPanel(g: Game): Panel {
  let tab: Tab = "party";
  /** Member and slot whose choice list is open ("2:weapon"), or null. */
  let picking: string | null = null;

  const editable = () => g.input.waiting && g.mode !== "combat";

  /** Re-renders, then puts the focus back on the element with this data-focus id. */
  const refreshFocus = (ctx: PanelContext, body: HTMLElement, focus: string) => {
    ctx.refresh();
    (body.querySelector(`[data-focus="${focus}"]`) as HTMLElement | null)?.focus();
  };

  const stat = (label: string, value: string | number) =>
    h("span", { class: "inv-stat" }, h("span", { class: "inv-label" }, label), " ", h("b", {}, String(value)));

  function supplies(): HTMLElement {
    const s = g.save;
    const rows: [string, number][] = [
      ["inv.gold", s.gold], ["inv.food", Math.floor(s.food / 100)], ["inv.torches", s.torches],
      ["inv.gems", s.gems], ["inv.keys", s.keys], ["inv.sextants", s.sextants],
    ];
    return h("div", { class: "inv-supplies", role: "group", "aria-label": t("inv.supplies") },
      rows.map(([k, v]) => stat(t(k), v)));
  }

  function tabBar(ctx: PanelContext, body: HTMLElement): HTMLElement {
    return h("div", { class: "inv-tabs", role: "tablist", "aria-label": t("inv.tabs") },
      TABS.map((id) => h("button", {
        class: "inv-tab", role: "tab", id: `inv-tab-${id}`, "data-focus": `tab:${id}`, "data-tab": id,
        "aria-selected": id === tab ? "true" : "false", "aria-controls": "inv-section",
        onclick: () => { tab = id; picking = null; refreshFocus(ctx, body, `tab:${id}`); },
      }, t(`inv.tab.${id}`))));
  }

  /** One equipment slot: current item, a change button and (when open) the list of choices. */
  function slot(ctx: PanelContext, body: HTMLElement, i: number, p: PlayerRecord, kind: "weapon" | "armour"): HTMLElement {
    const isW = kind === "weapon";
    const table = isW ? WEAPONS : ARMOURS;
    const current = isW ? p.weapon : p.armour;
    const key = `${i}:${kind}`;
    const open = picking === key;
    const row = h("div", { class: "inv-slot" },
      h("span", { class: "inv-label" }, t(isW ? "inv.weapon" : "inv.armour")),
      h("span", { class: "inv-item" }, table[current].name));
    if (!editable()) return row;
    const choices = isW ? weaponChoices(g.save, p) : armourChoices(g.save, p);
    const label = t(isW ? "inv.changeWeapon" : "inv.changeArmour", { name: p.name });
    row.append(h("button", {
      class: "inv-change", "data-focus": `change:${key}`, "aria-expanded": open ? "true" : "false",
      "aria-label": label, title: label, disabled: choices.length < 2,
      onclick: () => { picking = open ? null : key; refreshFocus(ctx, body, open ? `change:${key}` : `pick:${key}:${current}`); },
    }, t("inv.change")));
    if (!open) return row;
    const stock = isW ? g.save.weapons : g.save.armour;
    const list = h("div", { class: "inv-choices", role: "group", "aria-label": label },
      choices.map((c) => h("button", {
        class: c === current ? "inv-choice current" : "inv-choice", "data-focus": `pick:${key}:${c}`,
        "aria-pressed": c === current ? "true" : "false",
        onclick: () => {
          if (c !== current) { if (isW) equipWeapon(g.save, p, c); else equipArmour(g.save, p, c); }
          picking = null;
          refreshFocus(ctx, body, `change:${key}`);
        },
      }, c === 0 || c === current ? table[c].name : t("inv.option", { name: table[c].name, count: stock[c] }))));
    return h("div", {}, row, list);
  }

  function party(ctx: PanelContext, body: HTMLElement): HTMLElement[] {
    const out: HTMLElement[] = g.members.map((p, i) => h("article", { class: `inv-member status-${p.status}` },
      h("header", { class: "inv-member-head" },
        h("span", { class: "inv-num" }, String(i + 1)),
        h("span", { class: "inv-name" }, p.name),
        h("span", { class: "inv-class" }, CLASSES[p.klass] ?? "?"),
        h("span", { class: "inv-status" }, t(`inv.status.${p.status}`))),
      h("div", { class: "inv-stats" },
        stat(t("inv.hp"), `${p.hp}/${p.hpMax}`), stat(t("inv.mp"), p.mp), stat(t("inv.xp"), p.xp),
        stat(t("inv.level"), Math.floor(p.hpMax / 100)),
        stat(t("inv.str"), p.str), stat(t("inv.dex"), p.dex), stat(t("inv.int"), p.int)),
      slot(ctx, body, i, p, "weapon"),
      slot(ctx, body, i, p, "armour")));
    if (!editable()) out.unshift(h("p", { class: "inv-note" }, t("inv.readOnly")));
    return out;
  }

  /** A titled list of (name, count) rows; zero counts dimmed, or skipped when `owned`. */
  function counts(title: string, rows: [string, number][], owned = false): HTMLElement {
    const shown = owned ? rows.filter(([, n]) => n > 0) : rows;
    return h("section", { class: "inv-list" },
      h("h3", {}, title),
      shown.length
        ? h("ul", {}, shown.map(([name, n]) => h("li", { class: n > 0 ? "" : "dim" }, h("span", {}, name), h("b", {}, String(n)))))
        : h("p", { class: "dim" }, t("inv.none")));
  }

  function equipment(): HTMLElement[] {
    const s = g.save;
    return [h("div", { class: "inv-cols" },
      counts(t("inv.weapons"), WEAPONS.slice(1).map((w) => [w.name, s.weapons[w.index]]), true),
      counts(t("inv.armours"), ARMOURS.slice(1).map((a) => [a.name, s.armour[a.index]]), true))];
  }

  function reagents(): HTMLElement[] {
    const s = g.save;
    return [h("div", { class: "inv-cols" },
      counts(t("inv.reagents"), REAGENTS.map((r, i) => [r, s.reagents[i]])),
      counts(t("inv.mixtures"), SPELLS.map((sp, i) => [sp.name, s.mixtures[i]]), true))];
  }

  function items(): HTMLElement[] {
    const f = g.save.items, F = ITEM_FLAGS, M = MSG_MAGIC;
    const has = (bit: number) => (f & bit) !== 0;
    const rows: HTMLElement[] = [];
    const item = (name: string, ...tags: (string | false)[]) =>
      rows.push(h("li", {}, h("span", {}, cap(name)), tags.filter(Boolean).map((tg) => h("span", { class: "inv-tag" }, tg as string))));
    if (has(F.skull) || has(F.skullDestroyed)) item(M.itemSkull, has(F.skullDestroyed) && t("inv.state.destroyed"));
    if (has(F.candle)) item(M.itemCandle, has(F.candleLit) && t("inv.state.lit"));
    if (has(F.book)) item(M.itemBook, has(F.bookRead) && t("inv.state.read"));
    if (has(F.bell)) item(M.itemBell, has(F.bellRung) && t("inv.state.rung"));
    const parts = [F.keyTruth, F.keyLove, F.keyCourage];
    if (parts.some(has)) {
      const names = gameText("data.codexAnswers") as readonly string[];
      rows.push(h("li", {}, h("span", {}, cap(M.itemKey)),
        h("span", { class: "inv-chips" }, parts.map((bit, k) =>
          h("span", { class: has(bit) ? "inv-chip on" : "inv-chip", "aria-label": `${cap(names[k])}: ${t(has(bit) ? "inv.owned" : "inv.missing")}` }, cap(names[k]))))));
    }
    if (has(F.horn)) item(M.itemHorn);
    if (has(F.wheel)) item(M.itemWheel);
    return [rows.length ? h("ul", { class: "inv-items" }, rows) : h("p", { class: "dim" }, t("inv.noItems"))];
  }

  function stones(): HTMLElement[] {
    const s = g.save;
    const chips = (title: string, names: readonly string[], mask: number, swatch?: readonly string[]) =>
      h("section", { class: "inv-list" }, h("h3", {}, title),
        h("ul", { class: "inv-grid" }, names.map((n, i) => {
          const on = (mask & (1 << i)) !== 0;
          return h("li", { class: on ? "inv-chip on" : "inv-chip", "aria-label": `${n}: ${t(on ? "inv.owned" : "inv.missing")}` },
            swatch && h("span", { class: "inv-swatch", style: `background:${swatch[i]}` }), h("span", {}, n));
        })));
    return [h("div", { class: "inv-cols" },
      chips(t("inv.stones"), STONE_COLORS, s.stones, STONE_CSS),
      chips(t("inv.runes"), VIRTUES, s.runes))];
  }

  return {
    id: "inventory",
    title: () => t("menu.inventory"),
    render(body, ctx) {
      const content = tab === "party" ? party(ctx, body) : tab === "equipment" ? equipment() : tab === "reagents" ? reagents() : tab === "items" ? items() : stones();
      body.classList.add("inv");
      body.append(supplies(), tabBar(ctx, body),
        h("div", { class: "inv-section", id: "inv-section", role: "tabpanel", "aria-labelledby": `inv-tab-${tab}` }, content));
    },
    onKey(e, ctx) {
      const body = (document.activeElement as HTMLElement | null)?.closest(".panel-body") as HTMLElement | null
        ?? document.querySelector(".panel-body.inv") as HTMLElement | null;
      if (!body) return false;
      const active = document.activeElement as HTMLElement | null;
      // Left/Right: previous/next tab (from anywhere but a choice list).
      if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !active?.closest(".inv-choices")) {
        const k = TABS.indexOf(tab) + (e.key === "ArrowRight" ? 1 : -1);
        tab = TABS[(k + TABS.length) % TABS.length];
        picking = null;
        refreshFocus(ctx, body, `tab:${tab}`);
        return true;
      }
      // Up/Down (and Left/Right inside a choice list): previous/next button.
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const all = [...body.querySelectorAll<HTMLElement>("button:not([disabled])")];
        const i = active ? all.indexOf(active) : -1;
        const next = all[i < 0 ? 0 : (i + (e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 1) + all.length) % all.length];
        next?.focus();
        return true;
      }
      return false;
    },
  };
}
