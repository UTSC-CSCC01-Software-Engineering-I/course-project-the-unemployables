import { Map, MapControls } from "@/components/ui/map";
import "./MapCNPage.css";

export function MapCNPage() {
  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      <Map
        center={[-96, 62]}
        zoom={3.2}
        maxBounds={[[-145, 40], [-45, 86]]}
        minZoom={2.5}
        className="h-full w-full"
      >
        <MapControls position="bottom-right" showZoom showCompass />
      </Map>
    </div>
  );
}

/*
 * Province layer — uncomment to restore
 *
 * import { useCallback, useEffect, useState } from "react";
 * import type maplibregl from "maplibre-gl";
 * import { Map, MapControls, useMap } from "@/components/ui/map";
 *
 * const PROVINCE_NAMES: Record<string, string> = {
 *   AB: "Alberta", BC: "British Columbia", MB: "Manitoba",
 *   NB: "New Brunswick", NL: "Newfoundland and Labrador", NS: "Nova Scotia",
 *   NT: "Northwest Territories", NU: "Nunavut", ON: "Ontario",
 *   PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan", YT: "Yukon",
 * };
 *
 * const FILL_DEFAULT  = "#c8e6da";
 * const FILL_HOVER    = "#2d9268";
 * const FILL_SELECTED = "#1a5c42";
 * const STROKE        = "#2d7a5c";
 *
 * interface SelectedProvince { code: string; name: string; }
 *
 * function ProvinceLayer({ selected, onSelect }: {
 *   selected: SelectedProvince | null;
 *   onSelect: (p: SelectedProvince | null) => void;
 * }) {
 *   const { map, isLoaded } = useMap();
 *   const [hovered, setHovered] = useState<string | null>(null);
 *
 *   const updateFill = useCallback((hoveredCode: string | null, selectedCode: string | null) => {
 *     if (!map || !map.getLayer("provinces-fill")) return;
 *     map.setPaintProperty("provinces-fill", "fill-color", [
 *       "case",
 *       ["==", ["get", "province_code"], selectedCode ?? ""], FILL_SELECTED,
 *       ["==", ["get", "province_code"], hoveredCode ?? ""], FILL_HOVER,
 *       FILL_DEFAULT,
 *     ]);
 *   }, [map]);
 *
 *   useEffect(() => {
 *     if (!map || !isLoaded) return;
 *     if (!map.getSource("provinces")) {
 *       map.addSource("provinces", { type: "geojson", data: "/provinces.geojson" });
 *     }
 *     if (!map.getLayer("provinces-fill")) {
 *       map.addLayer({ id: "provinces-fill", type: "fill", source: "provinces",
 *         paint: { "fill-color": FILL_DEFAULT, "fill-opacity": 0.65 } });
 *     }
 *     if (!map.getLayer("provinces-outline")) {
 *       map.addLayer({ id: "provinces-outline", type: "line", source: "provinces",
 *         paint: { "line-color": STROKE, "line-width": 1 } });
 *     }
 *     const onMouseMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
 *       const code = e.features?.[0]?.properties?.province_code as string | undefined;
 *       setHovered(code ?? null);
 *       map.getCanvas().style.cursor = code ? "pointer" : "";
 *     };
 *     const onMouseLeave = () => { setHovered(null); map.getCanvas().style.cursor = ""; };
 *     const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
 *       const code = e.features?.[0]?.properties?.province_code as string | undefined;
 *       if (!code) return;
 *       onSelect(selected?.code === code ? null : { code, name: PROVINCE_NAMES[code] ?? code });
 *     };
 *     map.on("mousemove", "provinces-fill", onMouseMove);
 *     map.on("mouseleave", "provinces-fill", onMouseLeave);
 *     map.on("click", "provinces-fill", onClick);
 *     return () => {
 *       map.off("mousemove", "provinces-fill", onMouseMove);
 *       map.off("mouseleave", "provinces-fill", onMouseLeave);
 *       map.off("click", "provinces-fill", onClick);
 *     };
 *   }, [map, isLoaded, selected, onSelect]);
 *
 *   useEffect(() => { updateFill(hovered, selected?.code ?? null); }, [hovered, selected, updateFill]);
 *   return null;
 * }
 *
 * // In MapCNPage:
 * // const [selected, setSelected] = useState<SelectedProvince | null>(null);
 * // <ProvinceLayer selected={selected} onSelect={setSelected} />
 * // + the info panel aside
 */
