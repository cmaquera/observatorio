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
    if (setGeoStatus) {
      const parts = [filters.departamento];
      if (filters.provincia) parts.push(filters.provincia);
      if (val) parts.push(val);
      setGeoStatus({
        loading: false,
        source: 'manual',
        label: parts.join(' / '),
        detail: 'Preferencia guardada en tu navegador'
      });
    }
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
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-sm dark:shadow-xl mb-4 transition-colors">
      {/* Barra Unificada de Selectores de Zona en un solo bloque */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        
        {/* Etiqueta de Zona */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <MapPin className="w-4 h-4 text-red-500 shrink-0" />
            <span>Zona:</span>
          </div>

          {/* Acciones en Móvil */}
          <div className="flex items-center gap-1.5 lg:hidden">
            {onGpsDetect && (
              <button
                onClick={onGpsDetect}
                disabled={gpsLoading}
                title="Detectar ubicación por GPS"
                className="flex items-center gap-1 text-[11px] text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/70 py-1 px-2 rounded-lg font-medium cursor-pointer"
              >
                {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Compass className="w-3 h-3 text-sky-500" />}
                <span>GPS</span>
              </button>
            )}
            <button
              onClick={handleReset}
              title="Ver todas las obras"
              className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1 px-2 rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Todas</span>
            </button>
          </div>
        </div>

        {/* Selectores de Zona (Departamento, Provincia, Distrito) en fila compacta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
          {/* 1. DEPARTAMENTO */}
          <div>
            <select
              value={filters.departamento || ''}
              onChange={handleDptoChange}
              className={`w-full bg-slate-50 dark:bg-slate-800/90 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all cursor-pointer font-medium ${
                filters.departamento
                  ? 'border border-cyan-500/70 ring-1 ring-cyan-500/30'
                  : 'border border-slate-200 dark:border-slate-700'
              }`}
            >
              <option value="">Todo el Perú</option>
              {departamentos.map((d) => (
                <option key={d.departamento} value={d.departamento}>
                  {d.departamento} ({d.obras_count} obras)
                </option>
              ))}
            </select>
          </div>

          {/* 2. PROVINCIA */}
          <div>
            <select
              value={filters.provincia || ''}
              onChange={handleProvChange}
              disabled={!filters.departamento || provincias.length === 0}
              className={`w-full bg-slate-50 dark:bg-slate-800/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all cursor-pointer font-medium ${
                filters.provincia
                  ? 'border border-cyan-500/70 ring-1 ring-cyan-500/30'
                  : 'border border-slate-200 dark:border-slate-700'
              }`}
            >
              <option value="">Todas las provincias {loadingProvs ? '...' : ''}</option>
              {provincias.map((p) => (
                <option key={p.provincia} value={p.provincia}>
                  {p.provincia} ({p.obras_count} obras)
                </option>
              ))}
            </select>
          </div>

          {/* 3. DISTRITO */}
          <div>
            <select
              value={filters.distrito || ''}
              onChange={handleDistChange}
              disabled={!filters.provincia || distritos.length === 0}
              className={`w-full bg-slate-50 dark:bg-slate-800/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all cursor-pointer font-medium ${
                filters.distrito
                  ? 'border border-cyan-500/70 ring-1 ring-cyan-500/30'
                  : 'border border-slate-200 dark:border-slate-700'
              }`}
            >
              <option value="">Todos los distritos {loadingDists ? '...' : ''}</option>
              {distritos.map((d) => (
                <option key={d.distrito} value={d.distrito}>
                  {d.distrito} ({d.obras_count} obras)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Acciones en Desktop */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          {onGpsDetect && (
            <button
              onClick={onGpsDetect}
              disabled={gpsLoading}
              title="Obtener tu ubicación exacta por GPS"
              className="flex items-center gap-1 text-[11px] text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-white bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/70 border border-sky-200 dark:border-sky-800/70 transition-all py-1.5 px-2.5 rounded-lg font-medium cursor-pointer disabled:opacity-50"
            >
              {gpsLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-sky-600 dark:text-sky-400" />
              ) : (
                <Compass className="w-3 h-3 text-sky-600 dark:text-sky-400" />
              )}
              <span>{gpsLoading ? 'GPS...' : '📍 GPS'}</span>
            </button>
          )}

          <button
            onClick={handleReset}
            title="Restablecer filtros a la región piloto activa"
            className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 cursor-pointer font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Ver todas</span>
          </button>
        </div>

      </div>

      {/* Confirmación ÚNICAMENTE cuando el usuario activa GPS voluntariamente */}
      {geoStatus && geoStatus.source === 'gps' && geoStatus.detail && (
        <div className="flex items-center justify-between text-xs px-2.5 py-1 rounded-lg mt-2 border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 transition-all">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>{geoStatus.detail}</span>
          </div>
          {geoStatus.label && (
            <span className="font-semibold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-slate-900/60 text-emerald-900 dark:text-white text-[10px]">
              {geoStatus.label}
            </span>
          )}
        </div>
      )}

      {/* Alerta si falla GPS */}
      {gpsError && (
        <div className="text-xs px-2.5 py-1 rounded-lg mt-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
          ⚠️ {gpsError}
        </div>
      )}
    </div>
  );
}

