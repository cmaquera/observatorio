/**
 * Servicio de Detección Geográfica Inteligente (IP + GPS + LocalStorage)
 * Observatorio de Obras Públicas del Perú
 */

export const PERU_DEPARTAMENTOS = [
  'AMAZONAS', 'ANCASH', 'APURIMAC', 'AREQUIPA', 'AYACUCHO',
  'CAJAMARCA', 'CALLAO', 'CUSCO', 'HUANCAVELICA', 'HUANUCO',
  'ICA', 'JUNIN', 'LA LIBERTAD', 'LAMBAYEQUE', 'LIMA',
  'LORETO', 'MADRE DE DIOS', 'MOQUEGUA', 'PASCO', 'PIURA',
  'PUNO', 'SAN MARTIN', 'TACNA', 'TUMBES', 'UCAYALI'
];

export const DEPARTAMENTO_CENTROIDS = {
  'AMAZONAS': { lat: -6.23, lon: -77.87 },
  'ANCASH': { lat: -9.53, lon: -77.53 },
  'APURIMAC': { lat: -13.63, lon: -72.88 },
  'AREQUIPA': { lat: -16.40, lon: -71.53 },
  'AYACUCHO': { lat: -13.16, lon: -74.22 },
  'CAJAMARCA': { lat: -7.16, lon: -78.51 },
  'CALLAO': { lat: -12.05, lon: -77.12 },
  'CUSCO': { lat: -13.53, lon: -71.97 },
  'HUANCAVELICA': { lat: -12.78, lon: -74.97 },
  'HUANUCO': { lat: -9.93, lon: -76.24 },
  'ICA': { lat: -14.07, lon: -75.73 },
  'JUNIN': { lat: -12.06, lon: -75.20 },
  'LA LIBERTAD': { lat: -8.11, lon: -79.03 },
  'LAMBAYEQUE': { lat: -6.77, lon: -79.84 },
  'LIMA': { lat: -12.05, lon: -77.04 },
  'LORETO': { lat: -3.75, lon: -73.25 },
  'MADRE DE DIOS': { lat: -12.59, lon: -69.19 },
  'MOQUEGUA': { lat: -17.19, lon: -70.93 },
  'PASCO': { lat: -10.68, lon: -76.26 },
  'PIURA': { lat: -5.19, lon: -80.63 },
  'PUNO': { lat: -15.84, lon: -70.02 },
  'SAN MARTIN': { lat: -6.49, lon: -76.37 },
  'TACNA': { lat: -18.01, lon: -70.25 },
  'TUMBES': { lat: -3.57, lon: -80.46 },
  'UCAYALI': { lat: -8.38, lon: -74.55 }
};

export const CUSCO_PROVINCIAS_CENTROIDS = {
  'ACOMAYO': { lat: -13.9189, lon: -71.6842 },
  'ANTA': { lat: -13.4619, lon: -72.1481 },
  'CALCA': { lat: -13.3331, lon: -71.9542 },
  'CANAS': { lat: -14.2081, lon: -71.4558 },
  'CANCHIS': { lat: -14.2967, lon: -71.2258 },
  'CHUMBIVILCAS': { lat: -14.4503, lon: -71.7825 },
  'CUSCO': { lat: -13.5319, lon: -71.9675 },
  'ESPINAR': { lat: -14.7933, lon: -71.4117 },
  'LA CONVENCION': { lat: -12.8631, lon: -72.6978 },
  'PARURO': { lat: -13.7631, lon: -71.8447 },
  'PAUCARTAMBO': { lat: -13.3156, lon: -71.5956 },
  'QUISPICANCHI': { lat: -13.6706, lon: -71.6744 },
  'URUBAMBA': { lat: -13.3044, lon: -72.1158 }
};

const STORAGE_KEY = 'observatorio_user_geo_pref';

/**
 * Normaliza nombres geográficos quitando acentos, mayúsculas y prefijos.
 */
export function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/^(DEPARTMENT OF|DEPARTAMENTO DE|REGION DE|REGION|PROVINCIA DE|PROVINCIA)\s+/gi, '')
    .replace(/\s+(DEPARTMENT|DEPARTAMENTO|REGION|PROVINCE|PROVINCIA)$/gi, '')
    .trim();
}

/**
 * Mapea una región devuelta por GeoIP a un departamento oficial del Perú.
 */
export function mapToPeruvianDepartment(rawRegion) {
  if (!rawRegion) return null;
  const clean = normalizeText(rawRegion);
  if (clean === 'CUZCO' || clean.includes('CUSCO') || clean.includes('CUZCO')) return 'CUSCO';
  if (clean.includes('LIMA')) return 'LIMA';
  if (clean.includes('CALLAO')) return 'CALLAO';
  if (clean.includes('LIBERTAD')) return 'LA LIBERTAD';
  if (clean.includes('MADRE DE DIOS')) return 'MADRE DE DIOS';
  if (clean.includes('SAN MARTIN')) return 'SAN MARTIN';

  for (const dept of PERU_DEPARTAMENTOS) {
    if (clean === dept || clean.includes(dept) || dept.includes(clean)) {
      return dept;
    }
  }
  return null;
}

/**
 * Obtiene la preferencia guardada en localStorage si existe.
 */
export function getSavedGeoPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Guarda la preferencia geográfica del usuario en localStorage.
 */
export function saveGeoPreference(geo) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(geo));
  } catch (e) {
    // ignorar errores de storage en modo incógnito estricto
  }
}

/**
 * Detecta la ubicación mediante la IP pública del navegador.
 */
export async function detectLocationByIp() {
  // Intentar primero con ipwho.is (gratuito, soporta HTTPS y CORS, sin token)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('Fallo en ipwho');
    const data = await res.json();
    if (data.success === false) throw new Error(data.message || 'Error en respuesta ipwho');

    const mappedDept = mapToPeruvianDepartment(data.region);
    return {
      ip: data.ip,
      country: data.country,
      countryCode: data.country_code,
      regionRaw: data.region,
      cityRaw: data.city,
      departamento: mappedDept,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      isp: data.connection?.isp || data.connection?.org || '',
      source: 'ip'
    };
  } catch (err1) {
    // Fallback 1: ipinfo.io
    try {
      const res = await fetch('https://ipinfo.io/json');
      if (!res.ok) throw new Error('Fallo en ipinfo');
      const data = await res.json();
      const [lat, lon] = (data.loc || '').split(',').map(Number);
      const mappedDept = mapToPeruvianDepartment(data.region);
      return {
        ip: data.ip,
        country: data.country === 'PE' ? 'Peru' : data.country,
        countryCode: data.country,
        regionRaw: data.region,
        cityRaw: data.city,
        departamento: mappedDept,
        city: data.city,
        latitude: lat,
        longitude: lon,
        isp: data.org || '',
        source: 'ip'
      };
    } catch (err2) {
      console.warn('No se pudo geolocalizar por IP externa:', err2);
      return null;
    }
  }
}

/**
 * Encuentra el departamento más cercano según coordenadas (lat, lon).
 */
export function findClosestDepartment(lat, lon) {
  let closestDept = 'CUSCO';
  let minDistance = Infinity;
  for (const [dept, coord] of Object.entries(DEPARTAMENTO_CENTROIDS)) {
    const dLat = lat - coord.lat;
    const dLon = lon - coord.lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < minDistance) {
      minDistance = dist;
      closestDept = dept;
    }
  }
  return closestDept;
}

/**
 * Encuentra la provincia de Cusco más cercana según coordenadas (lat, lon).
 */
export function findClosestProvinciaCusco(lat, lon) {
  let closestProv = 'CUSCO';
  let minDistance = Infinity;
  for (const [prov, coord] of Object.entries(CUSCO_PROVINCIAS_CENTROIDS)) {
    const dLat = lat - coord.lat;
    const dLon = lon - coord.lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < minDistance) {
      minDistance = dist;
      closestProv = prov;
    }
  }
  return closestProv;
}

/**
 * Detección por GPS de alta precisión (HTML5 Geolocation API).
 */
export function detectLocationByGps() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tu navegador no soporta geolocalización GPS.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const dept = findClosestDepartment(lat, lon);
        let prov = '';
        if (dept === 'CUSCO') {
          prov = findClosestProvinciaCusco(lat, lon);
        }
        resolve({
          latitude: lat,
          longitude: lon,
          accuracyMeters: pos.coords.accuracy,
          departamento: dept,
          provincia: prov,
          source: 'gps'
        });
      },
      (err) => {
        let msg = 'Permiso de ubicación denegado.';
        if (err.code === 2) msg = 'Ubicación no disponible.';
        if (err.code === 3) msg = 'Tiempo de espera agotado.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}
