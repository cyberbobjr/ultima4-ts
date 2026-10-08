import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, mergeConfig } from "../src/config/config";

describe("config", () => {
  it("merges stored values over the defaults, key by key", () => {
    const c = mergeConfig(structuredClone(DEFAULT_CONFIG), { lang: { ui: "fr" }, debug: { enabled: true } });
    expect(c.lang).toEqual({ game: "en", ui: "fr" });
    expect(c.debug).toEqual({ enabled: true, godMode: false });
    expect(c.tiles.pack).toBe("original");
  });
  it("keeps unknown keys and fills missing sections", () => {
    const c = mergeConfig(structuredClone(DEFAULT_CONFIG), { future: { x: 1 } }) as unknown as Record<string, unknown>;
    expect(c.future).toEqual({ x: 1 });
    expect(mergeConfig(structuredClone(DEFAULT_CONFIG), undefined)).toEqual(DEFAULT_CONFIG);
  });
});
