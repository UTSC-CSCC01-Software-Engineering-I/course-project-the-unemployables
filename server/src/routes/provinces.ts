import { Router } from "express";
import type { Request, Response } from "express";
import { getSupabase } from "../lib/supabase";

const router = Router();

// GET /api/provinces/summary?year=2022&party=LPC  — single year, party filter
// GET /api/provinces/summary?years=2015,2016       — multi-year average
// Without party filter uses province_year_total (fast). With party filter uses
// province_party_year_total (has party column, still small enough for single query).
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

  const baseQuery = partyFilter
    ? getSupabase().from("province_party_year_total")
        .select("province, total_monetary, donation_count, donor_count")
        .eq("party", partyFilter)
    : getSupabase().from("province_year_total")
        .select("province, total_monetary, donation_count, donor_count");

  const { data, error } = await (years.length === 1
    ? baseQuery.eq("year", years[0])
    : baseQuery.in("year", years));

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const byProvince: Record<string, { province: string; totalMonetary: number; donationCount: number; donorCount: number }> = {};
  for (const row of data ?? []) {
    const province = String(row["province"]);
    if (!byProvince[province]) byProvince[province] = { province, totalMonetary: 0, donationCount: 0, donorCount: 0 };
    byProvince[province].totalMonetary += Number(row["total_monetary"]);
    byProvince[province].donationCount += Number(row["donation_count"]);
    byProvince[province].donorCount += Number(row["donor_count"]);
  }

  const grouped = Object.values(byProvince);
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

// GET /api/provinces/:code/summary — all-years breakdown with per-year byParty
router.get("/:code/summary", async (req: Request, res: Response) => {
  const code = req.params["code"];

  const PAGE = 1000;
  let allRows: { year: number | string; party: string; total_monetary: number | string; donation_count: number | string; donor_count: number | string }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await getSupabase()
      .from("province_party_year_total")
      .select("year, party, total_monetary, donation_count, donor_count")
      .eq("province", code)
      .range(from, from + PAGE - 1);

    if (error) {
      console.error(`[provinces/:code/summary] Supabase error for ${code}:`, error.message);
      res.status(500).json({ error: error.message });
      return;
    }

    allRows = allRows.concat(data ?? []);
    if ((data?.length ?? 0) < PAGE) break;
    from += PAGE;
  }

  console.log(`[provinces/:code/summary] ${code} → ${allRows.length} rows`);

  const byYearMap: Record<number, {
    totalMonetary: number;
    donationCount: number;
    donorCount: number;
    byPartyMap: Record<string, { party: string; totalMonetary: number; donationCount: number }>;
  }> = {};

  for (const row of allRows) {
    const year = Number(row["year"]);
    const party = String(row["party"]);
    if (!byYearMap[year]) byYearMap[year] = { totalMonetary: 0, donationCount: 0, donorCount: 0, byPartyMap: {} };
    byYearMap[year].totalMonetary += Number(row["total_monetary"]);
    byYearMap[year].donationCount += Number(row["donation_count"]);
    byYearMap[year].donorCount += Number(row["donor_count"]);
    if (!byYearMap[year].byPartyMap[party]) {
      byYearMap[year].byPartyMap[party] = { party, totalMonetary: 0, donationCount: 0 };
    }
    byYearMap[year].byPartyMap[party].totalMonetary += Number(row["total_monetary"]);
    byYearMap[year].byPartyMap[party].donationCount += Number(row["donation_count"]);
  }

  const byYear = Object.entries(byYearMap)
    .map(([year, v]) => ({
      year: Number(year),
      totalMonetary: v.totalMonetary,
      donationCount: v.donationCount,
      donorCount: v.donorCount,
      byParty: Object.values(v.byPartyMap),
    }))
    .sort((a, b) => a.year - b.year);

  res.json({ province: code, byYear });
});

export default router;
