import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchDonationSumByYearParty,
  fetchDonationSumByMonth,
} from "../api/trends";
import type {
  YearPartySumResponse,
  MonthPartySumResponse,
} from "../types/index";

const SAMPLE_YEAR_RESPONSE: YearPartySumResponse = {
  data: [
    { year: 2015, party: "LPC", total: 100 },
    { year: 2015, party: "CPC", total: 200 },
  ],
};

const SAMPLE_MONTH_RESPONSE: MonthPartySumResponse = {
  data: [
    { month: 1, party: "LPC", total: 50 },
    { month: 2, party: "CPC", total: 75 },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchDonationSumByYearParty", () => {
  it("requests the correctly constructed sum-by-year-party URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_YEAR_RESPONSE),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchDonationSumByYearParty();

    expect(fetchMock).toHaveBeenCalledWith("/api/donations/sum-by-year-party");
  });

  it("resolves with the parsed JSON body on a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(SAMPLE_YEAR_RESPONSE),
      })
    );

    const result = await fetchDonationSumByYearParty();
    expect(result).toEqual(SAMPLE_YEAR_RESPONSE);
  });

  it("throws a descriptive error when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "boom" }),
      })
    );

    await expect(fetchDonationSumByYearParty()).rejects.toThrow(
      "Failed to fetch donation trends: 500"
    );
  });

  it("propagates a network-level rejection (e.g. server unreachable)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));
    await expect(fetchDonationSumByYearParty()).rejects.toThrow("Failed to fetch");
  });
});

describe("fetchDonationSumByMonth", () => {
  it("requests the correctly constructed sum-by-month URL with the year query param", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_MONTH_RESPONSE),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchDonationSumByMonth(2015);

    expect(fetchMock).toHaveBeenCalledWith("/api/donations/sum-by-month?year=2015");
  });

  it("resolves with the parsed JSON body on a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(SAMPLE_MONTH_RESPONSE),
      })
    );

    const result = await fetchDonationSumByMonth(2015);
    expect(result).toEqual(SAMPLE_MONTH_RESPONSE);
  });

  it("throws a descriptive error when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "bad year" }),
      })
    );

    await expect(fetchDonationSumByMonth(2015)).rejects.toThrow(
      "Failed to fetch monthly donation trends: 400"
    );
  });

  it("propagates a network-level rejection (e.g. server unreachable)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));
    await expect(fetchDonationSumByMonth(2015)).rejects.toThrow("Failed to fetch");
  });
});
