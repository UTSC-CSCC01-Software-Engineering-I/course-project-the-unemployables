import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TopNav } from "../../components/layout/TopNav";
import { useAuth } from "../../context/AuthContext";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
const mockedUseAuth = vi.mocked(useAuth);

const mockSignOut = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signOut: () => mockSignOut() } },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderNav() {
  return render(
    <MemoryRouter>
      <TopNav />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockedUseAuth.mockReset();
  mockSignOut.mockReset().mockResolvedValue(undefined);
  mockNavigate.mockReset();
});

describe("TopNav", () => {
  it("shows the researcher login link when signed out", () => {
    mockedUseAuth.mockReturnValue({ session: null, loading: false });
    renderNav();
    expect(screen.getByRole("link", { name: /Researcher Login/i })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: /Sign Out/i })).not.toBeInTheDocument();
  });

  it("shows the user's email and a sign-out button when signed in", () => {
    mockedUseAuth.mockReturnValue({
      session: { user: { email: "researcher@university.ca" } } as never,
      loading: false,
    });
    renderNav();
    expect(screen.getByText("researcher@university.ca")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign Out/i })).toBeInTheDocument();
  });

  it("signs out and returns to the home page", async () => {
    const user = userEvent.setup();
    mockedUseAuth.mockReturnValue({ session: { user: { email: "r@u.ca" } } as never, loading: false });
    renderNav();
    await user.click(screen.getByRole("button", { name: /Sign Out/i }));
    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
