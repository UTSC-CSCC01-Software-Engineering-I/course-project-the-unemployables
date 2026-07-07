-- Pre-aggregated totals: one row per (year, party) for EVERY year in the data's
-- range and EVERY party — years with no donations for a party are filled with 0
-- (via the full grid + LEFT JOIN + COALESCE) so the chart lines have no gaps.
create materialized view if not exists public.donation_year_party_totals as
with years as (
  select generate_series(
    (select min(contribution_year) from public.donations where contribution_year is not null),
    (select max(contribution_year) from public.donations where contribution_year is not null)
  ) as year
),
parties as (
  select distinct political_party as party
  from public.donations
  where political_party is not null
)
select
  y.year,
  p.party,
  coalesce(sum(d.contribution_amount), 0) as total
from years y
cross join parties p
left join public.donations d
  on d.contribution_year = y.year
 and d.political_party   = p.party
group by y.year, p.party;

create unique index if not exists donation_year_party_totals_pk
  on public.donation_year_party_totals (year, party);

-- Function now reads the tiny view, not the big table
create or replace function public.donations_sum_by_year_party()
returns table (year integer, party text, total numeric)
language sql
stable
security definer
set search_path = public
as $$
  select year, party, total
  from public.donation_year_party_totals
  order by year, party;
$$;

grant execute on function public.donations_sum_by_year_party() to anon;