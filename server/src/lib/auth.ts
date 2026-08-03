import { createClient } from "@supabase/supabase-js";
import type { Request } from "express";
import { getSupabase } from "./supabase";

// Get the researcher ID from the request's authorization header, 
// returning null if not authorized or not a valid researcher.
export async function getResearcherId(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const accessToken = authHeader.replace("Bearer ", "").trim();
  const supabase = createClient(process.env["SUPABASE_URL"] ?? "", process.env["SUPABASE_ANON_KEY"] ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;

  // check if the user is a valid researcher in the database
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
export async function logAccess(
  researcherId: string,
  actionType: string,
  filters: Record<string, unknown> | null,
  recordsReturnedCount: number | null
) {
  const serviceSupabase = getSupabase();
  await serviceSupabase.from("access_logs").insert({
    researcher_id: researcherId,
    action_type: actionType,
    filters_used: filters,
    records_returned_count: recordsReturnedCount,
  });
}