import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import ridingsRouter from "../routes/ridings";
import { getSupabase } from "../lib/supabase";

// Mock the Supabase client entirely — these are unit tests for the route's
// own validation/aggregation logic, not an integration test against a real
// database. No network call happens here.
vi.mock("../lib/supabase", () => ({
  getSupabase: vi.fn(),
}));

const mockedGetSupabase = vi.mocked(getSupabase);

function buildApp() {
  const app = express();
  app.use("/api/ridings", ridingsRouter);
  return app;
}

// Builds a fake Supabase query chain: .from().select().eq() resolving to
// { data, error }, matching exactly how ridings.ts calls it.
function mockSupabaseResult(result: { data: unknown[] | null; error: { message: string } | null }) {
  const eq = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  mockedGetSupabase.mockReturnValue({ from } as never);
  return { from, select, eq };
}

// Builds a fake Supabase chain for the paginated /summary route:
// .from().select().eq().range() — each call to .range() resolves to the
// next entry in `pages`, in order, matching the route's while-loop.
function mockPaginatedSupabase(
  pages: { data: unknown[] | null; error: { message: string } | null }[]
) {
  let callIndex = 0;
  const range = vi.fn().mockImplementation(() => {
    const page = pages[Math.min(callIndex, pages.length - 1)]!;
    callIndex++;
    return Promise.resolve(page);
  });
  const eq = vi.fn().mockReturnValue({ range });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  mockedGetSupabase.mockReturnValue({ from } as never);
  return { from, select, eq, range };
}

function makeRows(count: number, overrides: Partial<Record<string, unknown>> = {}) {
  return Array.from({ length: count }, (_, i) => ({
    fed_num: 10000 + i,
    party: "CPC",
    total_monetary: 100,
    donation_count: 1,
    donor_count: 1,
    ...overrides,
  }));
}

beforeEach(() => {
  mockedGetSupabase.mockReset();
});

describe("GET /api/ridings/:fedNum/summary — validation", () => {
  it("returns 400 when fedNum is not an integer", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/ridings/abc/summary");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "fedNum must be an integer" });
  });

  it("returns 400 for a decimal fedNum", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/ridings/123.5/summary");
    expect(res.status).toBe(400);
  });

  it("does not query Supabase at all when validation fails", async () => {
    const { from } = mockSupabaseResult({ data: [], error: null });
    const app = buildApp();
    await request(app).get("/api/ridings/abc/summary");
    expect(from).not.toHaveBeenCalled();
  });
});

describe("GET /api/ridings/:fedNum/summary — Supabase error handling", () => {
  it("returns 500 with the Supabase error message when the query fails", async () => {
    mockSupabaseResult({ data: null, error: { message: "relation does not exist" } });
    const app = buildApp();
    const res = await request(app).get("/api/ridings/35092/summary");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "relation does not exist" });
  });
});

describe("GET /api/ridings/:fedNum/summary — a riding with no rows at all", () => {
  it("returns a valid, zeroed summary rather than erroring or 404ing", async () => {
    mockSupabaseResult({ data: [], error: null });
    const app = buildApp();
    const res = await request(app).get("/api/ridings/99999/summary");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      fedNum: 99999,
      allTime: { totalMonetary: 0, donationCount: 0, donorCount: 0, byParty: [] },
      byYear: [],
    });
  });

  it("also handles Supabase returning null for data (not just an empty array)", async () => {
    mockSupabaseResult({ data: null, error: null });
    const app = buildApp();
    const res = await request(app).get("/api/ridings/99999/summary");
    expect(res.status).toBe(200);
    expect(res.body.allTime.donationCount).toBe(0);
    expect(res.body.byYear).toEqual([]);
  });
});

describe("GET /api/ridings/:fedNum/summary — aggregation correctness", () => {
  it("queries riding_party_summary filtered by the correct fed_num", async () => {
    const { from, select, eq } = mockSupabaseResult({ data: [], error: null });
    const app = buildApp();
    await request(app).get("/api/ridings/35092/summary");

    expect(from).toHaveBeenCalledWith("riding_party_summary");
    expect(select).toHaveBeenCalledWith("party, year, total_monetary, donation_count, donor_count");
    expect(eq).toHaveBeenCalledWith("fed_num", 35092);
  });

  it("sums all-time totals across every year and party correctly", async () => {
    mockSupabaseResult({
      data: [
        { party: "CPC", year: 2022, total_monetary: 100, donation_count: 2, donor_count: 2 },
        { party: "CPC", year: 2023, total_monetary: 200, donation_count: 3, donor_count: 3 },
        { party: "NDP", year: 2023, total_monetary: 50, donation_count: 1, donor_count: 1 },
      ],
      error: null,
    });
    const app = buildApp();
    const res = await request(app).get("/api/ridings/35092/summary");

    expect(res.status).toBe(200);
    expect(res.body.allTime.totalMonetary).toBe(350);
    expect(res.body.allTime.donationCount).toBe(6);
    expect(res.body.allTime.donorCount).toBe(6);
  });

  it("groups all-time results by party, summing across years for the same party", async () => {
    mockSupabaseResult({
      data: [
        { party: "CPC", year: 2022, total_monetary: 100, donation_count: 2, donor_count: 2 },
        { party: "CPC", year: 2023, total_monetary: 200, donation_count: 3, donor_count: 1 },
      ],
      error: null,
    });
    const app = buildApp();
    const res = await request(app).get("/api/ridings/35092/summary");

    expect(res.body.allTime.byParty).toEqual([
      { party: "CPC", totalMonetary: 300, donationCount: 5, donorCount: 3 },
    ]);
  });

  it("buckets results by year independently, each with its own party breakdown", async () => {
    mockSupabaseResult({
      data: [
        { party: "CPC", year: 2022, total_monetary: 100, donation_count: 2, donor_count: 2 },
        { party: "NDP", year: 2022, total_monetary: 40, donation_count: 1, donor_count: 1 },
        { party: "CPC", year: 2023, total_monetary: 200, donation_count: 3, donor_count: 3 },
      ],
      error: null,
    });
    const app = buildApp();
    const res = await request(app).get("/api/ridings/35092/summary");

    expect(res.body.byYear).toEqual([
      {
        year: 2022,
        totalMonetary: 140,
        donationCount: 3,
        donorCount: 3,
        byParty: expect.arrayContaining([
          { party: "CPC", totalMonetary: 100, donationCount: 2, donorCount: 2 },
          { party: "NDP", totalMonetary: 40, donationCount: 1, donorCount: 1 },
        ]),
      },
      {
        year: 2023,
        totalMonetary: 200,
        donationCount: 3,
        donorCount: 3,
        byParty: [{ party: "CPC", totalMonetary: 200, donationCount: 3, donorCount: 3 }],
      },
    ]);
  });

  it("sorts byYear ascending by year regardless of the order rows came back in", async () => {
    mockSupabaseResult({
      data: [
        { party: "CPC", year: 2024, total_monetary: 1, donation_count: 1, donor_count: 1 },
        { party: "CPC", year: 2004, total_monetary: 1, donation_count: 1, donor_count: 1 },
        { party: "CPC", year: 2015, total_monetary: 1, donation_count: 1, donor_count: 1 },
      ],
      error: null,
    });
    const app = buildApp();
    const res = await request(app).get("/api/ridings/35092/summary");

    expect(res.body.byYear.map((y: { year: number }) => y.year)).toEqual([2004, 2015, 2024]);
  });

  it("coerces bigint columns returned as strings (Postgres/PostgREST convention) into numbers", async () => {
    // donation_count/donor_count are bigint in Postgres, which PostgREST/
    // supabase-js commonly serializes as strings to avoid precision loss.
    // The route must Number()-coerce these, not treat them as already numeric.
    mockSupabaseResult({
      data: [
        { party: "CPC", year: 2023, total_monetary: "500", donation_count: "10", donor_count: "4" },
      ],
      error: null,
    });
    const app = buildApp();
    const res = await request(app).get("/api/ridings/35092/summary");

    expect(res.body.allTime.totalMonetary).toBe(500);
    expect(res.body.allTime.donationCount).toBe(10);
    expect(res.body.allTime.donorCount).toBe(4);
    expect(typeof res.body.allTime.totalMonetary).toBe("number");
  });

  it("stringifies a missing/null party as the literal string 'null' rather than crashing", async () => {
    // NOTE: the route does `String(row["party"])` with no nullish fallback,
    // so a null party becomes the string "null", not a friendly label like
    // "Unknown". This test documents actual behavior — worth revisiting if
    // riding_party_summary can ever legitimately have a null party.
    mockSupabaseResult({
      data: [{ party: null, year: 2023, total_monetary: 10, donation_count: 1, donor_count: 1 }],
      error: null,
    });
    const app = buildApp();
    const res = await request(app).get("/api/ridings/35092/summary");
    expect(res.status).toBe(200);
    expect(res.body.allTime.byParty[0].party).toBe("null");
  });

  it("sums two rows for the same party within the same year, not just across years", async () => {
    // riding_party_summary is expected to have one row per fed_num/party/year,
    // but this proves the accumulation logic still combines correctly even
    // if that uniqueness assumption is ever violated.
    mockSupabaseResult({
      data: [
        { party: "CPC", year: 2023, total_monetary: 50, donation_count: 1, donor_count: 1 },
        { party: "CPC", year: 2023, total_monetary: 75, donation_count: 2, donor_count: 1 },
      ],
      error: null,
    });
    const app = buildApp();
    const res = await request(app).get("/api/ridings/35092/summary");

    expect(res.body.byYear).toEqual([
      {
        year: 2023,
        totalMonetary: 125,
        donationCount: 3,
        donorCount: 2,
        byParty: [{ party: "CPC", totalMonetary: 125, donationCount: 3, donorCount: 2 }],
      },
    ]);
  });

  it("echoes back the requested fedNum in the response", async () => {
    mockSupabaseResult({ data: [], error: null });
    const app = buildApp();
    const res = await request(app).get("/api/ridings/24037/summary");
    expect(res.body.fedNum).toBe(24037);
  });
});

describe("GET /api/ridings/summary?year= — all ridings (choropleth map)", () => {
  it("defaults year to 2022 when no query param is given", async () => {
    const { eq } = mockPaginatedSupabase([{ data: [], error: null }]);
    const app = buildApp();
    const res = await request(app).get("/api/ridings/summary");

    expect(res.status).toBe(200);
    expect(res.body.year).toBe(2022);
    expect(eq).toHaveBeenCalledWith("year", 2022);
  });

  it("uses the year query param when provided", async () => {
    const { eq } = mockPaginatedSupabase([{ data: [], error: null }]);
    const app = buildApp();
    const res = await request(app).get("/api/ridings/summary?year=2019");

    expect(res.status).toBe(200);
    expect(res.body.year).toBe(2019);
    expect(eq).toHaveBeenCalledWith("year", 2019);
  });

  it("queries the correct table and columns", async () => {
    const { from, select } = mockPaginatedSupabase([{ data: [], error: null }]);
    const app = buildApp();
    await request(app).get("/api/ridings/summary");

    expect(from).toHaveBeenCalledWith("riding_party_summary");
    expect(select).toHaveBeenCalledWith("fed_num, party, total_monetary, donation_count, donor_count");
  });

  it("stops after a single page when fewer than 1000 rows come back", async () => {
    const rows = makeRows(2);
    const { range } = mockPaginatedSupabase([{ data: rows, error: null }]);
    const app = buildApp();
    const res = await request(app).get("/api/ridings/summary");

    expect(res.status).toBe(200);
    expect(range).toHaveBeenCalledTimes(1);
    expect(range).toHaveBeenCalledWith(0, 999);
  });

  it("fetches a second page when the first page comes back with exactly 1000 rows", async () => {
    const page1 = makeRows(1000);
    const page2 = makeRows(50, { fed_num: 99999 });
    const { range } = mockPaginatedSupabase([
      { data: page1, error: null },
      { data: page2, error: null },
    ]);
    const app = buildApp();
    const res = await request(app).get("/api/ridings/summary");

    expect(res.status).toBe(200);
    expect(range).toHaveBeenCalledTimes(2);
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
    // Total accumulated rows across both pages should all reach groupByRiding —
    // 1000 rows share fed_num 10000-10999, plus 50 more all under fed_num 99999,
    // so grouping should produce 1001 distinct ridings.
    expect(res.body.data).toHaveLength(1001);
  });

  it("keeps paging until a page comes back under 1000 rows, then stops", async () => {
    const page1 = makeRows(1000); // 1000 distinct fed_nums (10000-10999)
    const page2 = makeRows(1000, { fed_num: 20000 }); // all share one fed_num
    const page3 = makeRows(3, { fed_num: 30000 }); // all share one fed_num
    const { range } = mockPaginatedSupabase([
      { data: page1, error: null },
      { data: page2, error: null },
      { data: page3, error: null },
    ]);
    const app = buildApp();
    const res = await request(app).get("/api/ridings/summary");

    expect(range).toHaveBeenCalledTimes(3);
    expect(range).toHaveBeenNthCalledWith(3, 2000, 2999);
    expect(res.status).toBe(200);
    // Grouped by fed_num: 1000 distinct (page1) + 1 (page2, all same fed_num)
    // + 1 (page3, all same fed_num) = 1002 riding entries in the response —
    // not the raw row count (2003), since the response is grouped output.
    expect(res.body.data.length).toBe(1002);
  });

  it("returns 500 immediately if the first page errors, without paging further", async () => {
    const { range } = mockPaginatedSupabase([{ data: null, error: { message: "connection reset" } }]);
    const app = buildApp();
    const res = await request(app).get("/api/ridings/summary");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "connection reset" });
    expect(range).toHaveBeenCalledTimes(1);
  });

  it("returns 500 if a later page errors mid-pagination", async () => {
    const page1 = makeRows(1000);
    const { range } = mockPaginatedSupabase([
      { data: page1, error: null },
      { data: null, error: { message: "timeout on page 2" } },
    ]);
    const app = buildApp();
    const res = await request(app).get("/api/ridings/summary");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "timeout on page 2" });
    expect(range).toHaveBeenCalledTimes(2);
  });

  it("groups the accumulated rows correctly via the real groupByRiding function", async () => {
    const rows = [
      { fed_num: 35092, party: "CPC", total_monetary: 500, donation_count: 5, donor_count: 3 },
      { fed_num: 35092, party: "NDP", total_monetary: 200, donation_count: 2, donor_count: 2 },
      { fed_num: 10006, party: "LPC", total_monetary: 100, donation_count: 1, donor_count: 1 },
    ];
    mockPaginatedSupabase([{ data: rows, error: null }]);
    const app = buildApp();
    const res = await request(app).get("/api/ridings/summary");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    const agincourt = res.body.data.find((r: { fedNum: number }) => r.fedNum === 35092);
    expect(agincourt.totalMonetary).toBe(700);
    expect(agincourt.donationCount).toBe(7);
    expect(agincourt.byParty).toHaveLength(2);
  });

  it("handles Supabase returning null data on a page rather than an empty array", async () => {
    mockPaginatedSupabase([{ data: null, error: null }]);
    const app = buildApp();
    const res = await request(app).get("/api/ridings/summary");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

