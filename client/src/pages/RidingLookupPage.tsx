import { useEffect, useMemo, useRef, useState } from "react";
import { Search, MapPin, X, BarChart3, PieChart, CalendarRange, ChevronDown } from "lucide-react";
import { fetchRidingSummary } from "../api/ridings";
import type { RidingSummary } from "../types/index";
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

// "all" = all-time (default). A specific year narrows both the stat cards
// and the chart down to that year's riding_party_summary rows.
type YearSelection = "all" | number;

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

// Donation data covers 2004-2024 per CDMP-data/README.md
const YEARS = Array.from({ length: 2024 - 2004 + 1 }, (_, i) => 2024 - i);

function formatMoney(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

export function RidingLookupPage() {
  const [ridings, setRidings] = useState<RidingOption[]>([]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<RidingOption | null>(null);
  const [yearSelection, setYearSelection] = useState<YearSelection>("all");
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [metric, setMetric] = useState<Metric>("total");
  const [viewType, setViewType] = useState<ViewType>("bar");
  const [summary, setSummary] = useState<RidingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
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
  // year/metric/view choice that may not make sense for the new riding.
  useEffect(() => {
    if (!selected) {
      setSummary(null);
      setSummaryError(null);
      return;
    }
    setYearSelection("all");
    setMetric("total");
    setViewType("bar");
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
  // whichever is selected (all-time or a specific year), everything below
  // reads from this instead of branching on yearSelection repeatedly.
  const activeStats = useMemo(() => {
    if (!summary) return null;
    if (yearSelection === "all") {
      return {
        totalMonetary: summary.allTime.totalMonetary,
        donationCount: summary.allTime.donationCount,
        byParty: summary.allTime.byParty,
      };
    }
    const yearData = summary.byYear.find(y => y.year === yearSelection);
    return {
      totalMonetary: yearData?.totalMonetary ?? 0,
      donationCount: yearData?.donationCount ?? 0,
      byParty: yearData?.byParty ?? [],
    };
  }, [summary, yearSelection]);

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

  // Chart rows derived from the selected metric. "total" = raw $ per party
  // (shown as a share of the riding's whole). "average" = $ per donation per
  // party (no shared whole, so pct below is scaled against the max row).
  const chartRows = useMemo(() => {
    if (!activeStats) return [];
    return activeStats.byParty
      .map(p => ({
        party: p.party,
        donationCount: p.donationCount,
        value: metric === "total" ? p.totalMonetary : p.donationCount > 0 ? p.totalMonetary / p.donationCount : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeStats, metric]);

  const chartTotal = useMemo(() => chartRows.reduce((sum, r) => sum + r.value, 0), [chartRows]);
  const chartMax = useMemo(() => Math.max(0, ...chartRows.map(r => r.value)), [chartRows]);

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
      .slice(0, MAX_SUGGESTIONS);
  }, [ridings, query]);

  function handleSelect(riding: RidingOption) {
    setSelected(riding);
    setQuery("");
    setIsOpen(false);
  }

  function handleClear() {
    setSelected(null);
    setQuery("");
    setYearSelection("all");
  }

  function selectYearOption(option: YearSelection) {
    setYearSelection(option);
    setIsYearDropdownOpen(false);
  }

  const metricLabel = metric === "total" ? "Total Amount" : "Avg. Donation Size";
  const chartTitle =
    yearSelection === "all"
      ? `${metricLabel} by Party — All-Time`
      : `${metricLabel} by Party — ${yearSelection}`;
  const noDataLabel =
    yearSelection === "all" ? "No donations recorded" : `No donations recorded for ${yearSelection}`;

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
              <div className="riding-results-code">District {selected.fedNum}</div>
            </div>
            <button type="button" className="riding-results-close" onClick={handleClear}>
              <X size={16} />
            </button>
          </div>

          <div className="riding-year-section">
            <div className="riding-year-picker" ref={yearDropdownRef}>
              <button
                type="button"
                className="riding-year-picker-button"
                onClick={() => setIsYearDropdownOpen(o => !o)}
              >
                <CalendarRange size={15} />
                <span>{yearSelection === "all" ? "All-Time" : yearSelection}</span>
                <ChevronDown size={14} />
              </button>

              {isYearDropdownOpen && (
                <div className="riding-year-dropdown">
                  <button
                    type="button"
                    className={
                      "riding-year-option" + (yearSelection === "all" ? " riding-year-option--active" : "")
                    }
                    onClick={() => selectYearOption("all")}
                  >
                    All-Time
                  </button>
                  <div className="riding-year-dropdown-divider" />
                  {YEARS.map(year => (
                    <button
                      key={year}
                      type="button"
                      className={
                        "riding-year-option" + (yearSelection === year ? " riding-year-option--active" : "")
                      }
                      onClick={() => selectYearOption(year)}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                  <div className="riding-stat-note">
                    {yearSelection === "all" ? "All years combined" : yearSelection}
                  </div>
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
                  <div className="riding-stat-note">
                    {yearSelection === "all" ? "All years combined" : yearSelection}
                  </div>
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

          <div className="riding-charts-row">
            <div className="riding-chart-card">
              <div className="riding-chart-header">
                <BarChart3 size={15} />
                <span>{chartTitle}</span>
              </div>

              {!summaryLoading && !summaryError && chartRows.length > 0 && (
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

              {summaryLoading ? (
                <div className="riding-chart-placeholder">Loading…</div>
              ) : summaryError ? (
                <div className="riding-chart-placeholder">{summaryError}</div>
              ) : chartRows.length === 0 ? (
                <div className="riding-chart-placeholder">{noDataLabel}</div>
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
