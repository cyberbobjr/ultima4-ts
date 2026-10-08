// Text entry for touch screens: an input field (bringing up the on-screen keyboard) whose text is
// typed into the game when validated (names, keywords, mantras, numbers, letters for spells).
import type { Game } from "../../game/game";
import { t } from "../../i18n/i18n";
import { h } from "./dom";

export function openTextEntry(host: HTMLElement, g: Game): void {
  if (host.querySelector(".text-entry")) return;
  const release = g.input.block();
  const field = h("input", { type: "text", class: "text-entry-field", autocomplete: "off", autocapitalize: "off", spellcheck: "false", "aria-label": t("ui.typeHint"), maxlength: 32 });
  const close = () => { release(); box.remove(); };
  const send = (enter: boolean) => { const v = field.value; close(); g.input.type(v, "pointer", enter); };
  const box = h("form", { class: "text-entry", onsubmit: (e: Event) => { e.preventDefault(); send(true); } },
    field,
    h("button", { type: "button", onclick: () => send(false), title: t("ui.typeOnly") }, t("ui.typeOnlyShort")),
    h("button", { type: "submit" }, t("ui.enter")),
    h("button", { type: "button", onclick: close }, "✕"));
  field.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); close(); } });
  host.append(box);
  field.focus();
}
