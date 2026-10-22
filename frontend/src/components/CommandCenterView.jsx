import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import {
  ShieldAlert,
  AlertTriangle,
  MapPin,
  TrendingUp,
  Activity,
  Layers,
  ExternalLink,
  Building,
  CheckCircle2,
  Clock,
  FileText,
  RotateCcw,
  Sparkles,
  Search,
  X
} from 'lucide-react';
import { getMapPoints, getObras } from '../services/api';
import { DEPARTAMENTO_CENTROIDS } from '../services/geoDetector';

const formatMoney = (val) => {
  if (!val && val !== 0) return 'S/ 0.00';
  if (val >= 1_000_000_000) return `S/ ${(val / 1_000_000_000).toFixed(2)} Mil M`;
  if (val >= 1_000_000) return `S/ ${(val / 1_000_000).toFixed(2)} Millones`;
  return `S/ ${val.toLocaleString('es-PE')}`;
};

// Normaliza coordenadas que vengan con ejes X/Y invertidos y valida que pertenezcan al Perú
function normalizePointCoords(p, targetDept) {
  let lat = Number(p.lat);
  let lng = Number(p.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  // Auto-corregir si latitud y longitud vienen invertidas (ej. lat=-70.5, lng=-17.4 en Tacna)
  if (lat >= -81.5 && lat <= -68.0 && lng >= -18.5 && lng <= -0.01) {
    const tmp = lat;
    lat = lng;
    lng = tmp;
  }

  // Validar rango continental del Perú
  if (lat < -18.5 || lat > -0.01 || lng < -81.5 || lng > -68.0) {
    const deptKey = (targetDept || p.dpto || '').toUpperCase().trim();
    const fallback = DEPARTAMENTO_CENTROIDS[deptKey];
    if (fallback) {
      return { ...p, lat: fallback.lat, lng: fallback.lon };
    }
    return null;
  }

  return { ...p, lat, lng };
}

function isWithinDepartmentBounds(lat, lng, dept) {
  if (!dept) return true;
  const d = dept.toUpperCase().trim();
  if (d === 'TACNA') {
    return lat >= -18.45 && lat <= -16.70 && lng >= -71.25 && lng <= -69.30;
  }
  const c = DEPARTAMENTO_CENTROIDS[d];
  if (!c) return true;
  const maxDelta = ['LORETO', 'UCAYALI', 'MADRE DE DIOS', 'CUSCO', 'AREQUIPA', 'PUNO'].includes(d) ? 5.0 : 3.2;
  return Math.abs(lat - c.lat) <= maxDelta && Math.abs(lng - c.lon) <= maxDelta;
}

// Clasificador robusto para catalogar obras reales por su objeto y especialidad
function categorizeObra(obra) {
  const text = `${obra.sector || ''} ${obra.nombre || ''}`.toUpperCase();
  if (
    text.includes('VIAL') ||
    text.includes('CAMINO') ||
    text.includes('CARRETERA') ||
    text.includes('PUENTE') ||
    text.includes('PISTA') ||
    text.includes('CALZADA') ||
    text.includes('MOVILIDAD') ||
    text.includes('TRANSPORTE') ||
    text.includes('TRANSITO')
  ) {
    return 'VIAL';
  }
  if (
    text.includes('SALUD') ||
    text.includes('HOSPITAL') ||
    text.includes('POSTA') ||
    text.includes('MEDIC') ||
    text.includes('CLINIC') ||
    text.includes('QUIRURG')
  ) {
    return 'SALUD';
  }
  if (
    text.includes('AGUA') ||
    text.includes('SANEAMIENTO') ||
    text.includes('ALCANTARILLADO') ||
    text.includes('DESAGUE') ||
    text.includes('EXCRETA') ||
    text.includes('POTABLE') ||
    text.includes('RESIDUAL') ||
    text.includes('HIDR') ||
    text.includes('RIEGO') ||
    text.includes('CANAL') ||
    text.includes('REPRESA')
  ) {
    return 'AGUA';
  }
  if (
    text.includes('EDUCAC') ||
    text.includes('COLEGIO') ||
    text.includes('INICIAL') ||
    text.includes('PRIMARI') ||
    text.includes('SECUNDARI') ||
    text.includes('AULA') ||
    text.includes('INSTITUCION EDUCATIVA') ||
    text.includes('ESCUELA') ||
    text.includes('TECNOLOGIC') ||
    text.includes('UNIVERSITA')
  ) {
    return 'EDUCACION';
  }
  return 'OTROS';
}

// Paleta cromática no semafórica para sectores económicos:
// Evita estrictamente Rojo, Naranja/Ámbar y Verde para no confundirse con los niveles de alerta
function getSectorStyle(cat) {
  switch (cat) {
    case 'VIAL':
      return {
        label: 'Vial',
        color: 'text-sky-700 bg-sky-50/80 border-sky-200 dark:text-sky-300 dark:border-sky-500/30 dark:bg-sky-950/20',
        activeStyle: 'border-2 border-sky-500 bg-sky-100/90 text-sky-900 ring-1 ring-sky-400/40 shadow-sm dark:border-sky-400 dark:bg-sky-950/70 dark:text-sky-200 dark:shadow-[0_0_12px_rgba(56,189,248,0.35)]',
        badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800/80',
        hex: '#38bdf8'
      };
    case 'SALUD':
      return {
        label: 'Salud',
        color: 'text-fuchsia-700 bg-fuchsia-50/80 border-fuchsia-200 dark:text-fuchsia-300 dark:border-fuchsia-500/30 dark:bg-fuchsia-950/20',
        activeStyle: 'border-2 border-fuchsia-500 bg-fuchsia-100/90 text-fuchsia-900 ring-1 ring-fuchsia-400/40 shadow-sm dark:border-fuchsia-400 dark:bg-fuchsia-950/70 dark:text-fuchsia-200 dark:shadow-[0_0_12px_rgba(217,70,239,0.35)]',
        badge: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/80 dark:text-fuchsia-300 dark:border-fuchsia-800/80',
        hex: '#d946ef'
      };
    case 'AGUA':
      return {
        label: 'Agua',
        color: 'text-teal-700 bg-teal-50/80 border-teal-200 dark:text-teal-300 dark:border-teal-500/30 dark:bg-teal-950/20',
        activeStyle: 'border-2 border-teal-500 bg-teal-100/90 text-teal-900 ring-1 ring-teal-400/40 shadow-sm dark:border-teal-400 dark:bg-teal-950/70 dark:text-teal-200 dark:shadow-[0_0_12px_rgba(45,212,191,0.35)]',
        badge: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800/80',
        hex: '#2dd4bf'
      };
    case 'EDUCACION':
      return {
        label: 'Educ.',
        color: 'text-indigo-700 bg-indigo-50/80 border-indigo-200 dark:text-indigo-300 dark:border-indigo-500/30 dark:bg-indigo-950/20',
        activeStyle: 'border-2 border-indigo-500 bg-indigo-100/90 text-indigo-900 ring-1 ring-indigo-400/40 shadow-sm dark:border-indigo-400 dark:bg-indigo-950/70 dark:text-indigo-200 dark:shadow-[0_0_12px_rgba(129,140,248,0.35)]',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800/80',
        hex: '#818cf8'
      };
    case 'OTROS':
    default:
      return {
        label: 'Otros',
        color: 'text-slate-700 bg-slate-100/80 border-slate-200 dark:text-slate-300 dark:border-slate-700/40 dark:bg-slate-900/40',
        activeStyle: 'border-2 border-slate-400 bg-slate-200/90 text-slate-900 ring-1 ring-slate-400/40 shadow-sm dark:border-slate-300 dark:bg-slate-800/80 dark:text-white dark:shadow-[0_0_12px_rgba(148,163,184,0.35)]',
        badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-700/80',
        hex: '#94a3b8'
      };
  }
}

// Controlador de cámara de Leaflet para animación y encuadre fluido
function MapCameraController({ center, zoom, bounds, triggerFly }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (bounds && bounds.length === 2) {
      map.flyToBounds(bounds, {
        padding: [45, 45],
        maxZoom: 15,
        duration: 1.0
      });
    } else if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 11, { duration: 1.0 });
    }
  }, [center, zoom, bounds, triggerFly, map]);

  return null;
}

// Componente táctico para gestionar marcadores individuales y despliegue en abanico (Spiderfy)
function TacticalSpiderfyMarkers({
  points,
  focusedCui,
  onSelectProject,
  getMarkerColor
}) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());
  const [, setTick] = useState(0);

  // Escuchar eventos de zoom y movimiento para recalcular la proyección en píxeles
  useMapEvents({
    zoomend: () => {
      setCurrentZoom(map.getZoom());
      setTick((t) => t + 1);
    },
    moveend: () => {
      setTick((t) => t + 1);
    }
  });

  // Agrupar obras por coordenadas coincidentes (dentro de un umbral de ~10m)
  const groups = useMemo(() => {
    const res = [];
    points.forEach((p) => {
      const existing = res.find(
        (g) => Math.abs(g.lat - p.lat) < 0.0001 && Math.abs(g.lng - p.lng) < 0.0001
      );
      if (existing) {
        existing.points.push(p);
      } else {
        res.push({
          lat: p.lat,
          lng: p.lng,
          points: [p]
        });
      }
    });
    return res;
  }, [points]);

  return (
    <>
      {groups.map((group, gIdx) => {
        const count = group.points.length;

        // Caso 1: Punto único sin solapamiento
        if (count === 1) {
          const p = group.points[0];
          const isSelected = String(p.cui) === String(focusedCui);
          const isCrit = p.nivel_alerta === 'CRITICO';
          const markerColor = getMarkerColor(p.nivel_alerta);

          return (
            <CircleMarker
              key={`single-${p.cui}`}
              center={[p.lat, p.lng]}
              radius={isSelected ? 10 : isCrit ? 7 : 5}
              pathOptions={{
                color: isSelected ? '#ffffff' : markerColor,
                fillColor: markerColor,
                fillOpacity: 0.9,
                weight: isSelected ? 3 : 1.5
              }}
              eventHandlers={{
                click: () => onSelectProject(p.cui, p.lat, p.lng)
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <div className="font-sans text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-cyan-400">
                    <strong>CUI {p.cui}</strong>
                  </div>
                  <div className="text-white text-xs mt-0.5 max-w-[200px] truncate">
                    {p.nombre}
                  </div>
                  <div className="text-[10px] font-bold mt-0.5" style={{ color: markerColor }}>
                    {p.nivel_alerta === 'CRITICO' ? 'PELIGRO CRÍTICO' : (p.nivel_alerta === 'ALTO' || p.nivel_alerta === 'MEDIO') ? 'OBSERVADA' : (p.nivel_alerta === 'SIN_DATOS' || p.nivel_alerta === 'EN_INICIO') ? 'EN INICIO' : 'EN PLAZO'}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        }

        // Caso 2: Múltiples CUI en la misma ubicación física (2 o más)
        // A zoom < 13 se muestra clúster compacto; al hacer clic se acerca y despliega
        const isSpiderfied = currentZoom >= 13;

        if (!isSpiderfied) {
          const hasCrit = group.points.some((p) => p.nivel_alerta === 'CRITICO');
          const hasAlert = group.points.some((p) => p.nivel_alerta === 'ALTO' || p.nivel_alerta === 'MEDIO');
          const clusterColor = hasCrit ? '#ef4444' : hasAlert ? '#f97316' : '#10b981';
          const containsSelected = group.points.some((p) => String(p.cui) === String(focusedCui));

          return (
            <CircleMarker
              key={`cluster-${gIdx}`}
              center={[group.lat, group.lng]}
              radius={containsSelected ? 12 : 9}
              pathOptions={{
                color: containsSelected ? '#ffffff' : clusterColor,
                fillColor: clusterColor,
                fillOpacity: 0.85,
                weight: containsSelected ? 3 : 2
              }}
              eventHandlers={{
                click: () => {
                  map.flyTo([group.lat, group.lng], 16, { duration: 0.8 });
                  onSelectProject(group.points[0].cui, group.lat, group.lng);
                }
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div className="font-sans text-xs font-mono">
                  <span className="font-bold text-amber-400">📍 {count} Obras coincidentes aquí</span>
                  <div className="text-[10px] text-slate-300 mt-0.5">Haz clic para acercar y desplegar en abanico</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        }

        // DESPLIEGUE EN ABANICO (Spiderfy): Coincidentes a zoom >= 13
        const centerPt = map.latLngToLayerPoint([group.lat, group.lng]);
        const radiusPx = count === 2 ? 36 : Math.min(55, 32 + count * 4);

        return (
          <React.Fragment key={`spider-group-${gIdx}`}>
            {/* Punto ancla central que marca el predio físico exacto */}
            <CircleMarker
              center={[group.lat, group.lng]}
              radius={4}
              pathOptions={{
                color: '#64748b',
                fillColor: '#0f172a',
                fillOpacity: 1,
                weight: 2
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                <div className="font-sans text-[11px] font-mono text-slate-300">
                  📍 Ubicación física compartida ({count} obras)
                </div>
              </Tooltip>
            </CircleMarker>

            {/* Marcadores individuales desplegados en abanico con líneas conectoras */}
            {group.points.map((p, idx) => {
              let angle;
              if (count === 2) {
                // Separación en diagonal limpia para 2 puntos
                angle = idx === 0 ? -Math.PI / 4 : (3 * Math.PI) / 4;
              } else {
                angle = (2 * Math.PI / count) * idx - Math.PI / 2;
              }

              const targetX = centerPt.x + Math.cos(angle) * radiusPx;
              const targetY = centerPt.y + Math.sin(angle) * radiusPx;
              const targetLatLng = map.layerPointToLatLng([targetX, targetY]);

              const isSelected = String(p.cui) === String(focusedCui);
              const isCrit = p.nivel_alerta === 'CRITICO';
              const markerColor = getMarkerColor(p.nivel_alerta);

              return (
                <React.Fragment key={`spider-point-${p.cui}`}>
                  {/* Línea conectora punteada entre el predio central y la bolita */}
                  <Polyline
                    positions={[
                      [group.lat, group.lng],
                      [targetLatLng.lat, targetLatLng.lng]
                    ]}
                    pathOptions={{
                      color: isSelected ? '#38bdf8' : '#64748b',
                      weight: isSelected ? 2.5 : 1.5,
                      dashArray: '4, 4',
                      opacity: isSelected ? 0.95 : 0.7
                    }}
                  />

                  {/* Bolita individual del CUI */}
                  <CircleMarker
                    center={[targetLatLng.lat, targetLatLng.lng]}
                    radius={isSelected ? 10 : isCrit ? 8 : 6}
                    pathOptions={{
                      color: isSelected ? '#ffffff' : markerColor,
                      fillColor: markerColor,
                      fillOpacity: 0.95,
                      weight: isSelected ? 3 : 2
                    }}
                    eventHandlers={{
                      click: () => onSelectProject(p.cui, p.lat, p.lng)
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                      <div className="font-sans text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-cyan-400">
                          <strong>CUI {p.cui}</strong>
                          <span className="text-slate-400">({idx + 1} de {count})</span>
                        </div>
                        <div className="text-white text-xs mt-0.5 max-w-[200px] truncate">
                          {p.nombre}
                        </div>
                        <div className="text-[10px] font-bold mt-0.5" style={{ color: markerColor }}>
                          {p.nivel_alerta === 'CRITICO' ? 'PELIGRO CRÍTICO' : (p.nivel_alerta === 'ALTO' || p.nivel_alerta === 'MEDIO') ? 'OBSERVADA' : (p.nivel_alerta === 'SIN_DATOS' || p.nivel_alerta === 'EN_INICIO') ? 'EN INICIO' : 'EN PLAZO'}
                        </div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}

// Helper de estilos y colores de selección según nivel semafórico (Rojo, Naranja, Verde)
function getSelectionStyle(nivel_alerta) {
  switch (nivel_alerta) {
    case 'CRITICO':
      return {
        ring: 'border-2 border-rose-500 ring-2 ring-rose-500/25 bg-rose-50/90 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 shadow-sm',
        badge: 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-600',
        glow: 'shadow-[0_0_16px_rgba(244,63,94,0.25)]',
        colorHex: '#ef4444'
      };
    case 'ALTO':
    case 'MEDIO':
      return {
        ring: 'border-2 border-orange-500 ring-2 ring-orange-500/25 bg-orange-50/90 dark:bg-orange-950/40 text-orange-900 dark:text-orange-100 shadow-sm',
        badge: 'bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-600',
        glow: 'shadow-[0_0_16px_rgba(249,115,22,0.25)]',
        colorHex: '#f97316'
      };
    case 'SIN_DATOS':
    case 'EN_INICIO':
      return {
        ring: 'border-2 border-slate-400 ring-2 ring-slate-400/25 bg-slate-50/90 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 shadow-sm',
        badge: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
        glow: 'shadow-[0_0_16px_rgba(148,163,184,0.25)]',
        colorHex: '#94a3b8'
      };
    case 'NORMAL':
    case 'BAJO':
    default:
      return {
        ring: 'border-2 border-emerald-500 ring-2 ring-emerald-500/25 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-sm',
        badge: 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-600',
        glow: 'shadow-[0_0_16px_rgba(16,185,129,0.25)]',
        colorHex: '#10b981'
      };
  }
}

export default function CommandCenterView({
  filters,
  setFilters,
  kpis,
  onSelectProject,
  loadingKpis
}) {
  const [mapPoints, setMapPoints] = useState([]);
  const [obrasList, setObrasList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSector, setSelectedSector] = useState('TODOS');
  
  // Obra actualmente enfocada en el panel lateral de inspección (null por defecto para vista panorámica limpia)
  const [focusedCui, setFocusedCui] = useState(null);
  const [isCardOpen, setIsCardOpen] = useState(false);

  // Conteos unificados para los filtros de la barra superior derecha
  const [zoneCounts, setZoneCounts] = useState({
    total: 0,
    criticos: 0,
    observadas: 0,
    enPlazo: 0,
    enInicio: 0
  });

  const [mapCenter, setMapCenter] = useState([-13.5319, -71.9675]);
  const [mapZoom, setMapZoom] = useState(10);
  const [mapBounds, setMapBounds] = useState(null);
  const [flyTrigger, setFlyTrigger] = useState(0);

  // Referencia y observador para fijar la altura exacta de las columnas laterales según la columna central (Mapa + Desfase)
  const centerColRef = useRef(null);
  const [centerColHeight, setCenterColHeight] = useState(716);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const el = centerColRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (el && el.offsetHeight > 0) {
        setCenterColHeight(el.offsetHeight);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // Resetear el filtro de sector cada vez que el usuario cambie departamento, provincia o distrito
  useEffect(() => {
    setSelectedSector('TODOS');
  }, [filters.departamento, filters.provincia, filters.distrito]);

  // Sincronizar estadísticas de la zona a partir de kpis
  useEffect(() => {
    if (kpis && kpis.total_inversiones !== undefined) {
      const tot = kpis.total_inversiones || 0;
      const crit = kpis.total_criticos || 0;
      const totAlertas = kpis.total_alertas || 0;
      const obs = Math.max(0, totAlertas - crit);
      const enInicio = kpis.total_en_inicio || 0;
      const enPlazo = Math.max(0, tot - totAlertas - enInicio);
      setZoneCounts({
        total: tot,
        criticos: crit,
        observadas: obs,
        enPlazo: enPlazo,
        enInicio: enInicio
      });
    }
  }, [kpis]);

  // Cargar puntos de mapa y lista de obras sincronizados con TODOS los filtros
  useEffect(() => {
    setLoading(true);

    const params = {
      departamento: filters.departamento || undefined,
      provincia: filters.provincia || undefined,
      distrito: filters.distrito || undefined,
      nivel_alerta: filters.nivel_alerta && filters.nivel_alerta !== 'TODAS' ? filters.nivel_alerta : undefined,
      q: filters.q ? filters.q : undefined,
      limit: 1000
    };

    Promise.all([
      getMapPoints(params),
      getObras({ ...params, page_size: 50, sort_by: 'score_desc' })
    ])
      .then(([points, obrasRes]) => {
        const rawPoints = points || [];
        const pointsData = rawPoints
          .map((p) => normalizePointCoords(p, filters.departamento))
          .filter(Boolean);
        const itemsData = obrasRes?.items || [];

        setMapPoints(pointsData);
        setObrasList(itemsData);

        // Guardar estadísticas completas de la zona para mantener conteos estables en los botones
        if (!filters.nivel_alerta || filters.nivel_alerta === 'TODAS') {
          let crit = 0;
          let obs = 0;
          let normal = 0;
          let enInicio = 0;
          pointsData.forEach((p) => {
            const isInicio = p.nivel_alerta === 'SIN_DATOS' || p.nivel_alerta === 'EN_INICIO' || ((!p.avance_fisico || p.avance_fisico === 0) && (!p.avance_financiero || p.avance_financiero === 0));
            if (p.nivel_alerta === 'CRITICO') crit++;
            else if (p.nivel_alerta === 'ALTO' || p.nivel_alerta === 'MEDIO' || (p.diferencia_avance && p.diferencia_avance > 15)) obs++;
            else if (isInicio) enInicio++;
            else normal++;
          });
          setZoneCounts({
            total: pointsData.length,
            criticos: crit,
            observadas: obs,
            enPlazo: normal,
            enInicio: enInicio
          });
        }

        // Encuadrar el mapa usando solo puntos dentro del ámbito del departamento seleccionado
        const framingPoints = pointsData.filter((p) =>
          isWithinDepartmentBounds(p.lat, p.lng, filters.departamento)
        );
        const targetFraming = framingPoints.length > 0 ? framingPoints : pointsData;

        if (targetFraming.length > 0) {
          let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
          targetFraming.forEach((p) => {
            if (p.lat && p.lng) {
              if (p.lat < minLat) minLat = p.lat;
              if (p.lat > maxLat) maxLat = p.lat;
              if (p.lng < minLng) minLng = p.lng;
              if (p.lng > maxLng) maxLng = p.lng;
            }
          });

          const latDiff = maxLat - minLat;
          const lngDiff = maxLng - minLng;

          if (latDiff > 0.002 || lngDiff > 0.002) {
            // Múltiples puntos dispersos: encuadrar todos los puntos con flyToBounds
            setMapBounds([[minLat, minLng], [maxLat, maxLng]]);
          } else {
            // Un solo punto o puntos muy juntos: centrar con zoom adecuado
            setMapBounds(null);
            const fallbackDept = DEPARTAMENTO_CENTROIDS[(filters.departamento || '').toUpperCase().trim()];
            const defaultLat = fallbackDept ? fallbackDept.lat : -13.5319;
            const defaultLng = fallbackDept ? fallbackDept.lon : -71.9675;
            setMapCenter([minLat !== 90 ? minLat : defaultLat, minLng !== 180 ? minLng : defaultLng]);
            setMapZoom(filters.distrito ? 13 : filters.provincia ? 11 : 10);
          }
          setFlyTrigger((prev) => prev + 1);
        } else if (filters.departamento) {
          const fallbackDept = DEPARTAMENTO_CENTROIDS[filters.departamento.toUpperCase().trim()];
          if (fallbackDept) {
            setMapBounds(null);
            setMapCenter([fallbackDept.lat, fallbackDept.lon]);
            setMapZoom(10);
            setFlyTrigger((prev) => prev + 1);
          }
        }

        // NO auto-seleccionar ninguna obra: vista panorámica limpia sin popups
        setFocusedCui(null);
        setIsCardOpen(false);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error sincronizando datos del Centro de Monitoreo:', err);
        setLoading(false);
      });
  }, [filters.departamento, filters.provincia, filters.distrito, filters.nivel_alerta, filters.q]);

  // Filtrado reactivo por sector (Vial, Salud, Agua, Educación, Todos)
  const filteredPoints = useMemo(() => {
    if (selectedSector === 'TODOS') return mapPoints;
    return mapPoints.filter((p) => categorizeObra(p) === selectedSector);
  }, [mapPoints, selectedSector]);

  const filteredObras = useMemo(() => {
    if (selectedSector === 'TODOS') return obrasList;
    return obrasList.filter((o) => categorizeObra(o) === selectedSector);
  }, [obrasList, selectedSector]);

  // Conteos exactos por sector calculados de las obras de la zona actual
  const sectorCounts = useMemo(() => {
    const counts = { VIAL: 0, SALUD: 0, AGUA: 0, EDUCACION: 0, OTROS: 0 };
    mapPoints.forEach((p) => {
      const cat = categorizeObra(p);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts.OTROS++;
      }
    });
    return counts;
  }, [mapPoints]);

  // Conteos de estado de ejecución
  const statusCounts = useMemo(() => {
    let enPlazo = 0;
    let enRiesgo = 0;
    mapPoints.forEach((p) => {
      if (p.nivel_alerta === 'CRITICO' || p.nivel_alerta === 'ALTO' || p.nivel_alerta === 'MEDIO') {
        enRiesgo++;
      } else {
        enPlazo++;
      }
    });
    return { enPlazo, enRiesgo };
  }, [mapPoints]);

  // Datos completos de la obra actualmente enfocada en el panel lateral derecho
  const activeObra = useMemo(() => {
    if (!focusedCui) return null;
    const foundInList = obrasList.find((o) => String(o.cui) === String(focusedCui));
    if (foundInList) {
      return {
        cui: foundInList.cui,
        nombre: foundInList.nombre,
        entidad: foundInList.entidad || 'Entidad Pública',
        costo: foundInList.costo_actualizado,
        avance_fisico: foundInList.avance_fisico || 0,
        avance_financiero: foundInList.avance_financiero || 0,
        diferencia_avance: foundInList.diferencia_avance || 0,
        nivel_alerta: foundInList.evaluacion_riesgo?.nivel_alerta || 'NORMAL',
        distrito: foundInList.distrito,
        provincia: foundInList.provincia,
        sector: foundInList.sector,
        lat: foundInList.latitud,
        lng: foundInList.longitud,
        alerta_desc:
          foundInList.evaluacion_riesgo?.motivo_alerta ||
          (foundInList.evaluacion_riesgo?.nivel_alerta === 'SIN_DATOS' || ((!foundInList.avance_fisico || foundInList.avance_fisico === 0) && (!foundInList.avance_financiero || foundInList.avance_financiero === 0))
            ? 'Inversión en fase inicial o cartera pre-ejecución. No registra desembolsos ni inicio de obra física.'
            : foundInList.diferencia_avance > 15
            ? 'Alerta por desfase financiero sobre avance físico real'
            : 'Proyecto en ejecución dentro de parámetros previstos')
      };
    }
    const foundInPoints = mapPoints.find((p) => String(p.cui) === String(focusedCui));
    if (foundInPoints) {
      return {
        cui: foundInPoints.cui,
        nombre: foundInPoints.nombre,
        entidad: foundInPoints.entidad || 'Entidad Pública',
        costo: foundInPoints.costo,
        avance_fisico: foundInPoints.avance_fisico || 0,
        avance_financiero: foundInPoints.avance_financiero || 0,
        diferencia_avance: foundInPoints.diferencia_avance || 0,
        nivel_alerta: foundInPoints.nivel_alerta || 'NORMAL',
        distrito: foundInPoints.dist,
        provincia: foundInPoints.prov,
        sector: foundInPoints.sector,
        lat: foundInPoints.lat,
        lng: foundInPoints.lng,
        alerta_desc:
          (foundInPoints.nivel_alerta === 'SIN_DATOS' || foundInPoints.nivel_alerta === 'EN_INICIO' || ((!foundInPoints.avance_fisico || foundInPoints.avance_fisico === 0) && (!foundInPoints.avance_financiero || foundInPoints.avance_financiero === 0))
            ? 'Inversión en fase inicial o cartera pre-ejecución. Sin desembolsos ni inicio de obras.'
            : foundInPoints.diferencia_avance > 15
            ? 'Alerta por desfase financiero sobre avance físico'
            : 'En cronograma de ejecución regular')
      };
    }
    return null;
  }, [focusedCui, obrasList, mapPoints]);

  // Obras que comparten la misma ubicación física que la obra actualmente activa
  const coincidentObras = useMemo(() => {
    if (!activeObra || !activeObra.lat || !activeObra.lng) return [];
    return mapPoints.filter(
      (p) =>
        Math.abs(p.lat - activeObra.lat) < 0.0001 &&
        Math.abs(p.lng - activeObra.lng) < 0.0001
    );
  }, [activeObra, mapPoints]);

  // Lista de alertas reales obtenidas de las obras con observación en la zona actual
  const localAlerts = useMemo(() => {
    return obrasList
      .filter((o) => {
        const ev = o.evaluacion_riesgo || {};
        return (
          ev.nivel_alerta === 'CRITICO' ||
          ev.nivel_alerta === 'ALTO' ||
          (o.diferencia_avance || 0) > 15 ||
          ev.alerta_plazo_vencido === true
        );
      })
      .slice(0, 5);
  }, [obrasList]);

  // Manejador centralizado para enfocar un proyecto:
  // Abre la ficha lateral a la IZQUIERDA y mueve el mapa con offset para mostrar el punto en la DERECHA
  const handleFocusProject = (cui, lat, lng) => {
    setFocusedCui(cui);
    setIsCardOpen(true);
    setMapBounds(null); // Al enfocar un punto individual, desactivar encuadre general

    let targetLat = lat;
    let targetLng = lng;

    if (!targetLat || !targetLng) {
      const p = mapPoints.find((mp) => String(mp.cui) === String(cui));
      if (p && p.lat && p.lng) {
        targetLat = p.lat;
        targetLng = p.lng;
      }
    }

    if (targetLat && targetLng) {
      // Offset de longitud para que el punto se visualice en el lado DERECHO del mapa
      // y la ficha táctica se ubique cómodamente en el lado IZQUIERDO sin tapar el punto
      const offsetLng = -0.014;
      setMapCenter([targetLat, targetLng + offsetLng]);
      setMapZoom(14);
      setFlyTrigger((prev) => prev + 1);
    }
  };

  // Si la obra enfocada deja de pertenecer al sector seleccionado, deseleccionarla sin forzar una nueva
  useEffect(() => {
    if (focusedCui && selectedSector !== 'TODOS') {
      const isStillVisible = filteredObras.some((o) => String(o.cui) === String(focusedCui));
      if (!isStillVisible) {
        setFocusedCui(null);
        setIsCardOpen(false);
      }
    }
  }, [selectedSector, filteredObras, focusedCui]);

  // Alternar filtro de estado semafórico (Todas, Críticas, Observadas, En Plazo)
  const handleToggleAlerta = (nivel) => {
    if (filters.nivel_alerta === nivel) {
      setFilters((prev) => ({ ...prev, nivel_alerta: 'TODAS' }));
    } else {
      setFilters((prev) => ({ ...prev, nivel_alerta: nivel }));
    }
    // Deseleccionar al alternar estado de alerta para mantener la vista general limpia
    setFocusedCui(null);
    setIsCardOpen(false);
  };

  // Colores semánticos estrictos del semáforo (Rojo, Naranja, Verde)
  const getMarkerColor = (alerta) => {
    switch (alerta) {
      case 'CRITICO':
        return '#ef4444'; // Rojo (Peligro Crítico)
      case 'ALTO':
      case 'MEDIO':
        return '#f97316'; // Naranja (Retraso / Observación)
      case 'SIN_DATOS':
      case 'EN_INICIO':
        return '#94a3b8'; // Slate / Gris (En Inicio / En Cartera)
      case 'NORMAL':
      case 'BAJO':
      default:
        return '#10b981'; // Verde (En Plazo)
    }
  };

  // Blueprint icon helper con colores de sector no semafóricos
  const renderSectorIcon = (cat, isCritical) => {
    const secStyle = getSectorStyle(cat);
    const strokeColor = isCritical ? '#ef4444' : secStyle.hex;
    if (cat === 'VIAL') {
      return (
        <svg className="w-10 h-8 text-slate-600 shrink-0" viewBox="0 0 48 36" fill="none" stroke="currentColor">
          <path d="M4 32L18 4H30L44 32" strokeWidth="1.5" />
          <line x1="24" y1="10" x2="24" y2="16" strokeDasharray="2 2" strokeWidth="2" stroke={strokeColor} />
          <line x1="24" y1="22" x2="24" y2="28" strokeDasharray="2 2" strokeWidth="2" stroke={strokeColor} />
        </svg>
      );
    }
    if (cat === 'SALUD') {
      return (
        <svg className="w-10 h-8 text-slate-600 shrink-0" viewBox="0 0 48 36" fill="none" stroke="currentColor">
          <rect x="4" y="8" width="40" height="26" rx="2" strokeWidth="1.5" />
          <path d="M16 8V2H32V8" strokeWidth="1.5" />
          <path d="M24 14V28M17 21H31" strokeWidth="2.5" stroke={strokeColor} />
        </svg>
      );
    }
    if (cat === 'AGUA') {
      return (
        <svg className="w-10 h-8 text-slate-600 shrink-0" viewBox="0 0 48 36" fill="none" stroke="currentColor">
          <path d="M24 4C24 4 12 16 12 24C12 30.6 17.4 36 24 36C30.6 36 36 30.6 36 24C36 16 24 4 24 4Z" strokeWidth="1.5" stroke={strokeColor} />
          <circle cx="24" cy="24" r="5" strokeWidth="1" stroke={strokeColor} />
        </svg>
      );
    }
    return (
      <svg className="w-10 h-8 text-slate-600 shrink-0" viewBox="0 0 48 36" fill="none" stroke="currentColor">
        <rect x="6" y="6" width="36" height="28" rx="2" strokeWidth="1.5" />
        <line x1="6" y1="16" x2="42" y2="16" strokeWidth="1" stroke={strokeColor} />
        <rect x="12" y="20" width="6" height="14" strokeWidth="1" />
        <rect x="30" y="20" width="6" height="14" strokeWidth="1" />
      </svg>
    );
  };

  // Texto amigable de ubicación actual
  const locationLabel = useMemo(() => {
    const parts = [];
    if (filters.departamento) parts.push(filters.departamento);
    if (filters.provincia) parts.push(filters.provincia);
    if (filters.distrito) parts.push(filters.distrito);
    return parts.length > 0 ? parts.join(' / ') : 'Todo el Perú';
  }, [filters]);

  // Presupuesto total de la zona filtrada
  const zonaPresupuestoTotal = useMemo(() => {
    return mapPoints.reduce((acc, p) => acc + (p.costo || 0), 0);
  }, [mapPoints]);

  return (
    <div className="space-y-4">

      {/* ============================================================== */}
      {/* 1. BARRA SUPERIOR DE ESTADO Y FEEDBACK VISUAL                  */}
      {/* ============================================================== */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Centro de Monitoreo Táctico
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800">
                {locationLabel}
              </span>
              {loading && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-mono animate-pulse flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  Actualizando datos...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Inspección geoespacial en vivo sobre OpenStreetMap • Cruce automático MEF, SEACE e Infobras
            </p>
          </div>
        </div>

        {/* Botones de filtro de estado unificados (Todas, Críticas, Observadas, En Plazo, En Inicio) */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-2 uppercase tracking-wider hidden xl:inline">
            Estado:
          </span>
          <button
            onClick={() => handleToggleAlerta('TODAS')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              !filters.nivel_alerta || filters.nivel_alerta === 'TODAS'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200 ring-1 ring-slate-400/20 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:ring-slate-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
            }`}
          >
            Todas ({zoneCounts.total || mapPoints.length})
          </button>
          <button
            onClick={() => handleToggleAlerta('CRITICO')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filters.nivel_alerta === 'CRITICO'
                ? 'bg-red-50 text-red-700 border border-red-300 shadow-sm ring-1 ring-red-400/30 dark:bg-red-950 dark:text-red-300 dark:border-red-800 dark:ring-red-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50/80 dark:hover:bg-red-950/30'
            }`}
            title="Filtrar obras con retrasos o fallas graves"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-xs shadow-red-500"></span>
            Críticas ({zoneCounts.criticos})
          </button>
          <button
            onClick={() => handleToggleAlerta('ALTO')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filters.nivel_alerta === 'ALTO'
                ? 'bg-orange-50 text-orange-700 border border-orange-300 shadow-sm ring-1 ring-orange-400/30 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 dark:ring-orange-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-50/80 dark:hover:bg-orange-950/30'
            }`}
            title="Filtrar obras observadas o con desfase"
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-xs shadow-orange-500"></span>
            Observadas ({zoneCounts.observadas})
          </button>
          <button
            onClick={() => handleToggleAlerta('NORMAL')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filters.nivel_alerta === 'NORMAL'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm ring-1 ring-emerald-400/30 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 dark:ring-emerald-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30'
            }`}
            title="Filtrar obras que van en plazo y cronograma"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500"></span>
            En Plazo ({zoneCounts.enPlazo})
          </button>
          <button
            onClick={() => handleToggleAlerta('SIN_DATOS')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filters.nivel_alerta === 'SIN_DATOS' || filters.nivel_alerta === 'EN_INICIO'
                ? 'bg-slate-200 text-slate-800 border border-slate-300 shadow-sm ring-1 ring-slate-400/40 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:ring-slate-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/40'
            }`}
            title="Filtrar inversiones en cartera / fase inicial sin ejecución física ni financiera iniciada"
          >
            <span className="w-2 h-2 rounded-full bg-slate-400 shadow-xs shadow-slate-400"></span>
            En Inicio ({zoneCounts.enInicio})
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. REJILLA PRINCIPAL DE 3 COLUMNAS                             */}
      {/* ============================================================== */}
      <div className="grid grid-cols-12 gap-4 items-start">

        {/* ------------------------------------------------------------ */}
        {/* COLUMNA IZQUIERDA: LISTA COMPLETA DE OBRAS EN LA ZONA        */}
        {/* (Eficiencia trasladada a la ficha según solicitud)          */}
        {/* ------------------------------------------------------------ */}
        <aside
          aria-label="Lista de obras en la zona"
          className="col-span-12 lg:col-span-3 flex flex-col min-h-0"
          style={isDesktop && centerColHeight ? { height: `${centerColHeight}px` } : undefined}
        >
          
          {/* Contenedor Unificado de Obras en la Zona: altura sincronizada milimétricamente con Desfase de Cronograma */}
          <div className="glass-panel p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex-1 flex flex-col shadow-lg overflow-hidden min-h-0">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                <span className="text-slate-800 dark:text-slate-200">Obras en la Zona ({filteredObras.length})</span>
              </span>
              {selectedSector !== 'TODOS' && (
                <button
                  onClick={() => setSelectedSector('TODOS')}
                  className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Ver todas</span>
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              )}
            </div>

            {filteredObras.length === 0 ? (
              <div className="p-5 text-center text-slate-500 dark:text-slate-400 text-xs flex-1 flex flex-col items-center justify-center min-h-0">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" aria-hidden="true" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">No hay obras registradas con este filtro</p>
                <p className="text-[11px] text-slate-500 mt-1">Prueba seleccionando "Todas las obras" o cambiando de distrito.</p>
                <button
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, nivel_alerta: 'TODAS' }));
                    setSelectedSector('TODOS');
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white text-xs font-semibold cursor-pointer"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 min-h-0">
                {filteredObras.map((p) => {
                  const isFocused = String(focusedCui) === String(p.cui);
                  const ev = p.evaluacion_riesgo || {};
                  const isCritical = ev.nivel_alerta === 'CRITICO';
                  const isAlert = ev.nivel_alerta === 'ALTO' || ev.nivel_alerta === 'MEDIO';
                  const isInicio = ev.nivel_alerta === 'SIN_DATOS' || ev.nivel_alerta === 'EN_INICIO' || ((!p.avance_fisico || p.avance_fisico === 0) && (!p.avance_financiero || p.avance_financiero === 0));
                  const cat = categorizeObra(p);
                  const alertaNivel = isCritical ? 'CRITICO' : isAlert ? 'ALTO' : isInicio ? 'SIN_DATOS' : 'NORMAL';
                  const selStyle = getSelectionStyle(alertaNivel);

                  return (
                    <article
                      key={p.cui}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleFocusProject(p.cui, p.latitud, p.longitud);
                        }
                      }}
                      aria-label={`Enfocar obra CUI ${p.cui}: ${p.nombre || ''}`}
                      onClick={() => handleFocusProject(p.cui, p.latitud, p.longitud)}
                      className={`p-3 rounded-xl cursor-pointer transition-all focus:outline-hidden focus:ring-2 focus:ring-cyan-500 ${
                        isFocused
                          ? `${selStyle.ring} ${selStyle.glow}`
                          : 'bg-white dark:bg-slate-900/70 border-2 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs dark:shadow-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                            CUI {p.cui}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getSectorStyle(cat).badge}`}>
                            {getSectorStyle(cat).label}
                          </span>
                          {isFocused && (
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold border ${selStyle.badge}`}>
                              ENFOCADA
                            </span>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 animate-pulse'
                              : isAlert
                              ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40'
                              : isInicio
                              ? 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40'
                              : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {isCritical ? 'CRÍTICO' : isAlert ? 'OBSERVADA' : isInicio ? 'EN INICIO' : 'EN PLAZO'}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 mt-1 leading-snug" title={p.nombre}>
                        {p.nombre}
                      </h4>

                      {/* Esquemático Blueprint Vectorial */}
                      <div className="my-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                        {renderSectorIcon(cat, isCritical)}
                        <div className="flex-1 text-right">
                          <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                            {formatMoney(p.costo_actualizado)}
                          </div>
                          <div className={`text-xs font-black ${isCritical ? 'text-rose-600 dark:text-rose-400' : isAlert ? 'text-orange-600 dark:text-orange-400' : isInicio ? 'text-slate-600 dark:text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isInicio ? 'Fase pre-ejecución' : p.diferencia_avance > 0 ? `+${p.diferencia_avance.toFixed(1)} pp brecha` : 'Sin desvío'}
                          </div>
                        </div>
                      </div>

                      {/* Doble Barra de Progreso */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-500 dark:text-slate-400">Físico: {p.avance_fisico?.toFixed(1) || 0}%</span>
                          <span className="text-rose-600 dark:text-rose-400">Financiero: {p.avance_financiero?.toFixed(1) || 0}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                          <div
                            className="absolute left-0 top-0 h-full bg-rose-500 rounded-full"
                            style={{ width: `${Math.min(100, p.avance_financiero || 0)}%` }}
                          ></div>
                          <div
                            className="absolute left-0 top-0 h-full bg-cyan-500 dark:bg-cyan-400 rounded-full"
                            style={{ width: `${Math.min(100, p.avance_fisico || 0)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Botón de inspección */}
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="text-[10px] truncate max-w-[130px]">
                          {p.distrito}, {p.provincia}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(p.cui);
                          }}
                          className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-semibold cursor-pointer hover:underline flex items-center gap-1"
                        >
                          <span>Auditar</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

        </aside>

        {/* ------------------------------------------------------------ */}
        {/* COLUMNA CENTRAL: MAPA CON FICHA LATERAL A LA DERECHA        */}
        {/* (Punto en el lado izquierdo y Ficha Táctica en la derecha)   */}
        {/* ------------------------------------------------------------ */}
        <div ref={centerColRef} className="col-span-12 lg:col-span-6 space-y-4">
          
          <div className="glass-panel rounded-2xl relative h-[560px] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
            
            {/* Mapa Leaflet utilizando OpenStreetMap Standard 100% libre sin zoomControl por defecto */}
            <div className="absolute inset-0 z-0">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                scrollWheelZoom={true}
                zoomControl={false}
                attributionControl={false}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> colaboradores'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />

                <MapCameraController
                  center={mapCenter}
                  zoom={mapZoom}
                  bounds={mapBounds}
                  triggerFly={flyTrigger}
                />

                {/* Marcadores de Obras sobre OpenStreetMap con Despliegue en Abanico (Spiderfy) */}
                <TacticalSpiderfyMarkers
                  points={filteredPoints}
                  focusedCui={focusedCui}
                  onSelectProject={handleFocusProject}
                  getMarkerColor={getMarkerColor}
                />
              </MapContainer>
            </div>

            {/* Columna Flotante Izquierda: Cabecera + Ficha Táctica */}
            <div className="absolute top-3 left-3.5 z-30 flex flex-col pointer-events-none max-h-[calc(100%-3rem)] w-80 sm:w-88 space-y-2">
              
              {/* Cabecera Flotante del Mapa: Título arriba y [Zona] + [Puntos] juntos debajo */}
              <div className="pointer-events-auto">
                <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight text-slate-900 dark:text-white drop-shadow-xs">
                  Mapa de Inspección en Terreno
                </h3>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-xs text-slate-700 bg-white/95 px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-sm dark:text-slate-300 dark:bg-slate-950/85 dark:border-slate-800 backdrop-blur-md">
                    Zona: <strong className="text-slate-900 dark:text-white">{locationLabel}</strong>
                  </span>
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/95 text-cyan-800 border border-slate-200 shadow-sm dark:bg-slate-900/90 dark:text-cyan-300 dark:border-slate-700 backdrop-blur-sm">
                    {filteredPoints.length} Puntos
                  </span>
                  {selectedSector !== 'TODOS' && (
                    <button
                      onClick={() => setSelectedSector('TODOS')}
                      className={`text-xs px-2 py-0.5 rounded-lg backdrop-blur-md flex items-center gap-1 transition-all cursor-pointer border ${getSectorStyle(selectedSector).badge}`}
                      title="Quitar filtro de sector"
                    >
                      <span>Sector: {getSectorStyle(selectedSector).label}</span>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Botón para volver a abrir la ficha si se cerró */}
                {!isCardOpen && activeObra && (
                  <button
                    onClick={() => setIsCardOpen(true)}
                    className="pointer-events-auto mt-1.5 px-3 py-1 rounded-xl bg-white/95 hover:bg-slate-100 text-cyan-800 border border-slate-200 shadow-lg dark:bg-slate-900/90 dark:hover:bg-slate-800 dark:text-cyan-300 dark:border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Ficha de CUI {activeObra.cui}</span>
                  </button>
                )}
              </div>

              {/* FICHA TÁCTICA FLOTANTE (Aprovecha el espacio superior liberado para evitar scroll y cortes) */}
              {activeObra && isCardOpen && (
                <div className={`pointer-events-auto glass-panel p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl flex-1 overflow-y-auto space-y-2 animate-in fade-in slide-in-from-left duration-200 border-2 ${
                activeObra.nivel_alerta === 'CRITICO'
                  ? 'border-rose-500 ring-2 ring-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                  : (activeObra.nivel_alerta === 'ALTO' || activeObra.nivel_alerta === 'MEDIO')
                  ? 'border-orange-400 ring-2 ring-orange-400/30 shadow-[0_0_20px_rgba(249,115,22,0.35)]'
                  : (activeObra.nivel_alerta === 'SIN_DATOS' || activeObra.nivel_alerta === 'EN_INICIO')
                  ? 'border-slate-400 ring-2 ring-slate-400/30 shadow-[0_0_20px_rgba(148,163,184,0.35)]'
                  : 'border-emerald-400 ring-2 ring-emerald-400/30 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
              }`}>
                {/* Encabezado con CUI, Categoría y Botón de Cerrar */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700/80">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-cyan-700 dark:text-cyan-300">
                      CUI {activeObra.cui}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${getSectorStyle(categorizeObra(activeObra)).badge}`}>
                      {getSectorStyle(categorizeObra(activeObra)).label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-bold uppercase"
                      style={{
                        backgroundColor: `${getMarkerColor(activeObra.nivel_alerta)}25`,
                        color: getMarkerColor(activeObra.nivel_alerta),
                        border: `1px solid ${getMarkerColor(activeObra.nivel_alerta)}60`
                      }}
                    >
                      {activeObra.nivel_alerta === 'CRITICO' ? 'PELIGRO CRÍTICO' : (activeObra.nivel_alerta === 'ALTO' || activeObra.nivel_alerta === 'MEDIO') ? 'OBSERVADA' : (activeObra.nivel_alerta === 'SIN_DATOS' || activeObra.nivel_alerta === 'EN_INICIO') ? 'EN INICIO' : 'EN PLAZO'}
                    </span>
                    <button
                      onClick={() => setIsCardOpen(false)}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                      title="Cerrar ficha táctica"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Selector de Obras Coincidentes en el mismo Predio */}
                {coincidentObras.length > 1 && (
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-inner">
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-cyan-700 dark:text-cyan-300 font-mono">
                        <MapPin className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        <span>{coincidentObras.length} Obras en esta ubicación</span>
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">Alternar</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {coincidentObras.map((co) => {
                        const isCoActive = String(co.cui) === String(activeObra.cui);
                        const coColor = getMarkerColor(co.nivel_alerta);
                        return (
                          <button
                            key={co.cui}
                            onClick={() => handleFocusProject(co.cui, co.lat, co.lng)}
                            className={`py-1 px-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isCoActive
                                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 ring-1 ring-white/50'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:border-slate-800'
                            }`}
                            title={co.nombre}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: coColor }}
                            />
                            <span>CUI {co.cui}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Título de la Obra */}
                <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white line-clamp-2 leading-snug">
                  {activeObra.nombre}
                </h4>

                {/* Entidad y Ubicación */}
                <div className="space-y-0.5">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    Entidad: <strong className="text-slate-800 dark:text-slate-200">{activeObra.entidad}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {activeObra.distrito}, {activeObra.provincia}
                  </div>
                </div>

                {/* Matriz de Desembolso vs Físico */}
                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 dark:bg-slate-950/90 rounded-xl border border-slate-200 dark:border-slate-800 font-mono">
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">DESEMBOLSADO</div>
                    <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                      {activeObra.avance_financiero?.toFixed(1) || '0.0'}%
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {formatMoney(activeObra.costo)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">AVANCE FÍSICO</div>
                    <div className="text-sm font-black text-cyan-600 dark:text-cyan-400">
                      {activeObra.avance_fisico?.toFixed(1) || '0.0'}%
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {activeObra.diferencia_avance > 0 ? `+${activeObra.diferencia_avance.toFixed(1)} pp brecha` : 'Al día'}
                    </div>
                  </div>
                </div>

                {/* Eficiencia de Inversión integrada en la Ficha del Proyecto */}
                <div className="p-2 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Eficiencia de Inversión
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-800 dark:text-white mt-0.5">
                      {(() => {
                        const isInicio = activeObra.nivel_alerta === 'SIN_DATOS' || activeObra.nivel_alerta === 'EN_INICIO' || ((!activeObra.avance_fisico || activeObra.avance_fisico === 0) && (!activeObra.avance_financiero || activeObra.avance_financiero === 0));
                        if (isInicio) {
                          return (
                            <>
                              <span>0.0%</span>
                              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                                En Inicio / Cartera
                              </span>
                            </>
                          );
                        }
                        const eff = Math.max(0, Math.min(100, 100 - (activeObra.diferencia_avance || 0)));
                        return (
                          <>
                            <span>{eff.toFixed(1)}%</span>
                            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                              {activeObra.diferencia_avance <= 5 ? 'Óptima' : activeObra.diferencia_avance <= 15 ? 'Aceptable' : 'Con desvío'}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="w-16 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (activeObra.nivel_alerta === 'SIN_DATOS' || activeObra.nivel_alerta === 'EN_INICIO' || ((!activeObra.avance_fisico || activeObra.avance_fisico === 0) && (!activeObra.avance_financiero || activeObra.avance_financiero === 0)))
                          ? 'bg-slate-400'
                          : activeObra.diferencia_avance > 15
                          ? 'bg-rose-500'
                          : activeObra.diferencia_avance > 5
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{
                        width: (activeObra.nivel_alerta === 'SIN_DATOS' || activeObra.nivel_alerta === 'EN_INICIO' || ((!activeObra.avance_fisico || activeObra.avance_fisico === 0) && (!activeObra.avance_financiero || activeObra.avance_financiero === 0)))
                          ? '0%'
                          : `${Math.max(5, Math.min(100, 100 - (activeObra.diferencia_avance || 0)))}%`
                      }}
                    />
                  </div>
                </div>

                {/* Diagnóstico / Alerta */}
                <div className="text-[11px] leading-snug text-slate-700 bg-amber-50/90 border border-amber-200/80 dark:text-slate-300 dark:bg-slate-900/80 dark:border-slate-800/80 p-2 rounded-lg">
                  <span className="font-semibold text-amber-800 dark:text-amber-400">Diagnóstico: </span>
                  <span>{activeObra.alerta_desc}</span>
                </div>

                {/* Botón de Auditoría al pie */}
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => onSelectProject(activeObra.cui)}
                    className="w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/40 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Auditar Expediente Completo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            </div>

            {/* Botones de Control de Zoom Tácticos (+, ⌖, -) en la esquina inferior derecha del mapa */}
            <div className="absolute bottom-12 right-4 z-20 glass-panel p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-xl">
              <button
                onClick={() => setMapZoom((z) => Math.min(18, z + 1))}
                aria-label="Acercar mapa"
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-sm cursor-pointer"
                title="Acercar mapa"
              >
                +
              </button>
              <button
                onClick={() => {
                  if (filteredPoints.length > 0) {
                    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
                    filteredPoints.forEach((p) => {
                      if (p.lat && p.lng) {
                        if (p.lat < minLat) minLat = p.lat;
                        if (p.lat > maxLat) maxLat = p.lat;
                        if (p.lng < minLng) minLng = p.lng;
                        if (p.lng > maxLng) maxLng = p.lng;
                      }
                    });

                    if (maxLat - minLat > 0.002 || maxLng - minLng > 0.002) {
                      setMapBounds([[minLat, minLng], [maxLat, maxLng]]);
                    } else {
                      setMapBounds(null);
                      setMapCenter([minLat !== 90 ? minLat : -13.5319, minLng !== 180 ? minLng : -71.9675]);
                      setMapZoom(filters.distrito ? 13 : filters.provincia ? 11 : 10);
                    }
                    setFlyTrigger((prev) => prev + 1);
                  }
                }}
                aria-label="Centrar y encuadrar obras visibles"
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs cursor-pointer"
                title="Centrar y encuadrar obras visibles"
              >
                ⌖
              </button>
              <button
                onClick={() => setMapZoom((z) => Math.max(5, z - 1))}
                aria-label="Alejar mapa"
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-sm cursor-pointer"
                title="Alejar mapa"
              >
                -
              </button>
            </div>

            {/* Barra de Leyenda Inferior del Mapa (Anclada en la parte inferior del recuadro) */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-4 py-2 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-700 dark:text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs shadow-red-500"></span>
                  Crítico
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs shadow-orange-500"></span>
                  Observadas
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500"></span>
                  En Plazo
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-xs shadow-slate-400"></span>
                  En Inicio
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-500 hidden sm:inline">
                OpenStreetMap Oficial • Haz clic en un punto para inspeccionarlo
              </span>
            </div>
          </div>

          {/* Matriz de Desfase de Cronograma por Provincia */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Desfase de Cronograma en {filters.provincia || filters.departamento || 'la Región'}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Variación de avance de las obras según reporte oficial MEF Formato 12-B
                </p>
              </div>
              <span className="text-xs text-cyan-700 dark:text-cyan-400 font-mono bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                {filteredPoints.length} Puntos Activos
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center font-mono">
              <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Vigilado</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{filteredPoints.length} Obras</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">En Cronograma</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{statusCounts.enPlazo}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Con Observación</div>
                <div className="text-sm font-bold text-orange-600 dark:text-orange-400 mt-0.5">{statusCounts.enRiesgo}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Presupuesto</div>
                <div className="text-sm font-bold text-cyan-700 dark:text-cyan-300 mt-0.5">{formatMoney(zonaPresupuestoTotal)}</div>
              </div>
            </div>
          </div>

        </div>

        {/* ------------------------------------------------------------ */}
        {/* COLUMNA DERECHA: SECTORES, ESTADOS, VOLUMEN Y ALERTAS REALES */}
        {/* (Contadores movidos a la derecha según petición del usuario) */}
        {/* ------------------------------------------------------------ */}
        <aside
          aria-label="Sectores y alertas de contraloría"
          className="col-span-12 lg:col-span-3 flex flex-col min-h-0 space-y-4"
          style={isDesktop && centerColHeight ? { height: `${centerColHeight}px` } : undefined}
        >
          
          {/* 1. Chips de Sectores en una sola fila compacta (Un solo bloque horizontal) */}
          <div className="glass-panel p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Sectores en {filters.distrito || filters.provincia || 'la Zona'}
              </span>
              {selectedSector !== 'TODOS' ? (
                <button
                  onClick={() => setSelectedSector('TODOS')}
                  className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Ver todos</span>
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Filtro rápido</span>
              )}
            </div>

            <div role="group" aria-label="Filtro rápido por sector" className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'VIAL', ...getSectorStyle('VIAL'), count: sectorCounts.VIAL },
                { id: 'SALUD', ...getSectorStyle('SALUD'), count: sectorCounts.SALUD },
                { id: 'AGUA', ...getSectorStyle('AGUA'), count: sectorCounts.AGUA },
                { id: 'EDUCACION', ...getSectorStyle('EDUCACION'), count: sectorCounts.EDUCACION },
                { id: 'OTROS', ...getSectorStyle('OTROS'), count: sectorCounts.OTROS },
              ].map((sec) => {
                const isSelected = selectedSector === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setSelectedSector(isSelected ? 'TODOS' : sec.id)}
                    aria-pressed={isSelected}
                    className={`p-1.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                      isSelected
                        ? sec.activeStyle
                        : `${sec.color} hover:border-slate-400 dark:hover:border-slate-600`
                    }`}
                    title={`Filtrar sector ${sec.label}`}
                  >
                    <div className="text-[10px] font-medium truncate opacity-90">{sec.label}</div>
                    <div className="text-sm font-black mt-0.5">{sec.count}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Inversión Pública Vigilada en la Zona */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Inversión Monitoreada en la Zona
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 font-mono">
              {formatMoney(zonaPresupuestoTotal)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span>{filteredPoints.length} contratos auditados</span>
              <span className="font-mono text-[10px] bg-slate-100 text-cyan-800 border border-slate-200 dark:bg-slate-900 dark:text-cyan-400 dark:border-slate-800 px-1.5 py-0.5 rounded">
                MEF SIAF
              </span>
            </div>
          </div>

          {/* 4. Feed de Alertas Reales de Contraloría para la Zona Filtrada */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex-1 flex flex-col shadow-lg overflow-hidden min-h-0">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Alertas de Contraloría
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
                {localAlerts.length} Detectadas
              </span>
            </div>

            {localAlerts.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-xs flex-1 flex flex-col items-center justify-center min-h-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400 mx-auto mb-1.5" />
                <div className="font-bold text-slate-800 dark:text-slate-200">Sin alertas graves en esta zona</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Las obras registradas en {locationLabel} no presentan desvíos presupuestales ni atrasos críticos según los reportes del MEF.
                </p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto p-1 pr-1.5 min-h-0">
                {localAlerts.map((alt) => {
                  const isFocused = String(focusedCui) === String(alt.cui);
                  const ev = alt.evaluacion_riesgo || {};
                  const isCrit = ev.nivel_alerta === 'CRITICO';
                  const altNivel = isCrit ? 'CRITICO' : (alt.diferencia_avance > 15 || ev.nivel_alerta === 'ALTO') ? 'ALTO' : 'MEDIO';
                  const selStyle = getSelectionStyle(altNivel);

                  return (
                    <article
                      key={alt.cui}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleFocusProject(alt.cui, alt.latitud, alt.longitud);
                        }
                      }}
                      aria-label={`Enfocar alerta de obra CUI ${alt.cui}: ${alt.nombre || ''}`}
                      onClick={() => handleFocusProject(alt.cui, alt.latitud, alt.longitud)}
                      className={`p-3 rounded-xl cursor-pointer transition-all focus:outline-hidden focus:ring-2 focus:ring-orange-500 ${
                        isFocused
                          ? `${selStyle.ring} ${selStyle.glow}`
                          : isCrit
                          ? 'bg-white dark:bg-slate-950/80 border-2 border-red-200 hover:border-red-400 dark:border-red-900/60 dark:hover:border-red-700 shadow-xs'
                          : 'bg-white dark:bg-slate-950/80 border-2 border-orange-200 hover:border-orange-400 dark:border-orange-900/60 dark:hover:border-orange-700 shadow-xs'
                      }`}
                      title="Haz clic para centrar en el mapa y abrir su ficha"
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                            isCrit
                              ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40'
                              : 'bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/40'
                          }`}
                          aria-hidden="true"
                        >
                          !
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                              <span>CUI {alt.cui}</span>
                              {isFocused && (
                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold border ${selStyle.badge}`}>
                                  ENFOCADA
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-bold">
                              {alt.diferencia_avance > 0 ? `+${alt.diferencia_avance.toFixed(1)} pp` : 'Plazo Vencido'}
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 mt-0.5 leading-snug">
                            {alt.nombre}
                          </div>

                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                            Entidad: <strong className="text-slate-700 dark:text-slate-300">{alt.entidad}</strong>
                          </div>

                          <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 flex justify-between font-mono bg-slate-50 dark:bg-slate-900/90 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span>Físico: {alt.avance_fisico?.toFixed(1) || 0}%</span>
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">Financiero: {alt.avance_financiero?.toFixed(1) || 0}%</span>
                          </div>

                          {/* Píldora de Recomendación Cívica */}
                          <div className="mt-2 p-1.5 rounded-lg bg-orange-50/80 border border-orange-200 text-orange-900 dark:bg-orange-950/40 dark:border-orange-800/50 dark:text-orange-300 flex items-center gap-1.5 text-[11px]">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-orange-600 dark:text-orange-400" aria-hidden="true" />
                            <span>
                              {alt.diferencia_avance > 20
                                ? 'Recomendación: Exigir peritaje de campo y congelar adicionales.'
                                : 'Recomendación: Fiscalizar cuaderno de obra digital en Infobras.'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

        </aside>

      </div>
    </div>
  );
}
