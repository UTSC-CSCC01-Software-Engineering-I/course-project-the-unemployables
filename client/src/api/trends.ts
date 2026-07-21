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

export async function fetchDonationSumByProvinceMonth(
  province: string,
  year: number
): Promise<MonthPartySumResponse> {
  const res = await fetch(
    `${BASE}/donations/sum-by-province-month?province=${encodeURIComponent(province)}&year=${year}`
  );
  if (!res.ok) throw new Error(`Failed to fetch provincial monthly donation trends: ${res.status}`);
  return res.json() as Promise<MonthPartySumResponse>;
}

export async function fetchDonationSumByProvinceYear(
  province: string
): Promise<YearPartySumResponse> {
  const res = await fetch(
    `${BASE}/donations/sum-by-province-year?province=${encodeURIComponent(province)}`
  );
  if (!res.ok) throw new Error(`Failed to fetch provincial donation trends: ${res.status}`);
  return res.json() as Promise<YearPartySumResponse>;
}
