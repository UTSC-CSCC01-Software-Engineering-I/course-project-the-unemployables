import { Router } from "express";
import type { Request, Response } from "express";
import { getSupabase } from "../lib/supabase";

const router = Router();

// GET /api/provinces/summary?year=2022
router.get("/summary", async (req: Request, res: Response) => {
  const year = req.query["year"] ? Number(req.query["year"]) : 2022;

  const { data, error } = await getSupabase()
    .from("province_party_summary")
    .select("province, party, total_monetary, donation_count")
    .eq("year", year);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Group rows by province, nest party breakdown
  const byProvince: Record<string, {
    province: string;
    totalMonetary: number;
    donationCount: number;
    byParty: { party: string; totalMonetary: number; donationCount: number }[];
  }> = {};

  for (const row of data ?? []) {
    if (!byProvince[row.province]) {
      byProvince[row.province] = {
        province: row.province,
        totalMonetary: 0,
        donationCount: 0,
        byParty: [],
      };
    }
    byProvince[row.province].totalMonetary += Number(row.total_monetary);
    byProvince[row.province].donationCount += Number(row.donation_count);
    byProvince[row.province].byParty.push({
      party: row.party,
      totalMonetary: Number(row.total_monetary),
      donationCount: Number(row.donation_count),
    });
  }

  res.json({ data: Object.values(byProvince), year });
});

export default router;
