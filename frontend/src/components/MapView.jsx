import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { AlertTriangle, ArrowUpRight, MapPin, DollarSign } from 'lucide-react';
import { getMapPoints } from '../services/api';

const formatMoney = (val) => {
  if (!val && val !== 0) return 'S/ 0.00';
  if (val >= 1_000_000) return `S/ ${(val / 1_000_000).toFixed(2)} M`;
  return `S/ ${val.toLocaleString('es-PE')}`;
};

// Componente para reenfocar el mapa automáticamente cuando cambian los puntos
function MapController({ points, center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 9, { duration: 1.2 });
    } else if (points && points.length > 0) {
      const first = points[0];
      map.flyTo([first.lat, first.lng], 9, { duration: 1.2 });
    }
  }, [points, center, map]);
  return null;
}

export default function MapView({ filters, onSelectProject }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMapPoints({
      departamento: filters.departamento || undefined,
      provincia: filters.provincia || undefined,
      distrito: filters.distrito || undefined,
      nivel_alerta: filters.nivel_alerta !== 'TODAS' ? filters.nivel_alerta : undefined,
      limit: 1000
    })
      .then((data) => {
        setPoints(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando puntos de mapa:', err);
        setLoading(false);
      });
  }, [filters]);

  // Coordenadas iniciales (Cusco por defecto: -13.5319, -71.9675)
  const defaultCenter = [-13.5319, -71.9675];

  const getColor = (alerta) => {
    switch (alerta) {
      case 'CRITICO':
        return '#ef4444'; // red-500
      case 'ALTO':
        return '#f97316'; // orange-500
      case 'MEDIO':
        return '#eab308'; // yellow-500
      case 'NORMAL':
        return '#10b981'; // emerald-500
      default:
        return '#64748b'; // slate-500
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl mb-8 relative">
      
      {/* Barra de cabecera del mapa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" />
            <span>Mapa Georreferenciado de Inversiones</span>
          </h3>
          <p className="text-xs text-slate-400">
            {loading ? 'Cargando coordenadas...' : `Visualizando ${points.length} obras georreferenciadas`}
          </p>
        </div>

        {/* Leyenda de Colores */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-500/20"></span>
            <span className="text-slate-300">Crítico</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 ring-2 ring-orange-500/20"></span>
            <span className="text-slate-300">Alto</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-500 ring-2 ring-yellow-500/20"></span>
            <span className="text-slate-300">Medio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></span>
            <span className="text-slate-300">Normal</span>
          </div>
        </div>
      </div>

      {/* Contenedor Leaflet */}
      <div className="h-[520px] w-full rounded-xl overflow-hidden border border-slate-800 relative">
        <MapContainer
          center={defaultCenter}
          zoom={9}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          <MapController points={points} center={points.length > 0 ? [points[0].lat, points[0].lng] : null} />

          {points.map((p) => {
            const color = getColor(p.nivel_alerta);
            return (
              <CircleMarker
                key={p.cui}
                center={[p.lat, p.lng]}
                radius={p.nivel_alerta === 'CRITICO' ? 8 : 6}
                pathOptions={{
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.8,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="p-1 max-w-xs text-slate-100">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-red-400">CUI {p.cui}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                        style={{
                          backgroundColor: `${color}20`,
                          color: color,
                          border: `1px solid ${color}60`
                        }}
                      >
                        {p.nivel_alerta}
                      </span>
                    </div>

                    <h4 className="font-semibold text-xs text-white line-clamp-2 mb-2">
                      {p.nombre}
                    </h4>

                    <div className="text-[11px] text-slate-300 space-y-1 mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Presupuesto:</span>
                        <span className="font-bold text-white">{formatMoney(p.costo)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Físico vs Financiero:</span>
                        <span className="font-medium text-emerald-400">
                          {p.avance_fisico}% <span className="text-slate-400">/</span> <span className="text-blue-400">{p.avance_financiero}%</span>
                        </span>
                      </div>
                      {p.diferencia_avance > 0 && (
                        <div className="flex justify-between text-red-400 font-semibold">
                          <span>Desfase:</span>
                          <span>+{p.diferencia_avance} pp</span>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-700">
                        {p.dpto} · {p.prov} · {p.dist}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectProject(p.cui)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-colors"
                    >
                      <span>Ver Ficha & Contratos</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

    </div>
  );
}
