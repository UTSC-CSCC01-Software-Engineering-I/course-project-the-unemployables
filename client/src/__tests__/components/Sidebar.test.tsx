import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "../../components/layout/Sidebar";
import { useAuth } from "../../context/AuthContext";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
const mockedUseAuth = vi.mocked(useAuth);

// Capture navigation so we can assert the locked-item sign-in redirect.
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar collapsed={false} onToggle={() => {}} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockedUseAuth.mockReset();
  mockNavigate.mockReset();
});

describe("Sidebar — Advanced Filters auth states", () => {
  it("renders Advanced Filters as a real link when signed in", () => {
    mockedUseAuth.mockReturnValue({ session: { user: {} } as never, loading: false });
    renderSidebar();
    expect(screen.getByRole("link", { name: /Advanced Filters/i })).toHaveAttribute("href", "/advanced-filters");
  });

  it("renders Advanced Filters as a locked button when signed out", () => {
    mockedUseAuth.mockReturnValue({ session: null, loading: false });
    renderSidebar();
    // Locked = a button, not a link.
    expect(screen.getByRole("button", { name: /Advanced Filters.*researcher login required/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Advanced Filters/i })).not.toBeInTheDocument();
  });

  it("does not render it as locked or as a link while the session is still loading", () => {
    mockedUseAuth.mockReturnValue({ session: null, loading: true });
    renderSidebar();
    expect(screen.queryByRole("link", { name: /Advanced Filters/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /researcher login required/i })).not.toBeInTheDocument();
    // The label still shows, just as a neutral non-interactive row.
    expect(screen.getByText("Advanced Filters")).toBeInTheDocument();
  });
});

describe("Sidebar — locked dialog", () => {
  beforeEach(() => mockedUseAuth.mockReturnValue({ session: null, loading: false }));

  it("opens a sign-in dialog when the locked item is clicked", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: /Advanced Filters.*researcher login required/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/not logged in/i)).toBeInTheDocument();
  });

  it("redirects to login with a return path when Sign In is chosen", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: /Advanced Filters.*researcher login required/i }));
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(mockNavigate).toHaveBeenCalledWith("/login?redirect=%2Fadvanced-filters");
  });
});
