import { Router } from "express";
import type { Request, Response } from "express";
import { getSupabase } from "../lib/supabase";
import type {
  RidingPartyBreakdown,
  RidingRankingEntry,
  RidingRankingsResponse,
  RidingSummary,
  RidingYearSummary,
} from "../types/index";
import { groupByRiding } from "../utils/groupings";

const router = Router();

// GET /api/ridings/rankings — all-time totals for every riding (summed across
// every year and party), plus national all-time totals. Powers the Riding
// Lookup page's "#N of 343" rank badge and "vs. national average" comparison.
// Reuses the same riding_party_summary table as the routes below — just a
// different aggregation (no year filter, grouped by fed_num only) — so no new
// table is needed.
router.get("/rankings", async (_req: Request, res: Response) => {
  const PAGE = 1000;
  let allRows: { fed_num: number; party: string; total_monetary: number; donation_count: number; donor_count: number }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await getSupabase()
      .from("riding_party_summary")
      .select("fed_num, party, total_monetary, donation_count, donor_count")
      .range(from, from + PAGE - 1);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    allRows = allRows.concat(data ?? []);
    if ((data?.length ?? 0) < PAGE) break;
    from += PAGE;
  }

  const byRidingMap: Record<number, RidingRankingEntry> = {};
  const nationalByPartyMap: Record<string, RidingPartyBreakdown> = {};
  let nationalTotalMonetary = 0;
  let nationalDonationCount = 0;
  let nationalDonorCount = 0;

  for (const row of allRows) {
    const fedNum = Number(row["fed_num"]);
    const party = String(row["party"]);
    const totalMonetary = Number(row["total_monetary"]);
    const donationCount = Number(row["donation_count"]);
    const donorCount = Number(row["donor_count"]);

    if (!byRidingMap[fedNum]) {
      byRidingMap[fedNum] = { fedNum, totalMonetary: 0, donationCount: 0, donorCount: 0 };
    }
    byRidingMap[fedNum].totalMonetary += totalMonetary;
    byRidingMap[fedNum].donationCount += donationCount;
    byRidingMap[fedNum].donorCount += donorCount;

    nationalTotalMonetary += totalMonetary;
    nationalDonationCount += donationCount;
    nationalDonorCount += donorCount;

    if (!nationalByPartyMap[party]) {
      nationalByPartyMap[party] = { party, totalMonetary: 0, donationCount: 0, donorCount: 0 };
    }
    nationalByPartyMap[party].totalMonetary += totalMonetary;
    nationalByPartyMap[party].donationCount += donationCount;
    nationalByPartyMap[party].donorCount += donorCount;
  }

  // Sorted descending by total raised — the frontend finds this riding's rank
  // by locating its fedNum in this array (index + 1).
  const ridings = Object.values(byRidingMap).sort((a, b) => b.totalMonetary - a.totalMonetary);

  const response: RidingRankingsResponse = {
    ridings,
    ridingCount: ridings.length,
    nationalTotals: {
      totalMonetary: nationalTotalMonetary,
      donationCount: nationalDonationCount,
      donorCount: nationalDonorCount,
      byParty: Object.values(nationalByPartyMap),
    },
  };

  res.json(response);
});

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
