import { describe, it, expect } from "vitest";
import { formatMoney, amountToColor, CHOROPLETH_STEPS } from "../../utils/mapUtils";

describe("formatMoney", () => {
  it("formats zero as plain dollars", () => {
    expect(formatMoney(0)).toBe("$0");
  });

  it("formats amounts in the thousands as K", () => {
    expect(formatMoney(1000)).toBe("$1K");
    expect(formatMoney(50000)).toBe("$50K");
  });

  it("formats amounts in the millions as M with one decimal", () => {
    expect(formatMoney(1_000_000)).toBe("$1.0M");
    expect(formatMoney(28_100_000)).toBe("$28.1M");
  });

  it("formats amounts in the billions as B with one decimal", () => {
    expect(formatMoney(1_000_000_000)).toBe("$1.0B");
    expect(formatMoney(1_487_300_000)).toBe("$1.5B");
  });

  it("stays in millions just below the billion boundary", () => {
    expect(formatMoney(999_900_000)).toBe("$999.9M");
  });
});

describe("amountToColor", () => {
  it("always returns a color from the palette", () => {
    expect(CHOROPLETH_STEPS).toContain(amountToColor(250, 1000));
    expect(CHOROPLETH_STEPS).toContain(amountToColor(1000, 1000));
  });

  it("returns a darker color for a larger proportion", () => {
    const low  = CHOROPLETH_STEPS.indexOf(amountToColor(100,  1000));
    const high = CHOROPLETH_STEPS.indexOf(amountToColor(900, 1000));
    expect(high).toBeGreaterThan(low);
  });
});
