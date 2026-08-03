import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotFoundPage } from "../../pages/NotFoundPage";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NotFoundPage />
    </MemoryRouter>
  );
}

describe("NotFoundPage", () => {
  it("shows the 404 code and the path that wasn't found", () => {
    renderAt("/totally-made-up");
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("/totally-made-up")).toBeInTheDocument();
  });

  it("offers the three public tools as recovery links, not Advanced Filters", () => {
    renderAt("/nope");
    // Scope to the suggestions region — the Footer also links to these pages.
    const suggestions = within(screen.getByRole("region", { name: /Suggested pages/i }));
    expect(suggestions.getByRole("link", { name: /Interactive Map/i })).toHaveAttribute("href", "/map");
    expect(suggestions.getByRole("link", { name: /Riding Lookup/i })).toHaveAttribute("href", "/riding-lookup");
    expect(suggestions.getByRole("link", { name: /Donation Trends/i })).toHaveAttribute("href", "/donation-trends");
    expect(suggestions.queryByRole("link", { name: /Advanced Filters/i })).not.toBeInTheDocument();
  });

  it("has a link back to the overview", () => {
    renderAt("/nope");
    expect(screen.getByRole("link", { name: /Back to the overview/i })).toHaveAttribute("href", "/");
  });
});
