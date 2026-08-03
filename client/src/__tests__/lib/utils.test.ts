import { describe, it, expect } from "vitest";
import { cn } from "../../lib/utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy and conditional values", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });

  it("lets a later Tailwind class win over a conflicting earlier one", () => {
    // tailwind-merge should collapse px-2 + px-4 to just px-4.
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
