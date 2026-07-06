import type { RidingSummary } from "../types/index";

const BASE = "/api";

export async function fetchRidingSummary(fedNum: number): Promise<RidingSummary> {
  const res = await fetch(`${BASE}/ridings/${fedNum}/summary`);
  if (!res.ok) throw new Error(`Failed to fetch riding summary: ${res.status}`);
  return res.json() as Promise<RidingSummary>;
}
