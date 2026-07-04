-- Aggregates total contribution amount grouped by year and party.
-- Run this once in the Supabase SQL editor to create the RPC that
-- GET /api/donations/sum-by-year-party calls.
create or replace function public.donations_sum_by_year_party()
returns table (
  year integer,
  party text,
  total numeric
)
language sql
stable
as $$
  select
    contribution_year as year,
    political_party   as party,
    sum(contribution_amount) as total
  from public.donations
  where contribution_year is not null
  group by contribution_year, political_party
  order by contribution_year, political_party;
$$;
