import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AboutPage } from "../../pages/AboutPage";

// AboutPage is currently a styled scaffold with placeholder copy, so this is a
// light smoke test: it renders, and its section headings are present.
describe("AboutPage", () => {
  it("renders the page heading and its methodology sections", () => {
    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { level: 1, name: /About the Data/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Data Source/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Scope & Limitations/i })).toBeInTheDocument();
  });
});
