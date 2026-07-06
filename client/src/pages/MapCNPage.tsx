import { useEffect, useState } from "react";
import { Map, MapControls, useMap } from "@/components/ui/map";
import { InvalidFilterPopUp } from "@/components/ui/invalidFilterPopUp";
import { X } from "lucide-react";
import "./MapCNPage.css";

type BoundaryMode = "provinces" | "ridings";

type SelectedRegion = { name: string; code: string };

type RegionSummary = {
  key: string; // province_code or fed_num string
  totalMonetary: number;
  donationCount: number;
  donorCount: number;
  byParty: { party: string; totalMonetary: number; donationCount: number }[];
};

const API = "http://localhost:3001";

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
}: {
  mode: BoundaryMode;
  regionData: RegionSummary[];
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
    const lineColor = mode === "provinces" ? "#1a3a2a" : "#2a3060";
    const lineWidth = mode === "provinces" ? 1.5 : 0.6;

    let hoveredId: number | string | null = null;

    map.addSource(sourceId, { type: "geojson", data: url, generateId: true });
    map.addLayer({ id: fillId, type: "fill", source: sourceId,
      paint: { "fill-color": baseColor, "fill-opacity": 0.15 } });
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
        if (map.getLayer(fillId)) map.removeLayer(fillId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* ignore */ }
    };
  }, [map, isLoaded, mode, onSelect]);

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


export function MapCNPage() {
  const [mode, setMode] = useState<BoundaryMode>("provinces");
  const [selected, setSelected] = useState<SelectedRegion | null>(null);
  const [year, setYear] = useState(2022);
  const [regionData, setRegionData] = useState<RegionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedData = regionData.find(r => r.key === selected?.code) ?? null;

  useEffect(() => {
    setLoading(true);
    setRegionData([]);
    const endpoint = mode === "provinces"
      ? `/api/provinces/summary?year=${year}`
      : `/api/ridings/summary?year=${year}`;

    fetch(`${API}${endpoint}`)
      .then(r => r.json())
      .then(({ data }) => {
        const normalized: RegionSummary[] = (data ?? []).map((d: Record<string, unknown>) =>
          mode === "provinces"
            ? { key: d["province"] as string, totalMonetary: d["totalMonetary"] as number,
                donationCount: d["donationCount"] as number, donorCount: d["donorCount"] as number,
                byParty: d["byParty"] as RegionSummary["byParty"] }
            : { key: String(d["fedNum"]), totalMonetary: d["totalMonetary"] as number,
                donationCount: d["donationCount"] as number, donorCount: d["donorCount"] as number,
                byParty: d["byParty"] as RegionSummary["byParty"] }
        );
        setRegionData(normalized);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, mode]);

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

        <select className="map-year-select" value={year} onChange={e => setYear(Number(e.target.value))}>
          {Array.from({ length: 2024 - 2004 + 1 }, (_, i) => 2004 + i).reverse().map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="map-layout">
        <div className={`map-canvas${loading ? " map-canvas--loading" : ""}`}>
          <Map center={[-96, 62]} zoom={3.2} maxBounds={[[-145, 40], [-45, 86]]} minZoom={2.5} className="h-full w-full">
            <MapControls position="bottom-right" showZoom showCompass />
            <BoundaryLayer mode={mode} regionData={regionData} onSelect={setSelected} />
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
                <div className="map-info-section-title">Total Donations ({year})</div>
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
                  </>
                ) : (
                  <div className="map-info-placeholder">No data</div>
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
