import { describe, it, expect, vi } from "vitest";

const { mockCreateClient } = vi.hoisted(() => {
  const mockClient = { auth: { signInWithPassword: vi.fn() }, from: vi.fn() };
  return { mockCreateClient: vi.fn(() => mockClient) };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// These imports must come after vi.mock() — importing supabase triggers the
// module-load call to createClient that the tests below assert on.
import { supabase as _supabase } from "../../lib/supabase";
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
