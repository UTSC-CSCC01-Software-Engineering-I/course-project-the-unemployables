import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchRidingSummary, fetchRidingRankings } from "../api/ridings";
import type { RidingRankingsResponse, RidingSummary } from "../types/index";

const SAMPLE_SUMMARY: RidingSummary = {
  fedNum: 35092,
  allTime: { totalMonetary: 100, donationCount: 2, donorCount: 2, byParty: [] },
  byYear: [],
};

const SAMPLE_RANKINGS: RidingRankingsResponse = {
  ridings: [
    { fedNum: 35092, totalMonetary: 1_400_000, donationCount: 11_013, donorCount: 5_000 },
    { fedNum: 10006, totalMonetary: 0, donationCount: 0, donorCount: 0 },
  ],
  ridingCount: 2,
  nationalTotals: {
    totalMonetary: 1_400_000,
    donationCount: 11_013,
    donorCount: 5_000,
    byParty: [{ party: "CPC", totalMonetary: 766_000, donationCount: 4_512, donorCount: 2_000 }],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRidingSummary", () => {
  it("requests the correctly constructed URL for the given fedNum", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_SUMMARY),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchRidingSummary(35092);

    expect(fetchMock).toHaveBeenCalledWith("/api/ridings/35092/summary");
  });

  it("resolves with the parsed JSON body on a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(SAMPLE_SUMMARY),
      })
    );

    const result = await fetchRidingSummary(35092);
    expect(result).toEqual(SAMPLE_SUMMARY);
  });

  it("throws a descriptive error when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "not found" }),
      })
    );

    await expect(fetchRidingSummary(999999)).rejects.toThrow(
      "Failed to fetch riding summary: 404"
    );
  });

  it("propagates a network-level rejection (e.g. server unreachable)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));
    await expect(fetchRidingSummary(35092)).rejects.toThrow("Failed to fetch");
  });
});

describe("fetchRidingRankings", () => {
  it("requests the rankings endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_RANKINGS),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchRidingRankings();

    expect(fetchMock).toHaveBeenCalledWith("/api/ridings/rankings");
  });

  it("resolves with the parsed JSON body on a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(SAMPLE_RANKINGS) })
    );

    const result = await fetchRidingRankings();
    expect(result).toEqual(SAMPLE_RANKINGS);
  });

  it("throws a descriptive error when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
    );

    await expect(fetchRidingRankings()).rejects.toThrow("Failed to fetch riding rankings: 500");
  });
});
