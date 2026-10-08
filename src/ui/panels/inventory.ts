// Inventory panel (placeholder until implemented).
import type { Game } from "../../game/game";
import { t } from "../../i18n/i18n";
import type { Panel } from "../dom/panels";

export function createInventoryPanel(g: Game): Panel {
  void g;
  return { id: "inventory", title: () => t("menu.inventory"), render(body) { body.textContent = "…"; } };
}
