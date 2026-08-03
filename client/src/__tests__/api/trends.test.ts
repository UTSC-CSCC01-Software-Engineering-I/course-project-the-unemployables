import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchDonationSumByYearParty,
  fetchDonationSumByMonth,
  fetchDonationSumByProvinceYear,
} from "../../api/trends";
import type { YearPartySumResponse, MonthPartySumResponse } from "../../types/index";

const SAMPLE_YEAR: YearPartySumResponse = {
  data: [{ year: 2015, party: "LPC", total: 100 }],
};
const SAMPLE_MONTH: MonthPartySumResponse = {
  data: [{ month: 1, party: "LPC", total: 50 }],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchDonationSumByYearParty", () => {
  it("requests the sum-by-year-party URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_YEAR) });
    vi.stubGlobal("fetch", fetchMock);
    await fetchDonationSumByYearParty();
    expect(fetchMock).toHaveBeenCalledWith("/api/donations/sum-by-year-party");
  });

  it("throws a descriptive error when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }));
    await expect(fetchDonationSumByYearParty()).rejects.toThrow("Failed to fetch donation trends: 500");
  });
});

describe("fetchDonationSumByMonth", () => {
  it("requests the sum-by-month URL with the year query param", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_MONTH) });
    vi.stubGlobal("fetch", fetchMock);
    await fetchDonationSumByMonth(2015);
    expect(fetchMock).toHaveBeenCalledWith("/api/donations/sum-by-month?year=2015");
  });
});

describe("fetchDonationSumByProvinceYear", () => {
  it("requests the sum-by-province-year URL with an encoded province param", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_YEAR) });
    vi.stubGlobal("fetch", fetchMock);
    await fetchDonationSumByProvinceYear("ON");
    expect(fetchMock).toHaveBeenCalledWith("/api/donations/sum-by-province-year?province=ON");
  });
});
