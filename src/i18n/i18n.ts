// Languages. Two catalogs per language:
// - ui (src/i18n/ui/<lang>/*.json, public): menus, help, inventory, debug panel... read with t();
// - game: the texts of the original game, extracted with the assets (assets/original/i18n/<lang>/
//   game.json, local), completed by the texts written for this port (src/i18n/game/<lang>/*.json,
//   public). They are read through the text registry (src/data/text.ts).
// Each catalog is split in one JSON file per area (merged here), so features can add texts
// without touching each other's files.
import { fmt, setGameText } from "../data/text";
import type { AssetStore, TextCatalog } from "../assets/store";

export const LANGS = ["en", "fr"] as const;
export type Lang = (typeof LANGS)[number];

type Catalog = Record<string, string>;
const files = import.meta.glob<Record<string, unknown>>("./*/*/*.json", { eager: true, import: "default" });

function merge<T>(area: "ui" | "game", lang: Lang): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [path, cat] of Object.entries(files)) {
    if (!path.startsWith(`./${area}/${lang}/`)) continue;
    for (const [k, v] of Object.entries(cat)) {
      if (k in out) throw new Error(`i18n: duplicate key ${k} in ${path}`);
      out[k] = v as T;
    }
  }
  return out;
}

const UI: Record<Lang, Catalog> = { en: merge<string>("ui", "en"), fr: merge<string>("ui", "fr") };
const PORT: Record<Lang, TextCatalog> = { en: merge("game", "en"), fr: merge("game", "fr") };

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
  store.lang = lang; // translated dialogues
  setGameText(cat, en);
}

/** Catalogs for the tests (completeness). */
export const catalogs = { ui: UI, port: PORT };
