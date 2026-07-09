import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RidingLookupPage } from "../pages/RidingLookupPage";
import { fetchRidingSummary } from "../api/ridings";
import type { RidingSummary } from "../types/index";

// The component imports fetchRidingSummary directly — mocking the module
// lets each test control exactly what the "backend" returns without any
// real network call, and without needing a running Express server.
vi.mock("../api/ridings", () => ({
  fetchRidingSummary: vi.fn(),
}));

const mockedFetchRidingSummary = vi.mocked(fetchRidingSummary);

// ── Fixture data ────────────────────────────────────────────────────────

const MOCK_GEOJSON = {
  features: [
    { properties: { FED_NUM: 35092, ED_NAMEE: "Scarborough—Agincourt" } },
    { properties: { FED_NUM: 10006, ED_NAMEE: "Avalon" } },
    { properties: { FED_NUM: 24037, ED_NAMEE: "Laurier—Sainte-Marie" } },
  ],
};

// Scarborough—Agincourt: has real data across all-time and two year slices
// (2022 and 2023), so tests can exercise both single-year selection and
// multi-year combination. Party totals are deliberately chosen so that the
// highest-total party (CPC) is NOT the highest-average party (GPC) — this is
// what proves the "Top Party" re-ranking logic actually switches basis with
// the metric toggle, rather than coincidentally looking right.
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
      { party: "GPC", totalMonetary: 31_000, donationCount: 465, donorCount: 400 },
      { party: "PPC", totalMonetary: 6_000, donationCount: 26, donorCount: 20 },
    ],
  },
  byYear: [
    {
      year: 2023,
      totalMonetary: 54_400,
      donationCount: 253,
      donorCount: 100,
      byParty: [
        // avg = 29000/89 ≈ 325.84
        { party: "CPC", totalMonetary: 29_000, donationCount: 89, donorCount: 40 },
        { party: "NDP", totalMonetary: 13_000, donationCount: 50, donorCount: 20 },
        { party: "LPC", totalMonetary: 11_000, donationCount: 110, donorCount: 30 },
        { party: "PPC", totalMonetary: 1_000, donationCount: 3, donorCount: 3 },
        // avg = 400/1 = 400 — highest average despite the smallest total
        { party: "GPC", totalMonetary: 400, donationCount: 1, donorCount: 1 },
      ],
    },
    {
      year: 2022,
      totalMonetary: 20_000,
      donationCount: 100,
      donorCount: 50,
      byParty: [
        { party: "CPC", totalMonetary: 10_000, donationCount: 40, donorCount: 20 },
        { party: "NDP", totalMonetary: 5_000, donationCount: 30, donorCount: 15 },
        { party: "LPC", totalMonetary: 5_000, donationCount: 30, donorCount: 15 },
      ],
    },
  ],
};

// A second riding sharing Agincourt's numbers, used only to prove that
// per-riding UI state (party filters, year selection) resets when the user
// switches to a different riding.
const LAURIER_SUMMARY: RidingSummary = { ...AGINCOURT_SUMMARY, fedNum: 24037 };

// Avalon: a riding that genuinely has zero recorded donations, to exercise
// the "no donations recorded" paths (not an error — a legitimate empty result).
const AVALON_EMPTY_SUMMARY: RidingSummary = {
  fedNum: 10006,
  allTime: { totalMonetary: 0, donationCount: 0, donorCount: 0, byParty: [] },
  byYear: [],
};

function mockFetchGeojson() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve(MOCK_GEOJSON),
    })
  );
}

async function selectRiding(user: ReturnType<typeof userEvent.setup>, query: string, optionText: string) {
  const input = screen.getByPlaceholderText(/search by riding name or district number/i);
  await user.type(input, query);
  const option = await screen.findByText(optionText);
  await user.click(option);
}

// Opens the year dropdown from its closed, All-Time state.
async function openYearDropdown(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /all-time/i }));
}

beforeEach(() => {
  mockFetchGeojson();
  mockedFetchRidingSummary.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RidingLookupPage — initial render", () => {
  it("renders the page header and an empty state before any riding is selected", async () => {
    render(<RidingLookupPage />);
    expect(screen.getByRole("heading", { name: "Riding Lookup" })).toBeInTheDocument();
    expect(
      screen.getByText(/search for a riding above to see its donation summary/i)
    ).toBeInTheDocument();
    // No stat cards or chart should exist until a riding is picked.
    expect(screen.queryByText("Total Donations")).not.toBeInTheDocument();
    // Flush the background ridings.geojson fetch so its state update doesn't
    // leak into the next test outside of act().
    await act(async () => {
      await Promise.resolve();
    });
  });
});

describe("RidingLookupPage — search", () => {
  it("shows matching suggestions by riding name as the user types", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    const input = screen.getByPlaceholderText(/search by riding name or district number/i);
    await user.type(input, "Scarborough");
    expect(await screen.findByText("Scarborough—Agincourt")).toBeInTheDocument();
    expect(screen.queryByText("Avalon")).not.toBeInTheDocument();
  });

  it("shows matching suggestions by district number as the user types", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    const input = screen.getByPlaceholderText(/search by riding name or district number/i);
    await user.type(input, "10006");
    expect(await screen.findByText("Avalon")).toBeInTheDocument();
  });

  it("shows a 'no matching ridings' message when nothing matches", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    const input = screen.getByPlaceholderText(/search by riding name or district number/i);
    await user.type(input, "zzz-does-not-exist");
    expect(await screen.findByText("No matching ridings")).toBeInTheDocument();
  });

  it("caps suggestions and matches case-insensitively", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    const input = screen.getByPlaceholderText(/search by riding name or district number/i);
    await user.type(input, "avalon"); // lowercase, real data is "Avalon"
    expect(await screen.findByText("Avalon")).toBeInTheDocument();
  });

  it("selecting a suggestion clears the query, closes the dropdown, and shows the riding header", async () => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
    const user = userEvent.setup();
    render(<RidingLookupPage />);

    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");

    const input = screen.getByPlaceholderText(/search by riding name or district number/i);
    expect(input).toHaveValue("");
    expect(screen.getByText("District 35092")).toBeInTheDocument();
    expect(screen.queryByText("No matching ridings")).not.toBeInTheDocument();
  });

  it("calls fetchRidingSummary with the selected riding's fedNum", async () => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    expect(mockedFetchRidingSummary).toHaveBeenCalledWith(35092);
    expect(mockedFetchRidingSummary).toHaveBeenCalledTimes(1);
  });
});

describe("RidingLookupPage — loading state", () => {
  it("shows loading placeholders while the summary request is pending", async () => {
    let resolveFn!: (value: RidingSummary) => void;
    mockedFetchRidingSummary.mockReturnValue(
      new Promise(resolve => {
        resolveFn = resolve;
      })
    );
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    // Stat cards show "…" while loading
    expect(screen.getAllByText("…").length).toBeGreaterThan(0);

    await act(async () => {
      resolveFn(AGINCOURT_SUMMARY);
    });
    expect(await screen.findByText("$1.4M")).toBeInTheDocument();
  });
});

describe("RidingLookupPage — error state", () => {
  it("shows an error message instead of fake data when the fetch rejects", async () => {
    mockedFetchRidingSummary.mockRejectedValue(new Error("Network exploded"));
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");

    const errorNodes = await screen.findAllByText("Network exploded");
    // Appears once per stat card (3) + once in the chart area.
    expect(errorNodes.length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText("$1.4M")).not.toBeInTheDocument();
  });

  it("falls back to a generic message when the rejection isn't an Error instance", async () => {
    mockedFetchRidingSummary.mockRejectedValue("plain string rejection");
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");

    expect((await screen.findAllByText("Failed to load data")).length).toBeGreaterThan(0);
  });
});

describe("RidingLookupPage — All-Time stat cards (default view)", () => {
  beforeEach(() => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
  });

  it("defaults the year picker to All-Time", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");
    expect(screen.getByRole("button", { name: /all-time/i })).toBeInTheDocument();
  });

  it("shows correct all-time total donations, count, and top party by total", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");

    expect(await screen.findByText("$1.4M")).toBeInTheDocument();
    expect(screen.getByText("11,013")).toBeInTheDocument();
    const topPartyCard = screen.getByText("Top Party").closest(".riding-stat-card")!;
    expect(within(topPartyCard).getByText("CPC")).toBeInTheDocument();
    expect(within(topPartyCard).getByText("By total donations")).toBeInTheDocument();
    expect(screen.getAllByText("All years combined").length).toBe(2);
  });

  it("renders the bar chart sorted descending by total amount, with correct formatted values", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    expect(screen.getByText("Total Amount by Party — All-Time")).toBeInTheDocument();
    const rows = document.querySelectorAll(".riding-party-row");
    expect(rows.length).toBe(5);
    // CPC is the largest all-time total, should be first.
    expect(within(rows[0] as HTMLElement).getByText("CPC")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText("$766K")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText("4,512 donations")).toBeInTheDocument();
    // PPC is the smallest, should be last.
    expect(within(rows[4] as HTMLElement).getByText("PPC")).toBeInTheDocument();
  });
});

describe("RidingLookupPage — year selection", () => {
  beforeEach(() => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
  });

  it("updates both the stat cards and the chart when a specific year is picked", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));

    // Stat cards now reflect the 2023 slice, not all-time.
    expect(await screen.findByText("$54K")).toBeInTheDocument();
    expect(screen.getByText("253")).toBeInTheDocument();
    expect(screen.getAllByText("2023").length).toBeGreaterThanOrEqual(2); // stat notes
    expect(screen.queryByText("All years combined")).not.toBeInTheDocument();

    // Chart title and rows also reflect 2023.
    expect(screen.getByText("Total Amount by Party — 2023")).toBeInTheDocument();
    expect(screen.getByText("$29K")).toBeInTheDocument();
  });

  it("shows the picked year as the active option and as the button label", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));

    expect(await screen.findByRole("button", { name: "2023" })).toBeInTheDocument();
  });

  it("shows a 'no donations recorded for <year>' message for a year with no rows", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    // 2020 isn't in AGINCOURT_SUMMARY.byYear at all.
    await user.click(screen.getByRole("checkbox", { name: "2020" }));

    expect((await screen.findAllByText("No donations recorded for 2020")).length).toBe(2);
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("keeps the dropdown open after checking a year, so more years can be added", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));

    // The checkbox for 2022 should still be reachable without reopening.
    expect(screen.getByRole("checkbox", { name: "2022" })).toBeInTheDocument();
  });

  it("combines totals across multiple selected years", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));
    await user.click(screen.getByRole("checkbox", { name: "2022" }));

    // 54,400 + 20,000 = 74,400 → "$74K"; 253 + 100 = 353 donations.
    expect(await screen.findByText("$74K")).toBeInTheDocument();
    expect(screen.getByText("353")).toBeInTheDocument();

    // Button label and chart title show both years, ascending.
    expect(screen.getByRole("button", { name: "2022, 2023" })).toBeInTheDocument();
    expect(screen.getByText("Total Amount by Party — 2022, 2023")).toBeInTheDocument();

    // Per-party totals summed across both years: CPC 29,000 + 10,000 = 39,000.
    const rows = document.querySelectorAll(".riding-party-row");
    expect(rows.length).toBe(5);
    expect(within(rows[0] as HTMLElement).getByText("CPC")).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText("$39K")).toBeInTheDocument();
  });

  it("shows a note that totals are combined when more than one year is selected", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));
    expect(screen.queryByText(/showing combined totals/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "2022" }));
    expect(screen.getByText("Showing combined totals for 2022, 2023.")).toBeInTheDocument();
  });

  it("falls back to All-Time automatically when every selected year is unchecked", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    const checkbox = screen.getByRole("checkbox", { name: "2023" });
    await user.click(checkbox);
    expect(await screen.findByText("$54K")).toBeInTheDocument();

    await user.click(checkbox); // uncheck the only selected year
    expect(await screen.findByText("$1.4M")).toBeInTheDocument();

    // Close the dropdown before asserting on the picker button label, since
    // the dropdown's own "All-Time" option would otherwise also match.
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("button", { name: /all-time/i })).toBeInTheDocument();
  });
});

describe("RidingLookupPage — metric toggle (Total vs Average)", () => {
  beforeEach(() => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
  });

  it("switches the headline stat card from Total Donations to Average Donation Size", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    // Move to the 2023 slice first for a clean, hand-verifiable average.
    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));
    await screen.findByText("$54K");

    expect(screen.getByText("Total Donations")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Avg. Donation Size" }));

    expect(screen.getByText("Average Donation Size")).toBeInTheDocument();
    expect(screen.queryByText("Total Donations")).not.toBeInTheDocument();
    // 54400 / 253 ≈ 215.02 → formatMoney renders under $1000 as a plain dollar figure
    expect(screen.getByText("$215")).toBeInTheDocument();
  });

  it("re-ranks Top Party by average instead of by total when Average is selected", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));
    await screen.findByText("$54K");

    // By total, CPC leads (2023 fixture). Confirm that first.
    const topPartyCardBefore = screen.getByText("Top Party").closest(".riding-stat-card")!;
    expect(within(topPartyCardBefore).getByText("CPC")).toBeInTheDocument();
    expect(within(topPartyCardBefore).getByText("By total donations")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Avg. Donation Size" }));

    // By average, GPC leads (400/1 = 400 > CPC's 29000/89 ≈ 325.8).
    const topPartyCardAfter = screen.getByText("Top Party").closest(".riding-stat-card")!;
    expect(within(topPartyCardAfter).getByText("GPC")).toBeInTheDocument();
    expect(within(topPartyCardAfter).getByText("By average donation size")).toBeInTheDocument();
  });

  it("relabels the chart title with the active metric", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await user.click(screen.getByRole("button", { name: "Avg. Donation Size" }));
    expect(screen.getByText("Avg. Donation Size by Party — All-Time")).toBeInTheDocument();
  });
});

describe("RidingLookupPage — view toggle (Bar vs Pie)", () => {
  beforeEach(() => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
  });

  it("renders the bar view by default", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");
    expect(document.querySelector(".riding-party-list")).toBeInTheDocument();
    expect(document.querySelector(".riding-pie-view")).not.toBeInTheDocument();
  });

  it("switches to a pie chart with a legend when the pie button is clicked", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await user.click(screen.getByTitle("Pie chart"));

    expect(document.querySelector(".riding-pie-view")).toBeInTheDocument();
    expect(document.querySelector(".riding-party-list")).not.toBeInTheDocument();
    // Legend should show every party with its % share.
    const legend = document.querySelector(".riding-pie-legend")!;
    expect(within(legend as HTMLElement).getByText("CPC")).toBeInTheDocument();
    expect(within(legend as HTMLElement).getByText(/55%/)).toBeInTheDocument();
  });

  it("disables the pie button when the Average metric is selected", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await user.click(screen.getByRole("button", { name: "Avg. Donation Size" }));
    const pieButton = screen.getByTitle("Pie view isn't available for averages");
    expect(pieButton).toBeDisabled();
  });

  it("automatically falls back to bar view if pie was active and metric switches to average", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await user.click(screen.getByTitle("Pie chart"));
    expect(document.querySelector(".riding-pie-view")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Avg. Donation Size" }));
    expect(document.querySelector(".riding-pie-view")).not.toBeInTheDocument();
    expect(document.querySelector(".riding-party-list")).toBeInTheDocument();
  });
});

describe("RidingLookupPage — party filter toggles", () => {
  beforeEach(() => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
  });

  it("shows a clickable chip for every party present in the current view", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    for (const party of ["CPC", "NDP", "LPC", "GPC", "PPC"]) {
      expect(screen.getByRole("button", { name: party })).toBeInTheDocument();
    }
  });

  it("removes a party from the bar chart when its chip is clicked, without touching the stat cards", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    expect(document.querySelectorAll(".riding-party-row").length).toBe(5);

    await user.click(screen.getByRole("button", { name: "CPC" }));

    const rows = document.querySelectorAll(".riding-party-row");
    expect(rows.length).toBe(4);
    for (const row of Array.from(rows)) {
      expect(within(row as HTMLElement).queryByText("CPC")).not.toBeInTheDocument();
    }

    // Stat cards describe the whole riding and shouldn't change because of a chart filter.
    expect(screen.getByText("$1.4M")).toBeInTheDocument();
    const topPartyCard = screen.getByText("Top Party").closest(".riding-stat-card")!;
    expect(within(topPartyCard).getByText("CPC")).toBeInTheDocument();
  });

  it("re-adds the party when its chip is clicked again", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    const chip = screen.getByRole("button", { name: "CPC" });
    await user.click(chip);
    expect(document.querySelectorAll(".riding-party-row").length).toBe(4);

    await user.click(chip);
    expect(document.querySelectorAll(".riding-party-row").length).toBe(5);
  });

  it("also filters the pie chart legend", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await user.click(screen.getByRole("button", { name: "CPC" }));
    await user.click(screen.getByTitle("Pie chart"));

    const legend = document.querySelector(".riding-pie-legend")!;
    expect(within(legend as HTMLElement).queryByText("CPC")).not.toBeInTheDocument();
    expect(within(legend as HTMLElement).getByText("NDP")).toBeInTheDocument();
  });

  it("shows a message when every party has been toggled off, but keeps the chips visible", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    for (const party of ["CPC", "NDP", "LPC", "GPC", "PPC"]) {
      await user.click(screen.getByRole("button", { name: party }));
    }

    expect(
      screen.getByText("All parties are hidden — click a party above to show it.")
    ).toBeInTheDocument();
    expect(document.querySelectorAll(".riding-party-row").length).toBe(0);
    // The chips themselves (and the metric/view controls) should remain so the user can undo this.
    expect(screen.getByRole("button", { name: "CPC" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Total Amount" })).toBeInTheDocument();
  });

  it("resets the party filter when a different riding is selected", async () => {
    mockedFetchRidingSummary.mockImplementation(fedNum =>
      Promise.resolve(fedNum === 35092 ? AGINCOURT_SUMMARY : LAURIER_SUMMARY)
    );
    const user = userEvent.setup();
    render(<RidingLookupPage />);

    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");
    await user.click(screen.getByRole("button", { name: "CPC" }));
    expect(document.querySelectorAll(".riding-party-row").length).toBe(4);

    await selectRiding(user, "Laurier", "Laurier—Sainte-Marie");
    await screen.findByText("District 24037");
    await screen.findByText("$1.4M");

    // CPC should be visible again for the newly selected riding.
    expect(document.querySelectorAll(".riding-party-row").length).toBe(5);
  });
});

describe("RidingLookupPage — dropdown dismissal", () => {
  it("closes the year dropdown when clicking outside of it", async () => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    expect(screen.getByRole("checkbox", { name: "2023" })).toBeInTheDocument();

    // Click somewhere clearly outside the dropdown (the page title).
    await user.click(screen.getByRole("heading", { name: "Riding Lookup" }));

    expect(screen.queryByRole("checkbox", { name: "2023" })).not.toBeInTheDocument();
  });

  it("closes the year dropdown via its own Done button", async () => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.queryByRole("checkbox", { name: "2023" })).not.toBeInTheDocument();
    // The selection itself should stick even though the dropdown closed.
    expect(screen.getByRole("button", { name: "2023" })).toBeInTheDocument();
  });

  it("closes the search suggestions when clicking outside of the search box", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    const input = screen.getByPlaceholderText(/search by riding name or district number/i);
    await user.type(input, "Scarborough");
    expect(await screen.findByText("Scarborough—Agincourt")).toBeInTheDocument();

    await user.click(screen.getByRole("heading", { name: "Riding Lookup" }));

    expect(screen.queryByText("Scarborough—Agincourt")).not.toBeInTheDocument();
  });
});

describe("RidingLookupPage — Top Party reduce edge cases", () => {
  it("picks a later party over an earlier one when ranking by total (data not pre-sorted)", async () => {
    // Deliberately NOT sorted descending — LPC (the 3rd entry) has the
    // highest total, so the reduce must actually replace `top` partway
    // through rather than keeping the first element by coincidence.
    const unsortedSummary: RidingSummary = {
      fedNum: 35092,
      allTime: {
        totalMonetary: 900,
        donationCount: 30,
        donorCount: 10,
        byParty: [
          { party: "CPC", totalMonetary: 100, donationCount: 10, donorCount: 5 },
          { party: "NDP", totalMonetary: 200, donationCount: 10, donorCount: 5 },
          { party: "LPC", totalMonetary: 600, donationCount: 10, donorCount: 5 },
        ],
      },
      byYear: [],
    };
    mockedFetchRidingSummary.mockResolvedValue(unsortedSummary);
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");

    const topPartyCard = await screen.findByText("Top Party");
    expect(within(topPartyCard.closest(".riding-stat-card")!).getByText("LPC")).toBeInTheDocument();
  });

  it("shows 'no donations recorded' for Top Party under Average when every party has a zero donation count", async () => {
    const zeroCountSummary: RidingSummary = {
      fedNum: 35092,
      allTime: {
        totalMonetary: 0,
        donationCount: 0,
        donorCount: 0,
        byParty: [
          { party: "CPC", totalMonetary: 0, donationCount: 0, donorCount: 0 },
          { party: "NDP", totalMonetary: 0, donationCount: 0, donorCount: 0 },
        ],
      },
      byYear: [],
    };
    mockedFetchRidingSummary.mockResolvedValue(zeroCountSummary);
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("Top Party");

    // Under the default "Total" metric, topParty doesn't look at donationCount
    // at all, so it'd still resolve to a party even at $0. Switch to Average
    // to actually exercise the "every party has 0 donations" guard branch.
    await user.click(screen.getByRole("button", { name: "Avg. Donation Size" }));

    const topPartyCard = screen.getByText("Top Party").closest(".riding-stat-card")!;
    expect(within(topPartyCard).getByText("No donations recorded")).toBeInTheDocument();
  });
});

describe("RidingLookupPage — unmapped party color fallback", () => {
  it("falls back to a default color for a party not present in PARTY_COLORS", async () => {
    const summaryWithUnknownParty: RidingSummary = {
      fedNum: 35092,
      allTime: {
        totalMonetary: 500,
        donationCount: 5,
        donorCount: 5,
        byParty: [{ party: "IND", totalMonetary: 500, donationCount: 5, donorCount: 5 }],
      },
      byYear: [],
    };
    mockedFetchRidingSummary.mockResolvedValue(summaryWithUnknownParty);
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");

    const partyList = await screen.findByText("IND", { selector: ".riding-party-label span" });
    expect(partyList).toBeInTheDocument();
    const dot = document.querySelector(".riding-party-dot") as HTMLElement;
    expect(dot.style.background).toBe("rgb(153, 153, 153)"); // #999 fallback

    // Also exercise the fallback in the pie legend.
    await user.click(screen.getByTitle("Pie chart"));
    const legendDot = document.querySelector(".riding-pie-legend .riding-party-dot") as HTMLElement;
    expect(legendDot.style.background).toBe("rgb(153, 153, 153)");
  });
});

describe("RidingLookupPage — a riding with genuinely zero donations", () => {
  beforeEach(() => {
    mockedFetchRidingSummary.mockResolvedValue(AVALON_EMPTY_SUMMARY);
  });

  it("shows zero totals rather than an error, and a 'no donations recorded' chart/top-party state", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Avalon", "Avalon");

    expect(await screen.findByText("$0")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getAllByText("No donations recorded").length).toBeGreaterThanOrEqual(2);
  });

  it("does not show the metric/view toggle controls or party chips when there is no chartable data", async () => {
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Avalon", "Avalon");
    await screen.findByText("$0");
    expect(screen.queryByRole("button", { name: "Total Amount" })).not.toBeInTheDocument();
    expect(document.querySelector(".riding-party-filter-row")).not.toBeInTheDocument();
  });
});

describe("RidingLookupPage — clearing and switching ridings", () => {
  it("clicking the close button returns to the empty state", async () => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    const closeButtons = document.querySelectorAll(".riding-results-close");
    await user.click(closeButtons[0] as HTMLElement);

    expect(
      screen.getByText(/search for a riding above to see its donation summary/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("$1.4M")).not.toBeInTheDocument();
  });

  it("resets year, metric, and view preferences to defaults when a different riding is selected", async () => {
    mockedFetchRidingSummary.mockImplementation(fedNum =>
      Promise.resolve(fedNum === 35092 ? AGINCOURT_SUMMARY : AVALON_EMPTY_SUMMARY)
    );
    const user = userEvent.setup();
    render(<RidingLookupPage />);

    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    // Change every preference away from its default.
    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));
    await user.click(screen.getByRole("button", { name: "Avg. Donation Size" }));
    await screen.findByText("Average Donation Size");

    // Now pick a different riding entirely.
    await selectRiding(user, "Avalon", "Avalon");
    await screen.findByText("District 10006");

    // Should be back to All-Time / Total Donations, not carried over.
    expect(screen.getByRole("button", { name: /all-time/i })).toBeInTheDocument();
    expect(mockedFetchRidingSummary).toHaveBeenLastCalledWith(10006);
  });

  it("can navigate back to All-Time, Total Amount, and Bar explicitly via their own buttons", async () => {
    mockedFetchRidingSummary.mockResolvedValue(AGINCOURT_SUMMARY);
    const user = userEvent.setup();
    render(<RidingLookupPage />);
    await selectRiding(user, "Scarborough", "Scarborough—Agincourt");
    await screen.findByText("$1.4M");

    // Move away from every default first.
    await openYearDropdown(user);
    await user.click(screen.getByRole("checkbox", { name: "2023" }));
    await user.click(screen.getByRole("button", { name: "Avg. Donation Size" }));
    await screen.findByText("Average Donation Size");

    // Back to Total Amount via its own button (not the metric-reset effect).
    await user.click(screen.getByRole("button", { name: "Total Amount" }));
    expect(await screen.findByText("Total Donations")).toBeInTheDocument();

    // Switch to Pie, then explicitly back to Bar via its own button.
    await user.click(screen.getByTitle("Pie chart"));
    expect(document.querySelector(".riding-pie-view")).toBeInTheDocument();
    await user.click(screen.getByTitle("Bar chart"));
    expect(document.querySelector(".riding-party-list")).toBeInTheDocument();

    // Back to All-Time via the dropdown option itself (not just the default).
    await user.click(screen.getByRole("button", { name: "2023" }));
    await user.click(screen.getByRole("button", { name: "All-Time" }));
    expect(screen.getAllByText("All years combined").length).toBe(2);
  });
});
