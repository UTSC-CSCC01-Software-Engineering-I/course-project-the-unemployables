import type {
  DonationFilters,
  PaginatedResponse,
  Donation,
  SummaryResponse,
  YearPartySumResponse,
} from "../types/index";

const BASE = "/api";

function buildQuery(filters: DonationFilters & { page?: number; limit?: number }): string {
  const params = new URLSearchParams();
  if (filters.year !== undefined) params.set("year", String(filters.year));
  if (filters.party) params.set("party", filters.party);
  if (filters.province) params.set("province", filters.province);
  if (filters.postalCode) params.set("postalCode", filters.postalCode);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchDonationSummary(
  filters: DonationFilters = {}
): Promise<SummaryResponse> {
  const res = await fetch(`${BASE}/donations/summary${buildQuery(filters)}`);
  if (!res.ok) throw new Error(`Failed to fetch donation summary: ${res.status}`);
  return res.json() as Promise<SummaryResponse>;
}

export async function fetchDonations(
  filters: DonationFilters & { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<Donation>> {
  const res = await fetch(`${BASE}/donations${buildQuery(filters)}`);
  if (!res.ok) throw new Error(`Failed to fetch donations: ${res.status}`);
  return res.json() as Promise<PaginatedResponse<Donation>>;
}

export async function fetchDonationSumByYearParty(): Promise<YearPartySumResponse> {
  const res = await fetch(`${BASE}/donations/sum-by-year-party`);
  if (!res.ok) throw new Error(`Failed to fetch donation trends: ${res.status}`);
  return res.json() as Promise<YearPartySumResponse>;
}
