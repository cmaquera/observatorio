import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Clock,
  Building,
  MapPin,
  FileSearch,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const formatMoney = (amount) => {
  if (!amount && amount !== 0) return 'S/ 0.00';
  return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CriticalProjects({ projects = [], onSelectProject, loading }) {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8">
        <div className="h-6 w-64 bg-slate-200 dark:bg-slate-800 rounded mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 mb-8 text-center">
        <AlertCircle className="w-10 h-10 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">¡Buenas noticias! Sin obras en peligro crítico</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          En la zona seleccionada no se registran obras con desvíos financieros ni plazos vencidos severos.
        </p>
      </div>
    );
  }

  const visibleProjects = showAll ? projects : projects.slice(0, 3);
  const hasMore = projects.length > 3;

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-red-200 dark:border-red-900/30 rounded-2xl p-5 sm:p-6 mb-8 shadow-sm dark:shadow-2xl relative transition-colors">
      
      {/* Header de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Alertas Prioritarias de Fiscalización
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                {projects.length} {projects.length === 1 ? 'obra observada' : 'obras observadas'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Obras con dinero desembolsado superior a la construcción física o plazos vencidos.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400" />
          <span>Ordenadas por gravedad</span>
        </div>
      </div>

      {/* Lista de Proyectos Críticos */}
      <div className="space-y-3.5">
        {visibleProjects.map((p) => {
          const ev = p.evaluacion_riesgo || {};
          const diff = p.diferencia_avance || 0;
          const isCritical = ev.nivel_alerta === 'CRITICO';

          return (
            <div
              key={p.cui}
              onClick={() => onSelectProject(p.cui)}
              className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 hover:border-red-500/70 rounded-xl p-4 sm:p-5 transition-all hover:shadow-lg dark:hover:shadow-red-950/20 cursor-pointer group"
            >
              {/* Encabezado de la Tarjeta */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60">
                    CUI {p.cui}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <strong>{p.distrito}</strong>, {p.provincia}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                    isCritical
                      ? 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                      : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}>
                    {isCritical ? '🔴 Peligro Crítico' : '🟠 Alerta Alta'}
                  </span>
                  {ev.score_criticidad > 0 && (
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      Riesgo {Math.round(ev.score_criticidad)}/100
                    </span>
                  )}
                </div>
              </div>

              {/* Título de la Obra y Entidad */}
              <div className="mb-3">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2 leading-snug">
                  {p.nombre}
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">Entidad: <strong className="text-slate-700 dark:text-slate-300 font-medium">{p.entidad}</strong></span>
                </div>
              </div>

              {/* Comparador Visual Ágil de Avance */}
              <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 mb-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Avance Físico:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{p.avance_fisico?.toFixed(1)}%</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Financiero Pagado:</span>
                    <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold">{p.avance_financiero?.toFixed(1)}%</strong>
                  </div>
                </div>

                {/* Barra de progreso combinada */}
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, p.avance_fisico || 0)}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Ejecutado físicamente: ${p.avance_fisico}%`}
                  ></div>
                  <div
                    style={{ width: `${Math.max(0, Math.min(100, (p.avance_financiero || 0) - (p.avance_fisico || 0)))}%` }}
                    className="bg-red-500/90 h-full"
                    title={`Desfase pagado sin sustento físico: ${diff}%`}
                  ></div>
                </div>

                {/* Mensaje conciso de diagnóstico ciudadano */}
                <div className="mt-2 text-xs flex flex-wrap items-center justify-between gap-2">
                  {diff > 5 ? (
                    <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                      <span>⚠️ Desfase:</span>
                      <span>Se desembolsó +{diff.toFixed(1)}% más de lo construido en obra</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">
                      Avance económico y físico con desfase controlado
                    </span>
                  )}

                  {ev.alerta_plazo_vencido ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Vencida hace {p.dias_atraso} días</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Plazo contractual vigente</span>
                    </span>
                  )}
                </div>

                {/* Causal de retraso si existe */}
                {p.causal_retraso && !p.causal_retraso.toLowerCase().includes('sin causales') && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                    <FileSearch className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">
                      <strong className="text-slate-700 dark:text-slate-300">Causa oficial del retraso: </strong>
                      {p.causal_retraso}
                    </span>
                  </div>
                )}
              </div>

              {/* Pie de Tarjeta: Presupuesto y Botón */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 block">
                    Presupuesto Actualizado
                  </span>
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">
                    {formatMoney(p.costo_actualizado)}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProject(p.cui);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all group-hover:scale-105 shrink-0 cursor-pointer"
                >
                  <span>Auditar Obra</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón de expansión */}
      {hasMore && (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm cursor-pointer"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 text-red-500 dark:text-red-400" />
                <span>Mostrar menos obras (solo las 3 más críticas)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-red-500 dark:text-red-400" />
                <span>Ver las {projects.length - 3} obras observadas adicionales</span>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
