import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { makeSupabaseMock } from "../helpers/mockSupabase";

// Point the route's Supabase import at a mock we reconfigure per test.
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("../../lib/supabase", () => ({
  supabase: { from: (t: string) => mockFrom(t) },
  getSupabase: () => ({ from: (t: string) => mockFrom(t) }),
}));

import trendsRouter from "../../routes/trends";

const app = express();
app.use("/api/donations", trendsRouter);

// Wire the mock so each listed table returns the given rows.
function useTables(resultsByTable: Record<string, { data: unknown; error: { message: string } | null }>) {
  const client = makeSupabaseMock(resultsByTable);
  mockFrom.mockImplementation((t: string) => client.from(t));
}

beforeEach(() => mockFrom.mockReset());

describe("GET /sum-by-year-party", () => {
  it("returns the view rows as-is", async () => {
    const rows = [{ year: 2019, party: "LPC", total: 100 }];
    useTables({ donation_year_party_totals: { data: rows, error: null } });
    const res = await request(app).get("/api/donations/sum-by-year-party");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(rows);
  });

  it("surfaces a database error as a 500", async () => {
    useTables({ donation_year_party_totals: { data: null, error: { message: "boom" } } });
    const res = await request(app).get("/api/donations/sum-by-year-party");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("boom");
  });
});

describe("GET /sum-by-month", () => {
  it("rejects a missing year", async () => {
    useTables({});
    const res = await request(app).get("/api/donations/sum-by-month");
    expect(res.status).toBe(400);
  });

  it("rejects a non-integer year", async () => {
    useTables({});
    const res = await request(app).get("/api/donations/sum-by-month?year=abc");
    expect(res.status).toBe(400);
  });

  it("zero-fills a full 12-month grid for each active party", async () => {
    // Only two sparse cells stored; every other month should come back as 0.
    useTables({
      donation_year_month_party_totals: {
        data: [
          { month: 3, party: "LPC", total: 500 },
          { month: 7, party: "CPC", total: 250 },
        ],
        error: null,
      },
    });
    const res = await request(app).get("/api/donations/sum-by-month?year=2015");
    expect(res.status).toBe(200);
    // 12 months x 2 parties = 24 cells.
    expect(res.body.data).toHaveLength(24);
    const march = res.body.data.find((r: { month: number; party: string }) => r.month === 3 && r.party === "LPC");
    const jan = res.body.data.find((r: { month: number; party: string }) => r.month === 1 && r.party === "LPC");
    expect(march.total).toBe(500);
    expect(jan.total).toBe(0);
  });
});

describe("GET /sum-by-province-month", () => {
  it("rejects a missing province", async () => {
    useTables({});
    const res = await request(app).get("/api/donations/sum-by-province-month?year=2015");
    expect(res.status).toBe(400);
  });

  it("rejects a missing year", async () => {
    useTables({});
    const res = await request(app).get("/api/donations/sum-by-province-month?province=ON");
    expect(res.status).toBe(400);
  });
});

describe("GET /sum-by-province-year", () => {
  it("rejects a missing province", async () => {
    useTables({});
    const res = await request(app).get("/api/donations/sum-by-province-year");
    expect(res.status).toBe(400);
  });

  it("rolls monthly rows up into per-year totals and zero-fills the gaps", async () => {
    // Two months of the same year/party should sum; the year range in between
    // should be zero-filled for continuity.
    useTables({
      donation_province_year_month_party_totals: {
        data: [
          { year: 2016, party: "LPC", total: 100 },
          { year: 2016, party: "LPC", total: 50 },
          { year: 2018, party: "LPC", total: 200 },
        ],
        error: null,
      },
    });
    const res = await request(app).get("/api/donations/sum-by-province-year?province=ON");
    expect(res.status).toBe(200);
    const y2016 = res.body.data.find((r: { year: number }) => r.year === 2016);
    const y2017 = res.body.data.find((r: { year: number }) => r.year === 2017);
    const y2018 = res.body.data.find((r: { year: number }) => r.year === 2018);
    expect(y2016.total).toBe(150); // 100 + 50 rolled up
    expect(y2017.total).toBe(0);   // zero-filled gap year
    expect(y2018.total).toBe(200);
  });
});
