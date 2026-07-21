import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  fetchDonationSumByYearParty,
  fetchDonationSumByMonth,
  fetchDonationSumByProvinceMonth,
  fetchDonationSumByProvinceYear,
} from "../api/trends";
import "./DonationTrendsPage.css";

/** Line colors — purely presentational. The list of parties itself comes from
 *  the API data (not this map); known parties get a brand color, anything else
 *  falls back to the palette below. */
const PARTY_COLORS: Record<string, string> = {
  LPC: "#d71920",
  CPC: "#1a4782",
  NDP: "#f37021",
  GPC: "#3d9b35",
  BQ: "#33b2cc",
  PPC: "#4b306a",
};
const FALLBACK_COLORS = ["#8e6c8a", "#3a8fb7", "#c9436f", "#6b8f3a", "#b0983d", "#5a6acf"];

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Provinces/territories for the monthly filter. `code` is the value the
 *  sum-by-province-month endpoint expects (matches `contributor_province`). */
const PROVINCES: { code: string; name: string }[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

type Granularity = "year" | "month";
type ChartKind = "line" | "bar" | "pie";

/** A pivoted chart row: the x-axis field (`year` or `month`) plus one key per party. */
type ChartRow = Record<string, number>;

/** Pivot flat { x, party, total } rows into Recharts' row-per-x format. */
function pivot(
  rows: { x: number; party: string; total: number }[],
  xField: string
): ChartRow[] {
  const byX = new Map<number, ChartRow>();
  for (const r of rows) {
    let row = byX.get(r.x);
    if (!row) {
      row = { [xField]: r.x };
      byX.set(r.x, row);
    }
    // Postgres numeric can arrive as a string; coerce to number.
    row[r.party] = Number(r.total);
  }
  return [...byX.values()].sort((a, b) => a[xField] - b[xField]);
}

function formatMoney(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}

interface TooltipProps {
  active?: boolean;
  label?: number;
  payload?: { dataKey: string; value: number; color: string }[];
  formatLabel?: (label: number) => string;
}

function ChartTooltip({ active, label, payload, formatLabel }: TooltipProps) {
  if (!active || !payload?.length || label === undefined) return null;
  return (
    <div className="trends-tooltip">
      <div className="trends-tooltip-year">
        {formatLabel ? formatLabel(label) : label}
      </div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="trends-tooltip-row">
          <span
            className="trends-legend-swatch"
            style={{ background: entry.color }}
          />
          <span className="trends-tooltip-name">{entry.dataKey}</span>
          <span className="trends-tooltip-value">
            {formatMoney(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DonationTrendsPage() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [granularity, setGranularity] = useState<Granularity>("year");
  const [chartKind, setChartKind] = useState<ChartKind>("line");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  // null = All provinces (uses the country-wide sum-by-month endpoint).
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  const [yearRows, setYearRows] = useState<ChartRow[]>([]);
  // Province-scoped yearly rows (only fetched when a province is picked in year
  // view); when no province is selected the all-province `yearRows` are shown.
  const [provinceYearRows, setProvinceYearRows] = useState<ChartRow[]>([]);
  const [monthRows, setMonthRows] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the yearly totals once; also seeds the year dropdown + default year.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDonationSumByYearParty()
      .then((res) => {
        if (cancelled) return;
        const rows = pivot(
          res.data.map((r) => ({ x: r.year, party: r.party, total: r.total })),
          "year"
        );
        setYearRows(rows);
        setSelectedYear((prev) => prev ?? rows[rows.length - 1]?.year ?? null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch monthly totals when viewing a specific year by month. Uses the
  // province-scoped endpoint when a province is picked, else the country-wide one.
  useEffect(() => {
    if (granularity !== "month" || selectedYear === null) return;
    let cancelled = false;
    setLoading(true);
    const request = selectedProvince
      ? fetchDonationSumByProvinceMonth(selectedProvince, selectedYear)
      : fetchDonationSumByMonth(selectedYear);
    request
      .then((res) => {
        if (cancelled) return;
        setMonthRows(
          pivot(
            res.data.map((r) => ({ x: r.month, party: r.party, total: r.total })),
            "month"
          )
        );
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [granularity, selectedYear, selectedProvince]);

  // Fetch province-scoped yearly totals when a province is picked in year view.
  // With no province selected we fall back to the all-province `yearRows`.
  useEffect(() => {
    if (granularity !== "year" || !selectedProvince) {
      setProvinceYearRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchDonationSumByProvinceYear(selectedProvince)
      .then((res) => {
        if (cancelled) return;
        setProvinceYearRows(
          pivot(
            res.data.map((r) => ({ x: r.year, party: r.party, total: r.total })),
            "year"
          )
        );
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [granularity, selectedProvince]);

  const isMonth = granularity === "month";
  const xField = isMonth ? "month" : "year";
  // Year view uses province-scoped rows when a province is selected, else the
  // country-wide rows. The month/year dropdown options stay tied to `yearRows`
  // (the full range) so switching province never strands the picker.
  const yearChartData = selectedProvince ? provinceYearRows : yearRows;
  const chartData = isMonth ? monthRows : yearChartData;

  const availableYears = useMemo(
    () => yearRows.map((r) => r.year),
    [yearRows]
  );

  // Party list is derived from the data, not hardcoded.
  const parties = useMemo(() => {
    const seen = new Set<string>();
    for (const row of chartData) {
      for (const key of Object.keys(row)) if (key !== xField) seen.add(key);
    }
    return [...seen].sort();
  }, [chartData, xField]);

  // Stable color per party (brand color if known, else palette by index).
  const partyColor = useMemo(() => {
    const map: Record<string, string> = {};
    parties.forEach((p, i) => {
      map[p] = PARTY_COLORS[p] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    });
    return map;
  }, [parties]);

  // Pie can't show a time series, so it collapses the visible periods into one
  // total per (non-hidden) party — each slice is that party's overall share.
  const pieData = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const row of chartData) {
      for (const party of parties) {
        if (hidden.has(party)) continue;
        totals[party] = (totals[party] ?? 0) + (row[party] ?? 0);
      }
    }
    return parties
      .filter((p) => !hidden.has(p) && totals[p] > 0)
      .map((party) => ({ party, value: totals[party] }));
  }, [chartData, parties, hidden]);

  const toggle = (code: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });

  const provinceName = selectedProvince
    ? PROVINCES.find((p) => p.code === selectedProvince)?.name ?? selectedProvince
    : "All provinces";
  const subtitle = isMonth
    ? `Monthly contributions by party — ${selectedYear ?? ""} · ${provinceName}`
    : availableYears.length > 0
    ? `Total contributions by party, ${availableYears[0]}–${availableYears[availableYears.length - 1]} · ${provinceName}`
    : "Total contributions by party";

  return (
    <div className="trends">
      <header className="trends-header">
        <h1>Donation Trends</h1>
        <p>{subtitle}.</p>
      </header>

      <div className="trends-card">
        <div className="trends-controls">
          <div className="trends-toggle" role="tablist" aria-label="Chart granularity">
            <button
              type="button"
              role="tab"
              aria-selected={!isMonth}
              className={"trends-toggle-btn" + (!isMonth ? " active" : "")}
              onClick={() => setGranularity("year")}
            >
              By Year
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isMonth}
              className={"trends-toggle-btn" + (isMonth ? " active" : "")}
              onClick={() => setGranularity("month")}
            >
              By Month
            </button>
          </div>

          {isMonth && (
            <label className="trends-year-select">
              <span>Year</span>
              <select
                value={selectedYear ?? ""}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="trends-year-select">
            <span>Province</span>
            <select
              value={selectedProvince ?? ""}
              onChange={(e) => setSelectedProvince(e.target.value || null)}
            >
              <option value="">All provinces</option>
              {PROVINCES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <div className="trends-toggle" role="tablist" aria-label="Chart type">
            {(["line", "bar", "pie"] as ChartKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={chartKind === kind}
                className={"trends-toggle-btn" + (chartKind === kind ? " active" : "")}
                onClick={() => setChartKind(kind)}
              >
                {kind === "line" ? "Line" : kind === "bar" ? "Bar" : "Pie"}
              </button>
            ))}
          </div>
        </div>

        <div className="trends-legend">
          {parties.map((party) => {
            const off = hidden.has(party);
            return (
              <button
                key={party}
                type="button"
                className={"trends-legend-item" + (off ? " off" : "")}
                onClick={() => toggle(party)}
              >
                <span
                  className="trends-legend-swatch"
                  style={{ background: off ? "#c4c9d0" : partyColor[party] }}
                />
                {party}
              </button>
            );
          })}
        </div>

        <div className="trends-chart-wrap">
          {loading ? (
            <div className="trends-state">Loading donation trends…</div>
          ) : error ? (
            <div className="trends-state trends-state-error">{error}</div>
          ) : chartData.length === 0 ? (
            <div className="trends-state">No donation data available.</div>
          ) : chartKind === "pie" ? (
            <ResponsiveContainer width="100%" height={440}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="party"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  isAnimationActive={false}
                  label={(props) => String((props as { name?: string }).name ?? "")}
                >
                  {pieData.map((d) => (
                    <Cell key={d.party} fill={partyColor[d.party]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={440}>
              {chartKind === "bar" ? (
                <BarChart
                  data={chartData}
                  margin={{ top: 16, right: 24, bottom: 8, left: 8 }}
                >
                  <CartesianGrid stroke="#eceef1" vertical={false} />
                  <XAxis
                    dataKey={xField}
                    tickFormatter={isMonth ? (m: number) => MONTH_NAMES[m - 1] ?? String(m) : undefined}
                    tick={{ fontSize: 12, fill: "#7a828c" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e5e9" }}
                  />
                  <YAxis
                    tickFormatter={formatMoney}
                    tick={{ fontSize: 12, fill: "#7a828c" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e5e9" }}
                    width={64}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(120, 130, 140, 0.06)" }}
                    content={
                      <ChartTooltip
                        formatLabel={isMonth ? (m) => MONTH_NAMES[m - 1] ?? String(m) : undefined}
                      />
                    }
                  />
                  {parties
                    .filter((party) => !hidden.has(party))
                    .map((party) => (
                      <Bar
                        key={party}
                        dataKey={party}
                        fill={partyColor[party]}
                        isAnimationActive={false}
                      />
                    ))}
                </BarChart>
              ) : (
                <LineChart
                  data={chartData}
                  margin={{ top: 16, right: 24, bottom: 8, left: 8 }}
                >
                  <CartesianGrid stroke="#eceef1" vertical={false} />
                  <XAxis
                    dataKey={xField}
                    tickFormatter={isMonth ? (m: number) => MONTH_NAMES[m - 1] ?? String(m) : undefined}
                    tick={{ fontSize: 12, fill: "#7a828c" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e5e9" }}
                  />
                  <YAxis
                    tickFormatter={formatMoney}
                    tick={{ fontSize: 12, fill: "#7a828c" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e5e9" }}
                    width={64}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatLabel={isMonth ? (m) => MONTH_NAMES[m - 1] ?? String(m) : undefined}
                      />
                    }
                  />
                  {parties
                    .filter((party) => !hidden.has(party))
                    .map((party) => (
                      <Line
                        key={party}
                        type="monotone"
                        dataKey={party}
                        stroke={partyColor[party]}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: partyColor[party] }}
                        isAnimationActive={false}
                      />
                    ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
