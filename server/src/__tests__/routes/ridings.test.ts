import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { makeSupabaseMock } from "../helpers/mockSupabase";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("../../lib/supabase", () => ({
  getSupabase: () => ({ from: (t: string) => mockFrom(t) }),
}));

import ridingsRouter, { invalidateRankingsCache } from "../../routes/ridings";

const app = express();
app.use("/api/ridings", ridingsRouter);

function useTables(resultsByTable: Record<string, { data: unknown; error: { message: string } | null }>) {
  const client = makeSupabaseMock(resultsByTable);
  mockFrom.mockImplementation((t: string) => client.from(t));
}

beforeEach(() => {
  mockFrom.mockReset();
  // Rankings are memoised, so clear the cache between tests to keep them isolated.
  invalidateRankingsCache();
});

describe("GET /api/ridings/rankings", () => {
  it("aggregates by riding and sorts descending by total raised", async () => {
    useTables({
      riding_party_summary: {
        data: [
          { fed_num: 1, party: "LPC", total_monetary: 100, donation_count: 2, donor_count: 1 },
          { fed_num: 1, party: "CPC", total_monetary: 50, donation_count: 1, donor_count: 1 },
          { fed_num: 2, party: "LPC", total_monetary: 500, donation_count: 5, donor_count: 3 },
        ],
        error: null,
      },
    });
    const res = await request(app).get("/api/ridings/rankings");
    expect(res.status).toBe(200);
    expect(res.body.ridingCount).toBe(2);
    // Riding 2 (500) outranks riding 1 (150), so it comes first.
    expect(res.body.ridings[0].fedNum).toBe(2);
    expect(res.body.ridings[1].totalMonetary).toBe(150);
    expect(res.body.nationalTotals.totalMonetary).toBe(650);
  });

  it("returns 500 when the scan errors", async () => {
    useTables({ riding_party_summary: { data: null, error: { message: "scan failed" } } });
    const res = await request(app).get("/api/ridings/rankings");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("scan failed");
  });
});

describe("GET /api/ridings/summary", () => {
  it("groups by riding for a single year without a party filter", async () => {
    useTables({
      riding_year_total: {
        data: [
          { fed_num: 10, total_monetary: 100, donation_count: 2, donor_count: 1 },
          { fed_num: 10, total_monetary: 40, donation_count: 1, donor_count: 1 },
        ],
        error: null,
      },
    });
    const res = await request(app).get("/api/ridings/summary?year=2022");
    expect(res.status).toBe(200);
    expect(res.body.data[0].fedNum).toBe(10);
    expect(res.body.data[0].totalMonetary).toBe(140);
  });

  it("reads the party-aware table when a party filter is given", async () => {
    useTables({ riding_party_summary: { data: [], error: null } });
    await request(app).get("/api/ridings/summary?year=2022&party=NDP");
    expect(mockFrom).toHaveBeenCalledWith("riding_party_summary");
  });

  it("averages across multiple years", async () => {
    useTables({
      riding_year_total: {
        data: [
          { fed_num: 10, total_monetary: 100, donation_count: 4, donor_count: 2 },
          { fed_num: 10, total_monetary: 500, donation_count: 8, donor_count: 4 },
        ],
        error: null,
      },
    });
    const res = await request(app).get("/api/ridings/summary?years=2015,2016");
    // (100 + 500) / 2 = 300
    expect(res.body.data[0].totalMonetary).toBe(300);
  });
});

describe("GET /api/ridings/:fedNum/summary", () => {
  it("rejects a non-integer fedNum", async () => {
    useTables({});
    const res = await request(app).get("/api/ridings/abc/summary");
    expect(res.status).toBe(400);
  });

  it("builds all-time and per-year breakdowns, sorted by year", async () => {
    useTables({
      riding_party_summary: {
        data: [
          { party: "LPC", year: 2019, total_monetary: 100, donation_count: 2, donor_count: 1 },
          { party: "LPC", year: 2015, total_monetary: 40, donation_count: 1, donor_count: 1 },
          { party: "CPC", year: 2015, total_monetary: 60, donation_count: 1, donor_count: 1 },
        ],
        error: null,
      },
    });
    const res = await request(app).get("/api/ridings/35001/summary");
    expect(res.status).toBe(200);
    expect(res.body.fedNum).toBe(35001);
    expect(res.body.allTime.totalMonetary).toBe(200);
    expect(res.body.byYear.map((y: { year: number }) => y.year)).toEqual([2015, 2019]);
    const y2015 = res.body.byYear.find((y: { year: number }) => y.year === 2015);
    expect(y2015.byParty).toHaveLength(2);
  });

  it("returns 500 when the query errors", async () => {
    useTables({ riding_party_summary: { data: null, error: { message: "nope" } } });
    const res = await request(app).get("/api/ridings/35001/summary");
    expect(res.status).toBe(500);
  });
});
