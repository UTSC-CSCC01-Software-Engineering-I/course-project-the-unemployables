import { Router } from "express";
import type { Request, Response } from "express";
import { getSupabase } from "../lib/supabase";
import { groupByRiding } from "../utils/groupings";

const router = Router();

// GET /api/ridings/summary?year=2022
router.get("/summary", async (req: Request, res: Response) => {
  const year = req.query["year"] ? Number(req.query["year"]) : 2022;

  const PAGE = 1000;
  let allRows: { fed_num: number; party: string; total_monetary: number; donation_count: number; donor_count: number }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await getSupabase()
      .from("riding_party_summary")
      .select("fed_num, party, total_monetary, donation_count, donor_count")
      .eq("year", year)
      .range(from, from + PAGE - 1);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    allRows = allRows.concat(data ?? []);
    if ((data?.length ?? 0) < PAGE) break;
    from += PAGE;
  }

  res.json({ data: groupByRiding(allRows), year });
});

export default router;
