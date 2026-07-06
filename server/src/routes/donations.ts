import { Router } from "express";
import type { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { getSupabase } from "../lib/supabase";

const router = Router();

// defined a type for the donation row returned from Supabase, matching the database schema.
type DonationRow = {
  id: string;
  contributor_postal_code: string | null;
  contributor_city: string | null;
  contributor_province: string | null;
  contribution_amount: number | null;
  contribution_date: string | null;
  contribution_year: number | null;
  political_party: string | null;
  recipient_name: string | null;
  contributor_first_name: string | null;
  contributor_last_name: string | null;
  type_of_contributor: string | null;
};

// simple parsing function
function parseNumber(value: unknown): number | undefined {
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return undefined;
}

function sendValidationError(res: Response, errors: Array<{ field: string; message: string }>) {
  res.status(400).json({ error: "Validation failed", errors });
}

// validate the filters from the query parameters, returning an array of errors if any validation fails.
// Will probably need to build upon this in future demos
function validateFilters(query: Request["query"]) {
  const errors: Array<{ field: string; message: string }> = [];
  const amountMin = parseNumber(query.amountMin);
  const amountMax = parseNumber(query.amountMax);
  const dateFrom = typeof query.dateFrom === "string" ? query.dateFrom : undefined;
  const dateTo = typeof query.dateTo === "string" ? query.dateTo : undefined;

  if (amountMin !== undefined && amountMin < 0) {
    errors.push({ field: "amountMin", message: "Minimum amount cannot be negative." });
  }
  if (amountMax !== undefined && amountMax < 0) {
    errors.push({ field: "amountMax", message: "Maximum amount cannot be negative." });
  }
  if (amountMin !== undefined && amountMax !== undefined && amountMin > amountMax) {
    errors.push({ field: "amountMax", message: "Maximum amount must be greater than or equal to minimum amount." });
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    errors.push({ field: "dateTo", message: "Date range is invalid: from date cannot be after to date." });
  }

  return errors;
}

// Get the researcher ID from the request's authorization header, 
// returning null if not authorized or not a valid researcher.
async function getResearcherId(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const accessToken = authHeader.replace("Bearer ", "").trim();
  const supabase = createClient(process.env["SUPABASE_URL"] ?? "", process.env["SUPABASE_ANON_KEY"] ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;

  const serviceSupabase = getSupabase();
  const { data: researcherRow, error: researcherError } = await serviceSupabase
    .from("researchers")
    .select("id")
    .eq("id", data.user.id)
    .eq("approved", true)
    .maybeSingle();

  if (researcherError || !researcherRow) return null;
  return researcherRow.id as string;
}

// this is just a temporary logging function so that I can see what is 
// happening on the server side.
async function logAccess(
  researcherId: string,
  actionType: string,
  filters: Record<string, unknown>,
  recordsReturnedCount: number
) {
  const serviceSupabase = getSupabase();
  await serviceSupabase.from("access_logs").insert({
    researcher_id: researcherId,
    action_type: actionType,
    filters_used: filters,
    records_returned_count: recordsReturnedCount,
  });
}

// Filters used in both routes and in the access log.
// Matches what buildQuery() in api/donations.ts sends: year, party, province,
// postalCode, donorName, firstName, lastName, dateFrom, dateTo, amountMin, amountMax,
// politicalParty, page, limit.
function readFiltersFromQuery(query: Request["query"]) {
  return {
    donorName: typeof query.donorName === "string" && query.donorName.trim() ? query.donorName.trim() : undefined,
    firstName: typeof query.firstName === "string" && query.firstName.trim() ? query.firstName.trim() : undefined,
    lastName: typeof query.lastName === "string" && query.lastName.trim() ? query.lastName.trim() : undefined,
    politicalParty:
      (typeof query.politicalParty === "string" && query.politicalParty.trim() && query.politicalParty) ||
      (typeof query.party === "string" && query.party.trim() && query.party) ||
      undefined,
    province: typeof query.province === "string" && query.province.trim() ? query.province : undefined,
    postalCode: typeof query.postalCode === "string" && query.postalCode.trim() ? query.postalCode : undefined,
    year: typeof query.year === "string" && query.year.trim() ? Number(query.year) : undefined,
    dateFrom: typeof query.dateFrom === "string" && query.dateFrom.trim() ? query.dateFrom : undefined,
    dateTo: typeof query.dateTo === "string" && query.dateTo.trim() ? query.dateTo : undefined,
    amountMin: parseNumber(query.amountMin),
    amountMax: parseNumber(query.amountMax),
  };
}
// Convert a DonationRow from Supabase into a Donation object for the API response.
function toDonationRow(row: DonationRow) {
  return {
    id: row.id,
    contributorFirstName: row.contributor_first_name ?? "",
    contributorLastName: row.contributor_last_name ?? "",
    postalCode: row.contributor_postal_code ?? "",
    city: row.contributor_city ?? "",
    province: row.contributor_province ?? "",
    contributionAmount: row.contribution_amount ?? 0,
    dateReceived: row.contribution_date ?? "",
    year: row.contribution_year ?? undefined,
    politicalParty: row.political_party ?? "",
    recipientName: row.recipient_name ?? "",
    typeOfContributor: row.type_of_contributor ?? "",
  };
}

// GET /api/donations/summary
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const researcherId = await getResearcherId(req);
    if (!researcherId) return res.status(403).json({ error: "Access denied" });

    const errors = validateFilters(req.query);
    if (errors.length) return sendValidationError(res, errors);

    const filters = readFiltersFromQuery(req.query);
    const serviceSupabase = getSupabase();
    let query = serviceSupabase
      .from("donations")
      .select("political_party, contributor_province, contribution_year", { count: "exact", head: false });

    if (filters.politicalParty) query = query.eq("political_party", filters.politicalParty);
    if (filters.province) query = query.eq("contributor_province", filters.province);
    if (filters.postalCode) query = query.eq("contributor_postal_code", filters.postalCode);
    if (filters.year !== undefined) query = query.eq("contribution_year", filters.year);
    if (filters.amountMin !== undefined) query = query.gte("contribution_amount", filters.amountMin);
    if (filters.amountMax !== undefined) query = query.lte("contribution_amount", filters.amountMax);
    if (filters.dateFrom) query = query.gte("contribution_date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("contribution_date", filters.dateTo);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    res.json({ data: data ?? [], filters });
  } catch (err) {
    console.error("GET /donations/summary failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown server error" });
  }
});

// GET /api/donations
// This route fetches donations based on the provided filters, with pagination support.
// It also logs the access for auditing purposes, which I will fix eventually.
router.get("/", async (req: Request, res: Response) => {
  try {
    const researcherId = await getResearcherId(req);
    if (!researcherId) return res.status(403).json({ error: "Access denied" });

    const errors = validateFilters(req.query);
    if (errors.length) return sendValidationError(res, errors);

    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(Math.max(1, Number(req.query.limit ?? 25)), 500);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const filters = readFiltersFromQuery(req.query);
    const serviceSupabase = getSupabase();
    let query = serviceSupabase
      .from("donations")
      .select(
        "id, contributor_first_name, contributor_last_name, contributor_postal_code, contributor_city, contributor_province, contribution_amount, contribution_date, contribution_year, political_party, recipient_name, type_of_contributor",
        { count: "exact" }
      );

    if (filters.donorName) {
      const term = `%${filters.donorName}%`;
      query = query.or(`contributor_first_name.ilike.${term},contributor_last_name.ilike.${term}`);
    }
    if (filters.firstName) {
      query = query.ilike("contributor_first_name", `%${filters.firstName}%`);
    }
    if (filters.lastName) {
      query = query.ilike("contributor_last_name", `%${filters.lastName}%`);
    }
    if (filters.politicalParty) query = query.eq("political_party", filters.politicalParty);
    if (filters.province) query = query.eq("contributor_province", filters.province);
    if (filters.postalCode) query = query.eq("contributor_postal_code", filters.postalCode);
    if (filters.year !== undefined) query = query.eq("contribution_year", filters.year);
    if (filters.amountMin !== undefined) query = query.gte("contribution_amount", filters.amountMin);
    if (filters.amountMax !== undefined) query = query.lte("contribution_amount", filters.amountMax);
    if (filters.dateFrom) query = query.gte("contribution_date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("contribution_date", filters.dateTo);

    query = query.order("contribution_date", { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    await logAccess(researcherId, filters.donorName ? "donor_search" : "search", filters, data?.length ?? 0);

    res.json({ data: (data ?? []).map(toDonationRow), page, limit, total: count ?? 0, filters });
  } catch (err) {
    console.error("GET /donations failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown server error" });
  }
});

export default router;