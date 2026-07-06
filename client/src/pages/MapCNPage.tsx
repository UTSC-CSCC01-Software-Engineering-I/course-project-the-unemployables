import { useEffect, useRef, useState } from "react";
import { Map, MapControls, useMap } from "@/components/ui/map";
import { InvalidFilterPopUp } from "@/components/ui/invalidFilterPopUp";
import { X, CalendarRange, ChevronDown } from "lucide-react";
import "./MapCNPage.css";

type BoundaryMode = "provinces" | "ridings";

type SelectedRegion = {
  name: string;
  code: string;
};

type ProvinceSummary = {
  province: string;
  totalMonetary: number;
  donationCount: number;
  byParty: { party: string; totalMonetary: number; donationCount: number }[];
};

const API = "http://localhost:3001";

// Donation data covers 2004-2024 per CDMP-data/README.md
const YEARS = Array.from({ length: 2024 - 2004 + 1 }, (_, i) => 2024 - i);

const PARTY_COLORS: Record<string, string> = {
  LPC: "#d71920",
  CPC: "#1a4782",
  NDP: "#f37021",
  BQ:  "#33b2cc",
  GPC: "#3d9b35",
  PPC: "#4b306a",
};

// Green sequential: pale mint → deep forest green
const CHOROPLETH_STEPS = ["#edf8e9", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#005a20"];

function amountToColor(amount: number, max: number): string {
  const t = Math.sqrt(amount / max);
  const last = CHOROPLETH_STEPS.length - 1;
  const idx = Math.min(Math.floor(t * last), last - 1);
  return CHOROPLETH_STEPS[idx];
}

function BoundaryLayer({
  mode,
  provinceData,
  onSelect,
}: {
  mode: BoundaryMode;
  provinceData: ProvinceSummary[];
  onSelect: (region: SelectedRegion | null) => void;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const sourceId = "boundary-source";
    const fillId = "boundary-fill";
    const hoverFillId = "boundary-hover";
    const lineId = "boundary-line";

    const url = mode === "provinces" ? "/provinces.geojson" : "/ridings.geojson";
    const baseColor = mode === "provinces" ? "#2d9268" : "#4452c4";
    const lineWidth = mode === "provinces" ? 1.5 : 0.6;

    let hoveredId: number | string | null = null;

    map.addSource(sourceId, { type: "geojson", data: url, generateId: true });

    map.addLayer({
      id: fillId,
      type: "fill",
      source: sourceId,
      paint: { "fill-color": baseColor, "fill-opacity": 0.15 },
    });

    map.addLayer({
      id: hoverFillId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": baseColor,
        "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.3, 0],
      },
    });

    map.addLayer({
      id: lineId,
      type: "line",
      source: sourceId,
      paint: { "line-color": baseColor, "line-width": lineWidth, "line-opacity": 0.7 },
    });

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
        if (map.getLayer(fillId)) map.removeLayer(fillId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* ignore */ }
    };
  }, [map, isLoaded, mode, onSelect]);

  // Apply choropleth colors when province data arrives
  useEffect(() => {
    if (!map || !isLoaded || mode !== "provinces" || !provinceData.length) return;
    if (!map.getLayer("boundary-fill")) return;

    const max = Math.max(...provinceData.map(p => p.totalMonetary));
    const matchExpr: unknown[] = ["match", ["get", "province_code"]];
    for (const p of provinceData) {
      matchExpr.push(p.province, amountToColor(p.totalMonetary, max));
    }
    matchExpr.push("#edf8e9"); // default (lightest step)

    map.setPaintProperty("boundary-fill", "fill-color", matchExpr);
    map.setPaintProperty("boundary-fill", "fill-opacity", 0.75);
  }, [map, isLoaded, provinceData, mode]);

  return null;
}

function formatMoney(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

export function MapCNPage() {
  const [mode, setMode] = useState<BoundaryMode>("provinces");
  const [selected, setSelected] = useState<SelectedRegion | null>(null);
  const [year, setYear] = useState(2022);
  const [provinceData, setProvinceData] = useState<ProvinceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  const selectedData = provinceData.find(p => p.province === selected?.code) ?? null;

  useEffect(() => {
    if (mode !== "provinces") return;
    setLoading(true);
    fetch(`${API}/api/provinces/summary?year=${year}`)
      .then(r => r.json())
      .then(({ data }) => setProvinceData(data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, mode]);

  // Close the year dropdown on outside click.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectYear(y: number) {
    setYear(y);
    setIsYearDropdownOpen(false);
  }

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

        {mode === "provinces" && (
          <div className="map-year-picker" ref={yearDropdownRef}>
            <button
              type="button"
              className="map-year-picker-button"
              onClick={() => setIsYearDropdownOpen(o => !o)}
            >
              <CalendarRange size={15} />
              <span>{year}</span>
              <ChevronDown size={14} />
            </button>

            {isYearDropdownOpen && (
              <div className="map-year-dropdown">
                {YEARS.map(y => (
                  <button
                    key={y}
                    type="button"
                    className={"map-year-option" + (year === y ? " map-year-option--active" : "")}
                    onClick={() => selectYear(y)}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <div className="map-layout">
        <div className={`map-canvas${loading ? " map-canvas--loading" : ""}`}>
          <Map
            center={[-96, 62]}
            zoom={3.2}
            maxBounds={[[-145, 40], [-45, 86]]}
            minZoom={2.5}
            className="h-full w-full"
          >
            <MapControls position="bottom-right" showZoom showCompass />
            <BoundaryLayer mode={mode} provinceData={provinceData} onSelect={setSelected} />
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
                <div className="map-info-section-title">Total Donations {mode === "provinces" ? `(${year})` : ""}</div>
                {loading ? (
                  <div className="map-skeleton-group">
                    <div className="map-skeleton map-skeleton--lg" />
                    <div className="map-skeleton map-skeleton--sm" />
                  </div>
                ) : selectedData ? (
                  <>
                    <div className="map-info-total">{formatMoney(selectedData.totalMonetary)}</div>
                    <div className="map-info-sub">{selectedData.donationCount.toLocaleString()} donations</div>
                  </>
                ) : (
                  <div className="map-info-placeholder">{mode === "provinces" ? "No data" : "Data coming soon"}</div>
                )}
              </div>

              {loading ? (
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
              ) : selectedData && (
                <div className="map-info-section">
                  <div className="map-info-section-title">By Party</div>
                  <div className="map-party-list">
                    {[...selectedData.byParty]
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

              <div className="map-info-section">
                <div className="map-info-section-title">Year Trend</div>
                <div className="map-info-placeholder">Coming soon</div>
              </div>
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
