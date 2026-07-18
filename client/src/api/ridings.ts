import type { RidingRankingsResponse, RidingSummary } from "../types/index";

const BASE = "/api";

export async function fetchRidingSummary(fedNum: number): Promise<RidingSummary> {
  const res = await fetch(`${BASE}/ridings/${fedNum}/summary`);
  if (!res.ok) throw new Error(`Failed to fetch riding summary: ${res.status}`);
  return res.json() as Promise<RidingSummary>;
}

// All-time totals for every riding, plus national totals — used for the
// national-rank badge and "vs. national average" comparison on the Riding
// Lookup page. Fetched once (not per-riding) since it covers every district.
export async function fetchRidingRankings(): Promise<RidingRankingsResponse> {
  const res = await fetch(`${BASE}/ridings/rankings`);
  if (!res.ok) throw new Error(`Failed to fetch riding rankings: ${res.status}`);
  return res.json() as Promise<RidingRankingsResponse>;
}
