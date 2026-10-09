// Only red — hotspots come from backend already classified.
export const SEVERITY = { red: '#D7263D' };
export const severityOf = () => 'red';

// MapLibre expects { longitude, latitude, zoom }
export const NAIROBI_CENTER = { longitude: 36.8219, latitude: -1.2921, zoom: 11 };

// MapLibre bounds format: [[swLng, swLat], [neLng, neLat]]
export const NAIROBI_BOUNDS = [
  [36.65, -1.45],   // south-west
  [37.10, -1.15],   // north-east
];

// TIV dot sizing: ≤ 2M → 4px, 2M–50M → linear 4→18px, ≥ 50M → 18px
const MIN_TIV = 2_000_000;
const MAX_TIV = 50_000_000;
const MIN_PX  = 4;
const MAX_PX  = 18;

export function tivSize(tiv) {
  const v = Number(tiv) || 0;
  if (v <= MIN_TIV) return MIN_PX;
  if (v >= MAX_TIV) return MAX_PX;
  const r = (v - MIN_TIV) / (MAX_TIV - MIN_TIV);
  return Math.round(MIN_PX + r * (MAX_PX - MIN_PX));
}

export function kes(n, compact = true) {
  const v = Number(n) || 0;
  if (compact) {
    if (Math.abs(v) >= 1e9) return `KSh ${(v / 1e9).toFixed(1)}B`;
    if (Math.abs(v) >= 1e6) return `KSh ${(v / 1e6).toFixed(1)}M`;
    if (Math.abs(v) >= 1e3) return `KSh ${(v / 1e3).toFixed(1)}K`;
  }
  return `KSh ${v.toLocaleString('en-KE')}`;
}