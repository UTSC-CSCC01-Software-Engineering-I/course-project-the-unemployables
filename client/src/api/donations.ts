import type {
  DonationFilters,
  PaginatedResponse,
  Donation,
  SummaryResponse,
} from "../types/index";

const BASE = "/api";

// Build a query string from the provided filters, returning a string that can be added to a URL.
export function buildQuery(filters: DonationFilters & { page?: number; limit?: number }): string {
  const params = new URLSearchParams();
  if (filters.year !== undefined) params.set("year", String(filters.year));
  if (filters.party) params.set("party", filters.party);
  if (filters.province) params.set("province", filters.province);
  if (filters.postalCode) params.set("postalCode", filters.postalCode);
  if (filters.firstName) params.set("firstName", filters.firstName);
  if (filters.lastName) params.set("lastName", filters.lastName);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.amountMin !== undefined) params.set("amountMin", String(filters.amountMin));
  if (filters.amountMax !== undefined) params.set("amountMax", String(filters.amountMax));
  if (filters.politicalParty) params.set("politicalParty", filters.politicalParty);
  if (filters.page !== undefined) params.set("page", String(filters.page));
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.donorName) params.set("donorName", filters.donorName);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// instead of the regular fetch, this function adds the authorization header with the 
// access token from Supabase auth, if available. This is used to authenticate requests 
// to the server API for specific researcher access. If the user is not signed in, it will 
// just make a regular fetch request without the auth header.
async function withAuth(url: string): Promise<Response> {
  const { data, error } = await (await import("@/lib/supabase")).supabase.auth.getSession();
  console.log("session on request:", url, { hasToken: !!data.session?.access_token, error });
  const token = data.session?.access_token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { headers });
}

export async function fetchDonationSummary(
  filters: DonationFilters = {}
): Promise<SummaryResponse> {
  const res = await withAuth(`${BASE}/donations/summary${buildQuery(filters)}`);
  if (!res.ok) throw new Error(`Failed to fetch donation summary: ${res.status}`);
  return res.json() as Promise<SummaryResponse>;
}

export async function fetchDonations(
  filters: DonationFilters & { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<Donation>> {
  const res = await withAuth(`${BASE}/donations${buildQuery(filters)}`);
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? `Failed to fetch donations: ${res.status}`);
  }
  return res.json() as Promise<PaginatedResponse<Donation>>;
}

