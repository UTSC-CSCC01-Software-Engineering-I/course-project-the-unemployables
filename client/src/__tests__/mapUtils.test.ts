import { describe, it, expect } from "vitest";
import { formatMoney, amountToColor, CHOROPLETH_STEPS } from "../utils/mapUtils";

describe("formatMoney", () => {
  it("formats zero as dollars", () => {
    expect(formatMoney(0)).toBe("$0");
  });

  it("formats amounts under $1,000 as plain dollars", () => {
    expect(formatMoney(500)).toBe("$500");
    expect(formatMoney(999)).toBe("$999");
  });

  it("formats amounts $1,000–$999,999 as K", () => {
    expect(formatMoney(1000)).toBe("$1K");
    expect(formatMoney(50000)).toBe("$50K");
    expect(formatMoney(250000)).toBe("$250K");
  });

  it("formats amounts $1,000,000+ as M with one decimal", () => {
    expect(formatMoney(1_000_000)).toBe("$1.0M");
    expect(formatMoney(2_500_000)).toBe("$2.5M");
    expect(formatMoney(10_000_000)).toBe("$10.0M");
  });
});

describe("amountToColor", () => {
  it("returns the lightest step for amount of 0", () => {
    expect(amountToColor(0, 1000)).toBe(CHOROPLETH_STEPS[0]);
  });

  it("returns a mid-range color for 25% of max", () => {
    // sqrt(0.25) = 0.5, floor(0.5 * 6) = 3 → index 3
    expect(amountToColor(250, 1000)).toBe(CHOROPLETH_STEPS[3]);
  });

  it("returns the second-darkest step for the maximum value", () => {
    // sqrt(1) = 1, floor(1 * 6) = 6, capped at last-1 = 5
    expect(amountToColor(1000, 1000)).toBe(CHOROPLETH_STEPS[5]);
  });

  it("returns a darker color for larger amounts", () => {
    const low = amountToColor(100, 1000);
    const high = amountToColor(800, 1000);
    expect(CHOROPLETH_STEPS.indexOf(high)).toBeGreaterThan(
      CHOROPLETH_STEPS.indexOf(low)
    );
  });
});
