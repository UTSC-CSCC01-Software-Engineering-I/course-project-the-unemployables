import { Router } from "express";
import type { Request, Response } from "express";
import { getSupabase } from "../lib/supabase";
import type { RidingPartyBreakdown, RidingSummary, RidingYearSummary } from "../types/index";

const router = Router();

// GET /api/ridings/:fedNum/summary
// Returns donation stats for a single riding: an all-time total + party
// breakdown, and the same broken out per year. Sourced from
// riding_party_summary, which is already pre-aggregated by fed_num/party/year
// (mirrors how provinces.ts reads province_party_summary).
router.get("/:fedNum/summary", async (req: Request, res: Response) => {
  const fedNum = Number(req.params["fedNum"]);

  if (!Number.isInteger(fedNum)) {
    res.status(400).json({ error: "fedNum must be an integer" });
    return;
  }

  const { data, error } = await getSupabase()
    .from("riding_party_summary")
    .select("party, year, total_monetary, donation_count, donor_count")
    .eq("fed_num", fedNum);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const rows = data ?? [];

  // ── All-time totals, grouped by party across every year ──
  const allTimeByPartyMap: Record<string, RidingPartyBreakdown> = {};
  let allTimeTotalMonetary = 0;
  let allTimeDonationCount = 0;
  let allTimeDonorCount = 0;

  // ── Per-year totals, each with its own party breakdown ──
  const byYearMap: Record<number, {
    totalMonetary: number;
    donationCount: number;
    donorCount: number;
    byPartyMap: Record<string, RidingPartyBreakdown>;
  }> = {};

  for (const row of rows) {
    const party = String(row["party"]);
    const year = Number(row["year"]);
    const totalMonetary = Number(row["total_monetary"]);
    const donationCount = Number(row["donation_count"]);
    const donorCount = Number(row["donor_count"]);

    // All-time accumulation
    allTimeTotalMonetary += totalMonetary;
    allTimeDonationCount += donationCount;
    allTimeDonorCount += donorCount;

    if (!allTimeByPartyMap[party]) {
      allTimeByPartyMap[party] = { party, totalMonetary: 0, donationCount: 0, donorCount: 0 };
    }
    allTimeByPartyMap[party].totalMonetary += totalMonetary;
    allTimeByPartyMap[party].donationCount += donationCount;
    allTimeByPartyMap[party].donorCount += donorCount;

    // Per-year accumulation
    if (!byYearMap[year]) {
      byYearMap[year] = { totalMonetary: 0, donationCount: 0, donorCount: 0, byPartyMap: {} };
    }
    const yearBucket = byYearMap[year];
    yearBucket.totalMonetary += totalMonetary;
    yearBucket.donationCount += donationCount;
    yearBucket.donorCount += donorCount;

    if (!yearBucket.byPartyMap[party]) {
      yearBucket.byPartyMap[party] = { party, totalMonetary: 0, donationCount: 0, donorCount: 0 };
    }
    yearBucket.byPartyMap[party].totalMonetary += totalMonetary;
    yearBucket.byPartyMap[party].donationCount += donationCount;
    yearBucket.byPartyMap[party].donorCount += donorCount;
  }

  const byYear: RidingYearSummary[] = Object.entries(byYearMap)
    .map(([year, bucket]) => ({
      year: Number(year),
      totalMonetary: bucket.totalMonetary,
      donationCount: bucket.donationCount,
      donorCount: bucket.donorCount,
      byParty: Object.values(bucket.byPartyMap),
    }))
    .sort((a, b) => a.year - b.year);

  const summary: RidingSummary = {
    fedNum,
    allTime: {
      totalMonetary: allTimeTotalMonetary,
      donationCount: allTimeDonationCount,
      donorCount: allTimeDonorCount,
      byParty: Object.values(allTimeByPartyMap),
    },
    byYear,
  };

  res.json(summary);
});

export default router;
