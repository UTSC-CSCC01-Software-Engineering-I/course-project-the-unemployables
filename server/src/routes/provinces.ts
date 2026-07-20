import { Router } from "express";
import type { Request, Response } from "express";
import { getSupabase } from "../lib/supabase";
import { groupByProvince } from "../utils/groupings";

const router = Router();

// GET /api/provinces/summary?year=2022        — single year
// GET /api/provinces/summary?years=2015,2016  — multi-year average
router.get("/summary", async (req: Request, res: Response) => {
  const yearsRaw = req.query["years"] as string | undefined;
  const yearRaw = req.query["year"];

  let years: number[];
  if (yearsRaw) {
    years = yearsRaw.split(",").map(Number).filter(n => Number.isInteger(n) && n > 0);
  } else {
    years = [yearRaw ? Number(yearRaw) : 2022];
  }

  const PAGE = 1000;
  let allRows: { province: string; party: string; total_monetary: number | string; donation_count: number | string; donor_count: number | string }[] = [];
  let from = 0;

  while (true) {
    const baseQuery = getSupabase()
      .from("province_party_summary")
      .select("province, party, total_monetary, donation_count, donor_count");

    const filtered = years.length === 1
      ? baseQuery.eq("year", years[0])
      : baseQuery.in("year", years);

    const { data, error } = await filtered.range(from, from + PAGE - 1);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    allRows = allRows.concat(data ?? []);
    if ((data?.length ?? 0) < PAGE) break;
    from += PAGE;
  }

  const grouped = groupByProvince(allRows);

  const result = years.length > 1
    ? grouped.map(r => ({
        ...r,
        totalMonetary: r.totalMonetary / years.length,
        donationCount: r.donationCount / years.length,
        donorCount: r.donorCount / years.length,
        byParty: r.byParty.map(p => ({
          ...p,
          totalMonetary: p.totalMonetary / years.length,
          donationCount: p.donationCount / years.length,
        })),
      }))
    : grouped;

  res.json({ data: result, years });
});

// GET /api/provinces/:code/summary — all-years breakdown for a single province
router.get("/:code/summary", async (req: Request, res: Response) => {
  const code = req.params["code"];

  const { data, error } = await getSupabase()
    .from("province_party_summary")
    .select("year, total_monetary, donation_count, donor_count")
    .eq("province", code);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const byYearMap: Record<number, { totalMonetary: number; donationCount: number; donorCount: number }> = {};
  for (const row of data ?? []) {
    const year = Number(row["year"]);
    if (!byYearMap[year]) byYearMap[year] = { totalMonetary: 0, donationCount: 0, donorCount: 0 };
    byYearMap[year].totalMonetary += Number(row["total_monetary"]);
    byYearMap[year].donationCount += Number(row["donation_count"]);
    byYearMap[year].donorCount += Number(row["donor_count"]);
  }

  const byYear = Object.entries(byYearMap)
    .map(([year, v]) => ({ year: Number(year), ...v }))
    .sort((a, b) => a.year - b.year);

  res.json({ province: code, byYear });
});

export default router;
