import React, { useEffect, useState } from 'react';
import { MapPin, RotateCcw, AlertTriangle, Compass, Globe, Navigation, BookmarkCheck, Loader2 } from 'lucide-react';
import { getDepartamentos, getProvincias, getDistritos } from '../services/api';
import { saveGeoPreference } from '../services/geoDetector';

export default function GeoFilterBar({
  filters,
  setFilters,
  geoStatus,
  setGeoStatus,
  onGpsDetect,
  gpsLoading,
  gpsError
}) {
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [loadingProvs, setLoadingProvs] = useState(false);
  const [loadingDists, setLoadingDists] = useState(false);

  // Cargar departamentos al montar
  useEffect(() => {
    getDepartamentos()
      .then((data) => setDepartamentos(data))
      .catch((err) => console.error('Error cargando departamentos:', err));
  }, []);

  // Cargar provincias cuando cambia departamento
  useEffect(() => {
    if (filters.departamento) {
      setLoadingProvs(true);
      getProvincias(filters.departamento)
        .then((data) => {
          setProvincias(data);
          setLoadingProvs(false);
        })
        .catch(() => setLoadingProvs(false));
    } else {
      setProvincias([]);
      setDistritos([]);
    }
  }, [filters.departamento]);

  // Cargar distritos cuando cambia provincia
  useEffect(() => {
    if (filters.departamento && filters.provincia) {
      setLoadingDists(true);
      getDistritos(filters.departamento, filters.provincia)
        .then((data) => {
          setDistritos(data);
          setLoadingDists(false);
        })
        .catch(() => setLoadingDists(false));
    } else {
      setDistritos([]);
    }
  }, [filters.departamento, filters.provincia]);

  const handleDptoChange = (e) => {
    const val = e.target.value;
    setFilters((prev) => ({
      ...prev,
      departamento: val,
      provincia: '',
      distrito: ''
    }));
    saveGeoPreference({ departamento: val, provincia: '', distrito: '' });
    if (setGeoStatus) {
      setGeoStatus({
        loading: false,
        source: 'manual',
        label: val || 'Todo el Perú',
        detail: 'Preferencia guardada en tu navegador'
      });
    }
  };

  const handleProvChange = (e) => {
    const val = e.target.value;
    setFilters((prev) => ({
      ...prev,
      provincia: val,
      distrito: ''
    }));
    saveGeoPreference({ departamento: filters.departamento, provincia: val, distrito: '' });
    if (setGeoStatus) {
      setGeoStatus({
        loading: false,
        source: 'manual',
        label: `${filters.departamento}${val ? ` / ${val}` : ''}`,
        detail: 'Preferencia guardada en tu navegador'
      });
    }
  };

  const handleDistChange = (e) => {
    const val = e.target.value;
    setFilters((prev) => ({
      ...prev,
      distrito: val
    }));
    saveGeoPreference({ departamento: filters.departamento, provincia: filters.provincia, distrito: val });
  };

  const handleAlertaChange = (e) => {
    const val = e.target.value;
    setFilters((prev) => ({
      ...prev,
      nivel_alerta: val
    }));
  };

  const handleReset = () => {
    setFilters({
      departamento: 'CUSCO', // Región piloto por defecto
      provincia: '',
      distrito: '',
      nivel_alerta: 'TODAS',
      sector: '',
      q: ''
    });
    saveGeoPreference({ departamento: 'CUSCO', provincia: '', distrito: '' });
    if (setGeoStatus) {
      setGeoStatus({
        loading: false,
        source: 'default',
        label: 'CUSCO',
        detail: 'Restablecido a región piloto activa (Cusco)'
      });
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <MapPin className="w-4 h-4 text-red-500" />
            <span>Ubica las obras de tu barrio, distrito o provincia</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Filtra para saber exactamente cómo van los proyectos financiados con dinero público cerca de ti.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón de Geoubicación GPS */}
          {onGpsDetect && (
            <button
              onClick={onGpsDetect}
              disabled={gpsLoading}
              title="Obtener tu departamento y provincia exacta mediante GPS del dispositivo (requiere permiso de ubicación)"
              className="flex items-center gap-1.5 text-xs text-sky-300 hover:text-white bg-sky-950/50 hover:bg-sky-900/70 border border-sky-800/70 transition-all py-1.5 px-3 rounded-lg font-medium cursor-pointer disabled:opacity-50"
            >
              {gpsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              ) : (
                <Compass className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{gpsLoading ? 'Obteniendo GPS...' : '📍 Mi ubicación exacta (GPS)'}</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-800 border border-slate-700/60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ver todas las obras</span>
          </button>
        </div>
      </div>

      {/* Barra Informativa de Estado de Geolocalización */}
      {geoStatus && geoStatus.detail && (
        <div
          className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-xl mb-3 border transition-all ${
            geoStatus.source === 'gps'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : geoStatus.source === 'ip'
              ? 'bg-blue-950/40 text-blue-300 border-blue-800/60'
              : geoStatus.source === 'ip_unmatched'
              ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
              : geoStatus.source === 'saved'
              ? 'bg-purple-950/40 text-purple-300 border-purple-800/60'
              : 'bg-slate-800/40 text-slate-300 border-slate-700/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {geoStatus.source === 'gps' && <Navigation className="w-3.5 h-3.5 text-emerald-400" />}
            {geoStatus.source === 'ip' && <Globe className="w-3.5 h-3.5 text-blue-400" />}
            {geoStatus.source === 'ip_unmatched' && <Globe className="w-3.5 h-3.5 text-amber-400" />}
            {geoStatus.source === 'saved' && <BookmarkCheck className="w-3.5 h-3.5 text-purple-400" />}
            {geoStatus.source === 'manual' && <MapPin className="w-3.5 h-3.5 text-slate-400" />}
            <span>{geoStatus.detail}</span>
          </div>
          {geoStatus.label && (
            <span className="font-semibold px-2 py-0.5 rounded bg-slate-900/60 text-white text-[11px] border border-white/10 hidden sm:inline">
              {geoStatus.label}
            </span>
          )}
        </div>
      )}

      {/* Alerta si falla GPS */}
      {gpsError && (
        <div className="text-xs px-3 py-1.5 rounded-xl mb-3 bg-red-950/40 text-red-300 border border-red-800/60">
          ⚠️ {gpsError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. DEPARTAMENTO */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            1. Departamento / Región
          </label>
          <select
            value={filters.departamento || ''}
            onChange={handleDptoChange}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all cursor-pointer"
          >
            <option value="">Todo el Perú</option>
            {departamentos.map((d) => (
              <option key={d.departamento} value={d.departamento}>
                {d.departamento} ({d.obras_count} obras registradas)
              </option>
            ))}
          </select>
        </div>

        {/* 2. PROVINCIA */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            2. Provincia {loadingProvs && <span className="text-red-400 font-normal">(buscando...)</span>}
          </label>
          <select
            value={filters.provincia || ''}
            onChange={handleProvChange}
            disabled={!filters.departamento || provincias.length === 0}
            className="w-full bg-slate-800/90 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all cursor-pointer"
          >
            <option value="">Todas las provincias</option>
            {provincias.map((p) => (
              <option key={p.provincia} value={p.provincia}>
                {p.provincia} ({p.obras_count} obras)
              </option>
            ))}
          </select>
        </div>

        {/* 3. DISTRITO */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            3. Distrito {loadingDists && <span className="text-red-400 font-normal">(buscando...)</span>}
          </label>
          <select
            value={filters.distrito || ''}
            onChange={handleDistChange}
            disabled={!filters.provincia || distritos.length === 0}
            className="w-full bg-slate-800/90 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all cursor-pointer"
          >
            <option value="">Todos los distritos</option>
            {distritos.map((d) => (
              <option key={d.distrito} value={d.distrito}>
                {d.distrito} ({d.obras_count} obras)
              </option>
            ))}
          </select>
        </div>

        {/* 4. ¿CÓMO VA LA OBRA? (ESTADO SEMÁFORO) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>4. ¿Cómo va la obra? (Semáforo)</span>
          </label>
          <select
            value={filters.nivel_alerta || 'TODAS'}
            onChange={handleAlertaChange}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all cursor-pointer"
          >
            <option value="TODAS">Ver todas las obras</option>
            <option value="CRITICO">🔴 Obras en peligro (muy atrasadas o con pagos excesivos)</option>
            <option value="ALTO">🟠 Obras con retrasos o pagos adelantados</option>
            <option value="MEDIO">🟡 Obras con observaciones leves</option>
            <option value="NORMAL">🟢 Obras que van bien y a tiempo</option>
          </select>
        </div>
      </div>
    </div>
  );
}
