import React, { useEffect, useState } from 'react';
import { Landmark, ChevronDown, ChevronUp } from 'lucide-react';
import { getSectores } from '../services/api';
import { formatCompactMoney as formatMoney } from '../utils/formatters';

export default function SectorDistribution({ departamento }) {
  const [sectores, setSectores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSectores({ departamento: departamento || undefined })
      .then((data) => {
        setSectores(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando sectores:', err);
        setLoading(false);
      });
  }, [departamento]);

  if (loading || sectores.length === 0) return null;

  const maxMonto = Math.max(...sectores.map((s) => s.monto_total || 1));
  const visibleSectores = showAll ? sectores : sectores.slice(0, 6);
  const hasMore = sectores.length > 6;

  return (
    <section
      aria-labelledby="sector-dist-heading"
      className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm dark:shadow-xl mb-8 transition-colors"
    >
      <header className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 id="sector-dist-heading" className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Landmark className="w-4 h-4 text-sky-400" aria-hidden="true" />
          <span>Inversión por Sector ({departamento || 'Nacional'})</span>
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {sectores.length} sectores económicos monitoreados
        </span>
      </header>

      <div id="grid-sectores-distribucion" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleSectores.map((s) => {
          const pct = ((s.monto_total / maxMonto) * 100).toFixed(0);

          return (
            <article
              key={s.sector}
              className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 p-3 rounded-xl transition-all"
            >
              <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={s.sector}>
                  {s.sector}
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-200 shrink-0">
                  {formatMoney(s.monto_total)}
                </span>
              </div>

              <div
                role="progressbar"
                aria-valuenow={Number(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Distribución de inversión en ${s.sector}: ${pct}% respecto al líder`}
                className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-1.5"
              >
                <div
                  style={{ width: `${pct}%` }}
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                ></div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{s.total_obras} obras</span>
                <span className="text-slate-400 dark:text-slate-500">{pct}% del líder</span>
              </div>
            </article>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-3 pt-2 text-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            aria-expanded={showAll}
            aria-controls="grid-sectores-distribucion"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors cursor-pointer"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>Mostrar menos sectores</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>Ver todos los sectores ({sectores.length})</span>
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
