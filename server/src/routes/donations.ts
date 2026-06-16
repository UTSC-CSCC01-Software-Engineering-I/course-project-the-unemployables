import { Router } from "express";
import type { Request, Response } from "express";
import type { DonationFilters, Party, Province } from "../types/index";

const router = Router();

// GET /api/donations/summary
// Returns aggregated totals grouped by postalCode+party+year — used for map rendering.
// Filters: year, party, province, postalCode
router.get("/summary", (_req: Request, res: Response) => {
  // TODO: replace stub with data from database / CSV loader
  const filters: DonationFilters = {
    year: _req.query["year"] ? Number(_req.query["year"]) : undefined,
    party: _req.query["party"] as Party | undefined,
    province: _req.query["province"] as Province | undefined,
    postalCode: _req.query["postalCode"] as string | undefined,
  };

  void filters; // used once DB layer is wired up

  res.json({ data: [], filters });
});

// GET /api/donations
// Returns paginated raw donation rows.
// Query params: year, party, province, postalCode, page (default 1), limit (default 100)
router.get("/", (_req: Request, res: Response) => {
  // TODO: replace stub with data from database / CSV loader
  const page = Number(_req.query["page"] ?? 1);
  const limit = Math.min(Number(_req.query["limit"] ?? 100), 500);

  res.json({ data: [], page, limit, total: 0 });
});

export default router;
