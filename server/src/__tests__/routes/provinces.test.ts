import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { makeSupabaseMock } from "../helpers/mockSupabase";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("../../lib/supabase", () => ({
  getSupabase: () => ({ from: (t: string) => mockFrom(t) }),
}));

import provincesRouter from "../../routes/provinces";

const app = express();
app.use("/api/provinces", provincesRouter);

function useTables(resultsByTable: Record<string, { data: unknown; error: { message: string } | null }>) {
  const client = makeSupabaseMock(resultsByTable);
  mockFrom.mockImplementation((t: string) => client.from(t));
}

beforeEach(() => mockFrom.mockReset());

describe("GET /api/provinces/summary", () => {
  it("groups rows by province for a single year", async () => {
    useTables({
      province_year_total: {
        data: [
          { province: "ON", total_monetary: 100, donation_count: 3, donor_count: 2 },
          { province: "ON", total_monetary: 50, donation_count: 1, donor_count: 1 },
          { province: "BC", total_monetary: 80, donation_count: 2, donor_count: 2 },
        ],
        error: null,
      },
    });
    const res = await request(app).get("/api/provinces/summary?year=2022");
    expect(res.status).toBe(200);
    const on = res.body.data.find((r: { province: string }) => r.province === "ON");
    expect(on.totalMonetary).toBe(150);
    expect(on.donationCount).toBe(4);
  });

  it("averages across years when several are selected", async () => {
    useTables({
      province_year_total: {
        data: [
          { province: "ON", total_monetary: 100, donation_count: 4, donor_count: 2 },
          { province: "ON", total_monetary: 300, donation_count: 8, donor_count: 4 },
        ],
        error: null,
      },
    });
    const res = await request(app).get("/api/provinces/summary?years=2015,2016");
    expect(res.status).toBe(200);
    const on = res.body.data.find((r: { province: string }) => r.province === "ON");
    // (100 + 300) / 2 years = 200
    expect(on.totalMonetary).toBe(200);
    expect(res.body.years).toEqual([2015, 2016]);
  });

  it("reads the party-aware view when a party filter is given", async () => {
    useTables({ province_party_year_total: { data: [], error: null } });
    await request(app).get("/api/provinces/summary?year=2022&party=LPC");
    expect(mockFrom).toHaveBeenCalledWith("province_party_year_total");
  });

  it("returns 500 when the query errors", async () => {
    useTables({ province_year_total: { data: null, error: { message: "db down" } } });
    const res = await request(app).get("/api/provinces/summary?year=2022");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("db down");
  });
});

describe("GET /api/provinces/:code/summary", () => {
  it("breaks a province down by year with per-party totals, sorted by year", async () => {
    useTables({
      province_party_year_total: {
        data: [
          { year: 2018, party: "LPC", total_monetary: 100, donation_count: 2, donor_count: 1 },
          { year: 2016, party: "CPC", total_monetary: 50, donation_count: 1, donor_count: 1 },
          { year: 2016, party: "LPC", total_monetary: 25, donation_count: 1, donor_count: 1 },
        ],
        error: null,
      },
    });
    const res = await request(app).get("/api/provinces/ON/summary");
    expect(res.status).toBe(200);
    expect(res.body.province).toBe("ON");
    expect(res.body.byYear.map((y: { year: number }) => y.year)).toEqual([2016, 2018]);
    const y2016 = res.body.byYear.find((y: { year: number }) => y.year === 2016);
    expect(y2016.totalMonetary).toBe(75);
    expect(y2016.byParty).toHaveLength(2);
  });
});
