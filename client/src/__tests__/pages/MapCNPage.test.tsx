import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MapCNPage } from "../../pages/MapCNPage";

// MapLibre doesn't run in jsdom, so stub the map primitives. useMap reports
// "not loaded" — that's enough for BoundaryLayer to no-op while we exercise the
// toolbar, data fetching, and info panel around it.
vi.mock("@/components/ui/map", () => ({
  Map: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  MapControls: () => null,
  useMap: () => ({ map: null, isLoaded: false }),
}));

const mockFetch = vi.fn();

// The map page also fetches the .geojson files for its search box, so a given
// endpoint won't always be the most recent call. Match against every call
// instead of just the last one.
function fetchedUrls(): string[] {
  return mockFetch.mock.calls.map((c) => c[0] as string);
}

function renderMap() {
  return render(
    <MemoryRouter>
      <MapCNPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ json: async () => ({ data: [] }) });
  vi.stubGlobal("fetch", mockFetch);
});

describe("MapCNPage", () => {
  it("shows the boundary mode toggle and the empty info panel", () => {
    renderMap();
    expect(screen.getByRole("button", { name: "Provinces" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Electoral Districts" })).toBeInTheDocument();
    expect(screen.getByText(/Click a province to see details/i)).toBeInTheDocument();
  });

  it("requests the province summary for the default year on load", async () => {
    renderMap();
    await waitFor(() =>
      expect(fetchedUrls().some((u) => u.includes("/api/provinces/summary") && u.includes("year=2022"))).toBe(true)
    );
  });

  it("switches to the ridings endpoint when Electoral Districts is picked", async () => {
    const user = userEvent.setup();
    renderMap();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Electoral Districts" }));

    await waitFor(() =>
      expect(fetchedUrls().some((u) => u.includes("/api/ridings/summary"))).toBe(true)
    );
    // The empty-panel copy follows the mode.
    expect(screen.getByText(/Click a district to see details/i)).toBeInTheDocument();
  });

  it("defaults the year picker label to the single default year", () => {
    renderMap();
    expect(screen.getByText("2022")).toBeInTheDocument();
  });
});
