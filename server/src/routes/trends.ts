import { Router } from "express";
import type { Request, Response } from "express";
import type {
  DonationMonthPartySum,
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

// GET /api/donations/sum-by-month?year=2015
// Returns the total contribution amount grouped by month and party for one year.
// Backed by the `donations_sum_by_month(p_year)` Postgres RPC (see server/sql/).
router.get("/sum-by-month", async (req: Request, res: Response) => {
  const yearRaw = req.query["year"];
  const year = Number(yearRaw);
  if (yearRaw === undefined || !Number.isInteger(year)) {
    res.status(400).json({ error: "Query param 'year' is required and must be an integer." });
    return;
  }

  const { data, error } = await supabase.rpc("donations_sum_by_month", { p_year: year });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data: (data ?? []) as DonationMonthPartySum[] });
});

export default router;