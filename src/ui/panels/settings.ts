// Settings panel (placeholder until implemented).
import type { Game } from "../../game/game";
import { t } from "../../i18n/i18n";
import type { Panel } from "../dom/panels";

export function createSettingsPanel(g: Game): Panel {
  void g;
  return { id: "settings", title: () => t("menu.settings"), render(body) { body.textContent = "…"; } };
}
