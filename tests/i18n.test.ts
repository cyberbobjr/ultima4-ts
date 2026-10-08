// Catalog completeness: every text written for the port and every interface text exists in each
// language, with the same {placeholders}.
import { describe, expect, it } from "vitest";
import { textSpecs } from "../src/data/text";
import "../src/data/all-texts";
import { catalogs, LANGS } from "../src/i18n/i18n";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n catalogs", () => {
  it("has every port text in every language", () => {
    const keys = [...textSpecs()].filter(([, s]) => s.kind === "port").map(([k]) => k);
    for (const lang of LANGS) expect(keys.filter((k) => catalogs.port[lang][k] === undefined), lang).toEqual([]);
  });
  it("has no unused port text", () => {
    const keys = new Set([...textSpecs()].filter(([, s]) => s.kind === "port").map(([k]) => k));
    for (const lang of LANGS) expect(Object.keys(catalogs.port[lang]).filter((k) => !keys.has(k)), lang).toEqual([]);
  });
  it("has every interface text in every language, with the same placeholders", () => {
    for (const lang of LANGS) {
      for (const [k, v] of Object.entries(catalogs.ui.en)) {
        const tr = catalogs.ui[lang][k];
        expect(tr, `${lang}: ${k}`).toBeDefined();
        expect(placeholders(tr), `${lang}: ${k}`).toEqual(placeholders(v));
      }
    }
  });
});
