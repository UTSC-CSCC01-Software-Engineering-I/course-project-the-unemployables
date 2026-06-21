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

