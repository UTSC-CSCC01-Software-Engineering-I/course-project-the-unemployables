import type {
  YearPartySumResponse,
  MonthPartySumResponse,
} from "../types/index";

const BASE = "/api";

export async function fetchDonationSumByYearParty(): Promise<YearPartySumResponse> {
  const res = await fetch(`${BASE}/donations/sum-by-year-party`);
  if (!res.ok) throw new Error(`Failed to fetch donation trends: ${res.status}`);
  return res.json() as Promise<YearPartySumResponse>;
}

export async function fetchDonationSumByMonth(
  year: number
): Promise<MonthPartySumResponse> {
  const res = await fetch(`${BASE}/donations/sum-by-month?year=${year}`);
  if (!res.ok) throw new Error(`Failed to fetch monthly donation trends: ${res.status}`);
  return res.json() as Promise<MonthPartySumResponse>;
}
