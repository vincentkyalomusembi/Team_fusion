import './NairobiMap.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Map, Marker, Popup, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SEVERITY, severityOf, tivSize, kes, NAIROBI_CENTER, NAIROBI_BOUNDS } from '../../utils';

const STYLE = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.55, 'raster-saturation': -0.8 } }],
};

// Real-world reach of each hotspot in metres. Red covers the most ground.
const REACH = { red: 2600, orange: 1800, yellow: 1300, green: 900 };
const ORDER = ['red', 'orange', 'yellow', 'green']; // drawn bottom to top, so small circles stay visible
const px = (m, z) => (m * 2 ** z) / 156543;           // metres to pixels at zoom z near the equator

const ring = (sev, soft) => ({
  'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 9, px(REACH[sev], 9), 16, px(REACH[sev], 16)],
  'circle-color': SEVERITY[sev],
  'circle-opacity': soft ? 0.16 : 0.28,
  'circle-stroke-color': SEVERITY[sev],
  'circle-stroke-width': 1.5,
  'circle-stroke-opacity': 0.8,
});
const LAYER_IDS = [...ORDER.map((s) => `hs-${s}`), 'hs-core'];

// hotspots: coloured areas. buildings (results page): dots sized by TIV.
// The map zooms to whatever is shown: the buildings if there are any, otherwise the hotspots.
export default function NairobiMap({ hotspots = [], buildings = [] }) {
  const mapRef = useRef();
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState(null);
  const [cursor, setCursor] = useState('');

  const geo = useMemo(() => ({
    type: 'FeatureCollection',
    features: hotspots.map((h) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
      properties: { id: h.id, name: h.name || `Hotspot ${h.id}`, severity: severityOf(h) },
    })),
  }), [hotspots]);

  const pts = buildings.length ? buildings : hotspots;
  const key = `${pts.length}:${pts.reduce((s, p) => s + p.lon + p.lat, 0).toFixed(5)}`;
  useEffect(() => {
    if (!ready || !pts.length || !mapRef.current) return;
    const lons = pts.map((p) => p.lon), lats = pts.map((p) => p.lat);
    mapRef.current.fitBounds(
        [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
        { padding: 70, maxZoom: 13, duration: 700 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  const onClick = (e) => {
    const f = e.features?.[0];
    if (f) {
      const [lon, lat] = f.geometry.coordinates;
      setPicked({ kind: 'hotspot', lon, lat, ...f.properties });
    } else setPicked(null);
  };

  return (
      <Map
          ref={mapRef}
          initialViewState={NAIROBI_CENTER}
          maxBounds={NAIROBI_BOUNDS}
          minZoom={9.5}
          maxZoom={16}
          mapStyle={STYLE}
          interactiveLayerIds={LAYER_IDS}
          cursor={cursor}
          onLoad={() => setReady(true)}
          onClick={onClick}
          onMouseEnter={() => setCursor('pointer')}
          onMouseLeave={() => setCursor('')}
      >
        <Source id="hotspots" type="geojson" data={geo}>
          {ORDER.map((s) => (
              <Layer key={s} id={`hs-${s}`} type="circle" filter={['==', ['get', 'severity'], s]} paint={ring(s, buildings.length > 0)} />
          ))}
          <Layer id="hs-core" type="circle" paint={{
            'circle-radius': 4,
            'circle-color': ['match', ['get', 'severity'], 'red', SEVERITY.red, 'orange', SEVERITY.orange, 'yellow', SEVERITY.yellow, SEVERITY.green],
            'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5,
          }} />
        </Source>

        {buildings.map((b) => {
          const s = tivSize(b.tiv_kes);
          return (
              <Marker key={b.loc_id} longitude={b.lon} latitude={b.lat} onClick={(e) => { e.originalEvent.stopPropagation(); setPicked({ kind: 'building', ...b }); }}>
                <div className="building" style={{ width: s, height: s }} />
              </Marker>
          );
        })}

        {picked && (
            <Popup longitude={picked.lon} latitude={picked.lat} offset={14} closeButton={false} onClose={() => setPicked(null)}>
              {picked.kind === 'hotspot' ? (
                  <div className="pop"><b>{picked.name}</b><span>{picked.severity} risk</span></div>
              ) : (
                  <div className="pop">
                    <b>{picked.loc_id}</b>
                    <span>Lat {Number(picked.lat).toFixed(5)}, Long {Number(picked.lon).toFixed(5)}</span>
                    <span>TIV {kes(picked.tiv_kes, false)}</span>
                    {picked.loss_kes != null && <span>Loss {kes(picked.loss_kes, false)}</span>}
                  </div>
              )}
            </Popup>
        )}
      </Map>
  );
}