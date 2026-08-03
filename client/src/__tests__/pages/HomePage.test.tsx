import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "../../pages/HomePage";
import { fetchRidingRankings } from "../../api/ridings";
import { useAuth } from "../../context/AuthContext";

vi.mock("../../api/ridings", () => ({ fetchRidingRankings: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
const mockedRankings = vi.mocked(fetchRidingRankings);
const mockedUseAuth = vi.mocked(useAuth);

const RANKINGS = {
  ridings: [{ fedNum: 1, totalMonetary: 9_000, donationCount: 10, donorCount: 5 }],
  ridingCount: 343,
  nationalTotals: { totalMonetary: 12_345, donationCount: 6789, donorCount: 100, byParty: [] },
};

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockedRankings.mockReset();
  mockedUseAuth.mockReset();
  mockedUseAuth.mockReturnValue({ session: null, loading: false });
  mockedRankings.mockResolvedValue(RANKINGS as never);
});

describe("HomePage", () => {
  it("links to the map and about pages from the hero", () => {
    renderHome();
    expect(screen.getByRole("link", { name: /Explore the Map/i })).toHaveAttribute("href", "/map");
    // The Footer also links to About, so just confirm one of them points there.
    const aboutLinks = screen.getAllByRole("link", { name: /About the Data/i });
    expect(aboutLinks.some((l) => l.getAttribute("href") === "/about")).toBe(true);
  });

  it("fills the stat band once the national totals load", async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText("343")).toBeInTheDocument());
    expect(screen.getByText("Ridings Covered")).toBeInTheDocument();
    expect(screen.getByText("2004–2024")).toBeInTheDocument();
  });

  it("keeps working and shows a notice if the totals fail to load", async () => {
    mockedRankings.mockRejectedValue(new Error("offline"));
    renderHome();
    await waitFor(() => expect(screen.getByText(/Live totals couldn't be loaded/i)).toBeInTheDocument());
  });

  it("locks the Advanced Filters card when signed out", () => {
    renderHome();
    expect(screen.getByText(/Researcher login required/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open Advanced Filters/i })).not.toBeInTheDocument();
  });

  it("unlocks the Advanced Filters card when signed in", () => {
    mockedUseAuth.mockReturnValue({ session: { user: {} } as never, loading: false });
    renderHome();
    expect(screen.getByRole("link", { name: /Open Advanced Filters/i })).toHaveAttribute("href", "/advanced-filters");
  });
});
