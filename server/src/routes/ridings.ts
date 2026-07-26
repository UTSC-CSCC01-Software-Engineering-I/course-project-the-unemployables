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

const router = Router();

// ── Rankings cache ──────────────────────────────────────────────────────────
//
// The rankings response is built by paging through the whole
// `riding_party_summary` table and aggregating it in memory. That's a full
// scan, and it used to run on *every* request — including every homepage load,
// since the stat band and the map teaser both read this endpoint.
//
// The underlying data is static (the materialized views are never refreshed
// during a run), so the result is memoised. `inFlight` matters as much as the
// cache itself: without it, a cold start with several concurrent visitors
// fires several simultaneous full scans instead of one.
const RANKINGS_TTL_MS = Number(process.env["RANKINGS_CACHE_TTL_MS"] ?? 60 * 60 * 1000);

let rankingsCache: { value: RidingRankingsResponse; expiresAt: number } | null = null;
let rankingsInFlight: Promise<RidingRankingsResponse> | null = null;

/** Clears the memoised rankings. Exported for tests and for a post-reingest hook. */
export function invalidateRankingsCache(): void {
  rankingsCache = null;
  rankingsInFlight = null;
}

async function buildRankings(): Promise<RidingRankingsResponse> {
  const PAGE = 1000;
  let allRows: { fed_num: number; party: string; total_monetary: number; donation_count: number; donor_count: number }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await getSupabase()
      .from("riding_party_summary")
      .select("fed_num, party, total_monetary, donation_count, donor_count")
      .range(from, from + PAGE - 1);

    if (error) throw new Error(error.message);

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

  return {
    ridings,
    ridingCount: ridings.length,
    nationalTotals: {
      totalMonetary: nationalTotalMonetary,
      donationCount: nationalDonationCount,
      donorCount: nationalDonorCount,
      byParty: Object.values(nationalByPartyMap),
    },
  };
}

async function getRankings(): Promise<RidingRankingsResponse> {
  if (rankingsCache && rankingsCache.expiresAt > Date.now()) {
    return rankingsCache.value;
  }

  // Someone else is already scanning — wait on their result rather than
  // starting a second scan of the same table.
  if (rankingsInFlight) return rankingsInFlight;

  rankingsInFlight = buildRankings()
    .then((value) => {
      rankingsCache = { value, expiresAt: Date.now() + RANKINGS_TTL_MS };
      return value;
    })
    .finally(() => {
      // Cleared on failure too, so a transient Supabase error doesn't wedge
      // every later request onto the same rejected promise.
      rankingsInFlight = null;
    });

  return rankingsInFlight;
}

// GET /api/ridings/rankings — all-time totals for every riding (summed across
// every year and party), plus national all-time totals. Powers the Riding
// Lookup page's rank badge and "vs. national average" comparison, and the
// homepage stat band. Reuses the same riding_party_summary table as the routes
// below — just a different aggregation (no year filter, grouped by fed_num
// only) — so no new table is needed. Served from the memoised copy above.
router.get("/rankings", async (_req: Request, res: Response) => {
  try {
    const response = await getRankings();
    // Lets the browser and any proxy in front of the API skip the round trip
    // entirely for repeat visits.
    res.set("Cache-Control", `public, max-age=${Math.floor(RANKINGS_TTL_MS / 1000)}`);
    res.json(response);
  } catch (err) {
    console.error("GET /ridings/rankings failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown server error" });
  }
});

// GET /api/ridings/summary?year=2022&party=LPC  — single year, party filter
// GET /api/ridings/summary?years=2015,2016       — multi-year average
// Without party filter uses riding_year_total (fast). With party filter uses
// riding_party_summary (paginated, ~338 × N years rows).
router.get("/summary", async (req: Request, res: Response) => {
  const yearsRaw = req.query["years"] as string | undefined;
  const yearRaw = req.query["year"];
  const partyFilter = req.query["party"] as string | undefined;

  let years: number[];
  if (yearsRaw) {
    years = yearsRaw.split(",").map(Number).filter(n => Number.isInteger(n) && n > 0);
  } else {
    years = [yearRaw ? Number(yearRaw) : 2022];
  }

  const byRiding: Record<number, { fedNum: number; totalMonetary: number; donationCount: number; donorCount: number }> = {};

  if (partyFilter) {
    const PAGE = 1000;
    let allRows: { fed_num: number | string; total_monetary: number | string; donation_count: number | string; donor_count: number | string }[] = [];
    let from = 0;
    while (true) {
      const baseQuery = getSupabase()
        .from("riding_party_summary")
        .select("fed_num, total_monetary, donation_count, donor_count")
        .eq("party", partyFilter);
      const filtered = years.length === 1 ? baseQuery.eq("year", years[0]) : baseQuery.in("year", years);
      const { data, error } = await filtered.range(from, from + PAGE - 1);
      if (error) { res.status(500).json({ error: error.message }); return; }
      allRows = allRows.concat(data ?? []);
      if ((data?.length ?? 0) < PAGE) break;
      from += PAGE;
    }
    for (const row of allRows) {
      const fedNum = Number(row["fed_num"]);
      if (!byRiding[fedNum]) byRiding[fedNum] = { fedNum, totalMonetary: 0, donationCount: 0, donorCount: 0 };
      byRiding[fedNum].totalMonetary += Number(row["total_monetary"]);
      byRiding[fedNum].donationCount += Number(row["donation_count"]);
      byRiding[fedNum].donorCount += Number(row["donor_count"]);
    }
  } else {
    const baseQuery = getSupabase()
      .from("riding_year_total")
      .select("fed_num, total_monetary, donation_count, donor_count");
    const { data, error } = await (years.length === 1
      ? baseQuery.eq("year", years[0])
      : baseQuery.in("year", years));
    if (error) { res.status(500).json({ error: error.message }); return; }
    for (const row of data ?? []) {
      const fedNum = Number(row["fed_num"]);
      if (!byRiding[fedNum]) byRiding[fedNum] = { fedNum, totalMonetary: 0, donationCount: 0, donorCount: 0 };
      byRiding[fedNum].totalMonetary += Number(row["total_monetary"]);
      byRiding[fedNum].donationCount += Number(row["donation_count"]);
      byRiding[fedNum].donorCount += Number(row["donor_count"]);
    }
  }

  const grouped = Object.values(byRiding);
  const result = years.length > 1
    ? grouped.map(r => ({
        ...r,
        totalMonetary: r.totalMonetary / years.length,
        donationCount: r.donationCount / years.length,
        donorCount: r.donorCount / years.length,
      }))
    : grouped;

  res.json({ data: result, years });
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
