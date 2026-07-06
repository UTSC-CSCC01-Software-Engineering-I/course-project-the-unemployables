import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { readFiltersFromQuery, validateFilters } from "../routes/donations";

function makeQuery(overrides: Record<string, string | undefined> = {}) {
  return {
    year: undefined,
    party: undefined,
    province: undefined,
    postalCode: undefined,
    donorName: undefined,
    firstName: undefined,
    lastName: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    amountMin: undefined,
    amountMax: undefined,
    politicalParty: undefined,
    page: undefined,
    limit: undefined,
    ...overrides,
  } as Request["query"];
}

describe("donations route helpers", () => {
  it("make sure we parse advanced filter values into the expected function", () => {
    const query = makeQuery({
      firstName: "Jane",
      lastName: "Doe",
      amountMin: "100",
      amountMax: "500",
      politicalParty: "LPC",
      province: "ON",
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
    });

    const result = readFiltersFromQuery(query);

    expect(result).toEqual({
      donorName: undefined,
      firstName: "Jane",
      lastName: "Doe",
      politicalParty: "LPC",
      province: "ON",
      postalCode: undefined,
      year: undefined,
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
      amountMin: 100,
      amountMax: 500,
    });
  });

  it("returns validation errors for invalid ranges", () => {
    const errors = validateFilters(makeQuery({ amountMin: "500", amountMax: "100" }));

    expect(errors).toEqual([
      { field: "amountMax", message: "Maximum amount must be greater than or equal to minimum amount." },
    ]);
  });

  it("accepts valid date ranges without errors", () => {
    const errors = validateFilters(makeQuery({ dateFrom: "2024-01-01", dateTo: "2024-12-31" }));

    expect(errors).toEqual([]);
  });

  it("rejects a date range where the start date is after the end date", () => {
    const errors = validateFilters(makeQuery({ dateFrom: "2024-12-31", dateTo: "2024-01-01" }));

    expect(errors).toEqual([{ field: "dateTo", message: "Date range is invalid: from date cannot be after to date." }]);
  });
});
