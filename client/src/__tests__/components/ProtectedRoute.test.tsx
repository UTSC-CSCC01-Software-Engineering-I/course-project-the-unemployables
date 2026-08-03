import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";

// The guard only cares about what useAuth reports, so we mock it directly
// rather than standing up a real AuthProvider + Supabase session.
vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/advanced-filters"
          element={
            <ProtectedRoute>
              <div>Researcher content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
  });

  it("renders the page when a session exists", () => {
    mockedUseAuth.mockReturnValue({ session: { user: {} } as never, loading: false });
    renderAt("/advanced-filters");
    expect(screen.getByText("Researcher content")).toBeInTheDocument();
  });

  it("shows the checking state while the session is still loading", () => {
    mockedUseAuth.mockReturnValue({ session: null, loading: true });
    renderAt("/advanced-filters");
    expect(screen.getByText("Checking access…")).toBeInTheDocument();
    expect(screen.queryByText("Researcher content")).not.toBeInTheDocument();
  });

  it("redirects to the login page when there is no session", () => {
    mockedUseAuth.mockReturnValue({ session: null, loading: false });
    renderAt("/advanced-filters");
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Researcher content")).not.toBeInTheDocument();
  });
});
