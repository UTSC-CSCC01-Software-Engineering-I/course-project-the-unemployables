import { useState, useCallback } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import type { MapMouseEvent, ExpressionSpecification } from 'maplibre-gl';
import styles from './DonationMap.module.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const PROVINCE_NAMES: Record<string, string> = {
  AB: 'Alberta',
  BC: 'British Columbia',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  ON: 'Ontario',
  PE: 'Prince Edward Island',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  YT: 'Yukon',
};

interface TooltipState {
  name: string;
  x: number;
  y: number;
}

interface DonationMapProps {
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function DonationMap({ selectedCode, onSelect }: DonationMapProps) {
  const [hoveredCode, setHoveredCode] = useState<string>('');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const onMouseMove = useCallback((e: MapMouseEvent) => {
    const feature = e.features?.[0];
    if (feature?.properties) {
      const code = (feature.properties as { province_code: string }).province_code;
      setHoveredCode(code);
      setTooltip({ name: PROVINCE_NAMES[code] ?? code, x: e.point.x, y: e.point.y });
    } else {
      setHoveredCode('');
      setTooltip(null);
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoveredCode('');
    setTooltip(null);
  }, []);

  const onClick = useCallback((e: MapMouseEvent) => {
    const feature = e.features?.[0];
    if (feature?.properties) {
      const code = (feature.properties as { province_code: string }).province_code;
      onSelect(selectedCode === code ? '' : code);
    }
  }, [onSelect, selectedCode]);

  const fillColor = [
    'case',
    ['==', ['get', 'province_code'], selectedCode],
    '#1a5c42',
    ['==', ['get', 'province_code'], hoveredCode],
    '#2d9268',
    '#c8e6da',
  ] as ExpressionSpecification;

  return (
    <div className={styles.container}>
      <Map
        initialViewState={{ longitude: -96, latitude: 62, zoom: 3.2 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        maxBounds={[[-145, 40], [-45, 86]]}
        minZoom={2.5}
        interactiveLayerIds={['provinces-fill']}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        cursor={hoveredCode ? 'pointer' : 'default'}
      >
        <Source id="provinces" type="geojson" data="/provinces.geojson">
          <Layer
            id="provinces-fill"
            type="fill"
            paint={{ 'fill-color': fillColor, 'fill-opacity': 0.65 }}
          />
          <Layer
            id="provinces-outline"
            type="line"
            paint={{ 'line-color': '#2d7a5c', 'line-width': 1 }}
          />
        </Source>
      </Map>

      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          {tooltip.name}
        </div>
      )}
    </div>
  );
}
