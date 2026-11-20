export interface VisitorRegion {
  city: string;
  uf: string;
}

const SESSION_KEY = 'bt_visitor_region_v1';

const STATE_NAME_TO_UF: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

function normalizeUf(regionCode?: string, regionName?: string): string {
  const cleanCode = (regionCode || '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cleanCode)) return cleanCode;
  const normalizedName = (regionName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return STATE_NAME_TO_UF[normalizedName] || '';
}

async function fetchWithTimeout(url: string, timeoutMs = 3200): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function detectVisitorRegion(): Promise<VisitorRegion | null> {
  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as VisitorRegion;
      if (parsed && (parsed.city || parsed.uf)) {
        return parsed;
      }
    }
  } catch {
    // ignore sessionStorage access issues
  }

  const saveAndReturn = (region: VisitorRegion): VisitorRegion => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(region));
    } catch {
      // ignore storage errors
    }
    return region;
  };

  // 1. Primary: ipwho.is (HTTPS + CORS)
  try {
    const res = await fetchWithTimeout('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data?.success !== false && (data?.city || data?.region || data?.region_code)) {
        const city = String(data.city || '').trim();
        const uf = normalizeUf(data.region_code, data.region);
        if (city || uf) {
          return saveAndReturn({ city, uf });
        }
      }
    }
  } catch {
    // try fallback
  }

  // 2. Fallback: GeoJS (HTTPS + CORS)
  try {
    const res = await fetchWithTimeout('https://get.geojs.io/v1/ip/geo.json');
    if (res.ok) {
      const data = await res.json();
      const city = String(data?.city || '').trim();
      const uf = normalizeUf(undefined, data?.region);
      if (city || uf) {
        return saveAndReturn({ city, uf });
      }
    }
  } catch {
    // try next fallback
  }

  // 3. Fallback: ipapi.co (HTTPS + CORS)
  try {
    const res = await fetchWithTimeout('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      const city = String(data?.city || '').trim();
      const uf = normalizeUf(data?.region_code, data?.region);
      if (city || uf) {
        return saveAndReturn({ city, uf });
      }
    }
  } catch {
    // try next fallback
  }

  // 4. Fallback: db-ip free geo API (HTTPS + CORS)
  try {
    const res = await fetchWithTimeout('https://api.db-ip.com/v2/free/self');
    if (res.ok) {
      const data = await res.json();
      const city = String(data?.city || '').trim();
      const uf = normalizeUf(data?.stateProvCode, data?.stateProv);
      if (city || uf) {
        return saveAndReturn({ city, uf });
      }
    }
  } catch {
    // graceful null fallback
  }

  return null;
}
