import { describe, expect, it } from "vitest";
import { buildQuery } from "../../api/donations";
import type { DonationFilters } from "../../types/index";

describe("buildQuery", () => {
  it("includes advanced research filters and pagination in the query string", () => {
    const filters: DonationFilters = {
      year: 2024,
      party: "CPC",
      province: "ON",
      postalCode: "M5V 2T6",
      firstName: "Jane",
      lastName: "Doe",
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
      amountMin: 100,
      amountMax: 500,
      politicalParty: "LPC",
      page: 2,
      limit: 50,
    };

    // Run the query string into an object parser
    const values = Object.fromEntries(new URLSearchParams(buildQuery(filters).slice(1)).entries());

    expect(values).toEqual({
      year: "2024",
      party: "CPC",
      province: "ON",
      postalCode: "M5V 2T6",
      firstName: "Jane",
      lastName: "Doe",
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
      amountMin: "100",
      amountMax: "500",
      politicalParty: "LPC",
      page: "2",
      limit: "50",
    });
  });

  it("keeps the query string empty when no filters are provided", () => {
    expect(buildQuery({})).toBe("");
  });

  it("builds the query string for a donor-name search bar input", () => {
    const filters: DonationFilters = {
      donorName: "Jane Doe",
      page: 1,
      limit: 25,
    };

    const values = Object.fromEntries(new URLSearchParams(buildQuery(filters).slice(1)).entries());

    expect(values).toEqual({ donorName: "Jane Doe", page: "1", limit: "25" });
  });

  it("omits undefined values from the query string", () => {
    const filters: DonationFilters = {
      firstName: "Ada",
      lastName: undefined,
      politicalParty: undefined,
      province: undefined,
      postalCode: undefined,
    };

    const values = Object.fromEntries(new URLSearchParams(buildQuery(filters).slice(1)).entries());

    expect(values).toEqual({ firstName: "Ada" });
  });
});
