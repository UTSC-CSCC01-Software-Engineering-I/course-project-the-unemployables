import { describe, it, expect, vi, beforeEach } from "vitest";

// getResearcherId creates its own short-lived anon client internally to verify
// the token, separate from the shared service-role client used everywhere else.
const mockGetUser = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser: (...args: any[]) => mockGetUser(...args) } }),
}));

const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockServiceSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    })),
    insert: mockInsert,
  })),
};
vi.mock("../../lib/supabase", () => ({
  getSupabase: () => mockServiceSupabase,
}));

import { getResearcherId, logAccess } from "../../lib/auth";

function fakeRequest(authHeader?: string) {
  return { headers: { authorization: authHeader } } as any;
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockMaybeSingle.mockReset();
  mockInsert.mockReset();
  mockServiceSupabase.from.mockClear();
});

describe("getResearcherId", () => {
  it("returns null when there is no Authorization header", async () => {
    expect(await getResearcherId(fakeRequest(undefined))).toBeNull();
  });

  it("returns null when the header isn't a Bearer token", async () => {
    expect(await getResearcherId(fakeRequest("Basic abc123"))).toBeNull();
  });

  it("returns null when the token doesn't resolve to a user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid token" } });
    expect(await getResearcherId(fakeRequest("Bearer bad-token"))).toBeNull();
  });

  it("returns null when the user isn't an approved researcher", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getResearcherId(fakeRequest("Bearer good-token"))).toBeNull();
  });

  it("returns the researcher id for a valid, approved user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: { id: "user-1" }, error: null });
    expect(await getResearcherId(fakeRequest("Bearer good-token"))).toBe("user-1");
  });
});

describe("logAccess", () => {
  it("inserts a row shaped for the access_logs table with null filters/count", async () => {
    mockInsert.mockResolvedValue({ error: null });
    await logAccess("researcher-1", "login", null, null);

    expect(mockServiceSupabase.from).toHaveBeenCalledWith("access_logs");
    expect(mockInsert).toHaveBeenCalledWith({
      researcher_id: "researcher-1",
      action_type: "login",
      filters_used: null,
      records_returned_count: null,
    });
  });

  it("passes through filters and a record count for a search action", async () => {
    mockInsert.mockResolvedValue({ error: null });
    await logAccess("researcher-1", "advanced_filter_search", { province: "ON" }, 12);

    expect(mockInsert).toHaveBeenCalledWith({
      researcher_id: "researcher-1",
      action_type: "advanced_filter_search",
      filters_used: { province: "ON" },
      records_returned_count: 12,
    });
  });
});