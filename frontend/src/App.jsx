import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GeoFilterBar from './components/GeoFilterBar';
import MetricCards from './components/MetricCards';
import CriticalProjects from './components/CriticalProjects';
import MapView from './components/MapView';
import AllObrasTable from './components/AllObrasTable';
import ContratistasTable from './components/ContratistasTable';
import SectorDistribution from './components/SectorDistribution';
import FichaObraModal from './components/FichaObraModal';
import DocumentStrategyModal from './components/DocumentStrategyModal';
import { getKpis, getCriticos, getExportCsvUrl, getDepartamentos, getProvincias } from './services/api';
import {
  detectLocationByIp,
  detectLocationByGps,
  getSavedGeoPreference,
  saveGeoPreference,
  normalizeText
} from './services/geoDetector';
import { ShieldCheck, Info, Database, FileSearch } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'mapa' | 'obras' | 'empresas'
  const [selectedCui, setSelectedCui] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStrategyModal, setShowStrategyModal] = useState(false);

  // Filtros globales
  const [filters, setFilters] = useState({
    departamento: 'CUSCO', // Región piloto por defecto
    provincia: '',
    distrito: '',
    nivel_alerta: 'TODAS',
    sector: '',
    q: ''
  });

  // Estado del motor de geolocalización (IP / GPS / Guardado)
  const [geoStatus, setGeoStatus] = useState({
    loading: true,
    source: null, // 'saved' | 'ip' | 'ip_unmatched' | 'gps' | 'manual'
    label: '',
    detail: '',
    detectedIp: null
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Detección inicial de ubicación geográfica (LocalStorage -> IP)
  useEffect(() => {
    let isMounted = true;

    async function initGeolocation() {
      // 1. Revisar si el usuario ya tiene una preferencia guardada en localStorage
      const saved = getSavedGeoPreference();
      if (saved && saved.departamento) {
        if (isMounted) {
          setFilters((prev) => ({
            ...prev,
            departamento: saved.departamento,
            provincia: saved.provincia || '',
            distrito: saved.distrito || ''
          }));
          setGeoStatus({
            loading: false,
            source: 'saved',
            label: `${saved.departamento}${saved.provincia ? ` / ${saved.provincia}` : ''}`,
            detail: 'Ubicación recordada de tu última visita',
            detectedIp: null
          });
        }
        return;
      }

      // 2. Consultar departamentos con datos en la base de datos
      let dbDepts = [];
      try {
        dbDepts = await getDepartamentos();
      } catch (err) {
        console.warn('No se pudo precargar la lista de departamentos:', err);
      }

      // 3. Detectar ubicación pública por IP
      const ipResult = await detectLocationByIp();
      if (!isMounted) return;

      if (ipResult) {
        const detectedDept = ipResult.departamento;
        const availableNames = (dbDepts || []).map((d) => d.departamento);
        const hasDbData = detectedDept && availableNames.includes(detectedDept);

        if (hasDbData) {
          // El departamento detectado existe en la BD actual
          let matchedProv = '';
          try {
            const provs = await getProvincias(detectedDept);
            const normCity = normalizeText(ipResult.city);
            const found = provs.find((p) => {
              const normP = normalizeText(p.provincia);
              return normCity && (normCity === normP || normCity.includes(normP) || normP.includes(normCity));
            });
            if (found) {
              matchedProv = found.provincia;
            }
          } catch (e) {
            // error menor obteniendo provincias
          }

          setFilters((prev) => ({
            ...prev,
            departamento: detectedDept,
            provincia: matchedProv,
            distrito: ''
          }));

          setGeoStatus({
            loading: false,
            source: 'ip',
            label: `${detectedDept}${matchedProv ? ` / ${matchedProv}` : ''}`,
            detail: `Detectado por tu IP (${ipResult.ip}) - ${ipResult.isp || 'Conexión local'}`,
            detectedIp: ipResult.ip
          });
        } else {
          // El departamento detectado no está en la BD (ej. usuario en Lima y la BD tiene solo Cusco)
          const regionName = detectedDept || ipResult.regionRaw || ipResult.city || 'otra región';
          setGeoStatus({
            loading: false,
            source: 'ip_unmatched',
            label: `${regionName}`,
            detail: `Tu IP (${ipResult.ip}) fue detectada en ${regionName}. Mostrando piloto con obras activas: CUSCO.`,
            detectedIp: ipResult.ip
          });
        }
      } else {
        setGeoStatus({
          loading: false,
          source: 'default',
          label: 'CUSCO',
          detail: 'Región piloto predeterminada',
          detectedIp: null
        });
      }
    }

    initGeolocation();

    return () => {
      isMounted = false;
    };
  }, []);

  // Manejador para detección de GPS de alta precisión
  const handleGpsDetect = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const gpsResult = await detectLocationByGps();
      // Consultar si el departamento existe en la base de datos
      let dbDepts = [];
      try {
        dbDepts = await getDepartamentos();
      } catch (e) {}

      const availableNames = (dbDepts || []).map((d) => d.departamento);
      const isDeptInDb = availableNames.includes(gpsResult.departamento);

      if (isDeptInDb) {
        setFilters((prev) => ({
          ...prev,
          departamento: gpsResult.departamento,
          provincia: gpsResult.provincia || '',
          distrito: ''
        }));
        saveGeoPreference({
          departamento: gpsResult.departamento,
          provincia: gpsResult.provincia || '',
          distrito: ''
        });
        setGeoStatus({
          loading: false,
          source: 'gps',
          label: `${gpsResult.departamento}${gpsResult.provincia ? ` / ${gpsResult.provincia}` : ''}`,
          detail: `GPS exacto (±${Math.round(gpsResult.accuracyMeters)}m)`,
          detectedIp: null
        });
      } else {
        setGeoStatus({
          loading: false,
          source: 'gps_unmatched',
          label: gpsResult.departamento,
          detail: `GPS detectó ${gpsResult.departamento}. Actualmente el observatorio tiene datos cargados de Cusco.`,
          detectedIp: null
        });
      }
    } catch (err) {
      setGpsError(err.message);
    } finally {
      setGpsLoading(false);
    }
  };

  const [kpis, setKpis] = useState(null);
  const [criticalProjects, setCriticalProjects] = useState([]);
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [loadingCriticos, setLoadingCriticos] = useState(false);

  // Cargar KPIs y Críticos al cambiar filtros
  useEffect(() => {
    setLoadingKpis(true);
    getKpis({
      departamento: filters.departamento || undefined,
      provincia: filters.provincia || undefined,
      distrito: filters.distrito || undefined,
    })
      .then((data) => {
        setKpis(data);
        setLoadingKpis(false);
      })
      .catch((err) => {
        console.error('Error cargando KPIs:', err);
        setLoadingKpis(false);
      });

    setLoadingCriticos(true);
    getCriticos({
      departamento: filters.departamento || undefined,
      provincia: filters.provincia || undefined,
      distrito: filters.distrito || undefined,
      limit: 10
    })
      .then((data) => {
        setCriticalProjects(data);
        setLoadingCriticos(false);
      })
      .catch((err) => {
        console.error('Error cargando críticos:', err);
        setLoadingCriticos(false);
      });
  }, [filters.departamento, filters.provincia, filters.distrito]);

  // Manejador del buscador del Navbar
  const handleNavbarSearch = () => {
    setFilters((prev) => ({
      ...prev,
      q: searchQuery.trim()
    }));
    setActiveTab('obras');
  };

  // Manejador de Exportación CSV
  const handleExportCsv = () => {
    const url = getExportCsvUrl({
      departamento: filters.departamento || undefined,
      provincia: filters.provincia || undefined,
      distrito: filters.distrito || undefined,
      nivel_alerta: filters.nivel_alerta !== 'TODAS' ? filters.nivel_alerta : undefined
    });
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-500 selection:text-white">
      
      {/* 1. Barra de Navegación */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleNavbarSearch}
      />

      {/* 2. Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Filtro Geográfico Jerárquico con detección inteligente */}
        <GeoFilterBar
          filters={filters}
          setFilters={setFilters}
          geoStatus={geoStatus}
          setGeoStatus={setGeoStatus}
          onGpsDetect={handleGpsDetect}
          gpsLoading={gpsLoading}
          gpsError={gpsError}
        />

        {/* Indicador de Conciliación Oficial en Línea */}
        <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800/80 rounded-xl px-3.5 py-1.5 mb-5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Auditoría en vivo: cruce automático de datos con <strong>MEF SSI</strong>, <strong>Formato 12-B</strong> y <strong>SEACE</strong></span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">Reconciliación de avance físico real activa</span>
        </div>

        {/* Tarjetas Ejecutivas de Métricas (KPIs) */}
        <MetricCards kpis={kpis} loading={loadingKpis} />

        {/* Contenido según la pestaña activa */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Sección de Proyectos Críticos */}
            <CriticalProjects
              projects={criticalProjects}
              onSelectProject={(cui) => setSelectedCui(cui)}
              loading={loadingCriticos}
            />

            {/* Distribución de Inversión por Sector */}
            <SectorDistribution departamento={filters.departamento} />
          </div>
        )}

        {activeTab === 'mapa' && (
          <div>
            <MapView
              filters={filters}
              onSelectProject={(cui) => setSelectedCui(cui)}
            />
          </div>
        )}

        {activeTab === 'obras' && (
          <div>
            <AllObrasTable
              filters={filters}
              onSelectProject={(cui) => setSelectedCui(cui)}
            />
          </div>
        )}

        {activeTab === 'empresas' && (
          <div>
            <ContratistasTable
              departamento={filters.departamento}
              onSelectCompany={() => {}}
            />
          </div>
        )}

      </main>

      {/* 3. Modal de Ficha de Obra */}
      {selectedCui && (
        <FichaObraModal
          cui={selectedCui}
          onClose={() => setSelectedCui(null)}
        />
      )}

      {/* 4. Modal de Estrategia Documental */}
      <DocumentStrategyModal
        isOpen={showStrategyModal}
        onClose={() => setShowStrategyModal(false)}
      />

      {/* 5. Pie de Página y Metodología */}
      <footer className="border-t border-slate-800 bg-slate-950/80 py-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-white mb-1">
              <span>🇵🇪 Observatorio de Obras Públicas del Perú</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                Iniciativa Cívica Abierta
              </span>
            </div>
            <p className="text-slate-400">
              Cruce de datos públicos: MEF (Banco de Inversiones / F12B / SIAF), OECE (Contrataciones SEACE) y Contraloría General de la República (Infobras).
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <button
              onClick={() => setShowStrategyModal(true)}
              className="hover:text-blue-400 text-blue-400/90 font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Estrategia de Documentos</span>
            </button>
            <span>•</span>
            <a
              href="https://datosabiertos.mef.gob.pe"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Datos Abiertos MEF</span>
            </a>
            <span>•</span>
            <a
              href="https://contratacionesabiertas.gob.pe"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-400 transition-colors"
            >
              SEACE / OECE
            </a>
            <span>•</span>
            <a
              href="https://infobras.gob.pe"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-400 transition-colors"
            >
              Infobras
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
