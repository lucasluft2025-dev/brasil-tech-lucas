export interface GeoCoord {
  lat: number;
  lng: number;
  label: string;
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'curitiba': { lat: -25.4284, lng: -49.2733 },
  'londrina': { lat: -23.3103, lng: -51.1628 },
  'maringa': { lat: -23.4209, lng: -51.9331 },
  'foz do iguacu': { lat: -25.5163, lng: -54.5854 },
  'cascavel': { lat: -24.9578, lng: -53.4595 },
  'ponta grossa': { lat: -25.0945, lng: -50.1633 },
  'sao jose dos pinhais': { lat: -25.5313, lng: -49.2031 },
  'sao paulo': { lat: -23.5505, lng: -46.6333 },
  'campinas': { lat: -22.9056, lng: -47.0608 },
  'guarulhos': { lat: -23.4543, lng: -46.5337 },
  'santos': { lat: -23.9608, lng: -46.3336 },
  'ribeirao preto': { lat: -21.1775, lng: -47.8103 },
  'sorocaba': { lat: -23.5015, lng: -47.4526 },
  'sao jose dos campos': { lat: -23.1896, lng: -45.8841 },
  'osasco': { lat: -23.5329, lng: -46.7916 },
  'registro': { lat: -24.4875, lng: -47.8439 },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
  'niteroi': { lat: -22.8832, lng: -43.1034 },
  'duque de caxias': { lat: -22.7858, lng: -43.3117 },
  'belo horizonte': { lat: -19.9167, lng: -43.9345 },
  'uberlandia': { lat: -18.9186, lng: -48.2772 },
  'juiz de fora': { lat: -21.7642, lng: -43.3503 },
  'contagem': { lat: -19.9321, lng: -44.0539 },
  'vitoria': { lat: -20.3155, lng: -40.3128 },
  'vila velha': { lat: -20.3297, lng: -40.2925 },
  'florianopolis': { lat: -27.5954, lng: -48.548 },
  'joinville': { lat: -26.3044, lng: -48.8487 },
  'blumenau': { lat: -26.9194, lng: -49.0661 },
  'chapeco': { lat: -27.1004, lng: -52.6152 },
  'porto alegre': { lat: -30.0346, lng: -51.2177 },
  'caxias do sul': { lat: -29.1678, lng: -51.1794 },
  'pelotas': { lat: -31.7654, lng: -52.3376 },
  'brasilia': { lat: -15.7939, lng: -47.8828 },
  'goiania': { lat: -16.6869, lng: -49.2648 },
  'campo grande': { lat: -20.4697, lng: -54.6201 },
  'cuiaba': { lat: -15.6014, lng: -56.0979 },
  'salvador': { lat: -12.9714, lng: -38.5014 },
  'feira de santana': { lat: -12.2669, lng: -38.9669 },
  'recife': { lat: -8.0476, lng: -34.877 },
  'fortaleza': { lat: -3.7319, lng: -38.5267 },
  'natal': { lat: -5.7945, lng: -35.211 },
  'joao pessoa': { lat: -7.1195, lng: -34.845 },
  'maceio': { lat: -9.6658, lng: -35.7353 },
  'aracaju': { lat: -10.9472, lng: -37.0731 },
  'teresina': { lat: -5.0892, lng: -42.8019 },
  'sao luis': { lat: -2.5307, lng: -44.3068 },
  'belem': { lat: -1.4558, lng: -48.4902 },
  'manaus': { lat: -3.119, lng: -60.0217 },
  'palmas': { lat: -10.184, lng: -48.3336 },
  'porto velho': { lat: -8.7612, lng: -63.9004 },
  'rio branco': { lat: -9.9747, lng: -67.8243 },
  'macapa': { lat: 0.0356, lng: -51.0705 },
  'boa vista': { lat: 2.8235, lng: -60.6758 },
};

const UF_COORDS: Record<string, { lat: number; lng: number }> = {
  AC: { lat: -9.97, lng: -67.82 },
  AL: { lat: -9.66, lng: -35.73 },
  AM: { lat: -3.11, lng: -60.02 },
  AP: { lat: 0.03, lng: -51.07 },
  BA: { lat: -12.97, lng: -38.5 },
  CE: { lat: -3.73, lng: -38.52 },
  DF: { lat: -15.79, lng: -47.88 },
  ES: { lat: -20.31, lng: -40.31 },
  GO: { lat: -16.68, lng: -49.26 },
  MA: { lat: -2.53, lng: -44.3 },
  MG: { lat: -19.91, lng: -43.93 },
  MS: { lat: -20.47, lng: -54.62 },
  MT: { lat: -15.6, lng: -56.09 },
  PA: { lat: -1.45, lng: -48.49 },
  PB: { lat: -7.12, lng: -34.84 },
  PE: { lat: -8.04, lng: -34.87 },
  PI: { lat: -5.09, lng: -42.8 },
  PR: { lat: -25.43, lng: -49.27 },
  RJ: { lat: -22.9, lng: -43.17 },
  RN: { lat: -5.79, lng: -35.21 },
  RO: { lat: -8.76, lng: -63.9 },
  RR: { lat: 2.82, lng: -60.67 },
  RS: { lat: -30.03, lng: -51.21 },
  SC: { lat: -27.59, lng: -48.55 },
  SE: { lat: -10.94, lng: -37.07 },
  SP: { lat: -23.55, lng: -46.63 },
  TO: { lat: -10.18, lng: -48.33 },
};

function normalizeCityKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[-/,]/)[0]
    .trim();
}

function extractUf(raw: string): string {
  const m = raw.toUpperCase().match(/\b(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)\b/);
  return m ? m[1] : '';
}

export function resolveBrazilLocationSync(rawLocation?: string, fallbackLabel = 'Curitiba - PR'): GeoCoord {
  const clean = (rawLocation || '').trim() || fallbackLabel;
  const cityKey = normalizeCityKey(clean);
  if (CITY_COORDS[cityKey]) {
    return { ...CITY_COORDS[cityKey], label: clean };
  }
  const uf = extractUf(clean);
  if (uf && UF_COORDS[uf]) {
    return { ...UF_COORDS[uf], label: clean };
  }
  return { ...CITY_COORDS['curitiba'], label: clean };
}

export async function geocodeBrazilCityAsync(rawLocation: string): Promise<GeoCoord | null> {
  const clean = rawLocation.trim();
  if (!clean || clean.length < 3) return null;
  const cityKey = normalizeCityKey(clean);
  if (CITY_COORDS[cityKey]) {
    return { ...CITY_COORDS[cityKey], label: clean };
  }

  const cacheKey = `bt_geo_v1_${clean.toLowerCase()}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as GeoCoord;
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return parsed;
      }
    }
  } catch {
    // ignore cache error
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(
      clean
    )}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
      if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
        const result: GeoCoord = {
          lat: Number(data[0].lat),
          lng: Number(data[0].lon),
          label: clean,
        };
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {
          // ignore
        }
        return result;
      }
    }
  } catch {
    // fallback silently
  }

  return resolveBrazilLocationSync(clean);
}

// Brazil bounding box projected onto 560x540 SVG map canvas
const MIN_LAT = -34.2;
const MAX_LAT = 5.6;
const MIN_LNG = -74.5;
const MAX_LNG = -33.8;

export function projectLatLngToSvg(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 480 + 40;
  const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * 460 + 40;
  return {
    x: Math.max(26, Math.min(534, x)),
    y: Math.max(26, Math.min(514, y)),
  };
}

export function haversineKm(a: GeoCoord, b: GeoCoord): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return Math.max(12, Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)) * 1.18));
}

// Quadratic Bezier point at t (0..1) for smooth arched route trajectory
export function getQuadraticBezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
): { x: number; y: number; angleDeg: number } {
  const u = 1 - t;
  const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
  const y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
  const dx = 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { x, y, angleDeg };
}

export function getControlPointForRoute(
  start: { x: number; y: number },
  end: { x: number; y: number }
): { x: number; y: number } {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return { x: midX, y: midY - 12 };
  const curveOffset = Math.min(54, Math.max(18, dist * 0.2));
  return {
    x: midX - (dy / dist) * curveOffset * 0.55,
    y: midY + (dx / dist) * curveOffset * 0.55 - 12,
  };
}
