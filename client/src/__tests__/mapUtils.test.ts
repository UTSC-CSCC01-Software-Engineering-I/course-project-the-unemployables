import { describe, it, expect } from "vitest";
import { formatMoney } from "../utils/mapUtils";

describe("formatMoney", () => {
  it("formats amounts under $1,000 as plain dollars", () => {
    expect(formatMoney(500)).toBe("$500");
  });

  it("formats amounts in the thousands as K", () => {
    expect(formatMoney(1000)).toBe("$1K");
    expect(formatMoney(50000)).toBe("$50K");
  });

  it("formats amounts in the millions as M with one decimal", () => {
    expect(formatMoney(1_000_000)).toBe("$1.0M");
    expect(formatMoney(2_500_000)).toBe("$2.5M");
  });
});
