import { Router } from "express";
import type { Request, Response } from "express";
import { getSupabase } from "../lib/supabase";
import { groupByProvince } from "../utils/groupings";

const router = Router();

// GET /api/provinces/summary?year=2022
router.get("/summary", async (req: Request, res: Response) => {
  const year = req.query["year"] ? Number(req.query["year"]) : 2022;

  const { data, error } = await getSupabase()
    .from("province_party_summary")
    .select("province, party, total_monetary, donation_count, donor_count")
    .eq("year", year);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data: groupByProvince(data ?? []), year });
});

export default router;
