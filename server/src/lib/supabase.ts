import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env["SUPABASE_URL"] ?? "";
    const key = process.env["SUPABASE_SERVICE_KEY"] ?? "";
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    _client = createClient(url, key);
  }
  return _client;
}
