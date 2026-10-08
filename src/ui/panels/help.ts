// Help panel (placeholder until implemented).
import type { Game } from "../../game/game";
import { t } from "../../i18n/i18n";
import type { Panel } from "../dom/panels";

export function createHelpPanel(g: Game): Panel {
  void g;
  return { id: "help", title: () => t("menu.help"), render(body) { body.textContent = "…"; } };
}
