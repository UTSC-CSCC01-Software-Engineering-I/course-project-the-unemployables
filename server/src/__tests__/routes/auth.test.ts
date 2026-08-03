import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const mockGetResearcherId = vi.fn();
const mockLogAccess = vi.fn();
vi.mock("../../lib/auth", () => ({
  getResearcherId: (...args: any[]) => mockGetResearcherId(...args),
  logAccess: (...args: any[]) => mockLogAccess(...args),
}));

import authRouter from "../../routes/auth";

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);

beforeEach(() => {
  mockGetResearcherId.mockReset();
  mockLogAccess.mockReset();
});

describe("POST /api/auth/log-login", () => {
  it("returns 403 when the request isn't from an approved researcher", async () => {
    mockGetResearcherId.mockResolvedValue(null);
    const res = await request(app).post("/api/auth/log-login");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Access denied");
    expect(mockLogAccess).not.toHaveBeenCalled();
  });

  it("logs a login action_type for a verified researcher", async () => {
    mockGetResearcherId.mockResolvedValue("researcher-123");
    const res = await request(app)
      .post("/api/auth/log-login")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(mockLogAccess).toHaveBeenCalledWith("researcher-123", "login", null, null);
  });

  it("returns 500 and does not crash if logAccess throws", async () => {
    mockGetResearcherId.mockResolvedValue("researcher-123");
    mockLogAccess.mockRejectedValue(new Error("db down"));
    const res = await request(app)
      .post("/api/auth/log-login")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(500);
  });
});