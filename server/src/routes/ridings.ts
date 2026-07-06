import { Router } from "express";
import type { Request, Response } from "express";
import { getSupabase } from "../lib/supabase";

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

  const byRiding: Record<string, {
    fedNum: number;
    totalMonetary: number;
    donationCount: number;
    donorCount: number;
    byParty: { party: string; totalMonetary: number; donationCount: number }[];
  }> = {};

  for (const row of allRows) {
    const key = String(row.fed_num);
    if (!byRiding[key]) {
      byRiding[key] = {
        fedNum: row.fed_num,
        totalMonetary: 0,
        donationCount: 0,
        donorCount: Number(row.donor_count),
        byParty: [],
      };
    }
    byRiding[key].totalMonetary += Number(row.total_monetary);
    byRiding[key].donationCount += Number(row.donation_count);
    byRiding[key].byParty.push({
      party: row.party,
      totalMonetary: Number(row.total_monetary),
      donationCount: Number(row.donation_count),
    });
  }

  res.json({ data: Object.values(byRiding), year });
});

export default router;
