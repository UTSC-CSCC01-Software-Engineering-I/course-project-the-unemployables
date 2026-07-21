import { describe, it, expect } from "vitest";
import { formatMoney, amountToColor, CHOROPLETH_STEPS } from "../utils/mapUtils";

describe("formatMoney", () => {
  it("formats amounts under $1,000 as plain dollars", () => {
    expect(formatMoney(500)).toBe("$500");
  });

  it("formats zero as plain dollars", () => {
    expect(formatMoney(0)).toBe("$0");
  });

  it("formats amounts just below $1K without the K suffix", () => {
    expect(formatMoney(999)).toBe("$999");
  });

  it("formats amounts in the thousands as K", () => {
    expect(formatMoney(1000)).toBe("$1K");
    expect(formatMoney(50000)).toBe("$50K");
  });

  it("formats amounts in the millions as M with one decimal", () => {
    expect(formatMoney(1_000_000)).toBe("$1.0M");
    expect(formatMoney(2_500_000)).toBe("$2.5M");
    expect(formatMoney(28_100_000)).toBe("$28.1M");
  });
});

describe("amountToColor", () => {
  it("returns the lightest step for a zero amount", () => {
    expect(amountToColor(0, 1000)).toBe(CHOROPLETH_STEPS[0]);
  });

  it("always returns a color from the palette", () => {
    expect(CHOROPLETH_STEPS).toContain(amountToColor(250, 1000));
    expect(CHOROPLETH_STEPS).toContain(amountToColor(500, 1000));
    expect(CHOROPLETH_STEPS).toContain(amountToColor(1000, 1000));
  });

  it("returns a darker color for a larger proportion", () => {
    const low  = CHOROPLETH_STEPS.indexOf(amountToColor(100,  1000));
    const high = CHOROPLETH_STEPS.indexOf(amountToColor(900, 1000));
    expect(high).toBeGreaterThan(low);
  });

  it("returns the same color when amount equals max", () => {
    expect(amountToColor(1000, 1000)).toBe(amountToColor(999, 1000));
  });
});
