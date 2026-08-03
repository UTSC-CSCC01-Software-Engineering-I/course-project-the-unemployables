import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ResearcherDashboardPage } from "../../pages/ResearcherDashboardPage";
import { fetchDonations, logDownload } from "../../api/donations";
import type { Donation, DonationFilters } from "../../types/index";

vi.mock("../../api/donations", () => ({
  fetchDonations: vi.fn(),
  logDownload: vi.fn(),
}));
const mockedFetch = vi.mocked(fetchDonations);
const mockedLogDownload = vi.mocked(logDownload);

// Control the signed-in session the page reads on mount.
const mockGetSession = vi.fn();
vi.mock("../../lib/supabase", () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const SAMPLE: Donation[] = [
  {
    id: "1",
    contributorFirstName: "Ada",
    contributorLastName: "Lovelace",
    postalCode: "M5V 1A1",
    city: "Toronto",
    province: "ON",
    contributionAmount: 250,
    dateReceived: "2020-06-01",
    politicalParty: "LPC",
    recipientName: "",
    typeOfContributor: "Individual",
  } as unknown as Donation,
];

function signedIn() {
  mockGetSession.mockResolvedValue({
    data: { session: { user: { email: "researcher@university.ca" } } },
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ResearcherDashboardPage />
    </MemoryRouter>
  );
}

// fills the Advanced Filters panel with valid values by default.
async function fillAdvancedFilters(
  user: ReturnType<typeof userEvent.setup>,
  overrides: { dateFrom?: string; dateTo?: string; amountMin?: string; amountMax?: string } = {}
) {
  const form = screen.getByRole("button", { name: "Apply Filters" }).closest("form") as HTMLFormElement;
  const [fromInput, toInput] = Array.from(form.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
  const [minInput, maxInput] = Array.from(form.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
  const [provinceInput, firstNameInput, lastNameInput] = Array.from(
    form.querySelectorAll('input[type="text"], input:not([type])')
  ) as HTMLInputElement[];
  const select = form.querySelector("select") as HTMLSelectElement;

  // Date inputs are set with fireEvent.change rather than userEvent.type:
  // typing char-by-char into a controlled type="date" input can race with
  // React's re-renders, so the value actually submitted can lag behind what
  // the final DOM shows. A single change event avoids that entirely.
  fireEvent.change(fromInput, { target: { value: overrides.dateFrom ?? "2020-01-01" } });
  fireEvent.change(toInput, { target: { value: overrides.dateTo ?? "2020-12-31" } });

  await user.selectOptions(select, "LPC");

  await user.clear(provinceInput);
  await user.type(provinceInput, "ON");

  await user.clear(minInput);
  await user.type(minInput, overrides.amountMin ?? "10");
  await user.clear(maxInput);
  await user.type(maxInput, overrides.amountMax ?? "500");

  await user.clear(firstNameInput);
  await user.type(firstNameInput, "Ada");
  await user.clear(lastNameInput);
  await user.type(lastNameInput, "Lovelace");
}

beforeEach(() => {
  mockedFetch.mockReset();
  mockedLogDownload.mockReset();
  mockGetSession.mockReset();
  mockNavigate.mockReset();
  mockedFetch.mockResolvedValue({ data: SAMPLE, total: SAMPLE.length, page: 1, limit: 25, filters: {} });
  // jsdom doesn't implement these; the CSV download path calls them.
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

describe("ResearcherDashboardPage — session", () => {
  it("redirects to login when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderPage();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });

  it("greets the signed-in researcher by email", async () => {
    signedIn();
    renderPage();
    await waitFor(() => expect(screen.getByText("researcher@university.ca")).toBeInTheDocument());
  });
});

describe("ResearcherDashboardPage — search parsing", () => {
  it("treats a single term as a donor-name search", async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("researcher@university.ca");

    await user.type(screen.getByPlaceholderText(/Search by donor name/i), "Lovelace");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    const arg = mockedFetch.mock.calls.at(-1)![0]!;
    expect(arg.donorName).toBe("Lovelace");
    expect(arg.firstName).toBeUndefined();
  });

  it("splits two terms into first and last name", async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("researcher@university.ca");

    await user.type(screen.getByPlaceholderText(/Search by donor name/i), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    const arg = mockedFetch.mock.calls.at(-1)![0]!;
    expect(arg.firstName).toBe("Ada");
    expect(arg.lastName).toBe("Lovelace");
    expect(arg.donorName).toBeUndefined();
  });
});

describe("ResearcherDashboardPage — advanced filter validation", () => {
  it("blocks submission and shows a banner when required fields are empty", async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("researcher@university.ca");

    await user.click(screen.getByRole("button", { name: "Apply Filters" }));

    expect(screen.getByText(/Please fill in all fields before submitting/i)).toBeInTheDocument();
    // A blocked submit never triggers a fetch.
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});

describe("ResearcherDashboardPage — results & export", () => {
  it("renders returned records", async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("researcher@university.ca");

    await user.type(screen.getByPlaceholderText(/Search by donor name/i), "Lovelace");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText(/Found 1 records/i)).toBeInTheDocument();
  });

  it("exports a CSV with a header row and the record", async () => {
    signedIn();
    const blobSpy = vi.spyOn(globalThis, "Blob");
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("researcher@university.ca");

    await user.type(screen.getByPlaceholderText(/Search by donor name/i), "Lovelace");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("Ada Lovelace");

    await user.click(screen.getByTitle("Download records"));
    await user.click(screen.getByRole("button", { name: /Download CSV/i }));

    const csv = String((blobSpy.mock.calls.at(-1)![0] as string[])[0]);
    expect(csv.split("\n")[0]).toContain("Donor Name");
    expect(csv).toContain("Ada Lovelace");
    expect(csv).toContain("LPC");
  });
});

describe("Advanced Filters — date range validation", () => {

  it("rejects an end date that precedes the start date", async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("researcher@university.ca");

    await fillAdvancedFilters(user, { dateFrom: "2020-06-01", dateTo: "2020-01-01" });
    await user.click(screen.getByRole("button", { name: "Apply Filters" }));

    expect(screen.getByText(/end date cannot precede start date/i, { selector: "p" })).toBeInTheDocument();
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});

describe("Advanced Filters — amount range validation", () => {
  it("rejects a zero amount", async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("researcher@university.ca");

    await fillAdvancedFilters(user, { amountMin: "0" });
    await user.click(screen.getByRole("button", { name: "Apply Filters" }));

    expect(screen.getByText(/must be a positive number/i, { selector: "p" })).toBeInTheDocument();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("rejects a minimum greater than the maximum", async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("researcher@university.ca");

    await fillAdvancedFilters(user, { amountMin: "500", amountMax: "100" });
    await user.click(screen.getByRole("button", { name: "Apply Filters" }));

    expect(screen.getByText(/cannot be greater than maximum/i, { selector: "p" })).toBeInTheDocument();
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});

describe("Advanced Filters — action_type source tagging", () => {
  it("submits with source 'advanced' when a full valid form is applied", async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("researcher@university.ca");

    await fillAdvancedFilters(user);
    await user.click(screen.getByRole("button", { name: "Apply Filters" }));

    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    const [, source] = mockedFetch.mock.calls.at(-1)! as [DonationFilters, "quick" | "advanced"];
    expect(source).toBe("advanced");
  });
});

describe("Quick search vs Advanced Filters — mutual clearing", () => {
  it("clears the quick search box after an advanced filter submission", async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("researcher@university.ca");

    const searchBox = screen.getByPlaceholderText(/Search by donor name/i) as HTMLInputElement;
    await user.type(searchBox, "leftover text");

    await fillAdvancedFilters(user);
    await user.click(screen.getByRole("button", { name: "Apply Filters" }));

    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    expect(searchBox.value).toBe("");
  });

  it("clears the advanced filters panel after a quick search", async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("researcher@university.ca");

    const form = screen.getByRole("button", { name: "Apply Filters" }).closest("form") as HTMLFormElement;
    const [provinceInput] = Array.from(
      form.querySelectorAll('input[type="text"], input:not([type])')
    ) as HTMLInputElement[];
    await user.type(provinceInput, "ON");

    await user.type(screen.getByPlaceholderText(/Search by donor name/i), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    expect(provinceInput.value).toBe("");
  });

  it("does not leak stale, unsubmitted advanced filter values into a quick search query", async () => {
    signedIn();
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("researcher@university.ca");

    // Fill (but never submit) a restrictive advanced filter value.
    const form = screen.getByRole("button", { name: "Apply Filters" }).closest("form") as HTMLFormElement;
    const [provinceInput] = Array.from(
      form.querySelectorAll('input[type="text"], input:not([type])')
    ) as HTMLInputElement[];
    await user.type(provinceInput, "ON");

    await user.type(screen.getByPlaceholderText(/Search by donor name/i), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    const [filtersArg, source] = mockedFetch.mock.calls.at(-1)! as [DonationFilters, "quick" | "advanced"];
    expect(filtersArg.province).toBeUndefined();
    expect(filtersArg.firstName).toBe("Ada");
    expect(filtersArg.lastName).toBe("Lovelace");
    expect(source).toBe("quick");
  });
});