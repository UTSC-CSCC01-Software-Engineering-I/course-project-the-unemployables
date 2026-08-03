import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import donationsRouter, { validateFilters, readFiltersFromQuery } from "../../routes/donations";

// Mount the real router on its own app so we can hit it without starting the
// full server. A request with no Bearer token never reaches Supabase — the
// auth check bails out first — so no database mock is needed here.
const app = express();
app.use("/api/donations", donationsRouter);

describe("donations routes require a researcher token", () => {
  it("returns 403 for the records list when no token is provided", async () => {
    const res = await request(app).get("/api/donations");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Access denied");
  });

  it("returns 403 for the summary when no token is provided", async () => {
    const res = await request(app).get("/api/donations/summary");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Access denied");
  });
});

describe("validateFilters", () => {
  it("returns no errors for an empty query", () => {
    expect(validateFilters({})).toEqual([]);
  });

  it("returns no errors for a well-formed query", () => {
    const errors = validateFilters({ amountMin: "10", amountMax: "500", dateFrom: "2020-01-01", dateTo: "2020-12-31" });
    expect(errors).toEqual([]);
  });

  it("flags a negative minimum amount", () => {
    const errors = validateFilters({ amountMin: "-5" });
    expect(errors).toEqual([{ field: "amountMin", message: expect.any(String) }]);
  });

  it("flags a negative maximum amount", () => {
    const errors = validateFilters({ amountMax: "-1" });
    expect(errors.map(e => e.field)).toContain("amountMax");
  });

  it("flags a minimum greater than the maximum", () => {
    const errors = validateFilters({ amountMin: "500", amountMax: "100" });
    expect(errors.map(e => e.field)).toContain("amountMax");
  });

  it("allows a minimum equal to the maximum", () => {
    expect(validateFilters({ amountMin: "100", amountMax: "100" })).toEqual([]);
  });

  it("flags a date range where 'from' is after 'to'", () => {
    const errors = validateFilters({ dateFrom: "2021-06-01", dateTo: "2021-01-01" });
    expect(errors.map(e => e.field)).toContain("dateTo");
  });

  it("collects multiple problems in one pass", () => {
    const errors = validateFilters({ amountMin: "-5", dateFrom: "2021-12-31", dateTo: "2021-01-01" });
    const fields = errors.map(e => e.field);
    expect(fields).toContain("amountMin");
    expect(fields).toContain("dateTo");
  });
});

describe("readFiltersFromQuery", () => {
  it("returns everything undefined for an empty query", () => {
    const filters = readFiltersFromQuery({});
    expect(Object.values(filters).every(v => v === undefined)).toBe(true);
  });

  it("trims surrounding whitespace on text fields", () => {
    const filters = readFiltersFromQuery({ firstName: "  Ada  ", province: " ON " });
    expect(filters.firstName).toBe("Ada");
    expect(filters.province).toBe(" ON "); // province is passed through untrimmed by design
  });

  it("drops whitespace-only text fields to undefined", () => {
    const filters = readFiltersFromQuery({ firstName: "   ", lastName: "" });
    expect(filters.firstName).toBeUndefined();
    expect(filters.lastName).toBeUndefined();
  });

  it("prefers politicalParty over the shorter party alias", () => {
    const filters = readFiltersFromQuery({ politicalParty: "LPC", party: "CPC" });
    expect(filters.politicalParty).toBe("LPC");
  });

  it("falls back to the party alias when politicalParty is absent", () => {
    const filters = readFiltersFromQuery({ party: "NDP" });
    expect(filters.politicalParty).toBe("NDP");
  });

  it("coerces year and amounts to numbers", () => {
    const filters = readFiltersFromQuery({ year: "2019", amountMin: "25", amountMax: "1000" });
    expect(filters.year).toBe(2019);
    expect(filters.amountMin).toBe(25);
    expect(filters.amountMax).toBe(1000);
  });
});
