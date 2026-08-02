import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InvalidFilterPopUp } from "../../components/ui/invalidFilterPopUp";

describe("InvalidFilterPopUp", () => {
  it("shows the no-data message on mount", () => {
    render(<InvalidFilterPopUp />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("No Data Available")).toBeInTheDocument();
  });

  it("dismisses itself when Reset Filters is clicked", async () => {
    const user = userEvent.setup();
    render(<InvalidFilterPopUp />);
    await user.click(screen.getByRole("button", { name: /Reset Filters/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
