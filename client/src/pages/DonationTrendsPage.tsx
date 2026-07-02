import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./DonationTrendsPage.css";

/** Party metadata (dummy — swap for real data later). */
const PARTIES = [
  { code: "LPC", label: "Liberal", color: "#d71920" },
  { code: "CPC", label: "Conservative", color: "#1a4782" },
  { code: "NDP", label: "New Democratic", color: "#f37021" },
  { code: "GPC", label: "Green", color: "#3d9b35" },
  { code: "BQ", label: "Bloc Québécois", color: "#33b2cc" },
  { code: "PPC", label: "People's", color: "#442d7b" },
] as const;

type PartyCode = (typeof PARTIES)[number]["code"];

const YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

/** Dummy yearly contribution totals (in dollars) per party. */
const RAW: Record<PartyCode, number[]> = {
  LPC: [16.2, 11.2, 8.9, 3.1, 6.8, 3.4, 3.6, 4.6, 8.3, 3.2, 5.1, 2.3],
  CPC: [16.1, 5.1, 16.4, 7.0, 13.8, 8.5, 6.7, 14.9, 21.2, 14.7, 14.3, 8.2],
  NDP: [7.1, 3.2, 4.8, 2.9, 7.1, 3.9, 4.1, 5.3, 9.0, 4.1, 5.4, 3.6],
  GPC: [0.9, 0.5, 0.6, 0.8, 1.3, 1.2, 1.4, 1.9, 2.6, 1.8, 2.3, 1.2],
  BQ: [0.4, 0.3, 0.4, 0.5, 0.9, 0.7, 1.0, 1.3, 1.5, 1.1, 1.2, 0.6],
  PPC: [0, 0, 0, 0, 0.2, 0.3, 0.4, 0.6, 0.8, 0.5, 0.4, 0.2],
};

/** Reshape into Recharts' row-per-year format: [{ year, LPC, CPC, ... }]. */
const CHART_DATA = YEARS.map((year, i) => {
  const row: { year: number } & Partial<Record<PartyCode, number>> = { year };
  for (const p of PARTIES) row[p.code] = RAW[p.code][i] * 1e6;
  return row;
});

function formatMoney(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}

interface TooltipProps {
  active?: boolean;
  label?: number;
  payload?: { dataKey: PartyCode; value: number; color: string }[];
}

function ChartTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="trends-tooltip">
      <div className="trends-tooltip-year">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="trends-tooltip-row">
          <span className="trends-legend-swatch" style={{ background: entry.color }} />
          <span className="trends-tooltip-name">{entry.dataKey}</span>
          <span className="trends-tooltip-value">{formatMoney(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function DonationTrendsPage() {
  const [hidden, setHidden] = useState<Set<PartyCode>>(new Set());

  const toggle = (code: PartyCode) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });

  return (
    <div className="trends">
      <header className="trends-header">
        <h1>Donation Trends</h1>
        <p>Total political contributions by party, {YEARS[0]}–{YEARS[YEARS.length - 1]}.</p>
      </header>

      <div className="trends-card">
        <div className="trends-legend">
          {PARTIES.map((p) => {
            const off = hidden.has(p.code);
            return (
              <button
                key={p.code}
                type="button"
                className={"trends-legend-item" + (off ? " off" : "")}
                onClick={() => toggle(p.code)}
              >
                <span className="trends-legend-swatch" style={{ background: off ? "#c4c9d0" : p.color }} />
                {p.code}
              </button>
            );
          })}
        </div>

        <div className="trends-chart-wrap">
          <ResponsiveContainer width="100%" height={440}>
            <LineChart data={CHART_DATA} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
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
              {PARTIES.filter((p) => !hidden.has(p.code)).map((p) => (
                <Line
                  key={p.code}
                  type="monotone"
                  dataKey={p.code}
                  stroke={p.color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
