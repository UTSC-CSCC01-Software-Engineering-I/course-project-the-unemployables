import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AboutPage } from "../../pages/AboutPage";

// Light smoke test: the page renders with its main heading and several
// sections. The section copy is still being written, so we don't pin exact
// titles here — just that the page has a title and a handful of sections.
describe("AboutPage", () => {
  it("renders the page heading and a set of sections", () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { level: 1, name: /About the Data/i })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThanOrEqual(2);
  });
});
