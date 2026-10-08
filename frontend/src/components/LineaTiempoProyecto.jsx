import React, { useState } from 'react';
import {
  Calendar, CheckCircle2, AlertTriangle, Clock, ExternalLink,
  ChevronDown, ChevronUp, AlertCircle, ShieldAlert, Sparkles,
  TrendingUp, Milestone, History, ArrowRight, Layers, Check, Info
} from 'lucide-react';

const formatMoney = (val) => {
  if (!val && val !== 0) return 'S/ 0.00';
  return `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function LineaTiempoProyecto({ lineaTiempo, componentes = [], historialSituacion = [], cui, urlProyinv14 }) {
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [showCurvaDetalle, setShowCurvaDetalle] = useState(false);
  const [showAllComponents, setShowAllComponents] = useState(false);

  if (!lineaTiempo && (!componentes || componentes.length === 0)) return null;

  const {
    origen = 'SINTESIS_INVIERTE',
    nroseg,
    url_reporte_mef,
    resumen_estado,
    hitos = [],
    curva_avance = [],
    reprogramaciones = [],
    alertas_campo = []
  } = lineaTiempo || {};

  const esMefSeace = origen === 'MEF_SEACE';

  // Ordenar periodos de forma descendente (el más reciente primero) para facilitar la consulta ciudadana
  const periodosDescendentes = [...curva_avance].sort((a, b) => {
    const pa = String(a.periodo || '').replace('-', '');
    const pb = String(b.periodo || '').replace('-', '');
    return pb.localeCompare(pa);
  });
  const ultimosPeriodos = showAllPeriods ? periodosDescendentes : periodosDescendentes.slice(0, 6);

  const listaComponentes = (componentes && componentes.length > 0)
    ? componentes
    : (lineaTiempo?.componentes || []);

  const visibleComponentes = showAllComponents ? listaComponentes : listaComponentes.slice(0, 4);

  const listaHistorial = (historialSituacion && historialSituacion.length > 0)
    ? historialSituacion
    : (lineaTiempo?.historial_situacion || []);

  const allComponentsZero = listaComponentes.length > 0 && listaComponentes.every(
    c => Number(c.porcentaje_avance || 0) === 0 && Number(c.monto_valorizado || 0) === 0
  );

  const listaNombresComp = listaComponentes.map(c => c.componente || c.producto).filter(Boolean).join(', ');

  const esControversia = hitos.some(h => h.estado?.toLowerCase().includes('controversia') || h.comentario?.toLowerCase().includes('controversia')) ||
    listaHistorial.some(h => h.es_controversia);

  const esParalizada = hitos.some(h => h.estado?.toLowerCase().includes('paralizada') || h.comentario?.toLowerCase().includes('paralizada') || h.estado?.toLowerCase().includes('inconclusa')) ||
    listaHistorial.some(h => h.es_paralizada);

  const proyinvUrl = urlProyinv14 || (cui ? `https://ofi5.mef.gob.pe/repseguim/proyinv14.html?codigo=${cui}` : null);

  // Determinar último avance registrado (el más reciente)
  const ultimoPunto = periodosDescendentes.length > 0 ? periodosDescendentes[0] : null;

  return (
    <div className="bg-slate-50/80 dark:bg-gradient-to-b dark:from-slate-900/90 dark:to-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-5">
      
      {/* 1. Cabecera de la Línea de Tiempo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
            <Milestone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white tracking-wide">
                Línea de Tiempo del Proyecto (Hitos y Evolución)
              </h3>
              {esMefSeace ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                  Seguimiento Físico en Vivo MEF
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                  Ciclo de Vida Banco de Inversiones
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {resumen_estado}
            </p>
          </div>
        </div>

        {/* Botón Reporte MEF sin CAPTCHA */}
        {url_reporte_mef && (
          <a
            href={url_reporte_mef}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 dark:text-blue-300 dark:border-blue-500/40 text-xs font-semibold transition-all shadow-sm shrink-0 self-start sm:self-auto"
          >
            <span>Ver Reporte Oficial MEF</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* 2. Stepper Visual de Hitos Cronológicos */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          <span>Hitos Clave del Ciclo del Proyecto</span>
        </h4>

        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {hitos.map((hito, idx) => {
            const nivel = hito.nivel || 'EN_CURSO';
            
            let badgeBg = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
            let dotBg = 'bg-slate-400 border-slate-300 dark:bg-slate-700 dark:border-slate-600';
            let icon = <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />;

            if (nivel === 'COMPLETADO') {
              badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
              dotBg = 'bg-emerald-500 border-emerald-300 ring-2 ring-emerald-100 dark:ring-emerald-950';
              icon = <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
            } else if (nivel === 'RETRASADO') {
              badgeBg = 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800';
              dotBg = 'bg-red-500 border-red-300 ring-2 ring-red-100 dark:ring-red-950';
              icon = <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />;
            } else if (nivel === 'EN_CURSO') {
              badgeBg = 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
              dotBg = 'bg-amber-500 border-amber-300 ring-2 ring-amber-100 dark:ring-amber-950';
              icon = <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
            }

            return (
              <div key={idx} className="relative group">
                {/* Nodo en el riel */}
                <div className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border ${dotBg} transition-transform group-hover:scale-125`}></div>

                {/* Tarjeta de Hito */}
                <div className="bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      {icon}
                      {hito.nombre}
                    </span>
                    <div className="flex items-center gap-2">
                      {hito.fecha && (
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {hito.fecha}
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                        {hito.estado}
                      </span>
                    </div>
                  </div>

                  {hito.comentario && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {hito.comentario}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Curva de Avance Físico Mensual (Si tiene data SEACE/MEF) */}
      {curva_avance.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>Evolución Mensual: Físico Programado vs Real ({curva_avance.length} periodos)</span>
            </h4>
            <button
              onClick={() => setShowCurvaDetalle(!showCurvaDetalle)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>{showCurvaDetalle ? 'Ocultar Detalle' : 'Ver Detalle Mensual'}</span>
              {showCurvaDetalle ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Tarjeta de Resumen del Último Periodo */}
          {ultimoPunto && (
            <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-sm">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Último Periodo Reportado</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">{ultimoPunto.periodo}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Reporte mensual de supervisión</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Avance Físico Acumulado</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{ultimoPunto.avance_real}%</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Prog: {ultimoPunto.avance_programado}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    style={{ width: `${Math.min(100, ultimoPunto.avance_real)}%` }}
                    className="bg-emerald-500 h-full rounded-full"
                  ></div>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Diagnóstico en Obra</span>
                <span className={`text-xs font-bold block mt-0.5 ${
                  ultimoPunto.situacion?.includes('ATRASADA') ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {ultimoPunto.situacion || 'En plazo'}
                </span>
                {ultimoPunto.comentario && (
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {ultimoPunto.comentario}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tabla / Lista Desplegable de Periodos Mensuales */}
          {showCurvaDetalle && (
            <div className="space-y-2 pt-2">
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Periodo</th>
                      <th className="py-2 px-3 text-right">Prog. (%)</th>
                      <th className="py-2 px-3 text-right">Real (%)</th>
                      <th className="py-2 px-3 text-right">Monto Real (S/)</th>
                      <th className="py-2 px-3">Situación Reportada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px] bg-white dark:bg-transparent">
                    {ultimosPeriodos.map((pt, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-800 dark:text-white">{pt.periodo}</td>
                        <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400">{pt.avance_programado}%</td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">{pt.avance_real}%</td>
                        <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">{formatMoney(pt.monto_real)}</td>
                        <td className="py-2 px-3 font-sans text-[10px]">
                          <span className={pt.situacion?.includes('ATRASADA') ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-600 dark:text-slate-300'}>
                            {pt.situacion}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {curva_avance.length > 6 && (
                <button
                  onClick={() => setShowAllPeriods(!showAllPeriods)}
                  className="w-full py-2 text-center text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors font-medium"
                >
                  {showAllPeriods ? 'Mostrar solo los 6 periodos más recientes' : `Mostrar los ${curva_avance.length} periodos completos (más recientes primero)`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3.5. Desglose Físico por Factor Productivo y Acción (Reporte MEF proyinv14) */}
      {listaComponentes.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <span>Ejecución Física por Componentes y Productos ({listaComponentes.length})</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Desglose oficial de metas físicas y valorizaciones registrado en el Formato 08 / 12-B (Reporte proyinv14)
              </p>
            </div>

            {proyinvUrl && (
              <a
                href={proyinvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800/80 text-[11px] font-semibold transition-colors shrink-0 self-start sm:self-auto"
              >
                <span>Ver Reporte proyinv14 MEF</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Explicación ciudadana pedagógica */}
          <div className="p-3 bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/30 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-blue-700 dark:text-blue-300">¿Qué significa esta sección? </strong>
              Cada proyecto público se compone de metas físicas concretas (infraestructura, equipamiento, etc.). Aquí se visualiza el porcentaje completado y el dinero valorizado para cada meta reportada en el Banco de Inversiones (Formato 14).
            </div>
          </div>

          {/* Banner especial para adquisiciones de activos / IOARR con componentes en cero o sin metrados */}
          {allComponentsZero && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5 shadow-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed space-y-1">
                <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <span>Componentes sin metrado civil tradicional o sin valorizaciones aprobadas (Formato 14)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  En el Formato 14, los componentes declarados ({listaNombresComp || 'Adquisición de activos / IOARR'}) corresponden a compras de bienes, equipamiento o intervenciones específicas que no emplean metrados de obra civil tradicional (m² o km). 
                  {esControversia ? (
                    <span> Asimismo, debido a la <strong className="text-amber-800 dark:text-amber-200">controversia contractual o legal en curso</strong>, los componentes no registran valorizaciones mensuales aprobadas en las actas técnicas del MEF.</span>
                  ) : esParalizada ? (
                    <span> Asimismo, debido a la <strong className="text-amber-800 dark:text-amber-200">paralización o desfinanciamiento de los trabajos</strong>, los componentes no registran continuidad de valorizaciones aprobadas.</span>
                  ) : (
                    <span> No se registran actas de valorización física acumuladas en las metas oficiales del MEF a la fecha.</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Grid de Componentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {visibleComponentes.map((comp, idx) => {
              const pct = Number(comp.porcentaje_avance || 0);
              const isZeroComp = pct === 0 && Number(comp.monto_valorizado || 0) === 0;
              let colorBar = 'bg-blue-500';
              let badgeBg = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800';

              if (pct >= 95) {
                colorBar = 'bg-emerald-500';
                badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
              } else if (pct >= 50) {
                colorBar = 'bg-amber-500';
                badgeBg = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
              } else if (isZeroComp && (esControversia || esParalizada)) {
                colorBar = esControversia ? 'bg-red-500' : 'bg-amber-500';
                badgeBg = esControversia
                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/80 dark:text-red-400 dark:border-red-800'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
              }

              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-3.5 space-y-2 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                        {comp.componente || comp.accion || 'Componente de Inversión'}
                      </span>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-white leading-snug line-clamp-2" title={comp.producto}>
                        {comp.producto}
                      </h5>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badgeBg}`}>
                      {isZeroComp && esControversia ? 'Sin valorizar (En controversia)' : isZeroComp && esParalizada ? 'Sin valorizar (Paralizada)' : `${pct.toFixed(1)}%`}
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                    <div
                      style={{ width: `${Math.max(isZeroComp && (esControversia || esParalizada) ? 4 : 0, Math.min(100, pct))}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${colorBar}`}
                    ></div>
                  </div>

                  {/* Valores financieros y meta física */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-900">
                    <div>
                      <span className="block text-slate-400 dark:text-slate-500">Valorizado / Costo:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {formatMoney(comp.monto_valorizado)}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 block">de {formatMoney(comp.costo_inversion)}</span>
                      {isZeroComp && (esControversia || esParalizada) && (
                        <span className={`${esControversia ? 'text-red-600 dark:text-red-400/90' : 'text-amber-600 dark:text-amber-400/90'} text-[9px] block font-medium mt-0.5`}>
                          {esControversia ? 'Entrega pendiente / En litigio' : 'Detenido por paralización'}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="block text-slate-400 dark:text-slate-500">Meta programada:</span>
                      {comp.meta_capacidad && Number(comp.meta_capacidad) > 0 ? (
                        <>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {Number(comp.meta_capacidad).toLocaleString('es-PE')}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 block truncate">{comp.unidad_medida?.toLowerCase()}</span>
                        </>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 block italic leading-tight">
                          Adquisición de bien / Sin metrado civil
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Situación / Anotación de campo */}
                  {comp.situacion && (
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="italic leading-tight">{comp.situacion}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {listaComponentes.length > 4 && (
            <button
              onClick={() => setShowAllComponents(!showAllComponents)}
              className="w-full py-1.5 text-center text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors"
            >
              {showAllComponents ? 'Mostrar solo los 4 primeros componentes' : `Mostrar los ${listaComponentes.length} componentes completos`}
            </button>
          )}
        </div>
      )}

      {/* 3.6. Historial de Situación y Controversias Oficiales (Formato 12-B) */}
      {listaHistorial.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                <span>Historial de Situación y Controversias Oficiales (Formato 12-B)</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Anotaciones cronológicas registradas oficialmente por la Unidad Ejecutora en el Banco de Inversiones
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 self-start sm:self-auto">
              Seguimiento MEF
            </span>
          </div>

          <div className="space-y-2">
            {listaHistorial.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                  item.es_controversia
                    ? 'bg-red-50/70 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800/50 dark:text-red-200'
                    : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-950/80 dark:border-slate-800 dark:text-slate-300 shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    {item.fecha}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                    item.es_controversia
                      ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/60 dark:text-red-300 dark:border-red-700'
                      : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}>
                    {item.tipo}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed font-sans text-slate-700 dark:text-slate-200">
                  {item.descripcion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Reprogramaciones y Ampliaciones de Plazo */}
      {reprogramaciones.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
            <span>Modificaciones de Cronograma y Ampliaciones ({reprogramaciones.length})</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {reprogramaciones.map((cr, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-white block text-[11px]">{cr.descripcion}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {cr.fecha_inicio} <ArrowRight className="inline w-2.5 h-2.5 mx-0.5 text-slate-400 dark:text-slate-500" /> {cr.fecha_fin}
                  </span>
                </div>
                {cr.es_reprogramacion ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 font-bold shrink-0">
                    Ampliación
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold shrink-0">
                    Inicial
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Alertas y Riesgos Identificados en Campo */}
      {alertas_campo.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Riesgos y Problemáticas Reportadas por la Supervisión</span>
          </h4>

          <div className="space-y-2">
            {alertas_campo.map((alt, idx) => (
              <div key={idx} className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 text-xs space-y-1 shadow-sm">
                <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 font-bold">
                  <span>{alt.riesgo} ({alt.periodo})</span>
                  {alt.responsable && (
                    <span className="text-[10px] font-normal px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800/60 rounded">
                      Resp: {alt.responsable}
                    </span>
                  )}
                </div>
                {alt.detalle && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    {alt.detalle}
                  </p>
                )}
                {alt.mitigacion && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 italic">
                    Acción de mitigación: {alt.mitigacion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
