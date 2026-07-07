import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import trendsRouter from "../routes/trends";
import { supabase } from "../lib/supabase";

// Mock the Supabase client entirely — these are unit tests for the route's own
// validation and RPC-plumbing logic, not an integration test against a real
// database. Mocking the whole module also avoids the createClient() call that
// runs at import time in the real lib/supabase.ts.
vi.mock("../lib/supabase", () => ({
  supabase: { rpc: vi.fn() },
}));

const mockedRpc = vi.mocked(supabase.rpc);

function buildApp() {
  const app = express();
  // Mounted where index.ts mounts it, so paths match production.
  app.use("/api/donations", trendsRouter);
  return app;
}

// The route awaits supabase.rpc(...) and destructures { data, error } from it.
function mockRpc(result: { data: unknown[] | null; error: { message: string } | null }) {
  mockedRpc.mockResolvedValue(result as never);
}

beforeEach(() => {
  mockedRpc.mockReset();
});

describe("GET /api/donations/sum-by-year-party", () => {
  it("calls the donations_sum_by_year_party RPC with no arguments", async () => {
    mockRpc({ data: [], error: null });
    const app = buildApp();
    await request(app).get("/api/donations/sum-by-year-party");

    expect(mockedRpc).toHaveBeenCalledTimes(1);
    expect(mockedRpc).toHaveBeenCalledWith("donations_sum_by_year_party");
  });

  it("returns 200 with the rows the RPC produced, wrapped in { data }", async () => {
    const rows = [
      { year: 2015, party: "CPC", total: 35488058.04 },
      { year: 2015, party: "LPC", total: 34374386.44 },
    ];
    mockRpc({ data: rows, error: null });
    const app = buildApp();
    const res = await request(app).get("/api/donations/sum-by-year-party");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: rows });
  });

  it("returns { data: [] } when the RPC returns null data", async () => {
    mockRpc({ data: null, error: null });
    const app = buildApp();
    const res = await request(app).get("/api/donations/sum-by-year-party");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });

  it("returns 500 with the Supabase error message when the RPC fails", async () => {
    mockRpc({ data: null, error: { message: "canceling statement due to statement timeout" } });
    const app = buildApp();
    const res = await request(app).get("/api/donations/sum-by-year-party");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "canceling statement due to statement timeout" });
  });
});

describe("GET /api/donations/sum-by-month — validation", () => {
  it("returns 400 when the year query param is missing", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/donations/sum-by-month");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Query param 'year' is required and must be an integer.",
    });
  });

  it("returns 400 when year is not a number", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/donations/sum-by-month?year=abc");
    expect(res.status).toBe(400);
  });

  it("returns 400 for a decimal year", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/donations/sum-by-month?year=2015.5");
    expect(res.status).toBe(400);
  });

  it("does not call the RPC at all when validation fails", async () => {
    const app = buildApp();
    await request(app).get("/api/donations/sum-by-month?year=abc");
    expect(mockedRpc).not.toHaveBeenCalled();
  });
});

describe("GET /api/donations/sum-by-month — success", () => {
  it("calls donations_sum_by_month with the parsed year as p_year", async () => {
    mockRpc({ data: [], error: null });
    const app = buildApp();
    await request(app).get("/api/donations/sum-by-month?year=2015");

    expect(mockedRpc).toHaveBeenCalledWith("donations_sum_by_month", { p_year: 2015 });
  });

  it("passes p_year as a number, not the raw query string", async () => {
    mockRpc({ data: [], error: null });
    const app = buildApp();
    await request(app).get("/api/donations/sum-by-month?year=2015");

    const [, params] = mockedRpc.mock.calls[0]!;
    expect(params).toEqual({ p_year: 2015 });
    expect(typeof (params as { p_year: unknown }).p_year).toBe("number");
  });

  it("returns 200 with the monthly rows wrapped in { data }", async () => {
    const rows = [
      { month: 1, party: "CPC", total: 100 },
      { month: 2, party: "CPC", total: 0 },
    ];
    mockRpc({ data: rows, error: null });
    const app = buildApp();
    const res = await request(app).get("/api/donations/sum-by-month?year=2015");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: rows });
  });

  it("returns { data: [] } when the RPC returns null data", async () => {
    mockRpc({ data: null, error: null });
    const app = buildApp();
    const res = await request(app).get("/api/donations/sum-by-month?year=2015");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });

  it("returns 500 with the Supabase error message when the RPC fails", async () => {
    mockRpc({ data: null, error: { message: "function does not exist" } });
    const app = buildApp();
    const res = await request(app).get("/api/donations/sum-by-month?year=2015");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "function does not exist" });
  });
});
