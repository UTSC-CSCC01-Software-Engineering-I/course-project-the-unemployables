import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DonationTrendsPage } from "../../pages/DonationTrendsPage";
import {
  fetchDonationSumByYearParty,
  fetchDonationSumByMonth,
  fetchDonationSumByProvinceMonth,
  fetchDonationSumByProvinceYear,
} from "../../api/trends";
import type { YearPartySumResponse, MonthPartySumResponse } from "../../types/index";

vi.mock("../../api/trends", () => ({
  fetchDonationSumByYearParty: vi.fn(),
  fetchDonationSumByMonth: vi.fn(),
  fetchDonationSumByProvinceMonth: vi.fn(),
  fetchDonationSumByProvinceYear: vi.fn(),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Line: () => null, Bar: () => null, Pie: () => null, Cell: () => null,
  XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null,
}));

// The page uses useSearchParams, so it must render inside a Router.
function renderPage(initialRoute = "/donation-trends") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <DonationTrendsPage />
    </MemoryRouter>
  );
}

const mockedFetchYear = vi.mocked(fetchDonationSumByYearParty);
const mockedFetchMonth = vi.mocked(fetchDonationSumByMonth);
const mockedFetchProvinceMonth = vi.mocked(fetchDonationSumByProvinceMonth);
const mockedFetchProvinceYear = vi.mocked(fetchDonationSumByProvinceYear);

const YEAR_RESPONSE: YearPartySumResponse = {
  data: [
    { year: 2013, party: "LPC", total: 100 },
    { year: 2013, party: "CPC", total: 200 },
    { year: 2015, party: "LPC", total: 300 },
    { year: 2015, party: "CPC", total: 120 },
  ],
};
const MONTH_RESPONSE: MonthPartySumResponse = {
  data: [
    { month: 1, party: "LPC", total: 50 },
    { month: 2, party: "CPC", total: 60 },
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
    mockedFetchYear.mockReturnValue(new Promise(resolve => { resolveFn = resolve; }));
    renderPage();
    expect(screen.getByText("Loading donation trends…")).toBeInTheDocument();
    await act(async () => { resolveFn(YEAR_RESPONSE); });
    expect(await screen.findByTestId("line-chart")).toBeInTheDocument();
  });
});

describe("DonationTrendsPage — yearly view (default)", () => {
  it("renders the header and a year-range subtitle once data loads", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Donation Trends" })).toBeInTheDocument();
    expect(await screen.findByText(/Total contributions by party, 2013.2015/)).toBeInTheDocument();
  });
});

describe("DonationTrendsPage — error state", () => {
  it("shows an error message instead of a chart when the fetch rejects", async () => {
    mockedFetchYear.mockRejectedValue(new Error("Network exploded"));
    renderPage();
    expect(await screen.findByText("Network exploded")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });
});

describe("DonationTrendsPage — monthly view", () => {
  it("switches to monthly data for the default (latest) year when 'By Month' is clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("line-chart");
    await user.click(screen.getByRole("tab", { name: "By Month" }));
    expect(mockedFetchMonth).toHaveBeenCalledWith(2015);
    expect(await screen.findByText(/Monthly contributions by party — 2015/)).toBeInTheDocument();
  });

  it("uses the province-scoped endpoint when a province is selected", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("line-chart");
    await user.click(screen.getByRole("tab", { name: "By Month" }));
    const provinceSelect = await screen.findByLabelText("Province");
    await user.selectOptions(provinceSelect, "ON");
    expect(mockedFetchProvinceMonth).toHaveBeenLastCalledWith("ON", 2015);
  });

  it("fetches every selected year and averages when multiple years are picked", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("line-chart");
    await user.click(screen.getByRole("tab", { name: "By Month" }));

    // Open the year dropdown and add 2013 alongside the default 2015.
    await user.click(screen.getByRole("button", { name: "Years" }));
    await user.click(await screen.findByRole("option", { name: "2013" }));

    expect(mockedFetchMonth).toHaveBeenCalledWith(2015);
    expect(mockedFetchMonth).toHaveBeenCalledWith(2013);
    expect(
      await screen.findByText(/Average monthly contributions by party — 2013, 2015/)
    ).toBeInTheDocument();
  });
});

describe("DonationTrendsPage — province from query param", () => {
  it("preselects the province from ?province= and uses the scoped year endpoint", async () => {
    renderPage("/donation-trends?province=ON");
    await screen.findByTestId("line-chart");
    expect(screen.getByLabelText("Province")).toHaveValue("ON");
    expect(mockedFetchProvinceYear).toHaveBeenCalledWith("ON");
  });

  it("ignores an unknown province code and defaults to All", async () => {
    renderPage("/donation-trends?province=ZZ");
    await screen.findByTestId("line-chart");
    expect(screen.getByLabelText("Province")).toHaveValue("");
    expect(mockedFetchProvinceYear).not.toHaveBeenCalled();
  });
});

describe("DonationTrendsPage — chart type", () => {
  it("switches to a bar chart when Bar is selected", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("line-chart");
    await user.click(screen.getByRole("tab", { name: "Bar" }));
    expect(await screen.findByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });
});
