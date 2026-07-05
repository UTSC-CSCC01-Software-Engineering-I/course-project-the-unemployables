-- Aggregates total contribution amount by year + month + party.
-- Run this once in the Supabase SQL editor to create the RPC that
-- GET /api/donations/sum-by-month?year=YYYY calls.
--
-- Like the yearly totals, this is a MATERIALIZED VIEW: aggregating monthly
-- buckets over the raw table times out under the API role's statement limit,
-- so we precompute it once (in the SQL editor, which has no such limit) and the
-- endpoint reads the tiny result. The view is small: ~years × 12 × parties rows.
--
-- Rows with a NULL contribution_date can't be placed in a month and are
-- therefore excluded from these totals.

-- Drop first so re-running this file always rebuilds with the latest definition
-- (`create materialized view if not exists` would silently keep the old one).
drop materialized view if exists public.donation_year_month_party_totals;

create materialized view public.donation_year_month_party_totals as
select
  contribution_year                          as year,
  extract(month from contribution_date)::int as month,
  political_party                            as party,
  sum(contribution_amount)                   as total
from public.donations
where contribution_year is not null
  and contribution_date is not null
  and political_party   is not null
group by
  contribution_year,
  extract(month from contribution_date)::int,
  political_party;

create unique index donation_year_month_party_totals_pk
  on public.donation_year_month_party_totals (year, month, party);

-- Reads the tiny view and zero-fills all 12 months for every party active that
-- year, so months with no donations render as 0 (continuous chart lines).
create or replace function public.donations_sum_by_month(p_year integer)
returns table (
  month integer,
  party text,
  total numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with months as (
    select generate_series(1, 12) as month
  ),
  parties as (
    select distinct party
    from public.donation_year_month_party_totals
    where year = p_year
  )
  select
    m.month,
    p.party,
    coalesce(t.total, 0) as total
  from months m
  cross join parties p
  left join public.donation_year_month_party_totals t
    on t.year  = p_year
   and t.month = m.month
   and t.party = p.party
  order by m.month, p.party;
$$;

-- Allow the API's anon role to call the function.
grant execute on function public.donations_sum_by_month(integer) to anon;
