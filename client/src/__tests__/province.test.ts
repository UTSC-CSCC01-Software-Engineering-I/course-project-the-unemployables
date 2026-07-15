import { describe, it, expect } from "vitest";
import { provinceForFedNum, ALL_PROVINCES } from "../utils/province";

describe("provinceForFedNum", () => {
  it("maps known FED_NUM prefixes to the correct province", () => {
    expect(provinceForFedNum(35092)?.code).toBe("ON"); // Scarborough—Agincourt
    expect(provinceForFedNum(24037)?.code).toBe("QC"); // Laurier—Sainte-Marie
    expect(provinceForFedNum(10006)?.code).toBe("NL"); // Avalon
  });

  it("returns full province names alongside the code", () => {
    expect(provinceForFedNum(48001)?.name).toBe("Alberta");
  });

  it("returns null for an unrecognized prefix", () => {
    expect(provinceForFedNum(99999)).toBeNull();
  });
});

describe("ALL_PROVINCES", () => {
  it("includes exactly the 13 provinces and territories, alphabetically sorted", () => {
    expect(ALL_PROVINCES).toHaveLength(13);
    const names = ALL_PROVINCES.map(p => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
