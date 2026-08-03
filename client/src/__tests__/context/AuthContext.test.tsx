import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import type { Session } from "@supabase/supabase-js";

// Capture the auth-change callback so tests can push new sessions through it.
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockUnsubscribe = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: (event: string, session: Session | null) => void) => mockOnAuthStateChange(cb),
    },
  },
}));

// Small consumer that surfaces the context values as text.
function Probe() {
  const { session, loading } = useAuth();
  return (
    <div>
      <span>loading:{String(loading)}</span>
      <span>email:{session?.user?.email ?? "none"}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockOnAuthStateChange.mockReset();
  mockUnsubscribe.mockReset();
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } });
});

describe("AuthProvider", () => {
  it("starts loading, then resolves to the restored session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { email: "restored@u.ca" } } } });
    renderProvider();
    // Before the promise resolves the provider is still loading.
    expect(screen.getByText("loading:true")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("loading:false")).toBeInTheDocument());
    expect(screen.getByText("email:restored@u.ca")).toBeInTheDocument();
  });

  it("has no session when none is stored", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderProvider();
    await waitFor(() => expect(screen.getByText("loading:false")).toBeInTheDocument());
    expect(screen.getByText("email:none")).toBeInTheDocument();
  });

  it("updates when an auth-change event fires", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderProvider();
    await waitFor(() => expect(screen.getByText("email:none")).toBeInTheDocument());

    // Simulate a sign-in coming through the subscription.
    const cb = mockOnAuthStateChange.mock.calls[0][0];
    act(() => cb("SIGNED_IN", { user: { email: "new@u.ca" } } as Session));
    expect(screen.getByText("email:new@u.ca")).toBeInTheDocument();
  });

  it("unsubscribes on unmount", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const { unmount } = renderProvider();
    await waitFor(() => expect(screen.getByText("loading:false")).toBeInTheDocument());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledOnce();
  });
});
