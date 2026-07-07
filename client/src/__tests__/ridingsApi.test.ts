import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchRidingSummary } from "../api/ridings";
import type { RidingSummary } from "../types/index";

const SAMPLE_SUMMARY: RidingSummary = {
  fedNum: 35092,
  allTime: { totalMonetary: 100, donationCount: 2, donorCount: 2, byParty: [] },
  byYear: [],
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
