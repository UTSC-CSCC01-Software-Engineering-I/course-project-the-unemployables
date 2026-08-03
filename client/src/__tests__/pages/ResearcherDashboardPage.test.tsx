import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ResearcherDashboardPage } from "../../pages/ResearcherDashboardPage";
import { fetchDonations } from "../../api/donations";
import type { Donation } from "../../types/index";

vi.mock("../../api/donations", () => ({ fetchDonations: vi.fn() }));
const mockedFetch = vi.mocked(fetchDonations);

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
  } as Donation,
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

beforeEach(() => {
  mockedFetch.mockReset();
  mockGetSession.mockReset();
  mockNavigate.mockReset();
  mockedFetch.mockResolvedValue({ data: SAMPLE, total: SAMPLE.length, page: 1, limit: 25 });
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
    const arg = mockedFetch.mock.calls.at(-1)![0];
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
    const arg = mockedFetch.mock.calls.at(-1)![0];
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
