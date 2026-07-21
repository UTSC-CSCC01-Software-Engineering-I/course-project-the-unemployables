import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DonationTrendsPage } from "../pages/DonationTrendsPage";
import {
  fetchDonationSumByYearParty,
  fetchDonationSumByMonth,
  fetchDonationSumByProvinceMonth,
  fetchDonationSumByProvinceYear,
} from "../api/trends";
import type {
  YearPartySumResponse,
  MonthPartySumResponse,
} from "../types/index";

// The component imports the trends API functions directly — mocking the module
// lets each test control exactly what the "backend" returns, with no real
// network call and no running Express server.
vi.mock("../api/trends", () => ({
  fetchDonationSumByYearParty: vi.fn(),
  fetchDonationSumByMonth: vi.fn(),
  fetchDonationSumByProvinceMonth: vi.fn(),
  fetchDonationSumByProvinceYear: vi.fn(),
}));

// Recharts relies on real layout measurement (ResponsiveContainer needs a
// non-zero width/height), which jsdom doesn't provide. Swap the chart
// primitives for inert stand-ins so the component renders deterministically;
// the behavior we care about (header, controls, legend, states) lives in our
// own DOM, not inside the SVG.
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Line: () => null,
  Bar: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

const mockedFetchYear = vi.mocked(fetchDonationSumByYearParty);
const mockedFetchMonth = vi.mocked(fetchDonationSumByMonth);
const mockedFetchProvinceMonth = vi.mocked(fetchDonationSumByProvinceMonth);
const mockedFetchProvinceYear = vi.mocked(fetchDonationSumByProvinceYear);

// ── Fixture data ────────────────────────────────────────────────────────

const YEAR_RESPONSE: YearPartySumResponse = {
  data: [
    { year: 2013, party: "LPC", total: 100 },
    { year: 2013, party: "CPC", total: 200 },
    { year: 2014, party: "LPC", total: 150 },
    { year: 2014, party: "CPC", total: 250 },
    { year: 2015, party: "LPC", total: 300 },
    { year: 2015, party: "CPC", total: 120 },
  ],
};

const MONTH_RESPONSE: MonthPartySumResponse = {
  data: [
    { month: 1, party: "LPC", total: 50 },
    { month: 1, party: "CPC", total: 60 },
    { month: 2, party: "LPC", total: 70 },
  ],
};

beforeEach(() => {
  mockedFetchYear.mockReset();
  mockedFetchMonth.mockReset();
  mockedFetchProvinceMonth.mockReset();
  mockedFetchProvinceYear.mockReset();
  mockedFetchYear.mockResolvedValue(YEAR_RESPONSE);
  mockedFetchMonth.mockResolvedValue(MONTH_RESPONSE);
  mockedFetchProvinceMonth.mockResolvedValue(MONTH_RESPONSE);
  mockedFetchProvinceYear.mockResolvedValue(YEAR_RESPONSE);
});

describe("DonationTrendsPage — loading state", () => {
  it("shows a loading message while the yearly request is pending", async () => {
    let resolveFn!: (value: YearPartySumResponse) => void;
    mockedFetchYear.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );
    render(<DonationTrendsPage />);

    expect(screen.getByText("Loading donation trends…")).toBeInTheDocument();

    await act(async () => {
      resolveFn(YEAR_RESPONSE);
    });
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();
  });
});

describe("DonationTrendsPage — yearly view (default)", () => {
  it("renders the header and a year-range subtitle once data loads", async () => {
    render(<DonationTrendsPage />);
    expect(
      screen.getByRole("heading", { name: "Donation Trends" })
    ).toBeInTheDocument();
    // Subtitle uses the first/last available years from the data.
    expect(
      await screen.findByText(/Total contributions by party, 2013.2015/)
    ).toBeInTheDocument();
  });

  it("fetches yearly totals exactly once and renders the chart", async () => {
    render(<DonationTrendsPage />);
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();
    expect(mockedFetchYear).toHaveBeenCalledTimes(1);
    expect(mockedFetchMonth).not.toHaveBeenCalled();
  });

  it("derives the legend from the data (one entry per party, sorted)", async () => {
    render(<DonationTrendsPage />);
    await screen.findByTestId("line-chart");
    expect(screen.getByRole("button", { name: "CPC" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "LPC" })).toBeInTheDocument();
  });

  it("toggles a party off in the legend when its entry is clicked", async () => {
    const user = userEvent.setup();
    render(<DonationTrendsPage />);
    await screen.findByTestId("line-chart");

    const cpc = screen.getByRole("button", { name: "CPC" });
    expect(cpc.className).not.toContain("off");
    await user.click(cpc);
    expect(
      screen.getByRole("button", { name: "CPC" }).className
    ).toContain("off");
  });
});

describe("DonationTrendsPage — error and empty states", () => {
  it("shows an error message instead of a chart when the fetch rejects", async () => {
    mockedFetchYear.mockRejectedValue(new Error("Network exploded"));
    render(<DonationTrendsPage />);
    expect(await screen.findByText("Network exploded")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });

  it("falls back to a generic message when the rejection isn't an Error", async () => {
    mockedFetchYear.mockRejectedValue("plain string rejection");
    render(<DonationTrendsPage />);
    expect(await screen.findByText("Failed to load data")).toBeInTheDocument();
  });

  it("shows an empty state when there is no donation data", async () => {
    mockedFetchYear.mockResolvedValue({ data: [] });
    render(<DonationTrendsPage />);
    expect(
      await screen.findByText("No donation data available.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });
});

describe("DonationTrendsPage — monthly view", () => {
  it("switches to monthly data for the default (latest) year when 'By Month' is clicked", async () => {
    const user = userEvent.setup();
    render(<DonationTrendsPage />);
    await screen.findByTestId("line-chart");

    await user.click(screen.getByRole("tab", { name: "By Month" }));

    // Latest year in the fixture is 2015 — that's what seeds the month request.
    expect(mockedFetchMonth).toHaveBeenCalledWith(2015);
    expect(
      await screen.findByText(/Monthly contributions by party — 2015/)
    ).toBeInTheDocument();
  });

  it("exposes a year selector in month view and refetches when the year changes", async () => {
    const user = userEvent.setup();
    render(<DonationTrendsPage />);
    await screen.findByTestId("line-chart");

    await user.click(screen.getByRole("tab", { name: "By Month" }));
    const yearSelect = await screen.findByLabelText("Year");
    expect(yearSelect).toHaveValue("2015");

    await user.selectOptions(yearSelect, "2013");

    expect(mockedFetchMonth).toHaveBeenLastCalledWith(2013);
    expect(
      await screen.findByText(/Monthly contributions by party — 2013/)
    ).toBeInTheDocument();
  });

  it("defaults the province filter to All and uses the country-wide endpoint", async () => {
    const user = userEvent.setup();
    render(<DonationTrendsPage />);
    await screen.findByTestId("line-chart");

    await user.click(screen.getByRole("tab", { name: "By Month" }));
    expect(await screen.findByLabelText("Province")).toHaveValue("");
    expect(mockedFetchMonth).toHaveBeenCalled();
    expect(mockedFetchProvinceMonth).not.toHaveBeenCalled();
  });

  it("uses the province-scoped endpoint when a province is selected", async () => {
    const user = userEvent.setup();
    render(<DonationTrendsPage />);
    await screen.findByTestId("line-chart");

    await user.click(screen.getByRole("tab", { name: "By Month" }));
    const provinceSelect = await screen.findByLabelText("Province");
    await user.selectOptions(provinceSelect, "ON");

    expect(mockedFetchProvinceMonth).toHaveBeenLastCalledWith("ON", 2015);
    expect(
      await screen.findByText(/Monthly contributions by party — 2015 · Ontario/)
    ).toBeInTheDocument();
  });

  it("does not show the year selector in the default yearly view", async () => {
    render(<DonationTrendsPage />);
    await screen.findByTestId("line-chart");
    expect(screen.queryByLabelText("Year")).not.toBeInTheDocument();
  });
});

describe("DonationTrendsPage — province filter in year view", () => {
  it("shows the province filter (defaulted to All) in year view", async () => {
    render(<DonationTrendsPage />);
    await screen.findByTestId("line-chart");
    expect(await screen.findByLabelText("Province")).toHaveValue("");
    // All-provinces year view uses the country-wide endpoint, not the scoped one.
    expect(mockedFetchYear).toHaveBeenCalled();
    expect(mockedFetchProvinceYear).not.toHaveBeenCalled();
  });

  it("uses the province-scoped yearly endpoint when a province is selected", async () => {
    const user = userEvent.setup();
    render(<DonationTrendsPage />);
    await screen.findByTestId("line-chart");

    const provinceSelect = await screen.findByLabelText("Province");
    await user.selectOptions(provinceSelect, "ON");

    expect(mockedFetchProvinceYear).toHaveBeenLastCalledWith("ON");
    expect(
      await screen.findByText(/Total contributions by party, .* · Ontario/)
    ).toBeInTheDocument();
  });
});

describe("DonationTrendsPage — chart type", () => {
  it("renders a line chart by default", async () => {
    render(<DonationTrendsPage />);
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument();
  });

  it("switches to a bar chart when Bar is selected", async () => {
    const user = userEvent.setup();
    render(<DonationTrendsPage />);
    await screen.findByTestId("line-chart");

    await user.click(screen.getByRole("tab", { name: "Bar" }));

    expect(await screen.findByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });

  it("switches to a pie chart when Pie is selected", async () => {
    const user = userEvent.setup();
    render(<DonationTrendsPage />);
    await screen.findByTestId("line-chart");

    await user.click(screen.getByRole("tab", { name: "Pie" }));

    expect(await screen.findByTestId("pie-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });

  it("keeps the chart type when toggling granularity", async () => {
    const user = userEvent.setup();
    render(<DonationTrendsPage />);
    await screen.findByTestId("line-chart");

    await user.click(screen.getByRole("tab", { name: "Bar" }));
    await screen.findByTestId("bar-chart");
    await user.click(screen.getByRole("tab", { name: "By Month" }));

    expect(await screen.findByTestId("bar-chart")).toBeInTheDocument();
  });
});
