import { vi } from "vitest";

// A tiny stand-in for a Supabase query builder. Every builder method
// (.select, .eq, .order, ...) returns the same object so calls can be chained,
// and awaiting it resolves to a { data, error } result; the same shape the
// real client hands back. Enough to drive a route's data-shaping logic in a
// test without touching a real database.
type Result = { data: unknown; error: { message: string } | null };

const BUILDER_METHODS = [
  "select", "eq", "in", "order", "range", "gte", "lte", "or", "ilike", "limit", "maybeSingle",
] as const;

function makeBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const method of BUILDER_METHODS) {
    builder[method] = vi.fn(() => builder);
  }
  // Make the builder awaitable: `await client.from(...).select(...)` ends here.
  builder["then"] = (resolve: (r: Result) => unknown) => resolve(result);
  return builder;
}

// Build a fake client that answers each table with a preset result. Pass a map
// of table name -> { data, error }; unlisted tables return an empty success.
export function makeSupabaseMock(resultsByTable: Record<string, Result>) {
  return {
    from: vi.fn((table: string) => makeBuilder(resultsByTable[table] ?? { data: [], error: null })),
  };
}
