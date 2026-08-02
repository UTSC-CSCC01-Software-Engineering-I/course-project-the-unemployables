import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ResearcherLoginUIpage } from "../../pages/ResearcherLogin";

// Control what a login attempt returns without hitting real Supabase.
const mockSignIn = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signInWithPassword: (args: unknown) => mockSignIn(args) } },
}));

function renderLoginAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<ResearcherLoginUIpage />} />
        <Route path="/advanced-filters" element={<div>Dashboard page</div>} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function submitLogin() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Institutional Email"), "researcher@university.ca");
  await user.type(screen.getByLabelText("Password"), "correct-password");
  await user.click(screen.getByRole("button", { name: "Log In" }));
}

describe("ResearcherLogin redirect", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignIn.mockResolvedValue({ error: null });
  });

  it("returns to the redirect destination after a successful login", async () => {
    renderLoginAt("/login?redirect=/advanced-filters");
    await submitLogin();
    await waitFor(() => expect(screen.getByText("Dashboard page")).toBeInTheDocument());
  });

  it("falls back to home when there is no redirect param", async () => {
    renderLoginAt("/login");
    await submitLogin();
    await waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });
});
