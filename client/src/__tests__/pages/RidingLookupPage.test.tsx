import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { RidingLookupPage } from "../../pages/RidingLookupPage";
import { fetchRidingSummary, fetchRidingRankings } from "../../api/ridings";
import type { RidingRankingsResponse, RidingSummary } from "../../types/index";

vi.mock("../../api/ridings", () => ({
  fetchRidingSummary: vi.fn(),
  fetchRidingRankings: vi.fn(),
}));

const mockedFetchRidingSummary = vi.mocked(fetchRidingSummary);
const mockedFetchRidingRankings = vi.mocked(fetchRidingRankings);

// ── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_GEOJSON = {
  features: [
    { properties: { FED_NUM: 35092, ED_NAMEE: "Scarborough—Agincourt" } },
    { properties: { FED_NUM: 10006, ED_NAMEE: "Avalon" } },
    { properties: { FED_NUM: 24037, ED_NAMEE: "Laurier—Sainte-Marie" } },
  ],
};

// Agincourt: CPC leads by total, GPC leads by average — exercises metric toggle re-ranking.
const AGINCOURT_SUMMARY: RidingSummary = {
  fedNum: 35092,
  allTime: {
    totalMonetary: 1_400_000,
    donationCount: 11_013,
    donorCount: 5_000,
    byParty: [
      { party: "CPC", totalMonetary: 766_000, donationCount: 4_512, donorCount: 2_000 },
      { party: "NDP", totalMonetary: 315_000, donationCount: 4_006, donorCount: 1_500 },
      { party: "LPC", totalMonetary: 285_000, donationCount: 2_004, donorCount: 1_000 },
      { party: "GPC", totalMonetary: 31_000,  donationCount: 465,   donorCount: 400 },
      { party: "PPC", totalMonetary: 6_000,   donationCount: 26,    donorCount: 20 },
    ],
  },
  byYear: [
    {
      year: 2023,
      totalMonetary: 54_400,
      donationCount: 253,
      donorCount: 100,
      byParty: [
        { party: "CPC", totalMonetary: 29_000, donationCount: 89, donorCount: 40 },
        { party: "NDP", totalMonetary: 13_000, donationCount: 50, donorCount: 20 },
        { party: "LPC", totalMonetary: 11_000, donationCount: 110, donorCount: 30 },
        { party: "PPC", totalMonetary: 1_000,  donationCount: 3,  donorCount: 3 },
        // avg = 400/1 = 400 — highest average despite the smallest total
        { party: "GPC", totalMonetary: 400,    donationCount: 1,  donorCount: 1 },
      ],
    },
    {
      year: 2022,
      totalMonetary: 20_000,
      donationCount: 100,
      donorCount: 50,
      byParty: [
        { party: "CPC", totalMonetary: 10_000, donationCount: 40, donorCount: 20 },
        { party: "NDP", totalMonetary: 5_000,  donationCount: 30, donorCount: 15 },
        { party: "LPC", totalMonetary: 5_000,  donationCount: 30, donorCount: 15 },
      ],
    },
  ],
};

const LAURIER_SUMMARY: RidingSummary = { ...AGINCOURT_SUMMARY, fedNum: 24037 };

const AVALON_EMPTY_SUMMARY: RidingSummary = {
  fedNum: 10006,
  allTime: { totalMonetary: 0, donationCount: 0, donorCount: 0, byParty: [] },
  byYear: [],
};

const DEFAULT_RANKINGS: RidingRankingsResponse = {
  ridings: [
    { fedNum: 35092, totalMonetary: 1_400_000, donationCount: 11_013, donorCount: 5_000 },
    { fedNum: 24037, totalMonetary: 1_400_000, donationCount: 11_013, donorCount: 5_000 },
  ],
  ridingCount: 2,
  nationalTotals: { totalMonetary: 2_800_000, donationCount: 22_026, donorCount: 10_000, byParty: [] },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderPage(initialRoute = "/riding-lookup") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <RidingLookupPage />
    </MemoryRouter>
  );
}

function mockFetchGeojson() {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: () => Promise.resolve(MOCK_GEOJSON) }));
}

async function selectRiding(user: ReturnType<typeof userEvent.setup>, query: string, optionText: string) {
  const input = screen.getByPlaceholderText(/search by riding name or district number/i);
  await user.type(input, query);
  const option = await screen.findByText(optionText);
  await user.click(option);
}

async function openYearDropdown(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /all-time/i }));
}

beforeEach(() => {
  mockFetchGeojson();
  mockedFetchRidingSummary.mockReset();
  mockedFetchRidingRankings.mockReset();
  mockedFetchRidingRankings.mockResolvedValue(DEFAULT_RANKINGS);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("RidingLookupPage — initial render", () => {
  it("renders the page header and an empty state before any riding is selected", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Riding Lookup" })).toBeInTheDocument();
    expect(screen.getByText(/search for a riding above to see its donation summary/i)).toBeInTheDocument();
    expect(screen.queryByText("Total Donations")).not.toBeInTheDocument();
    await act(async () => { await Promise.resolve(); });
  });
});

describe("RidingLookupPage — search", () => {
  it("shows matching suggestions by riding name as the user types", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/search by riding name or district number/i), "Scarborough");
    expect(await screen.findByText("Scarborough—Agincourt")).toBeInTheDocument();
    expect(screen.queryByText("Avalon")).not.toBeInTheDocument();
  });

  it("selecting a suggestion clears the query, closes the dropdown, and shows the riding header", async () => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
    const user = userEvent.setup();
    renderPage();
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    expect(screen.getByPlaceholderText(/search by riding name or district number/i)).toHaveValue("");
    expect(screen.getByText("District 35092")).toBeInTheDocument();
  });
});

describe("RidingLookupPage — All-Time stat cards (default view)", () => {
  beforeEach(() => { mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY); });

  it("shows correct all-time total donations, count, and top party by total", async () => {
    const user = userEvent.setup();
    renderPage();
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");

    expect(await screen.findByText("$1.4M")).toBeInTheDocument();
    expect(screen.getByText("11,013")).toBeInTheDocument();
    const topPartyCard = screen.getByText("Top Party").closest(".riding-stat-card")!;
    expect(within(topPartyCard).getByText("CPC")).toBeInTheDocument();
    expect(within(topPartyCard).getByText("By total donations")).toBeInTheDocument();
  });
});

describe("RidingLookupPage — year selection", () => {
  beforeEach(() => { mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY); });

  it("updates both the stat cards and the chart when a specific year is picked", async () => {
    const user = userEvent.setup();
    renderPage();
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));

    expect(await screen.findByText("$54K")).toBeInTheDocument();
    expect(screen.getByText("253")).toBeInTheDocument();
    expect(screen.getByText("Total Amount by Party — 2023")).toBeInTheDocument();
  });

  it("combines totals across multiple selected years", async () => {
    const user = userEvent.setup();
    renderPage();
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));
    await user.click(screen.getByRole("checkbox", { name: "2022" }));

    // 54,400 + 20,000 = 74,400 → "$74K"
    expect(await screen.findByText("$74K")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2022, 2023" })).toBeInTheDocument();

    // CPC: 29,000 + 10,000 = 39,000
    const rows = document.querySelectorAll(".riding-party-row");
    expect(within(rows[0] as HTMLElement).getByText("CPC")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText("$39K")).toBeInTheDocument();
  });
});

describe("RidingLookupPage — metric toggle (Total vs Average)", () => {
  beforeEach(() => { mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY); });

  it("re-ranks Top Party by average instead of by total when Average is selected", async () => {
    const user = userEvent.setup();
    renderPage();
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));
    await screen.findByText("$54K");

    // By total: CPC leads
    expect(within(screen.getByText("Top Party").closest(".riding-stat-card")!).getByText("CPC")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Avg. Donation Size" }));

    // By average: GPC leads (400/1 = 400 > CPC 29000/89 ≈ 326)
    expect(within(screen.getByText("Top Party").closest(".riding-stat-card")!).getByText("GPC")).toBeInTheDocument();
  });
});

describe("RidingLookupPage — party filter toggles", () => {
  beforeEach(() => { mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY); });

  it("removes a party from the bar chart when its chip is clicked, without touching the stat cards", async () => {
    const user = userEvent.setup();
    renderPage();
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    expect(document.querySelectorAll(".riding-party-row").length).toBe(5);
    await user.click(screen.getByRole("button", { name: "CPC" }));

    expect(document.querySelectorAll(".riding-party-row").length).toBe(4);
    expect(screen.getByText("$1.4M")).toBeInTheDocument(); // stat card unchanged
  });
});

describe("RidingLookupPage — national rank & average comparison", () => {
  it("shows the national rank and a multiple-of-average comparison", async () => {
    mockedFetchRidingRankings.mockResolvedValue({
      ridings: [
        { fedNum: 99001, totalMonetary: 2_000_000, donationCount: 1, donorCount: 1 },
        { fedNum: 35092, totalMonetary: 1_400_000, donationCount: 11_013, donorCount: 5_000 },
        { fedNum: 99002, totalMonetary: 100_000, donationCount: 1, donorCount: 1 },
      ],
      ridingCount: 3,
      nationalTotals: { totalMonetary: 3_500_000, donationCount: 3, donorCount: 3, byParty: [] },
    });
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
    const user = userEvent.setup();
    renderPage();
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    const [rankCard, averageCard] = document.querySelectorAll(".riding-context-card");
    expect(rankCard.textContent).toMatch(/ranks #2 of 3 ridings/i);
    expect(averageCard.textContent).toMatch(/1\.2× the average riding/i);
  });
});

describe("RidingLookupPage — deep link from the map (?fedNum=)", () => {
  it("auto-selects the riding matching the fedNum query param", async () => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
    renderPage("/riding-lookup?fedNum=35092");
    expect(await screen.findByText("District 35092")).toBeInTheDocument();
    expect(mockedFetchRidingSummary).toHaveBeenCalledWith(35092);
  });
});

describe("RidingLookupPage — a riding with genuinely zero donations", () => {
  it("shows zero totals rather than an error, and a 'no donations recorded' state", async () => {
    mockedFetchRidingSummary.mockResolvedValue(AVALON_EMPTY_SUMMARY);
    const user = userEvent.setup();
    renderPage();
    await selectRiding(user, "Avalon", "Avalon");
    expect(await screen.findByText("$0")).toBeInTheDocument();
    expect(screen.getAllByText("No donations recorded").length).toBeGreaterThanOrEqual(2);
  });
});

describe("RidingLookupPage — compare mode", () => {
  it("opens a compare panel and shows a second riding's all-time totals", async () => {
    mockedFetchRidingSummary.mockImplementation(fedNum =>
      Promise.resolve(fedNum === 35092 ? AGINCOURT_SUMMARY : LAURIER_SUMMARY)
    );
    const user = userEvent.setup();
    renderPage();
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await user.click(screen.getByRole("button", { name: /^compare$/i }));
    const compareInput = await screen.findByPlaceholderText(/search for a riding to compare/i);
    await user.type(compareInput, "Laurier");
    await user.click(await screen.findByText("Laurier—Sainte-Marie"));

    const compareBox = document.querySelector(".riding-compare-box");
    expect(compareBox).not.toBeNull();
    expect(within(compareBox as HTMLElement).getAllByText("$1.4M").length).toBe(2);
  });
});
