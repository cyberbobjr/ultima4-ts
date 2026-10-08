// Worldmap panel (placeholder until implemented).
import type { Game } from "../../game/game";
import { t } from "../../i18n/i18n";
import type { Panel } from "../dom/panels";

export function createWorldmapPanel(g: Game): Panel {
  void g;
  return { id: "worldmap", title: () => t("menu.worldmap"), render(body) { body.textContent = "…"; } };
}
