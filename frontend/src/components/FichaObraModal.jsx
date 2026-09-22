import React, { useEffect, useState } from 'react';
import {
  X, AlertTriangle, AlertCircle, Clock, FileText, Download, Building2,
  Calendar, DollarSign, ExternalLink, ShieldCheck, MapPin, CheckCircle2,
  FileSearch, HelpCircle, Radio, Phone, Mail, UserCheck, Activity,
  Camera, Layers, ArrowRight, Image as ImageIcon, Eye, ShieldAlert, Info
} from 'lucide-react';
import { getObraDetalle } from '../services/api';
import DocumentStrategyModal from './DocumentStrategyModal';
import LineaTiempoProyecto from './LineaTiempoProyecto';
import GaleriaFotosObra from './GaleriaFotosObra';

const formatMoney = (val) => {
  if (!val && val !== 0) return 'S/ 0.00';
  return `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function FichaObraModal({ cui, onClose }) {
  const [obra, setObra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [activeTab, setActiveTab] = useState('resumen');

  useEffect(() => {
    if (!cui) return;
    setLoading(true);
    setError(null);
    setActiveTab('resumen');
    getObraDetalle(cui)
      .then((data) => {
        setObra(data);
        setLoading(false);
      })
      .catch((err) => {
        setError('No se pudo cargar la información de la obra.');
        setLoading(false);
      });
  }, [cui]);

  if (!cui) return null;

  const fotosObra = obra?.fotos_obra || obra?.linea_tiempo?.fotos_obra || [];
  const totalFotos = fotosObra.length;
  const totalContratos = obra?.contratos?.length || 0;
  const totalComponentes = obra?.ejecucion_por_componentes?.length || 0;
  const totalAlertasSSI = obra?.alertas_ssi?.length || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col">
        
        {/* Barra Superior Modal */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-red-950 text-red-400 border border-red-800">
              CUI {cui}
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Ficha Técnica Oficial y Cruce de Entidades
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(cui);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors flex items-center gap-1"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : null}
              <span>{copied ? '¡Copiado!' : 'Copiar CUI'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido con Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {loading && (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-400">Consultando bases del MEF, SEACE e Infobras...</p>
            </div>
          )}

          {error && (
            <div className="py-12 text-center text-red-400 text-sm">
              {error}
            </div>
          )}

          {obra && (
            <>
              {/* 1. Cabecera del Proyecto */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    {obra.departamento} · {obra.provincia} · {obra.distrito}
                  </span>
                  <span>•</span>
                  <span>{obra.entidad}</span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                    {obra.nivel_gobierno}
                  </span>
                </div>

                <h1 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  {obra.nombre}
                </h1>
              </div>

              {/* 2. Barra de Navegación por Pestañas (Estructura Limpia y Despejada) */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800/90 rounded-2xl overflow-x-auto no-scrollbar shadow-inner">
                <button
                  onClick={() => setActiveTab('resumen')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'resumen'
                      ? 'bg-red-600 text-white shadow-md shadow-red-900/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span>📋</span>
                  <span>Diagnóstico y Resumen</span>
                </button>

                <button
                  onClick={() => setActiveTab('fotos')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'fotos'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Fotos en Terreno</span>
                  {totalFotos > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === 'fotos' ? 'bg-white/20 text-white' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {totalFotos}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('hitos')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'hitos'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Línea de Tiempo & Metas</span>
                  {totalComponentes > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === 'hitos' ? 'bg-white/20 text-white' : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}>
                      {totalComponentes} metas
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('contratos')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'contratos'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Contratos & Alertas</span>
                  {totalAlertasSSI > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white shadow-sm flex items-center gap-1 animate-pulse">
                      <span>{totalAlertasSSI}</span>
                      <span className="hidden sm:inline">alerta{totalAlertasSSI > 1 ? 's' : ''} SSI</span>
                    </span>
                  )}
                  {totalContratos > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === 'contratos' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {totalContratos} cont.
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('documentos')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'documentos'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Documentos & MEF</span>
                </button>
              </div>

              {/* ==================== TAB 1: RESUMEN CIUDADANO ==================== */}
              {activeTab === 'resumen' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Diagnóstico para el Ciudadano: ¿Cómo va esta obra? */}
                  <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-red-950/80 border border-red-800/80 flex items-center justify-center text-base shrink-0">
                          🚦
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>¿Cómo va esta obra? (Diagnóstico para el Ciudadano)</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-950 text-red-400 border border-red-800">
                              Resumen Claro
                            </span>
                          </h2>
                          <p className="text-[11px] text-slate-400">
                            Evaluación directa en lenguaje sencillo sobre plazos, dinero gastado y contratos
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowStrategyModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-200 border border-slate-700 transition-colors shrink-0"
                      >
                        <FileSearch className="w-3.5 h-3.5 text-blue-400" />
                        <span>¿Cómo analizamos estos datos?</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* 1. Plazo */}
                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>1. Plazo de Entrega</span>
                        </div>
                        {(() => {
                          const ultSitu = (obra.datos_en_vivo_mef?.ultimo_estado_situacional_f12b || '').toUpperCase();
                          const esControversia = ultSitu.includes('CONTROVERSIA') || ultSitu.includes('INCUMPLIMIENTO') || ultSitu.includes('ARBITRAJE') ||
                            obra.linea_tiempo?.hitos?.some(h => h.estado?.toLowerCase().includes('controversia'));
                          const esParalizada = ultSitu.includes('PARALIZAD') || ultSitu.includes('SUSPENDID') || ultSitu.includes('FALTA DE ASIGNACION') || ultSitu.includes('FALTA DE ASIGANCION') || ultSitu.includes('LIMITA LA EJECUC') ||
                            obra.linea_tiempo?.hitos?.some(h => h.estado?.toLowerCase().includes('paralizada') || h.comentario?.toLowerCase().includes('paralizada') || h.estado?.toLowerCase().includes('inconclusa'));
                          const esCulminada = !esControversia && !esParalizada && (
                            obra.avance_fisico >= 95 ||
                            obra.datos_en_vivo_mef?.en_funcionamiento === true ||
                            (obra.linea_tiempo?.hitos?.some(h => h.nombre?.includes('CULMINAC') && h.nivel === 'COMPLETADO') && obra.avance_fisico >= 80)
                          );

                          if (esCulminada) {
                            return (
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 text-xs font-bold border border-emerald-800">
                                  Obra Física Culminada
                                </span>
                                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                  Construcción finalizada en terreno. En proceso de liquidación administrativa y/o en funcionamiento.
                                </p>
                              </div>
                            );
                          }

                          if (esControversia) {
                            return (
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded bg-red-950/80 text-red-400 text-xs font-bold border border-red-800">
                                  En Controversia (+{obra.dias_atraso} días)
                                </span>
                                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                  Debió culminar el <strong className="text-slate-200">{obra.fec_fin_ejec_fisica || 'plazo vencido'}</strong>. Paralizada por controversia legal o proceso arbitral por incumplimiento contractual.
                                </p>
                              </div>
                            );
                          }

                          if (esParalizada) {
                            return (
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 text-xs font-bold border border-amber-800">
                                  Obra Paralizada (+{obra.dias_atraso} días)
                                </span>
                                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                  Plazo vencido el <strong className="text-slate-200">{obra.fec_fin_ejec_fisica || 'plazo vencido'}</strong>. Trabajos detenidos en terreno por agotamiento presupuestal o paralización formal de obra.
                                </p>
                              </div>
                            );
                          }

                          if (obra.dias_atraso > 0) {
                            return (
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded bg-red-950/80 text-red-400 text-xs font-bold border border-red-800">
                                  Demora: +{obra.dias_atraso} días
                                </span>
                                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                  Debió culminar el <strong className="text-slate-200">{obra.fec_fin_ejec_fisica || 'plazo vencido'}</strong>. La entrega está fuera de tiempo contractual.
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div>
                              <span className="inline-block px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 text-xs font-bold border border-emerald-800">
                                En Cronograma
                              </span>
                              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                Fecha programada: <strong className="text-slate-200">{obra.fec_fin_ejec_fisica || 'En ejecución normal'}</strong>.
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 2. Dinero vs Construcción */}
                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                          <DollarSign className="w-4 h-4 text-blue-400 shrink-0" />
                          <span>2. Dinero vs Construcción</span>
                        </div>
                        {obra.diferencia_avance > 10 ? (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded bg-red-950/80 text-red-400 text-xs font-bold border border-red-800">
                              Se pagó +{obra.diferencia_avance.toFixed(0)}% más de lo hecho
                            </span>
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                              De cada S/ 100 de presupuesto, se han desembolsado <strong className="text-blue-300">S/ {obra.avance_financiero?.toFixed(0)}</strong>, pero la construcción va al <strong className="text-emerald-300">{obra.avance_fisico?.toFixed(0)}%</strong>.
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 text-xs font-bold border border-emerald-800">
                              Gasto y Avance Equilibrados
                            </span>
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                              Lo pagado ({obra.avance_financiero?.toFixed(0)}%) concuerda con lo construido en la obra ({obra.avance_fisico?.toFixed(0)}%).
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 3. Documentos Oficiales */}
                      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                          <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                          <span>3. Adendas y Supervisión</span>
                        </div>
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 text-xs font-bold border border-purple-800">
                            {obra.nro_adendas || 0} Adendas {obra.sobrecosto_adendas > 0 ? `(+${formatMoney(obra.sobrecosto_adendas)})` : ''}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            Supervisor: <strong className="text-slate-200">{obra.supervisor_obra || 'No asignado'}</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Causal o Estado según Cuaderno de Obra */}
                    {obra.causal_retraso && (
                      <div className={`p-3 rounded-xl bg-slate-950/90 border flex items-start gap-2.5 text-xs ${
                        obra.causal_retraso.toLowerCase().includes('sin causales')
                          ? 'border-emerald-900/60'
                          : 'border-slate-800'
                      }`}>
                        {obra.causal_retraso.toLowerCase().includes('sin causales') ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className={`font-bold ${
                            obra.causal_retraso.toLowerCase().includes('sin causales')
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }`}>
                            {obra.causal_retraso.toLowerCase().includes('sin causales')
                              ? 'Supervisión en cuaderno de obra: '
                              : 'Motivo de retraso según documentos e informes oficiales: '}
                          </span>
                          <span className="text-slate-200">{obra.causal_retraso}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MINI GALERÍA DE FOTOS EN TERRENO (LO VISUAL MÁS IMPORTANTE PARA EL CIUDADANO) */}
                  {totalFotos > 0 && (
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-emerald-400" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Fotos de la Obra en Terreno ({totalFotos} registros oficiales en SEACE/MEF)
                          </h3>
                        </div>
                        <button
                          onClick={() => setActiveTab('fotos')}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Ver galería completa ({totalFotos})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {fotosObra.slice(0, 3).map((ft, idx) => {
                          const isPdf = ft.archivo_foto?.toLowerCase().endsWith('.pdf') || ft.url_foto?.toLowerCase().includes('.pdf');
                          return (
                            <div
                              key={idx}
                              onClick={() => setActiveTab('fotos')}
                              className="group relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-emerald-500/60 cursor-pointer transition-all shadow-sm flex flex-col justify-between p-3"
                            >
                              {isPdf ? (
                                <div className="flex flex-col justify-between h-full w-full">
                                  <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white bg-slate-950/80 border border-slate-700">
                                      {ft.periodo}
                                    </span>
                                    <span className="text-[10px] font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                                      PDF Oficial
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-300 my-auto">
                                    <FileText className="w-6 h-6 text-purple-400 shrink-0" />
                                    <div className="text-[11px] leading-tight line-clamp-2">
                                      {ft.descripcion || 'Panel fotográfico de supervisión'}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                                    <span className="font-bold text-emerald-400">
                                      {ft.avance_real}% físico
                                    </span>
                                    <span className="text-slate-400 text-[10px] group-hover:text-emerald-300 transition-colors font-medium">
                                      Ver documento →
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <img
                                    src={ft.url_foto}
                                    alt={`Foto de obra ${ft.periodo}`}
                                    loading="lazy"
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 absolute inset-0"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end justify-between p-2.5">
                                    <span className="text-[11px] font-mono font-bold text-white bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur-sm">
                                      {ft.periodo}
                                    </span>
                                    <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 backdrop-blur-sm">
                                      {ft.avance_real}% físico
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tarjetas de Presupuesto y Plazos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
                      <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Costo Actualizado</span>
                      <span className="text-base font-bold text-white">{formatMoney(obra.costo_actualizado)}</span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
                      <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Devengado Acumulado</span>
                      <span className="text-base font-bold text-blue-400">{formatMoney(obra.devengado_acumulado)}</span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
                      <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Saldo por Ejecutar</span>
                      <span className="text-base font-bold text-slate-300">{formatMoney(obra.saldo_ejecutar)}</span>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
                      <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Plazo y Culminación</span>
                      <span className="text-sm font-bold text-white block">
                        {obra.fec_fin_ejec_fisica ? obra.fec_fin_ejec_fisica : 'No especificado'}
                      </span>
                      {(obra.avance_fisico >= 95 || obra.datos_en_vivo_mef?.en_funcionamiento || obra.linea_tiempo?.hitos?.some(h => h.nombre?.includes('CULMINAC') && h.nivel === 'COMPLETADO')) ? (
                        <span className="text-[10px] text-emerald-400 font-semibold block">
                          Culminada (En Liquidación)
                        </span>
                      ) : obra.dias_atraso > 0 ? (
                        <span className="text-[10px] text-red-400 font-semibold block">
                          +{obra.dias_atraso} días atraso
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Comparador Ilustrativo Físico vs Financiero */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-inner space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Comparativa de Avances (Físico vs Financiero)
                      </span>
                      {obra.diferencia_avance > 0 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-red-950 text-red-400 border border-red-800">
                          Diferencia: +{obra.diferencia_avance} pp
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Avance Físico */}
                      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                        <span className="block text-xs font-semibold text-emerald-400 mb-1">
                          Avance físico reportado
                        </span>
                        <div className="text-2xl font-black text-emerald-400 mb-1.5">
                          {obra.avance_fisico?.toFixed(1)}%
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, obra.avance_fisico || 0)}%` }}
                            className="h-full bg-emerald-500 rounded-full"
                          ></div>
                        </div>
                        <span className="block text-[10px] text-slate-400 mt-1.5">
                          Fuente: Banco de Inversiones / Supervisión MEF
                        </span>
                      </div>

                      {/* Avance Financiero */}
                      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                        <span className="block text-xs font-semibold text-blue-400 mb-1">
                          Avance financiero calculado
                        </span>
                        <div className="text-2xl font-black text-blue-400 mb-1.5">
                          {obra.avance_financiero?.toFixed(1)}%
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, obra.avance_financiero || 0)}%` }}
                            className="h-full bg-blue-500 rounded-full"
                          ></div>
                        </div>
                        <span className="block text-[10px] text-slate-400 mt-1.5">
                          Fuente: Devengado acumulado sobre Costo Actualizado (SIAF)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Datos en Vivo MEF / Invierte.pe / SSI */}
                  {obra.datos_en_vivo_mef && obra.datos_en_vivo_mef.disponible && (
                    <div className="bg-slate-950/90 border border-blue-900/60 rounded-2xl p-4 shadow-lg space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                            <span>Consulta en Vivo a Invierte.pe / SSI del MEF</span>
                          </h3>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                          Datos Oficiales al Instante
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        {/* 1. Servicio a la población */}
                        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                          <span className="text-[11px] text-slate-400 block mb-1">¿Brinda servicio a la población?</span>
                          {obra.datos_en_vivo_mef.ultimo_estado_situacional_f12b?.toLowerCase().includes('controversia') ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>NO (EN CONTROVERSIA LEGAL)</span>
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-1 leading-tight">
                                Sin operar por controversia legal o proceso arbitral por incumplimiento contractual
                              </span>
                            </div>
                          ) : (obra.datos_en_vivo_mef.en_funcionamiento === true ||
                            obra.datos_en_vivo_mef.ultimo_estado_situacional_f12b?.toLowerCase().includes('en funcionamiento') ||
                            obra.datos_en_vivo_mef.ultimo_estado_situacional_f12b?.toLowerCase().includes('culminado su ejecuci')) ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>SÍ, EN FUNCIONAMIENTO</span>
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-1 leading-tight">
                                Culminada físicamente y brindando servicio a la comunidad (F12-B / F09)
                              </span>
                            </div>
                          ) : obra.datos_en_vivo_mef.en_funcionamiento === false ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>NO BRINDA SERVICIO</span>
                            </span>
                          ) : (obra.avance_fisico >= 90 || (obra.linea_tiempo?.hitos?.some(h => h.nombre?.includes('CULMINAC') && h.nivel === 'COMPLETADO') && obra.avance_fisico >= 80)) ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                                <span>OBRA FÍSICA CONCLUIDA</span>
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-1 leading-tight">
                                Trabajos terminados en terreno; en proceso de recepción y puesta en marcha
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 font-medium">En proceso constructivo</span>
                          )}
                        </div>

                        {/* 2. Liquidación y Cierre */}
                        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                          <span className="text-[11px] text-slate-400 block mb-1">Liquidación y Cierre (F09)</span>
                          <span className="text-xs font-bold text-slate-200 block">
                            {obra.datos_en_vivo_mef.estado_cierre === 'SI'
                              ? 'CERRADO (F09 Aprobado)'
                              : (obra.datos_en_vivo_mef.estado_cierre === 'EN_TRAMITE_F09' || obra.datos_en_vivo_mef.tiene_informe_cierre)
                              ? 'F09 EN REVISIÓN DE LIQUIDACIÓN'
                              : obra.datos_en_vivo_mef.estado_cierre === 'NO'
                              ? 'PENDIENTE DE CIERRE FORMAL'
                              : (obra.datos_en_vivo_mef.estado_cierre || 'En trámite')}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                            {obra.datos_en_vivo_mef.tiene_informe_cierre
                              ? 'F09 registrado; expediente técnico-financiero en trámite de revisión por el sector'
                              : (obra.datos_en_vivo_mef.ultimo_estado_situacional_f12b?.toLowerCase().includes('controversia'))
                              ? 'Sin Formato 09 emitido en el MEF; liquidación paralizada por proceso legal'
                              : (obra.datos_en_vivo_mef.fecha_liquidacion_prevista ? `Prevista: ${obra.datos_en_vivo_mef.fecha_liquidacion_prevista}` : 'Pendiente de aprobación administrativa')}
                          </span>
                        </div>

                        {/* 3. Modalidad de Ejecución */}
                        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                          <span className="text-[11px] text-slate-400 block mb-1">Modalidad de Ejecución</span>
                          {obra.datos_en_vivo_mef.modalidad_ejecucion && obra.datos_en_vivo_mef.modalidad_ejecucion.includes(',') ? (
                            <div>
                              <span className="text-xs font-bold text-purple-300 block">
                                Modalidad Mixta (Híbrida)
                              </span>
                              <span className="text-[10px] text-slate-300 block mt-0.5 leading-tight">
                                {obra.datos_en_vivo_mef.modalidad_ejecucion
                                  .split(',')
                                  .map(m => m.trim().replace(/^ADMINISTRACI[ÓO]N\s+/i, 'Adm. ').replace(/^POR\s+/i, ''))
                                  .join(' + ')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-purple-300 block">
                              {obra.datos_en_vivo_mef.modalidad_ejecucion || 'No especificada'}
                            </span>
                          )}
                          {obra.datos_en_vivo_mef.monto_expediente_tecnico > 0 && (
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Exp. Técnico: {formatMoney(obra.datos_en_vivo_mef.monto_expediente_tecnico)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Funcionario Responsable UEI */}
                      {obra.datos_en_vivo_mef.responsable_uei && (
                        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5">
                            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Responsable de Unidad Ejecutora (UEI)</span>
                              <span className="text-xs font-bold text-white">{obra.datos_en_vivo_mef.responsable_uei}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {obra.datos_en_vivo_mef.telefono_contacto && (
                              <a href={`tel:${obra.datos_en_vivo_mef.telefono_contacto}`} className="flex items-center gap-1 text-[11px] text-emerald-400 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                                <Phone className="w-3 h-3" />
                                <span>{obra.datos_en_vivo_mef.telefono_contacto}</span>
                              </a>
                            )}
                            {obra.datos_en_vivo_mef.email_contacto && (
                              <a href={`mailto:${obra.datos_en_vivo_mef.email_contacto}`} className="flex items-center gap-1 text-[11px] text-blue-400 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                                <Mail className="w-3 h-3" />
                                <span>{obra.datos_en_vivo_mef.email_contacto}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ==================== TAB 2: FOTOS EN TERRENO & AVANCE MENSUAL ==================== */}
              {activeTab === 'fotos' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <GaleriaFotosObra fotos={fotosObra} cui={obra.cui} />
                </div>
              )}

              {/* ==================== TAB 3: LÍNEA DE TIEMPO & METAS ==================== */}
              {activeTab === 'hitos' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <LineaTiempoProyecto
                    lineaTiempo={obra.linea_tiempo}
                    componentes={obra.ejecucion_por_componentes}
                    historialSituacion={obra.datos_en_vivo_mef?.historial_situacion || obra.linea_tiempo?.historial_situacion}
                    cui={obra.cui}
                    urlProyinv14={obra.datos_en_vivo_mef?.direct_urls?.url_ejecucion_factor_accion}
                  />
                </div>
              )}

              {/* ==================== TAB 4: CONTRATISTAS & ALERTAS ==================== */}
              {activeTab === 'contratos' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Evaluación de Riesgo y Alertas */}
                  {obra.evaluacion_riesgo && (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span>Diagnóstico de Alertas y Nivel de Riesgo</span>
                        </h3>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                          Nivel: {obra.evaluacion_riesgo.nivel_alerta} (ISR: {obra.evaluacion_riesgo.score_criticidad})
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {obra.evaluacion_riesgo.justificacion_tecnica}
                      </p>
                    </div>
                  )}

                  {/* Alertas Oficiales del Sistema de Seguimiento de Inversiones (SSI - MEF) */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                            Alertas Oficiales del Sistema de Seguimiento de Inversiones (SSI - MEF)
                          </h3>
                          {totalAlertasSSI > 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-950 text-red-400 border border-red-800 animate-pulse">
                              {totalAlertasSSI} {totalAlertasSSI === 1 ? 'Alerta Activa' : 'Alertas Activas'}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              0 Alertas Activas
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Evaluación algorítmica del MEF (mismas condiciones que disparan la ventana modal de riesgo al ingresar al SSI)
                        </p>
                      </div>

                      <a
                        href={`https://ofi5.mef.gob.pe/ssi/Ssi/Index?codigo=${obra.cui}&tipo=2`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-medium transition-colors shrink-0"
                      >
                        <span>Abrir en SSI Oficial</span>
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      </a>
                    </div>

                    {totalAlertasSSI > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {obra.alertas_ssi.map((alerta, idx) => {
                          const isCritico = alerta.severidad === 'CRITICO';
                          const isAlto = alerta.severidad === 'ALTO';
                          
                          const badgeCls = isCritico
                            ? 'bg-red-950/80 text-red-400 border-red-800/80'
                            : isAlto
                              ? 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                              : 'bg-blue-950/80 text-blue-400 border-blue-800/80';
                          
                          const cardBorder = isCritico
                            ? 'border-red-900/50 bg-red-950/20'
                            : isAlto
                              ? 'border-amber-900/50 bg-amber-950/20'
                              : 'border-blue-900/50 bg-blue-950/20';

                          return (
                            <div
                              key={alerta.codigo || idx}
                              className={`rounded-xl border p-4 space-y-2.5 transition-all ${cardBorder}`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeCls}`}>
                                    Alerta N° {alerta.numero} (SSI)
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${badgeCls}`}>
                                    {alerta.severidad}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {alerta.origen || 'SSI - MEF'}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-white flex items-start gap-2 leading-snug">
                                  {isCritico ? (
                                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                  ) : isAlto ? (
                                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                  ) : (
                                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                  )}
                                  <span>{alerta.titulo}</span>
                                </h4>
                                <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                                  {alerta.descripcion}
                                </p>
                              </div>

                              {alerta.detalle_calculo && (
                                <div className="pt-2 border-t border-slate-800/70 flex flex-wrap items-center gap-2 text-[11px] text-slate-300 pl-6">
                                  <span className="text-slate-400 font-semibold">Parámetro evaluado:</span>
                                  <span className="font-mono text-slate-200 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                                    {alerta.detalle_calculo}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl">
                        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-emerald-300 block">
                            Sin Alertas Preventivas de Riesgo en el SSI
                          </span>
                          <span className="text-[11px] text-slate-300">
                            La inversión no registra desfases financieros superiores al 20%, omisión del Formato 12-B ni controversias arbitrales en el aplicativo informático del MEF.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contratistas y Empresas (SEACE / OECE) */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-red-500" />
                      <span>Contratistas y Empresas Adjudicatarias (Data SEACE)</span>
                    </h3>

                    {obra.contratos && obra.contratos.length > 0 ? (
                      <div className="space-y-3">
                        {obra.contratos.map((con) => (
                          <div
                            key={con.id}
                            className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{con.razon_social}</span>
                                {con.es_consorcio && (
                                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-purple-950 text-purple-400 border border-purple-800">
                                    Consorcio
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                RUC: <span className="font-mono text-slate-200">{con.ruc_contratista}</span> · Contrato: <span className="text-slate-200">{con.nro_contrato}</span>
                              </div>
                              {con.detalle_consorcio && (
                                <p className="text-[11px] text-slate-400 mt-1.5 italic bg-slate-900 p-2 rounded-lg border border-slate-800">
                                  Integrantes: {con.detalle_consorcio}
                                </p>
                              )}
                            </div>

                            <div className="text-left sm:text-right shrink-0">
                              <span className="block text-[10px] uppercase font-semibold text-slate-400">Monto Contratado</span>
                              <span className="text-sm font-bold text-emerald-400">{formatMoney(con.monto_contratado)}</span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">Estado: {con.estado_contrato}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-400">
                        No se registran contratos digitalizados en SEACE para este CUI (obra por Administración Directa o previa al SEACE digital).
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ==================== TAB 5: DOCUMENTOS & MEF ==================== */}
              {activeTab === 'documentos' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Documentación Oficial Descargable Generada */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                          <Download className="w-4 h-4 text-emerald-400" />
                          <span>Documentación Oficial Generada para Descargar</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Archivos oficiales procesados directamente para evitar enlaces rotos por CAPTCHAs del Estado
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowStrategyModal(true)}
                          className="text-[11px] px-2.5 py-1 rounded-lg font-semibold bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition-colors flex items-center gap-1"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>¿Por qué descargar aquí?</span>
                        </button>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Descarga 100% Funcional
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {obra.documentos && obra.documentos.map((doc) => {
                        const isHtml = doc.tipo_documento === 'FICHA_OFICIAL';
                        return (
                          <a
                            key={doc.id}
                            href={doc.url_descarga}
                            download={!isHtml}
                            target={isHtml ? '_blank' : undefined}
                            rel="noopener noreferrer"
                            className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/70 p-3.5 rounded-xl flex items-center justify-between gap-3 group transition-all hover:bg-slate-900/90 shadow-md"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
                                  {doc.titulo}
                                </h4>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Fuente: {doc.origen} · {doc.tamanio_mb} MB · <span className="text-emerald-400 font-medium">Clic para {isHtml ? 'abrir / imprimir' : 'descargar archivo'}</span>
                                </span>
                              </div>
                            </div>

                            <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-emerald-600 group-hover:text-white text-slate-400 transition-colors shrink-0">
                              <Download className="w-3.5 h-3.5" />
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>

                  {/* Consulta en Portales Oficiales del Estado (Enlaces Directos Verificados sin CAPTCHA) */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                    <div className="pb-3 mb-3 border-b border-slate-800">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                        <span>Reportes Oficiales del Estado para este CUI (Acceso Directo Sin Captcha)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Enlaces directos a los reportes del MEF e Invierte.pe verificados para abrir sin pasar por pantallas de bloqueo
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs mb-3">
                      <a
                        href={`https://ofi5.mef.gob.pe/inviertews/Repseguim/ResumF12B?codigo=${obra.cui}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 flex items-center justify-between group transition-colors shadow-sm"
                      >
                        <div>
                          <span className="font-semibold text-slate-200 group-hover:text-emerald-400 block">Formato 12-B en Vivo</span>
                          <span className="text-[10px] text-slate-400">Seguimiento Físico-Financiero MEF</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                      </a>

                      <a
                        href={`https://ofi5.mef.gob.pe/ssi/Ssi/Index?codigo=${obra.cui}&tipo=2`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/60 flex items-center justify-between group transition-colors shadow-sm"
                      >
                        <div>
                          <span className="font-semibold text-slate-200 group-hover:text-blue-400 block">Ficha SSI Invierte.pe</span>
                          <span className="text-[10px] text-slate-400">Sistema Seguimiento Inversiones</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0" />
                      </a>

                      <a
                        href={`https://ofi5.mef.gob.pe/invierte/ejecucion/traeListaEjecucionSimplePublica/${obra.cui}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/60 flex items-center justify-between group transition-colors shadow-sm"
                      >
                        <div>
                          <span className="font-semibold text-slate-200 group-hover:text-purple-400 block">Modificaciones de Costo</span>
                          <span className="text-[10px] text-slate-400">Formato 08-A Fase de Ejecución</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 shrink-0" />
                      </a>

                      {obra.datos_en_vivo_mef?.tiene_informe_cierre ? (
                        <a
                          href={obra.datos_en_vivo_mef?.direct_urls?.url_informe_cierre || `https://ofi5.mef.gob.pe/invierte/informecierre/consultaCierre/${obra.cui}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 flex items-center justify-between group transition-colors shadow-sm"
                        >
                          <div>
                            <span className="font-semibold text-slate-200 group-hover:text-amber-400 block">Informe de Cierre (F09)</span>
                            <span className="text-[10px] text-slate-400">Liquidación y Funcionamiento</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0" />
                        </a>
                      ) : (
                        <div
                          className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between shadow-sm cursor-help opacity-85"
                          title="El servidor del MEF únicamente emite el Formato 09 cuando la obra concluye su ciclo constructivo y se formaliza la liquidación. Al no contar con cierre registrado o estar en controversia, el MEF no dispone de reporte descargable."
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-300 block">Informe de Cierre (F09)</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800">
                                No Emitido
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              {obra.datos_en_vivo_mef?.ultimo_estado_situacional_f12b?.toLowerCase().includes('controversia')
                                ? 'En controversia / Sin Formato 09'
                                : 'Pendiente de liquidación técnica'}
                            </span>
                          </div>
                          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        </div>
                      )}

                      <a
                        href={`https://ofi5.mef.gob.pe/invierteWS/Repseguim/RepContratac?codigo=${obra.cui}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 flex items-center justify-between group transition-colors shadow-sm"
                      >
                        <div>
                          <span className="font-semibold text-slate-200 group-hover:text-cyan-400 block">Contrataciones SEACE</span>
                          <span className="text-[10px] text-slate-400">Procesos, Contratos y Arbitrajes</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                      </a>

                      <a
                        href={`https://ofi5.mef.gob.pe/invierteWS/Repseguim/RepLinSeguim?codigo=${obra.cui}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/60 flex items-center justify-between group transition-colors shadow-sm"
                      >
                        <div>
                          <span className="font-semibold text-slate-200 group-hover:text-rose-400 block">Línea de Hitos y Cuaderno</span>
                          <span className="text-[10px] text-slate-400">Adicionales, Ampliaciones y Fotos</span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 shrink-0" />
                      </a>

                      {(obra.linea_tiempo?.url_reporte_mef || obra.datos_en_vivo_mef?.direct_urls?.url_ejecucion_fisica_obra) && (
                        <a
                          href={obra.linea_tiempo?.url_reporte_mef || obra.datos_en_vivo_mef?.direct_urls?.url_ejecucion_fisica_obra}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/80 hover:border-blue-400 flex items-center justify-between group transition-colors shadow-sm sm:col-span-2 lg:col-span-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-900/60 border border-blue-700/60 flex items-center justify-center text-blue-400 shrink-0">
                              ⏱️
                            </div>
                            <div>
                              <span className="font-semibold text-blue-300 group-hover:text-white block">
                                Reporte Oficial de Ejecución Física y Cronogramas (RepEjecFisObra)
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Línea de tiempo de hitos, valorizaciones mensuales, fotos y ampliaciones registradas en SEACE/MEF
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-800/80 text-white font-medium text-[11px] shrink-0">
                            <span>Abrir Reporte</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </div>
                        </a>
                      )}

                      <a
                        href={`https://ofi5.mef.gob.pe/repseguim/proyinv14.html?codigo=${obra.cui}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/80 hover:border-emerald-400 flex items-center justify-between group transition-colors shadow-sm sm:col-span-2 lg:col-span-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-900/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                            📊
                          </div>
                          <div>
                            <span className="font-semibold text-emerald-300 group-hover:text-white block">
                              Reporte de Factor Productivo y Acción (proyinv14)
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Metas físicas detalladas, valorizaciones por producto y componentes (Administración Directa / Contratas)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-800/80 text-white font-medium text-[11px] shrink-0">
                          <span>Abrir proyinv14</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showStrategyModal && (
        <DocumentStrategyModal
          cui={obra?.cui}
          nombreObra={obra?.nombre}
          onClose={() => setShowStrategyModal(false)}
        />
      )}
    </div>
  );
}
