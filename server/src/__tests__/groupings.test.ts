import { describe, it, expect } from "vitest";
import { groupByProvince, groupByRiding } from "../utils/groupings";

describe("groupByProvince", () => {
  it("sums monetary and donation counts across parties", () => {
    const rows = [
      { province: "ON", party: "LPC", total_monetary: 1000, donation_count: 5, donor_count: 3 },
      { province: "ON", party: "CPC", total_monetary: 500,  donation_count: 2, donor_count: 3 },
    ];
    const result = groupByProvince(rows);
    expect(result[0].totalMonetary).toBe(1500);
    expect(result[0].donationCount).toBe(7);
  });

  it("produces one entry per province with correct byParty list", () => {
    const rows = [
      { province: "ON", party: "LPC", total_monetary: 1000, donation_count: 5, donor_count: 3 },
      { province: "BC", party: "NDP", total_monetary: 800,  donation_count: 4, donor_count: 4 },
      { province: "BC", party: "LPC", total_monetary: 200,  donation_count: 1, donor_count: 4 },
    ];
    const result = groupByProvince(rows);
    expect(result).toHaveLength(2);
    const bc = result.find(r => r.province === "BC")!;
    expect(bc.totalMonetary).toBe(1000);
    expect(bc.byParty).toHaveLength(2);
  });

  it("coerces numeric strings from Supabase", () => {
    const rows = [
      { province: "AB", party: "CPC", total_monetary: "2500.50", donation_count: "10", donor_count: "8" },
    ];
    const result = groupByProvince(rows);
    expect(result[0].totalMonetary).toBeCloseTo(2500.50);
    expect(result[0].donationCount).toBe(10);
  });
});

describe("groupByRiding", () => {
  it("sums totals across parties for the same riding", () => {
    const rows = [
      { fed_num: 35001, party: "LPC", total_monetary: 2000, donation_count: 8, donor_count: 6 },
      { fed_num: 35001, party: "NDP", total_monetary: 1000, donation_count: 4, donor_count: 6 },
    ];
    const result = groupByRiding(rows);
    expect(result).toHaveLength(1);
    expect(result[0].totalMonetary).toBe(3000);
    expect(result[0].donationCount).toBe(12);
  });

  it("produces one entry per riding with correct byParty list", () => {
    const rows = [
      { fed_num: 59001, party: "NDP", total_monetary: 800,  donation_count: 3, donor_count: 3 },
      { fed_num: 59002, party: "LPC", total_monetary: 600,  donation_count: 2, donor_count: 2 },
      { fed_num: 59002, party: "CPC", total_monetary: 400,  donation_count: 1, donor_count: 2 },
    ];
    const result = groupByRiding(rows);
    expect(result).toHaveLength(2);
    const r = result.find(r => r.fedNum === 59002)!;
    expect(r.byParty).toHaveLength(2);
    expect(r.totalMonetary).toBe(1000);
  });

  it("preserves fedNum as a number", () => {
    const rows = [
      { fed_num: 10001, party: "LPC", total_monetary: 500, donation_count: 2, donor_count: 2 },
    ];
    const result = groupByRiding(rows);
    expect(typeof result[0].fedNum).toBe("number");
    expect(result[0].fedNum).toBe(10001);
  });
});
