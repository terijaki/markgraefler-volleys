import { describe, expect, it } from "vite-plus/test";
import { numToWordDe } from "./numToWordDe";

describe("numToWordDe", () => {
  it("uses lowercase when uppercase is false", () => {
    expect(numToWordDe(2, { uppercase: false })).toBe("zwei");
    expect(numToWordDe(6, { uppercase: false })).toBe("sechs");
    expect(numToWordDe(20, { uppercase: false })).toBe("zwanzig");
  });

  it("uses eine for 1 with indefinite_eine", () => {
    expect(numToWordDe(1, { uppercase: false, indefinite_eine: true })).toBe("eine");
  });

  it("uses eins for 1 without indefinite_eine", () => {
    expect(numToWordDe(1, { uppercase: false })).toBe("eins");
  });

  it("capitalizes when uppercase is omitted (default true)", () => {
    expect(numToWordDe(3)).toBe("Drei");
  });
});
