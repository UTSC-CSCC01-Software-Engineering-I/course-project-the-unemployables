import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchRidingSummary, fetchRidingRankings } from "../api/ridings";
import type { RidingRankingsResponse, RidingSummary } from "../types/index";

const SAMPLE_SUMMARY: RidingSummary = {
  fedNum: 35092,
  allTime: { totalMonetary: 100, donationCount: 2, donorCount: 2, byParty: [] },
  byYear: [],
};

const SAMPLE_RANKINGS: RidingRankingsResponse = {
  ridings: [{ fedNum: 35092, totalMonetary: 1_400_000, donationCount: 11_013, donorCount: 5_000 }],
  ridingCount: 1,
  nationalTotals: {
    totalMonetary: 1_400_000,
    donationCount: 11_013,
    donorCount: 5_000,
    byParty: [],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRidingSummary", () => {
  it("requests the correctly constructed URL for the given fedNum", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_SUMMARY) });
    vi.stubGlobal("fetch", fetchMock);
    await fetchRidingSummary(35092);
    expect(fetchMock).toHaveBeenCalledWith("/api/ridings/35092/summary");
  });

  it("throws a descriptive error when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) }));
    await expect(fetchRidingSummary(999999)).rejects.toThrow("Failed to fetch riding summary: 404");
  });
});

describe("fetchRidingRankings", () => {
  it("requests the rankings endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_RANKINGS) });
    vi.stubGlobal("fetch", fetchMock);
    await fetchRidingRankings();
    expect(fetchMock).toHaveBeenCalledWith("/api/ridings/rankings");
  });
});
