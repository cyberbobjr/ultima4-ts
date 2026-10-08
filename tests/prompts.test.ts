import { describe, expect, it } from "vitest";
import { sameText, strnieq } from "../src/game/prompts";

describe("strnieq (1000:EC39)", () => {
  it("compares n characters, case-insensitively, stopping at the end of a string", () => {
    expect(strnieq("Health", "heal", 4)).toBe(true);
    expect(strnieq("job", "JOB", 4)).toBe(true);
    expect(strnieq("job", "jobs", 4)).toBe(false);
    expect(strnieq("name", "nam", 4)).toBe(false);
  });
  it("ignores accents, so translated words can be typed without them", () => {
    expect(strnieq("épée", "epee", 4)).toBe(true);
    expect(strnieq("santé", "SANTE", 5)).toBe(true);
    expect(sameText("Honnêteté", "honnetete")).toBe(true);
  });
});
