import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import donationsRouter from "../routes/donations";

// Mount the real router on its own app so we can hit it without starting the
// full server. A request with no Bearer token never reaches Supabase — the
// auth check bails out first — so no database mock is needed here.
const app = express();
app.use("/api/donations", donationsRouter);

describe("donations routes require a researcher token", () => {
  it("returns 403 for the records list when no token is provided", async () => {
    const res = await request(app).get("/api/donations");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Access denied");
  });

  it("returns 403 for the summary when no token is provided", async () => {
    const res = await request(app).get("/api/donations/summary");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Access denied");
  });
});
