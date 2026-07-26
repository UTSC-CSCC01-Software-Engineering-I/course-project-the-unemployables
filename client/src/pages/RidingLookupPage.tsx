import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  X,
  BarChart3,
  PieChart,
  CalendarRange,
  ChevronDown,
  Award,
  TrendingUp,
  GitCompare,
} from "lucide-react";
import { fetchRidingSummary, fetchRidingRankings } from "../api/ridings";
import type { RidingSummary, RidingPartyBreakdown, RidingRankingsResponse } from "../types/index";
import { provinceForFedNum, ALL_PROVINCES } from "../utils/province";
import { DATA_YEARS } from "../utils/years";
import "./RidingLookupPage.css";

// ── Types ───────────────────────────────────────────────────────────────
// Riding options come from the static ridings.geojson (electoral district
// boundaries) already used by the map page — this lets the search bar work
// immediately, with no backend dependency. FED_NUM / ED_NAMEE match the
// properties on that file's features.

interface RidingOption {
  fedNum: number;
  name: string;
}

interface RidingFeature {
  properties: {
    FED_NUM: number;
    ED_NAMEE: string;
  };
}

interface RidingGeoJson {
  features: RidingFeature[];
}

// "all" = all-time (default, summary.allTime). "custom" = one or more
// specific years chosen from the dropdown, combined together.
type YearMode = "all" | "custom";

// "total" = total $ donated per party (a share of the riding's whole).
// "average" = average donation size per party (total ÷ count) — not a share
// of anything, so it's bar-only (see viewType note below).
type Metric = "total" | "average";

// Pie only makes statistical sense for "total" (parts of a whole). It's
// unavailable/hidden whenever metric is "average".
type ViewType = "bar" | "pie";

const MAX_SUGGESTIONS = 8;

const PARTY_COLORS: Record<string, string> = {
  LPC: "#d71920",
  CPC: "#1a4782",
  NDP: "#f37021",
  BQ: "#33b2cc",
  GPC: "#3d9b35",
  PPC: "#4b306a",
};

// Donation data covers 2004-2024 — see utils/years.ts for the shared window.
const YEARS = DATA_YEARS;

function formatMoney(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

// Human-readable label for the year picker button / chart title: "All-Time",
// a single year, a short comma-joined list, or a count once it gets long.
function formatYearSelection(mode: YearMode, years: Set<number>): string {
  if (mode === "all" || years.size === 0) return "All-Time";
  const sorted = Array.from(years).sort((a, b) => a - b);
  if (sorted.length <= 3) return sorted.join(", ");
  return `${sorted.length} years selected`;
}

// Sums a riding's year-by-year rows across the given set of years into one
// combined total + per-party breakdown, so multi-year selection reads from
// the exact same shape as a single year or all-time.
function combineYearStats(summary: RidingSummary, years: Set<number>) {
  const relevant = summary.byYear.filter(y => years.has(y.year));
  let totalMonetary = 0;
  let donationCount = 0;
  const partyTotals = new Map<string, { totalMonetary: number; donationCount: number; donorCount: number }>();

  for (const yearRow of relevant) {
    totalMonetary += yearRow.totalMonetary;
    donationCount += yearRow.donationCount;
    for (const p of yearRow.byParty) {
      const existing = partyTotals.get(p.party) ?? { totalMonetary: 0, donationCount: 0, donorCount: 0 };
      existing.totalMonetary += p.totalMonetary;
      existing.donationCount += p.donationCount;
      existing.donorCount += p.donorCount;
      partyTotals.set(p.party, existing);
    }
  }

  const byParty: RidingPartyBreakdown[] = Array.from(partyTotals.entries()).map(([party, totals]) => ({
    party,
    ...totals,
  }));

  return { totalMonetary, donationCount, byParty };
}

export function RidingLookupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ridings, setRidings] = useState<RidingOption[]>([]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<RidingOption | null>(null);
  const [yearMode, setYearMode] = useState<YearMode>("all");
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [metric, setMetric] = useState<Metric>("total");
  const [viewType, setViewType] = useState<ViewType>("bar");
  const [excludedParties, setExcludedParties] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<RidingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  // All-time totals for every riding, fetched once (not per-riding) and used
  // for the national rank badge, the "vs. national average" comparison, and
  // the "only ridings with donations" search filter.
  const [rankings, setRankings] = useState<RidingRankingsResponse | null>(null);
  const [provinceFilter, setProvinceFilter] = useState<string | null>(null);
  const [onlyWithData, setOnlyWithData] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Load the riding list once, client-side. No donation data involved here —
  // this is just the lookup index the search bar filters against.
  useEffect(() => {
    fetch("/ridings.geojson")
      .then(r => r.json())
      .then((geo: RidingGeoJson) => {
        const options = geo.features
          .map(f => ({ fedNum: f.properties.FED_NUM, name: f.properties.ED_NAMEE }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setRidings(options);
      })
      .catch(console.error);
  }, []);

  // All-time totals for every riding — fetched once, independent of which
  // riding is selected. If it fails, the page just falls back to not showing
  // rank/average comparisons rather than blocking the rest of the page.
  useEffect(() => {
    fetchRidingRankings()
      .then(setRankings)
      .catch(console.error);
  }, []);

  // Deep-link support: the map page links here as
  // "/riding-lookup?fedNum=<FED_NUM>" so a district clicked on the map opens
  // straight to its summary. Runs once the riding list has loaded (so the
  // fedNum can actually be resolved to a name), then clears the param so it
  // doesn't fight with the user's own search/clear actions afterward.
  useEffect(() => {
    const fedNumParam = searchParams.get("fedNum");
    if (!fedNumParam || ridings.length === 0) return;
    const fedNum = Number(fedNumParam);
    const match = ridings.find(r => r.fedNum === fedNum);
    if (match) {
      setSelected(match);
    }
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete("fedNum");
      return next;
    }, { replace: true });
  }, [ridings, searchParams, setSearchParams]);

  // Close either dropdown on outside click.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(target)) {
        setIsYearDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Fetch real donation stats whenever a riding is selected. Reset display
  // preferences back to defaults so switching ridings doesn't carry over a
  // year/metric/view/party-filter choice that may not make sense for the new riding.
  useEffect(() => {
    if (!selected) {
      setSummary(null);
      setSummaryError(null);
      setIsCompareOpen(false);
      return;
    }
    setYearMode("all");
    setSelectedYears(new Set());
    setMetric("total");
    setViewType("bar");
    setExcludedParties(new Set());
    setIsCompareOpen(false);
    setSummaryLoading(true);
    setSummaryError(null);
    fetchRidingSummary(selected.fedNum)
      .then(setSummary)
      .catch(err => setSummaryError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => setSummaryLoading(false));
  }, [selected]);

  // Pie is statistically meaningless for "average" (not parts of a whole) —
  // fall back to bar automatically if the user was on pie and switches metric.
  useEffect(() => {
    if (metric === "average" && viewType === "pie") {
      setViewType("bar");
    }
  }, [metric, viewType]);

  // The single source of truth for both the stat cards and the chart —
  // whichever is selected (all-time or one/many specific years), everything
  // below reads from this instead of branching on the year state repeatedly.
  const activeStats = useMemo(() => {
    if (!summary) return null;
    if (yearMode === "all") {
      return {
        totalMonetary: summary.allTime.totalMonetary,
        donationCount: summary.allTime.donationCount,
        byParty: summary.allTime.byParty,
      };
    }
    if (selectedYears.size === 0) {
      return { totalMonetary: 0, donationCount: 0, byParty: [] };
    }
    return combineYearStats(summary, selectedYears);
  }, [summary, yearMode, selectedYears]);

  const topParty = useMemo(() => {
    if (!activeStats || activeStats.byParty.length === 0) return null;
    if (metric === "average") {
      const withDonations = activeStats.byParty.filter(p => p.donationCount > 0);
      if (withDonations.length === 0) return null;
      return withDonations.reduce((top, p) => {
        const pAvg = p.totalMonetary / p.donationCount;
        const topAvg = top.totalMonetary / top.donationCount;
        return pAvg > topAvg ? p : top;
      });
    }
    return activeStats.byParty.reduce((top, p) => (p.totalMonetary > top.totalMonetary ? p : top));
  }, [activeStats, metric]);

  const overallAverageDonation = useMemo(() => {
    if (!activeStats || activeStats.donationCount === 0) return 0;
    return activeStats.totalMonetary / activeStats.donationCount;
  }, [activeStats]);

  // Province derived from the riding's own FED_NUM — no extra data needed.
  const selectedProvince = useMemo(
    () => (selected ? provinceForFedNum(selected.fedNum) : null),
    [selected]
  );

  // Which ridings have at least one donation recorded, ever — used by the
  // "only ridings with donations" search filter. rankings.ridings only
  // contains ridings that showed up in at least one riding_party_summary row,
  // so absence from this set means genuinely zero donations.
  const ridingsWithDataSet = useMemo(
    () => new Set(rankings?.ridings.map(r => r.fedNum) ?? []),
    [rankings]
  );

  // National average total per riding (all-time, regardless of the year
  // picker above) — the denominator for the "vs. national average" comparison.
  const nationalAverageTotal = useMemo(() => {
    if (!rankings || rankings.ridingCount === 0) return null;
    return rankings.nationalTotals.totalMonetary / rankings.ridingCount;
  }, [rankings]);

  // This riding's 1-indexed rank by all-time total raised, among ridings that
  // have any donations at all. null if rankings haven't loaded yet, or if
  // this riding has never received a donation (so it isn't in the list).
  const ridingRank = useMemo(() => {
    if (!rankings || !selected) return null;
    const idx = rankings.ridings.findIndex(r => r.fedNum === selected.fedNum);
    return idx === -1 ? null : idx + 1;
  }, [rankings, selected]);

  // Chart rows derived from the selected metric, with any parties the user
  // has toggled off filtered out. "total" = raw $ per party (shown as a share
  // of the riding's whole). "average" = $ per donation per party (no shared
  // whole, so pct below is scaled against the max row).
  const chartRows = useMemo(() => {
    if (!activeStats) return [];
    return activeStats.byParty
      .filter(p => !excludedParties.has(p.party))
      .map(p => ({
        party: p.party,
        donationCount: p.donationCount,
        value: metric === "total" ? p.totalMonetary : p.donationCount > 0 ? p.totalMonetary / p.donationCount : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeStats, metric, excludedParties]);

  const chartTotal = useMemo(() => chartRows.reduce((sum, r) => sum + r.value, 0), [chartRows]);
  const chartMax = useMemo(() => Math.max(0, ...chartRows.map(r => r.value)), [chartRows]);

  // True when the riding does have chartable data, but the user has toggled
  // every party off — distinct from there being genuinely no data at all.
  const allPartiesHidden = (activeStats?.byParty.length ?? 0) > 0 && chartRows.length === 0;

  // Pie slices as conic-gradient stops, built from each row's share of chartTotal.
  const pieGradient = useMemo(() => {
    if (chartRows.length === 0 || chartTotal === 0) return "";
    let cursor = 0;
    const stops = chartRows.map(r => {
      const start = cursor;
      const pct = (r.value / chartTotal) * 100;
      cursor += pct;
      return `${PARTY_COLORS[r.party] ?? "#999"} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [chartRows, chartTotal]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ridings
      .filter(r => r.name.toLowerCase().includes(q) || String(r.fedNum).includes(q))
      .filter(r => !provinceFilter || provinceForFedNum(r.fedNum)?.code === provinceFilter)
      // ridingsWithDataSet is empty until rankings load — don't filter anything
      // out before we actually know which ridings have data.
      .filter(r => !onlyWithData || ridingsWithDataSet.size === 0 || ridingsWithDataSet.has(r.fedNum))
      .slice(0, MAX_SUGGESTIONS);
  }, [ridings, query, provinceFilter, onlyWithData, ridingsWithDataSet]);

  function handleSelect(riding: RidingOption) {
    setSelected(riding);
    setQuery("");
    setIsOpen(false);
  }

  function handleClear() {
    setSelected(null);
    setQuery("");
    setYearMode("all");
    setSelectedYears(new Set());
    setExcludedParties(new Set());
  }

  function selectAllTime() {
    setYearMode("all");
    setSelectedYears(new Set());
    setIsYearDropdownOpen(false);
  }

  // Toggles a single year in/out of the combined selection. Doesn't close the
  // dropdown, since picking multiple years means the user needs it to stay
  // open across several clicks. If this unchecks the last remaining year,
  // fall back to All-Time rather than leaving the view stuck on empty data.
  function toggleYear(year: number) {
    setSelectedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      setYearMode(next.size === 0 ? "all" : "custom");
      return next;
    });
  }

  // Toggles whether a party is shown in the bar/pie graphs. Doesn't touch the
  // stat cards (Total Donations, Top Party, etc.) — those describe the whole
  // riding, not just the parties currently visible in the chart.
  function toggleParty(party: string) {
    setExcludedParties(prev => {
      const next = new Set(prev);
      if (next.has(party)) next.delete(party);
      else next.add(party);
      return next;
    });
  }

  const metricLabel = metric === "total" ? "Total Amount" : "Avg. Donation Size";
  const yearLabel = formatYearSelection(yearMode, selectedYears);
  const chartTitle = `${metricLabel} by Party — ${yearLabel}`;
  const noDataLabel = yearMode === "all" ? "No donations recorded" : `No donations recorded for ${yearLabel}`;

  return (
    <div className="riding-page">
      <div className="riding-header">
        <h1 className="riding-title">Riding Lookup</h1>
        <p className="riding-subtitle">
          Search for a federal electoral district to view its donation summary and trends.
        </p>
      </div>

      <div className="riding-search" ref={containerRef}>
        <div className="riding-search-input-wrap">
          <Search size={16} className="riding-search-icon" />
          <input
            type="text"
            className="riding-search-input"
            placeholder="Search by riding name or district number…"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
        </div>

        <div className="riding-search-filters">
          <select
            className="riding-province-select"
            aria-label="Filter by province"
            value={provinceFilter ?? ""}
            onChange={e => setProvinceFilter(e.target.value || null)}
          >
            <option value="">All provinces</option>
            {ALL_PROVINCES.map(p => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="riding-has-data-toggle">
            <input
              type="checkbox"
              checked={onlyWithData}
              onChange={e => setOnlyWithData(e.target.checked)}
            />
            <span>Only ridings with donations</span>
          </label>
        </div>

        {isOpen && query.trim() && (
          <div className="riding-suggestions">
            {suggestions.length > 0 ? (
              suggestions.map(r => (
                <button
                  key={r.fedNum}
                  type="button"
                  className="riding-suggestion-item"
                  onClick={() => handleSelect(r)}
                >
                  <MapPin size={14} className="riding-suggestion-icon" />
                  <span className="riding-suggestion-name">{r.name}</span>
                  <span className="riding-suggestion-code">{r.fedNum}</span>
                </button>
              ))
            ) : (
              <div className="riding-suggestion-empty">No matching ridings</div>
            )}
          </div>
        )}
      </div>

      {!selected ? (
        <div className="riding-empty-state">
          <MapPin size={28} className="riding-empty-icon" />
          <p>Search for a riding above to see its donation summary.</p>
        </div>
      ) : (
        <div className="riding-results">
          <div className="riding-results-header">
            <div>
              <div className="riding-results-name">{selected.name}</div>
              <div className="riding-results-meta">
                <span className="riding-results-code">District {selected.fedNum}</span>
                {selectedProvince && (
                  <span className="riding-results-province">{selectedProvince.name}</span>
                )}
              </div>
            </div>
            <div className="riding-results-actions">
              <button
                type="button"
                className="riding-compare-toggle"
                onClick={() => setIsCompareOpen(o => !o)}
                aria-pressed={isCompareOpen}
              >
                <GitCompare size={14} />
                {isCompareOpen ? "Hide Comparison" : "Compare"}
              </button>
              <button type="button" className="riding-results-close" onClick={handleClear}>
                <X size={16} />
              </button>
            </div>
          </div>

          {isCompareOpen && (
            <RidingCompareBox
              ridings={ridings}
              primary={selected}
              primarySummary={summary}
              onClose={() => setIsCompareOpen(false)}
            />
          )}

          <div className="riding-year-section">
            <div className="riding-year-picker" ref={yearDropdownRef}>
              <button
                type="button"
                className="riding-year-picker-button"
                onClick={() => setIsYearDropdownOpen(o => !o)}
              >
                <CalendarRange size={15} />
                <span>{yearLabel}</span>
                <ChevronDown size={14} />
              </button>

              {isYearDropdownOpen && (
                <div className="riding-year-dropdown">
                  <button
                    type="button"
                    className={"riding-year-option" + (yearMode === "all" ? " riding-year-option--active" : "")}
                    onClick={selectAllTime}
                  >
                    All-Time
                  </button>
                  <div className="riding-year-dropdown-divider" />
                  <div className="riding-year-checkbox-list">
                    {YEARS.map(year => (
                      <label
                        key={year}
                        className={
                          "riding-year-checkbox-option" +
                          (selectedYears.has(year) ? " riding-year-checkbox-option--active" : "")
                        }
                      >
                        <input
                          type="checkbox"
                          checked={selectedYears.has(year)}
                          onChange={() => toggleYear(year)}
                        />
                        <span>{year}</span>
                      </label>
                    ))}
                  </div>
                  <div className="riding-year-dropdown-divider" />
                  <button
                    type="button"
                    className="riding-year-dropdown-done"
                    onClick={() => setIsYearDropdownOpen(false)}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
            {yearMode === "custom" && selectedYears.size > 1 && (
              <div className="riding-year-note">Showing combined totals for {yearLabel}.</div>
            )}
          </div>

          <div className="riding-stats-row">
            <div className="riding-stat-card">
              <div className="riding-stat-label">
                {metric === "total" ? "Total Donations" : "Average Donation Size"}
              </div>
              {summaryLoading ? (
                <div className="riding-stat-placeholder">…</div>
              ) : summaryError ? (
                <>
                  <div className="riding-stat-placeholder">—</div>
                  <div className="riding-stat-note riding-stat-note--error">{summaryError}</div>
                </>
              ) : (
                <>
                  <div className="riding-stat-value">
                    {formatMoney(metric === "total" ? activeStats?.totalMonetary ?? 0 : overallAverageDonation)}
                  </div>
                  <div className="riding-stat-note">{yearMode === "all" ? "All years combined" : yearLabel}</div>
                </>
              )}
            </div>
            <div className="riding-stat-card">
              <div className="riding-stat-label">Number of Donations</div>
              {summaryLoading ? (
                <div className="riding-stat-placeholder">…</div>
              ) : summaryError ? (
                <>
                  <div className="riding-stat-placeholder">—</div>
                  <div className="riding-stat-note riding-stat-note--error">{summaryError}</div>
                </>
              ) : (
                <>
                  <div className="riding-stat-value">
                    {(activeStats?.donationCount ?? 0).toLocaleString()}
                  </div>
                  <div className="riding-stat-note">{yearMode === "all" ? "All years combined" : yearLabel}</div>
                </>
              )}
            </div>
            <div className="riding-stat-card">
              <div className="riding-stat-label">Top Party</div>
              {summaryLoading ? (
                <div className="riding-stat-placeholder">…</div>
              ) : summaryError ? (
                <>
                  <div className="riding-stat-placeholder">—</div>
                  <div className="riding-stat-note riding-stat-note--error">{summaryError}</div>
                </>
              ) : topParty ? (
                <>
                  <div className="riding-stat-value">
                    <span
                      className="riding-stat-party-dot"
                      style={{ background: PARTY_COLORS[topParty.party] ?? "#999" }}
                    />
                    {topParty.party}
                  </div>
                  <div className="riding-stat-note">
                    {metric === "total" ? "By total donations" : "By average donation size"}
                  </div>
                </>
              ) : (
                <>
                  <div className="riding-stat-placeholder">—</div>
                  <div className="riding-stat-note">{noDataLabel}</div>
                </>
              )}
            </div>
          </div>

          {(summaryLoading || summary) && (
            <div className="riding-context-row">
              <div className="riding-context-card">
                <Award size={14} className="riding-context-icon" />
                {summaryLoading ? (
                  <span>…</span>
                ) : summaryError ? (
                  <span className="riding-stat-note--error">{summaryError}</span>
                ) : ridingRank ? (
                  <span>
                    Ranks <strong>#{ridingRank}</strong> of {rankings?.ridingCount} ridings by
                    all-time total raised
                  </span>
                ) : rankings ? (
                  <span>Not ranked — no donations recorded</span>
                ) : (
                  <span>Loading rank…</span>
                )}
              </div>
              <div className="riding-context-card">
                <TrendingUp size={14} className="riding-context-icon" />
                {summaryLoading ? (
                  <span>…</span>
                ) : summaryError ? (
                  <span className="riding-stat-note--error">{summaryError}</span>
                ) : nationalAverageTotal && nationalAverageTotal > 0 && summary ? (
                  <span>
                    {(summary.allTime.totalMonetary / nationalAverageTotal).toFixed(1)}× the
                    average riding (national average: {formatMoney(nationalAverageTotal)} all-time)
                  </span>
                ) : (
                  <span>Loading comparison…</span>
                )}
              </div>
            </div>
          )}

          <div className="riding-charts-row">
            <div className="riding-chart-card">
              <div className="riding-chart-header">
                <BarChart3 size={15} />
                <span>{chartTitle}</span>
              </div>

              {!summaryLoading && !summaryError && (activeStats?.byParty.length ?? 0) > 0 && (
                <div className="riding-chart-controls">
                  <div className="riding-metric-toggle">
                    <button
                      type="button"
                      className={"riding-metric-btn" + (metric === "total" ? " riding-metric-btn--active" : "")}
                      onClick={() => setMetric("total")}
                    >
                      Total Amount
                    </button>
                    <button
                      type="button"
                      className={"riding-metric-btn" + (metric === "average" ? " riding-metric-btn--active" : "")}
                      onClick={() => setMetric("average")}
                    >
                      Avg. Donation Size
                    </button>
                  </div>

                  <div className="riding-view-toggle">
                    <button
                      type="button"
                      className={"riding-view-btn" + (viewType === "bar" ? " riding-view-btn--active" : "")}
                      onClick={() => setViewType("bar")}
                      title="Bar chart"
                    >
                      <BarChart3 size={14} />
                    </button>
                    <button
                      type="button"
                      className={"riding-view-btn" + (viewType === "pie" ? " riding-view-btn--active" : "")}
                      onClick={() => metric === "total" && setViewType("pie")}
                      disabled={metric === "average"}
                      title={metric === "average" ? "Pie view isn't available for averages" : "Pie chart"}
                    >
                      <PieChart size={14} />
                    </button>
                  </div>
                </div>
              )}

              {!summaryLoading && !summaryError && (activeStats?.byParty.length ?? 0) > 0 && (
                <div className="riding-party-filter-row">
                  {activeStats!.byParty.map(p => {
                    const isOff = excludedParties.has(p.party);
                    return (
                      <button
                        key={p.party}
                        type="button"
                        className={"riding-party-filter-chip" + (isOff ? " riding-party-filter-chip--off" : "")}
                        onClick={() => toggleParty(p.party)}
                        aria-pressed={!isOff}
                        title={isOff ? `Show ${p.party} in the chart` : `Hide ${p.party} from the chart`}
                      >
                        <span
                          className="riding-party-filter-swatch"
                          style={{ background: isOff ? "#c4c9d0" : PARTY_COLORS[p.party] ?? "#999" }}
                        />
                        {p.party}
                      </button>
                    );
                  })}
                </div>
              )}

              {summaryLoading ? (
                <div className="riding-chart-placeholder">Loading…</div>
              ) : summaryError ? (
                <div className="riding-chart-placeholder">{summaryError}</div>
              ) : chartRows.length === 0 ? (
                <div className="riding-chart-placeholder">
                  {allPartiesHidden ? "All parties are hidden — click a party above to show it." : noDataLabel}
                </div>
              ) : viewType === "pie" ? (
                <div className="riding-pie-view">
                  <div className="riding-pie" style={{ background: pieGradient }} />
                  <div className="riding-pie-legend">
                    {chartRows.map(({ party, value, donationCount }) => (
                      <div key={party} className="riding-pie-legend-item">
                        <span
                          className="riding-party-dot"
                          style={{ background: PARTY_COLORS[party] ?? "#999" }}
                        />
                        <span className="riding-pie-legend-label">{party}</span>
                        <span className="riding-pie-legend-value">
                          {formatMoney(value)} ({((value / chartTotal) * 100).toFixed(0)}%)
                        </span>
                        <span className="riding-party-count">{donationCount.toLocaleString()} donations</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="riding-party-list">
                  {chartRows.map(({ party, value, donationCount }) => {
                    const pct = metric === "total" ? (value / chartTotal) * 100 : (value / chartMax) * 100;
                    return (
                      <div key={party} className="riding-party-row">
                        <div className="riding-party-label">
                          <span
                            className="riding-party-dot"
                            style={{ background: PARTY_COLORS[party] ?? "#999" }}
                          />
                          <span>{party}</span>
                        </div>
                        <div className="riding-party-bar-wrap">
                          <div
                            className="riding-party-bar"
                            style={{ width: `${pct}%`, background: PARTY_COLORS[party] ?? "#999" }}
                          />
                        </div>
                        <span className="riding-party-amount">{formatMoney(value)}</span>
                        <span className="riding-party-count">{donationCount.toLocaleString()} donations</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Compare box ─────────────────────────────────────────────────────────
// A lightweight side-by-side comparison against a second riding, shown when
// the user clicks "Compare" on an already-selected riding. Deliberately kept
// separate from the main chart/year/metric machinery above — it always
// compares all-time totals, so it doesn't need to track its own year or
// metric state, and switching the primary riding closes it automatically.

interface RidingCompareBoxProps {
  ridings: RidingOption[];
  primary: RidingOption;
  primarySummary: RidingSummary | null;
  onClose: () => void;
}

function topPartyByTotal(summary: RidingSummary | null): RidingPartyBreakdown | null {
  if (!summary || summary.allTime.byParty.length === 0) return null;
  return summary.allTime.byParty.reduce((top, p) => (p.totalMonetary > top.totalMonetary ? p : top));
}

function RidingCompareBox({ ridings, primary, primarySummary, onClose }: RidingCompareBoxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<RidingOption | null>(null);
  const [summary, setSummary] = useState<RidingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (boxRef.current && !boxRef.current.contains(target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!selected) {
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchRidingSummary(selected.fedNum)
      .then(setSummary)
      .catch(err => setError(err instanceof Error ? err.message : "Failed to load data"))
      .finally(() => setLoading(false));
  }, [selected]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ridings
      .filter(r => r.fedNum !== primary.fedNum)
      .filter(r => r.name.toLowerCase().includes(q) || String(r.fedNum).includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [ridings, query, primary.fedNum]);

  const primaryTop = topPartyByTotal(primarySummary);
  const compareTop = topPartyByTotal(summary);

  return (
    <div className="riding-compare-box" ref={boxRef}>
      <div className="riding-compare-header">
        <span>Comparing with</span>
        <button type="button" className="riding-compare-close" onClick={onClose} aria-label="Close comparison">
          <X size={14} />
        </button>
      </div>

      {!selected ? (
        <div className="riding-compare-search">
          <input
            type="text"
            className="riding-compare-search-input"
            placeholder="Search for a riding to compare…"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
          {isOpen && query.trim() && (
            <div className="riding-suggestions">
              {suggestions.length > 0 ? (
                suggestions.map(r => (
                  <button
                    key={r.fedNum}
                    type="button"
                    className="riding-suggestion-item"
                    onClick={() => {
                      setSelected(r);
                      setQuery("");
                      setIsOpen(false);
                    }}
                  >
                    <MapPin size={14} className="riding-suggestion-icon" />
                    <span className="riding-suggestion-name">{r.name}</span>
                    <span className="riding-suggestion-code">{r.fedNum}</span>
                  </button>
                ))
              ) : (
                <div className="riding-suggestion-empty">No matching ridings</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="riding-compare-table">
          <div className="riding-compare-col">
            <div className="riding-compare-col-title">{primary.name}</div>
            <div className="riding-compare-stat">{formatMoney(primarySummary?.allTime.totalMonetary ?? 0)}</div>
            <div className="riding-compare-stat-label">Total Donations (All-Time)</div>
            <div className="riding-compare-stat">{(primarySummary?.allTime.donationCount ?? 0).toLocaleString()}</div>
            <div className="riding-compare-stat-label">Number of Donations</div>
            <div className="riding-compare-stat">{primaryTop ? primaryTop.party : "—"}</div>
            <div className="riding-compare-stat-label">Top Party</div>
          </div>

          <div className="riding-compare-col">
            <div className="riding-compare-col-title">
              {selected.name}
              <button type="button" className="riding-compare-change" onClick={() => setSelected(null)}>
                Change
              </button>
            </div>
            {loading ? (
              <div className="riding-compare-stat">…</div>
            ) : error ? (
              <div className="riding-stat-note--error">{error}</div>
            ) : (
              <>
                <div className="riding-compare-stat">{formatMoney(summary?.allTime.totalMonetary ?? 0)}</div>
                <div className="riding-compare-stat-label">Total Donations (All-Time)</div>
                <div className="riding-compare-stat">{(summary?.allTime.donationCount ?? 0).toLocaleString()}</div>
                <div className="riding-compare-stat-label">Number of Donations</div>
                <div className="riding-compare-stat">{compareTop ? compareTop.party : "—"}</div>
                <div className="riding-compare-stat-label">Top Party</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
