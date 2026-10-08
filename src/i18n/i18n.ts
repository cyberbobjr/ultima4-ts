// Languages. Two catalogs per language:
// - ui (src/i18n/ui/<lang>.json, public): menus, help, inventory, debug panel... read with t();
// - game: the texts of the original game, extracted with the assets (assets/original/i18n/<lang>/
//   game.json, local), completed by the texts written for this port (src/i18n/game/<lang>.json,
//   public). They are read through the text registry (src/data/text.ts).
import { fmt, setGameText } from "../data/text";
import type { AssetStore, TextCatalog } from "../assets/store";
import uiEn from "./ui/en.json";
import uiFr from "./ui/fr.json";
import portEn from "./game/en.json";
import portFr from "./game/fr.json";

export const LANGS = ["en", "fr"] as const;
export type Lang = (typeof LANGS)[number];

type Catalog = Record<string, string>;
const UI: Record<Lang, Catalog> = { en: uiEn, fr: uiFr };
const PORT: Record<Lang, TextCatalog> = { en: portEn, fr: portFr };

let uiLang: Lang = "en";
let gameLang: Lang = "en";
const missing = new Set<string>();

export const currentUiLang = () => uiLang;
export const currentGameLang = () => gameLang;

/** Interface text by key, with {name} placeholders. Falls back to English, then to the key. */
export function t(key: string, params?: Record<string, string | number>): string {
  const s = UI[uiLang][key] ?? UI.en[key];
  if (s === undefined) {
    if (!missing.has(key)) { missing.add(key); console.warn(`missing ui text: ${key}`); }
    return key;
  }
  return params ? fmt(s, params) : s;
}

export function setUiLang(lang: Lang) { uiLang = lang; }

/** Installs the game texts of `lang` (extracted + port catalogs), English as fallback. */
export async function loadGameLang(store: AssetStore, lang: Lang): Promise<void> {
  const en = { ...PORT.en, ...(await store.gameText("en")) };
  const cat = lang === "en" ? en : { ...PORT[lang], ...(await store.gameText(lang).catch(() => ({}))) };
  gameLang = lang;
  setGameText(cat, en);
}

/** Catalogs for the tests (completeness). */
export const catalogs = { ui: UI, port: PORT };
