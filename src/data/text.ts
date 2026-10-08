// Game texts by key. The source only declares *where* each text lives in the original
// executable (DS offset or pointer table); the texts themselves come from the catalog produced
// by `npm run extract` (assets/original/i18n/<lang>/game.json) and are installed at startup.
//
//   export const TALK = defineTexts("talk", { youSay: 0x2a62, adjectives: ptrs(0x2bb2, 8) });
//   TALK.youSay       -> string from the catalog (key "talk.youSay")
//   TALK.adjectives   -> readonly string[]
//
// The extractor walks the same registry (`textSpecs()`) to read the executable, so the key list
// and the offsets have a single source of truth.

/** Which original executable holds the text (AVATAR.EXE unless stated). */
export type TextSource = "avatar" | "title";

/** A NUL-terminated string at a DS offset. */
export interface StrSpec { kind: "str"; src: TextSource; ds: number }
/** `count` word pointers at a DS offset, each to a string (a null pointer gives ""). */
export interface PtrsSpec { kind: "ptrs"; src: TextSource; ds: number; count: number }
/**
 * Text written for this port (not in the original executables). It lives in the public catalogs
 * src/i18n/game/<lang>.json, under the same key. `count` makes it a list.
 */
export interface PortSpec { kind: "port"; count?: number }
export type TextSpec = StrSpec | PtrsSpec | PortSpec;

type SpecInput = number | TextSpec;
type Resolved<S> = S extends number ? string : S extends PtrsSpec ? readonly string[] : S extends PortSpec ? (S["count"] extends number ? readonly string[] : string) : string;
export type Texts<T> = { readonly [K in keyof T]: Resolved<T[K]> };

export const str = (ds: number, src: TextSource = "avatar"): StrSpec => ({ kind: "str", src, ds });
export const ptrs = (ds: number, count: number, src: TextSource = "avatar"): PtrsSpec => ({ kind: "ptrs", src, ds, count });
/** A text written for this port (public catalog). */
export const port = (): PortSpec & { count?: undefined } => ({ kind: "port" });
/** A list of texts written for this port (public catalog). */
export const portList = (count: number): PortSpec & { count: number } => ({ kind: "port", count });

/** Replaces {name} placeholders: fmt("{n} Gold", { n: 5 }). */
export function fmt(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

const registry = new Map<string, TextSpec>();
let catalog: Record<string, string | readonly string[]> = {};
let fallback: Record<string, string | readonly string[]> = {};
const missing = new Set<string>();
const listeners: (() => void)[] = [];
let installed = false;

/** Installs the catalog for the current game language, with the English one as fallback. */
export function setGameText(cat: Record<string, string | readonly string[]>, en: Record<string, string | readonly string[]> = cat): void {
  catalog = cat;
  fallback = en;
  missing.clear();
  installed = true;
  for (const l of listeners) l();
}

/** Runs `l` every time a catalog is installed (for plain exported values that cannot be getters). */
export function onGameText(l: () => void): void {
  listeners.push(l);
  if (installed) l();
}

/** Looks a text up by full key ("talk.youSay"). Unknown keys show as the key itself. */
export function gameText(key: string): string | readonly string[] {
  const v = catalog[key] ?? fallback[key];
  if (v !== undefined) return v;
  const spec = registry.get(key);
  if (!missing.has(key)) { missing.add(key); console.warn(`missing game text: ${key}`); }
  const count = spec?.kind === "ptrs" ? spec.count : spec?.kind === "port" ? spec.count : undefined;
  return count !== undefined ? Array.from({ length: count }, (_, i) => `${key}[${i}]`) : `<${key}>`;
}

export function defineTexts<T extends Record<string, SpecInput>>(ns: string, spec: T): Texts<T> {
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(spec)) {
    const key = `${ns}.${k}`;
    if (registry.has(key)) throw new Error(`duplicate text key ${key}`);
    registry.set(key, typeof v === "number" ? str(v) : v);
    Object.defineProperty(out, k, { enumerable: true, get: () => gameText(key) });
  }
  return out as Texts<T>;
}

/** Every declared text, for the extractor and the tests. */
export function textSpecs(): ReadonlyMap<string, TextSpec> {
  return registry;
}

/**
 * Gives each row of a table a `name` read from a text list, by row position or by an explicit index:
 *   withText(rows, () => NAMES.monsters, "name")
 */
export function withText<R extends object, F extends string>(rows: readonly R[], list: () => readonly string[], field: F, index: (r: R, i: number) => number = (_, i) => i): readonly (R & { readonly [P in F]: string })[] {
  return rows.map((r, i) => Object.defineProperty({ ...r }, field, { enumerable: true, get: () => list()[index(r, i)] }) as R & { readonly [P in F]: string });
}

/**
 * Adds several computed (getter) fields to each row of a table, for values read from the catalog
 * or derived from it (names, lists of names, transformed texts):
 *   withGetters(rows, { name: (_, i) => NAMES.shops[i], keeper: (_, i) => NAMES.keepers[i] })
 */
export function withGetters<R extends object, G extends Record<string, (r: R, i: number) => unknown>>(rows: readonly R[], getters: G): readonly (R & { readonly [K in keyof G]: ReturnType<G[K]> })[] {
  return rows.map((r, i) => {
    const o = { ...r };
    for (const [k, g] of Object.entries(getters)) Object.defineProperty(o, k, { enumerable: true, configurable: true, get: () => g(r, i) });
    return o as R & { readonly [K in keyof G]: ReturnType<G[K]> };
  });
}

/** A read-only list of `n` items computed on access (e.g. texts read from the catalog): lazyList(8, (i) => T.names[i]). */
export function lazyList<T>(n: number, item: (i: number) => T): readonly T[] {
  const a: T[] = [];
  for (let i = 0; i < n; i++) Object.defineProperty(a, i, { enumerable: true, configurable: true, get: () => item(i) });
  return a;
}

/** A read-only record whose keys and values are computed on access (e.g. keyed by catalog texts). */
export function lazyRecord<V>(build: () => Readonly<Record<string, V>>): Readonly<Record<string, V>> {
  return new Proxy({} as Record<string, V>, {
    get: (_, k) => (typeof k === "string" ? build()[k] : undefined),
    has: (_, k) => typeof k === "string" && Object.prototype.hasOwnProperty.call(build(), k),
    ownKeys: () => Object.keys(build()),
    getOwnPropertyDescriptor: (_, k) => {
      const r = build();
      return typeof k === "string" && Object.prototype.hasOwnProperty.call(r, k) ? { value: r[k], enumerable: true, configurable: true, writable: false } : undefined;
    },
  });
}
