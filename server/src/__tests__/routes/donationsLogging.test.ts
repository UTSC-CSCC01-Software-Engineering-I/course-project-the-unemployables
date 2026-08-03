import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import donationsRouter, { resolveActionType } from "../../routes/donations";

const app = express();
app.use(express.json());
app.use("/api/donations", donationsRouter);

describe("resolveActionType", () => {
  it("returns advanced_filter_search when source=advanced", () => {
    expect(resolveActionType({ source: "advanced" } as any, false)).toBe("advanced_filter_search");
  });

  it("returns quick_search when source=quick", () => {
    expect(resolveActionType({ source: "quick" } as any, false)).toBe("quick_search");
  });

  it("falls back to donor_search when there's a donor filter and no source", () => {
    expect(resolveActionType({} as any, true)).toBe("donor_search");
  });

  it("falls back to search when there's no donor filter and no source", () => {
    expect(resolveActionType({} as any, false)).toBe("search");
  });

  it("ignores an unrecognized source value and falls back to the donor/search default", () => {
    expect(resolveActionType({ source: "bogus" } as any, true)).toBe("donor_search");
    expect(resolveActionType({ source: "bogus" } as any, false)).toBe("search");
  });
});

describe("POST /api/donations/log-download", () => {
  it("returns 403 when no token is provided, even with a valid body", async () => {
    const res = await request(app)
      .post("/api/donations/log-download")
      .send({ scope: "all", filters: {}, rowCount: 5 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Access denied");
  });
});