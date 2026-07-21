import { Router } from "express";
import type { Request, Response } from "express";
import type {
  DonationMonthPartySum,
  DonationYearPartySum,
} from "../types/index";
import { supabase } from "../lib/supabase";

const router = Router();
// GET /api/donations/sum-by-year-party
// Returns the total contribution amount grouped by year and party.
// Reads the `donation_year_party_totals` materialized view directly (the data
// is static, so the view never needs refreshing). This view already bakes in
// the full year × party grid with zero-filled gaps, so no post-processing is
// needed — just select and order.
router.get("/sum-by-year-party", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("donation_year_party_totals")
    .select("year, party, total")
    .order("year")
    .order("party");

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ data: (data ?? []) as DonationYearPartySum[] });
});

// GET /api/donations/sum-by-month?year=2015
// Returns the total contribution amount grouped by month and party for one year.
// Reads the `donation_year_month_party_totals` materialized view directly (the
// data is static, so the view never needs refreshing). Uses the anon client:
// on this project the `anon` role has SELECT on the view but `service_role`
// does not (default privileges in `public` don't cover materialized views).
// The view only stores months that actually had donations, so we zero-fill the
// missing (month, party) cells here — every party active that year gets a value
// for all 12 months — to keep the chart lines continuous.
router.get("/sum-by-month", async (req: Request, res: Response) => {
  const yearRaw = req.query["year"];
  const year = Number(yearRaw);
  if (yearRaw === undefined || !Number.isInteger(year)) {
    res.status(400).json({ error: "Query param 'year' is required and must be an integer." });
    return;
  }

  const { data, error } = await supabase
    .from("donation_year_month_party_totals")
    .select("month, party, total")
    .eq("year", year);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const rows = (data ?? []) as { month: number; party: string; total: number | string }[];

  // Index the stored totals, then build the full 12-month × active-party grid.
  const parties = [...new Set(rows.map((r) => r.party))].sort();
  const totalByCell = new Map<string, number>();
  for (const r of rows) totalByCell.set(`${r.month}|${r.party}`, Number(r.total));

  const result: DonationMonthPartySum[] = [];
  for (let month = 1; month <= 12; month++) {
    for (const party of parties) {
      result.push({ month, party, total: totalByCell.get(`${month}|${party}`) ?? 0 });
    }
  }

  res.json({ data: result });
});

// GET /api/donations/sum-by-province-month?province=ON&year=2015
// Returns the total contribution amount grouped by month and party for one
// province in one year. Reads the `donation_province_year_month_party_totals`
// materialized view directly (static data, no refresh needed). Like sum-by-month
// the view is sparse, so we zero-fill the missing (month, party) cells — every
// party active in that province/year gets a value for all 12 months — to keep
// the chart lines continuous.
router.get("/sum-by-province-month", async (req: Request, res: Response) => {
  const province = req.query["province"];
  const yearRaw = req.query["year"];
  const year = Number(yearRaw);
  if (typeof province !== "string" || province.length === 0) {
    res.status(400).json({ error: "Query param 'province' is required." });
    return;
  }
  if (yearRaw === undefined || !Number.isInteger(year)) {
    res.status(400).json({ error: "Query param 'year' is required and must be an integer." });
    return;
  }

  const { data, error } = await supabase
    .from("donation_province_year_month_party_totals")
    .select("month, party, total")
    .eq("province", province)
    .eq("year", year);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const rows = (data ?? []) as { month: number; party: string; total: number | string }[];

  // Index the stored totals, then build the full 12-month × active-party grid.
  const parties = [...new Set(rows.map((r) => r.party))].sort();
  const totalByCell = new Map<string, number>();
  for (const r of rows) totalByCell.set(`${r.month}|${r.party}`, Number(r.total));

  const result: DonationMonthPartySum[] = [];
  for (let month = 1; month <= 12; month++) {
    for (const party of parties) {
      result.push({ month, party, total: totalByCell.get(`${month}|${party}`) ?? 0 });
    }
  }

  res.json({ data: result });
});

export default router;