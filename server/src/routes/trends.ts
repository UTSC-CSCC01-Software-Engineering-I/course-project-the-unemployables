import { Router } from "express";
import type { Request, Response } from "express";
import type {
  DonationYearPartySum,
} from "../types/index";
import { supabase } from "../lib/supabase";

const router = Router();
// GET /api/donations/sum-by-year-party
// Returns the total contribution amount grouped by year and party.
// Backed by the `donations_sum_by_year_party` Postgres RPC (see server/sql/).
router.get("/sum-by-year-party", async (_req: Request, res: Response) => {
  const { data, error } = await supabase.rpc("donations_sum_by_year_party");

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data: (data ?? []) as DonationYearPartySum[] });
});

export default router;