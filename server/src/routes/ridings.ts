import { Router } from "express";
import type { Request, Response } from "express";
import { getSupabase } from "../lib/supabase";
import type { RidingPartyBreakdown, RidingSummary, RidingYearSummary } from "../types/index";
import { groupByRiding } from "../utils/groupings";

const router = Router();

// GET /api/ridings/summary?year=2022 — all ridings for choropleth map
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

// GET /api/ridings/:fedNum/summary — single riding detail with all-time + per-year breakdown
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

  const allTimeByPartyMap: Record<string, RidingPartyBreakdown> = {};
  let allTimeTotalMonetary = 0;
  let allTimeDonationCount = 0;
  let allTimeDonorCount = 0;

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

    allTimeTotalMonetary += totalMonetary;
    allTimeDonationCount += donationCount;
    allTimeDonorCount += donorCount;

    if (!allTimeByPartyMap[party]) {
      allTimeByPartyMap[party] = { party, totalMonetary: 0, donationCount: 0, donorCount: 0 };
    }
    allTimeByPartyMap[party].totalMonetary += totalMonetary;
    allTimeByPartyMap[party].donationCount += donationCount;
    allTimeByPartyMap[party].donorCount += donorCount;

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
