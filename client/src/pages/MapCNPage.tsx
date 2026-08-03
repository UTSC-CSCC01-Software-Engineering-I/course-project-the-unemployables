import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { Map, MapControls, useMap } from "@/components/ui/map";
import { InvalidFilterPopUp } from "@/components/ui/invalidFilterPopUp";
import { X, CalendarRange, ChevronDown, ArrowRight, Search } from "lucide-react";
import "./MapCNPage.css";

type BoundaryMode = "provinces" | "ridings";

type SelectedRegion = { name: string; code: string };

type RegionSummary = {
  key: string; // province_code or fed_num string
  totalMonetary: number;
  donationCount: number;
  donorCount: number;
  byParty?: { party: string; totalMonetary: number; donationCount: number }[];
};

type GeoFeature = {
  properties: Record<string, unknown>;
  geometry: { coordinates: unknown };
};

const API = "http://localhost:3001";

// Donation data covers 2004-2024 per CDMP-data/README.md
const YEARS = Array.from({ length: 2024 - 2004 + 1 }, (_, i) => 2024 - i);

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const PARTY_COLORS: Record<string, string> = {
  LPC: "#d71920",
  CPC: "#1a4782",
  NDP: "#f37021",
  BQ:  "#33b2cc",
  GPC: "#3d9b35",
  PPC: "#4b306a",
};

import { amountToColor, formatMoney } from "@/utils/mapUtils";

function BoundaryLayer({
  mode,
  regionData,
  onSelect,
  selectedCode,
}: {
  mode: BoundaryMode;
  regionData: RegionSummary[];
  onSelect: (region: SelectedRegion | null) => void;
  selectedCode: string | null;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const sourceId = "boundary-source";
    const fillId = "boundary-fill";
    const selectedFillId = "boundary-selected";
    const selectedLineId = "boundary-selected-line";
    const hoverFillId = "boundary-hover";
    const lineId = "boundary-line";

    const url = mode === "provinces" ? "/provinces.geojson" : "/ridings.geojson";
    const baseColor = mode === "provinces" ? "#2d9268" : "#4452c4";
    const lineColor = mode === "provinces" ? "#1a3a2a" : "#2a3060";
    const lineWidth = mode === "provinces" ? 1.5 : 0.6;

    let hoveredId: number | string | null = null;

    map.addSource(sourceId, { type: "geojson", data: url, generateId: true });
    map.addLayer({ id: fillId, type: "fill", source: sourceId,
      paint: { "fill-color": baseColor, "fill-opacity": 0.15 } });
    // Selected highlight layers (initially invisible — updated in the effect below)
    map.addLayer({ id: selectedFillId, type: "fill", source: sourceId,
      paint: { "fill-color": "#ffffff", "fill-opacity": 0 } });
    map.addLayer({ id: selectedLineId, type: "line", source: sourceId,
      paint: { "line-color": "#ffffff", "line-width": 2.5, "line-opacity": 0 } });
    map.addLayer({ id: hoverFillId, type: "fill", source: sourceId,
      paint: { "fill-color": baseColor,
        "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.3, 0] } });
    map.addLayer({ id: lineId, type: "line", source: sourceId,
      paint: { "line-color": lineColor, "line-width": lineWidth, "line-opacity": 0.9 } });

    const onMouseMove = (e: { features?: { id?: number | string }[] }) => {
      if (!e.features?.length) return;
      if (hoveredId !== null) map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
      hoveredId = e.features[0].id ?? null;
      if (hoveredId !== null) map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: true });
    };
    const onMouseLeave = () => {
      if (hoveredId !== null) map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
      hoveredId = null;
    };
    const onClick = (e: { features?: { properties?: Record<string, unknown> }[] }) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties ?? {};
      if (mode === "provinces") {
        onSelect({ name: (props["PRENAME"] as string) ?? "Unknown", code: (props["province_code"] as string) ?? "" });
      } else {
        onSelect({ name: (props["ED_NAMEE"] as string) ?? "Unknown", code: String(props["FED_NUM"] ?? "") });
      }
    };

    map.on("mousemove", fillId, onMouseMove);
    map.on("mouseleave", fillId, onMouseLeave);
    map.on("click", fillId, onClick);

    return () => {
      map.off("mousemove", fillId, onMouseMove);
      map.off("mouseleave", fillId, onMouseLeave);
      map.off("click", fillId, onClick);
      try {
        if (map.getLayer(lineId)) map.removeLayer(lineId);
        if (map.getLayer(hoverFillId)) map.removeLayer(hoverFillId);
        if (map.getLayer(selectedLineId)) map.removeLayer(selectedLineId);
        if (map.getLayer(selectedFillId)) map.removeLayer(selectedFillId);
        if (map.getLayer(fillId)) map.removeLayer(fillId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* ignore */ }
    };
  }, [map, isLoaded, mode, onSelect]);

  // Update the highlight layers whenever the selected region changes.
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (!map.getLayer("boundary-selected")) return;
    const codeProp = mode === "provinces" ? "province_code" : "FED_NUM";
    const matchExpr: unknown = selectedCode
      ? ["==", ["to-string", ["get", codeProp]], selectedCode]
      : false;
    map.setPaintProperty("boundary-selected", "fill-opacity", ["case", matchExpr, 0.22, 0]);
    map.setPaintProperty("boundary-selected-line", "line-opacity", ["case", matchExpr, 0.9, 0]);
  }, [map, isLoaded, selectedCode, mode]);

  // Choropleth coloring
  useEffect(() => {
    if (!map || !isLoaded || !regionData.length) return;
    if (!map.getLayer("boundary-fill")) return;

    const max = Math.max(...regionData.map(r => r.totalMonetary));
    const prop = mode === "provinces" ? "province_code" : "FED_NUM";
    const matchExpr: unknown[] = ["match", ["to-string", ["get", prop]]];
    for (const r of regionData) {
      matchExpr.push(r.key, amountToColor(r.totalMonetary, max));
    }
    matchExpr.push("#edf8e9");

    map.setPaintProperty("boundary-fill", "fill-color", matchExpr);
    map.setPaintProperty("boundary-fill", "fill-opacity", 0.75);
  }, [map, isLoaded, regionData, mode]);

  return null;
}


// Flattens any GeoJSON geometry coordinates into [lng, lat] pairs.
function collectCoords(c: unknown, out: [number, number][] = []): [number, number][] {
  if (!Array.isArray(c)) return out;
  if (typeof c[0] === "number") { out.push(c as [number, number]); }
  else { (c as unknown[]).forEach(item => collectCoords(item, out)); }
  return out;
}

// Lives inside <Map> so it can access useMap(). Watches flyToCode and calls
// fitBounds on the matching GeoJSON feature whenever it changes.
function FlyToRegion({ flyToCode, features, mode }: {
  flyToCode: string | null;
  features: GeoFeature[];
  mode: BoundaryMode;
}) {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded || !flyToCode || !features.length) return;
    const codeProp = mode === "provinces" ? "province_code" : "FED_NUM";
    const feature = features.find(f => String(f.properties[codeProp]) === flyToCode);
    if (!feature) return;
    const coords = collectCoords(feature.geometry.coordinates);
    if (!coords.length) return;
    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 40, maxZoom: mode === "provinces" ? 7 : 11, duration: 800 }
    );
  }, [flyToCode, features, mode, map, isLoaded]);
  return null;
}

export function MapCNPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<BoundaryMode>("provinces");
  const [selected, setSelected] = useState<SelectedRegion | null>(null);
  const [selectedYears, setSelectedYears] = useState<number[]>([2022]);
  const [regionData, setRegionData] = useState<RegionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [geoFeatures, setGeoFeatures] = useState<GeoFeature[]>([]);
  const [flyToCode, setFlyToCode] = useState<string | null>(null);

  const isMultiYear = selectedYears.length > 1;
  const sortedYears = [...selectedYears].sort((a, b) => a - b);
  const isConsecutive = sortedYears.every((y, i) => i === 0 || y === sortedYears[i - 1] + 1);
  const yearLabel = selectedYears.length === 0
    ? "Select year"
    : selectedYears.length === 1
    ? String(selectedYears[0])
    : isConsecutive
    ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]} (avg)`
    : `${sortedYears.join(", ")} (avg)`;

  const selectedData = regionData.find(r => r.key === selected?.code) ?? null;

  useEffect(() => {
    if (selectedYears.length === 0) return;
    setLoading(true);
    setRegionData([]);
    const yearsParam = selectedYears.length === 1
      ? `year=${selectedYears[0]}`
      : `years=${selectedYears.join(",")}`;
    const partyParam = selectedParty ? `&party=${encodeURIComponent(selectedParty)}` : "";
    const endpoint = mode === "provinces"
      ? `/api/provinces/summary?${yearsParam}${partyParam}`
      : `/api/ridings/summary?${yearsParam}${partyParam}`;

    fetch(`${API}${endpoint}`)
      .then(r => r.json())
      .then(({ data }) => {
        const normalized: RegionSummary[] = (data ?? []).map((d: Record<string, unknown>) =>
          mode === "provinces"
            ? { key: d["province"] as string, totalMonetary: d["totalMonetary"] as number,
                donationCount: d["donationCount"] as number, donorCount: d["donorCount"] as number }
            : { key: String(d["fedNum"]), totalMonetary: d["totalMonetary"] as number,
                donationCount: d["donationCount"] as number, donorCount: d["donorCount"] as number }
        );
        setRegionData(normalized);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedYears, mode, selectedParty]);

  // Load GeoJSON features for search whenever the boundary mode changes.
  useEffect(() => {
    const url = mode === "provinces" ? "/provinces.geojson" : "/ridings.geojson";
    fetch(url)
      .then(r => r.json())
      .then(json => setGeoFeatures(json.features ?? []))
      .catch(() => {});
  }, [mode]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const nameProp = mode === "provinces" ? "PRENAME" : "ED_NAMEE";
    const codeProp = mode === "provinces" ? "province_code" : "FED_NUM";
    return geoFeatures
      .filter(f => {
        const name = String(f.properties[nameProp] ?? "").toLowerCase();
        const code = String(f.properties[codeProp] ?? "").toLowerCase();
        return name.includes(q) || code.includes(q);
      })
      .slice(0, 8)
      .map(f => ({
        name: String(f.properties[nameProp] ?? ""),
        code: String(f.properties[codeProp] ?? ""),
      }));
  }, [searchQuery, geoFeatures, mode]);

  function selectSearchResult(result: { name: string; code: string }) {
    setSelected(result);
    setFlyToCode(result.code);
    setSearchQuery("");
    setSearchOpen(false);
  }

  // Close dropdowns on outside click.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setIsYearDropdownOpen(false);
      }
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggleYear(y: number) {
    setSelectedYears(prev =>
      prev.includes(y)
        ? prev.length > 1 ? prev.filter(y2 => y2 !== y) : prev  // keep at least 1
        : [...prev, y]
    );
  }

  type PartyBreakdown = { party: string; totalMonetary: number; donationCount: number };
  type TrendPoint = { year: number; totalMonetary: number; byParty?: PartyBreakdown[] };
  const [trendData, setTrendData] = useState<TrendPoint[] | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);

  // Monthly donation totals for the selected province + year(s), from
  // /api/donations/sum-by-province-month. One value per calendar month.
  type MonthlyPoint = { month: number; total: number };
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[] | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  useEffect(() => {
    if (!selected) { setTrendData(null); setTrendLoading(false); return; }
    const controller = new AbortController();
    setTrendLoading(true);
    setTrendData(null);
    const url = mode === "provinces"
      ? `${API}/api/provinces/${selected.code}/summary`
      : `${API}/api/ridings/${selected.code}/summary`;
    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(json => {
        const byYear = (json.byYear ?? []) as TrendPoint[];
        setTrendData(byYear.sort((a, b) => a.year - b.year));
      })
      .catch(err => { if (err.name !== "AbortError") console.error(err); })
      .finally(() => setTrendLoading(false));
    return () => controller.abort();
  }, [selected, mode]);

  // Monthly breakdown: only meaningful for a selected province (the endpoint is
  // province-scoped). Fetches each selected year and combines into 12 buckets;
  // for a multi-year selection we average across years to match the panel's
  // "Average Donations" framing above.
  useEffect(() => {
    if (mode !== "provinces" || !selected || selectedYears.length === 0) {
      setMonthlyData(null);
      setMonthlyLoading(false);
      return;
    }
    const controller = new AbortController();
    setMonthlyLoading(true);
    setMonthlyData(null);
    Promise.all(
      selectedYears.map(y =>
        fetch(
          `${API}/api/donations/sum-by-province-month?province=${encodeURIComponent(selected.code)}&year=${y}`,
          { signal: controller.signal }
        ).then(r => r.json())
      )
    )
      .then(responses => {
        const totals = new Array(12).fill(0);
        for (const resp of responses) {
          for (const row of (resp.data ?? []) as { month: number; total: number | string }[]) {
            totals[row.month - 1] += Number(row.total);
          }
        }
        setMonthlyData(totals.map((total, i) => ({ month: i + 1, total: total / selectedYears.length })));
      })
      .catch(err => { if (err.name !== "AbortError") console.error(err); })
      .finally(() => setMonthlyLoading(false));
    return () => controller.abort();
  }, [selected, mode, selectedYears]);

  // byParty for both provinces and ridings comes from trendData (per-region click fetch).
  // When a party filter is active, only show that party's row.
  const infoPanelByParty: PartyBreakdown[] | null = (() => {
    if (!selected || !trendData) return null;
    const relevant = trendData.filter(t => selectedYears.includes(t.year));
    if (relevant.length === 0) return null;
    const partyMap: Record<string, PartyBreakdown> = {};
    for (const yearData of relevant) {
      for (const p of yearData.byParty ?? []) {
        if (selectedParty && p.party !== selectedParty) continue;
        if (!partyMap[p.party]) partyMap[p.party] = { party: p.party, totalMonetary: 0, donationCount: 0 };
        partyMap[p.party].totalMonetary += p.totalMonetary / selectedYears.length;
        partyMap[p.party].donationCount += p.donationCount / selectedYears.length;
      }
    }
    return Object.values(partyMap);
  })();

  return (
    <div className="map-page">
      <InvalidFilterPopUp />

      <div className="map-toolbar">
        <div className="map-toggle">
          <button className={mode === "provinces" ? "active" : ""} onClick={() => { setMode("provinces"); setSelected(null); }}>
            Provinces
          </button>
          <button className={mode === "ridings" ? "active" : ""} onClick={() => { setMode("ridings"); setSelected(null); }}>
            Electoral Districts
          </button>
        </div>

        <div className="map-year-picker" ref={yearDropdownRef}>
            <button
              type="button"
              className="map-year-picker-button"
              onClick={() => setIsYearDropdownOpen(o => !o)}
            >
              <CalendarRange size={15} />
              <span>{yearLabel}</span>
              <ChevronDown size={14} />
            </button>

            {isYearDropdownOpen && (
              <div className="map-year-dropdown">
                <div className="map-year-dropdown-actions">
                  <button
                    type="button"
                    className="map-year-dropdown-reset"
                    onClick={() => setSelectedYears([2022])}
                  >
                    Reset
                  </button>
                </div>
                {YEARS.map(y => (
                  <button
                    key={y}
                    type="button"
                    className={"map-year-option" + (selectedYears.includes(y) ? " map-year-option--active" : "")}
                    onClick={() => toggleYear(y)}
                  >
                    <span className="map-year-check">{selectedYears.includes(y) ? "✓" : ""}</span>
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>

        <div className="map-search" ref={searchRef}>
          <div className="map-search-input-wrap">
            <Search size={13} className="map-search-icon" />
            <input
              className="map-search-input"
              placeholder={mode === "provinces" ? "Search province…" : "Search district…"}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
            />
            {searchQuery && (
              <button className="map-search-clear" onClick={() => { setSearchQuery(""); setSearchOpen(false); }}>
                <X size={12} />
              </button>
            )}
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className="map-search-dropdown">
              {searchResults.map(r => (
                <button
                  key={r.code}
                  className="map-search-option"
                  onClick={() => selectSearchResult(r)}
                >
                  <span className="map-search-option-name">{r.name}</span>
                  <span className="map-search-option-code">{r.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="map-party-picker" ref={partyDropdownRef}>
          <button
            type="button"
            className="map-year-picker-button"
            onClick={() => setIsPartyDropdownOpen(o => !o)}
          >
            {selectedParty && (
              <span className="map-party-filter-dot" style={{ background: PARTY_COLORS[selectedParty] ?? "#999" }} />
            )}
            <span>{selectedParty ?? "All Parties"}</span>
            <ChevronDown size={14} />
          </button>

          {isPartyDropdownOpen && (
            <div className="map-year-dropdown" style={{ width: 150 }}>
              <button
                type="button"
                className={"map-year-option" + (!selectedParty ? " map-year-option--active" : "")}
                onClick={() => { setSelectedParty(null); setIsPartyDropdownOpen(false); }}
              >
                <span className="map-year-check">{!selectedParty ? "✓" : ""}</span>
                All Parties
              </button>
              {Object.entries(PARTY_COLORS).map(([party, color]) => (
                <button
                  key={party}
                  type="button"
                  className={"map-year-option" + (selectedParty === party ? " map-year-option--active" : "")}
                  onClick={() => { setSelectedParty(party); setIsPartyDropdownOpen(false); }}
                >
                  <span className="map-year-check">{selectedParty === party ? "✓" : ""}</span>
                  <span className="map-party-filter-dot" style={{ background: color }} />
                  {party}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="map-layout">
        <div className={`map-canvas${loading ? " map-canvas--loading" : ""}`}>
          <Map center={[-96, 62]} zoom={3.2} maxBounds={[[-145, 40], [-45, 86]]} minZoom={2.5} className="h-full w-full">
            <MapControls position="bottom-right" showZoom showCompass />
            <BoundaryLayer mode={mode} regionData={regionData} onSelect={setSelected} selectedCode={selected?.code ?? null} />
            <FlyToRegion flyToCode={flyToCode} features={geoFeatures} mode={mode} />
          </Map>
          {loading && (
            <div className="map-loading-overlay">
              <div className="map-spinner" />
              <span>Loading data…</span>
            </div>
          )}
        </div>

        <aside className={`map-info-panel${selected ? " open" : ""}`}>
          {selected ? (
            <>
              <div className="map-info-header">
                <div>
                  <div className="map-info-name">{selected.name}</div>
                  <div className="map-info-code">{selected.code}</div>
                </div>
                <button className="map-info-close" onClick={() => setSelected(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="map-info-section">
                <div className="map-info-section-title">
                  {isMultiYear
                    ? `Average Donations (${isConsecutive ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}` : sortedYears.join(", ")})`
                    : `Total Donations (${selectedYears[0]})`}
                </div>
                {loading ? (
                  <div className="map-skeleton-group">
                    <div className="map-skeleton map-skeleton--lg" />
                    <div className="map-skeleton map-skeleton--sm" />
                  </div>
                ) : selectedData ? (
                  <>
                    <div className="map-info-total">{formatMoney(selectedData.totalMonetary)}</div>
                    <div className="map-info-sub">
                      {(selectedData.donationCount ?? 0).toLocaleString()} donations
                      {selectedData.donorCount ? ` · ${selectedData.donorCount.toLocaleString()} donors` : ""}
                    </div>
                    {isMultiYear && (
                      <>
                        <div className="map-info-year-chips">
                          {sortedYears.map(y => (
                            <span key={y} className="map-info-year-chip">{y}</span>
                          ))}
                        </div>
                        <div className="map-info-cumulative">
                          <div className="map-info-cumulative-label">Cumulative ({isConsecutive ? `${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}` : sortedYears.join(", ")})</div>
                          <div className="map-info-cumulative-value">{formatMoney(selectedData.totalMonetary * selectedYears.length)}</div>
                          <div className="map-info-sub">{Math.round(selectedData.donationCount * selectedYears.length).toLocaleString()} donations</div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="map-info-placeholder">No data</div>
                )}
              </div>

              {(loading || trendLoading) && !infoPanelByParty ? (
                <div className="map-info-section">
                  <div className="map-info-section-title">By Party</div>
                  <div className="map-skeleton-group">
                    {[80, 60, 45, 30].map(w => (
                      <div key={w} className="map-skeleton-row">
                        <div className="map-skeleton map-skeleton--chip" />
                        <div className="map-skeleton" style={{ width: `${w}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : infoPanelByParty && infoPanelByParty.length > 0 && selectedData && (
                <div className="map-info-section">
                  <div className="map-info-section-title">By Party</div>
                  <div className="map-party-list">
                    {[...infoPanelByParty]
                      .sort((a, b) => b.totalMonetary - a.totalMonetary)
                      .map(({ party, totalMonetary }) => {
                        const pct = (totalMonetary / selectedData.totalMonetary) * 100;
                        return (
                          <div key={party} className="map-party-row">
                            <div className="map-party-label">
                              <span className="map-party-dot" style={{ background: PARTY_COLORS[party] ?? "#999" }} />
                              <span>{party}</span>
                            </div>
                            <div className="map-party-bar-wrap">
                              <div className="map-party-bar" style={{ width: `${pct}%`, background: PARTY_COLORS[party] ?? "#999" }} />
                            </div>
                            <span className="map-party-amount">{formatMoney(totalMonetary)}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {mode === "provinces" && (
                <div className="map-info-section">
                  <div className="map-info-section-title">
                    {isMultiYear
                      ? "Avg. Monthly Donations"
                      : `Monthly Donations (${selectedYears[0]})`}
                  </div>
                  {monthlyLoading ? (
                    <div className="map-skeleton" style={{ height: 190, borderRadius: 8 }} />
                  ) : monthlyData && monthlyData.some((d) => d.total > 0) ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={monthlyData}
                        margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
                      >
                        <XAxis
                          dataKey="month"
                          tickFormatter={(m) => MONTH_LABELS[(m as number) - 1]}
                          tick={{ fontSize: 10, fill: "#666" }}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                        />
                        <YAxis hide />
                        <Tooltip
                          cursor={{ fill: "rgba(45, 146, 104, 0.08)" }}
                          formatter={(v) => [formatMoney(v as number), "Donations"]}
                          labelFormatter={(m) => MONTH_LABELS[(m as number) - 1]}
                          contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #eee" }}
                        />
                        <Bar dataKey="total" fill="#2d9268" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="map-info-placeholder">No data</div>
                  )}
                </div>
              )}

              {mode === "provinces" && (
                <div className="map-info-footer">
                  <button
                    type="button"
                    className="map-info-link-btn"
                    onClick={() => navigate(`/donation-trends?province=${encodeURIComponent(selected.code)}`)}
                  >
                    View more donation trends
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {mode === "ridings" && (
                <div className="map-info-footer">
                  <button
                    type="button"
                    className="map-info-link-btn"
                    onClick={() => navigate(`/riding-lookup?fedNum=${selected.code}`)}
                  >
                    View advanced donation data
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="map-info-empty">
              Click a {mode === "provinces" ? "province" : "district"} to see details
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
