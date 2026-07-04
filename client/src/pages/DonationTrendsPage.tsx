import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchDonationSumByYearParty } from "../api/donations";
import type { DonationYearPartySum } from "../types/index";
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
  PPC: "#442d7b",
};
const FALLBACK_COLORS = ["#8e6c8a", "#3a8fb7", "#c9436f", "#6b8f3a", "#b0983d", "#5a6acf"];

type ChartRow = { year: number } & Partial<Record<string, number>>;

/** Reshape API rows into Recharts' row-per-year format: [{ year, LPC, CPC, ... }]. */
function toChartRows(rows: DonationYearPartySum[]): ChartRow[] {
  const byYear = new Map<number, ChartRow>();
  for (const r of rows) {
    let row = byYear.get(r.year);
    if (!row) {
      row = { year: r.year };
      byYear.set(r.year, row);
    }
    // Postgres numeric can arrive as a string; coerce to number.
    row[r.party] = Number(r.total);
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
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
}

function ChartTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="trends-tooltip">
      <div className="trends-tooltip-year">{label}</div>
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
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDonationSumByYearParty()
      .then((res) => {
        if (!cancelled) {
          setChartData(toChartRows(res.data));
          setError(null);
        }
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

  const yearRange = useMemo(() => {
    if (chartData.length === 0) return null;
    return { first: chartData[0].year, last: chartData[chartData.length - 1].year };
  }, [chartData]);

  // Party list is derived from the data, not hardcoded.
  const parties = useMemo(() => {
    const seen = new Set<string>();
    for (const row of chartData) {
      for (const key of Object.keys(row)) if (key !== "year") seen.add(key);
    }
    return [...seen].sort();
  }, [chartData]);

  // Stable color per party (brand color if known, else palette by index).
  const partyColor = useMemo(() => {
    const map: Record<string, string> = {};
    parties.forEach((p, i) => {
      map[p] = PARTY_COLORS[p] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
    });
    return map;
  }, [parties]);

  const toggle = (code: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });

  return (
    <div className="trends">
      <header className="trends-header">
        <h1>Donation Trends</h1>
        <p>
          Total political contributions by party
          {yearRange ? `, ${yearRange.first}–${yearRange.last}` : ""}.
        </p>
      </header>

      <div className="trends-card">
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
          ) : (
          <ResponsiveContainer width="100%" height={440}>
            <LineChart
              data={chartData}
              margin={{ top: 16, right: 24, bottom: 8, left: 8 }}
            >
              <CartesianGrid stroke="#eceef1" vertical={false} />
              <XAxis
                dataKey="year"
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
              <Tooltip content={<ChartTooltip />} />
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
          </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
