import { describe, it, expect } from "vitest";
import { DATA_FIRST_YEAR, DATA_LAST_YEAR, DATA_YEARS } from "../../utils/years";

describe("year coverage window", () => {
  it("spans 2004 to 2024", () => {
    expect(DATA_FIRST_YEAR).toBe(2004);
    expect(DATA_LAST_YEAR).toBe(2024);
  });

  it("lists every covered year, newest first", () => {
    expect(DATA_YEARS).toHaveLength(DATA_LAST_YEAR - DATA_FIRST_YEAR + 1);
    expect(DATA_YEARS[0]).toBe(DATA_LAST_YEAR);
    expect(DATA_YEARS[DATA_YEARS.length - 1]).toBe(DATA_FIRST_YEAR);
  });

  it("has no gaps or duplicates", () => {
    const unique = new Set(DATA_YEARS);
    expect(unique.size).toBe(DATA_YEARS.length);
    for (let i = 1; i < DATA_YEARS.length; i++) {
      expect(DATA_YEARS[i - 1] - DATA_YEARS[i]).toBe(1);
    }
  });
});
