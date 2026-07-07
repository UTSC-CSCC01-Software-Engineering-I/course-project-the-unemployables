import { describe, it, expect, vi } from "vitest";

// vi.hoisted makes these available inside the vi.mock factory below,
// which is hoisted to the top of the file before any imports run.
const { mockCreateClient, mockSignIn, mockFrom } = vi.hoisted(() => {
  const mockSignIn = vi.fn();
  const mockFrom = vi.fn();
  const mockClient = { auth: { signInWithPassword: mockSignIn }, from: mockFrom };
  return { mockCreateClient: vi.fn(() => mockClient), mockSignIn, mockFrom };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

import { supabase } from "./supabase";
import { createClient } from "@supabase/supabase-js";

describe("Supabase client initialization", () => {
  it("calls createClient once on module load", () => {
    expect(createClient).toHaveBeenCalledOnce();
  });

  it("is initialized with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY", () => {
    expect(createClient).toHaveBeenCalledWith(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
  });
});

describe("Supabase auth", () => {
  it("returns an error object on failed login", async () => {
    mockSignIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const { error } = await supabase.auth.signInWithPassword({
      email: "wrong@example.com",
      password: "badpassword",
    });

    expect(error).toEqual({ message: "Invalid login credentials" });
  });
});

describe("Supabase donations query", () => {
  it("returns a sample row from the donations table", async () => {
    const sampleRow = {
      contributor_province: "ON",
      political_party: "LPC",
      contribution_amount: 250,
    };
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockResolvedValueOnce({ data: [sampleRow], error: null }),
    });

    const { data, error } = await supabase
      .from("donations")
      .select("contributor_province, political_party, contribution_amount");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].contributor_province).toBe("ON");
  });
});
