// Debug panel (placeholder until implemented).
import type { Game } from "../../game/game";
import { t } from "../../i18n/i18n";
import type { Panel } from "../dom/panels";

export function createDebugPanel(g: Game): Panel {
  void g;
  return { id: "debug", title: () => t("menu.debug"), render(body) { body.textContent = "…"; } };
}
