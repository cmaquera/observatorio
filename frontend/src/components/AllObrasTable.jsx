import React, { useEffect, useState } from 'react';
import { Layers, ArrowUpDown, ChevronLeft, ChevronRight, AlertCircle, ArrowUpRight, Clock } from 'lucide-react';
import { getObras } from '../services/api';

const formatMoney = (val) => {
  if (!val && val !== 0) return 'S/ 0.00';
  return `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function AllObrasTable({ filters, onSelectProject }) {
  const [data, setData] = useState({ items: [], total: 0, total_pages: 1, page: 1 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('score_desc');

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    getObras({
      departamento: filters.departamento || undefined,
      provincia: filters.provincia || undefined,
      distrito: filters.distrito || undefined,
      nivel_alerta: filters.nivel_alerta !== 'TODAS' ? filters.nivel_alerta : undefined,
      q: filters.q || undefined,
      page: page,
      page_size: 15,
      sort_by: sortBy
    })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando obras:', err);
        setLoading(false);
      });
  }, [filters, page, sortBy]);

  const getColorBadge = (alerta) => {
    switch (alerta) {
      case 'CRITICO':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800';
      case 'ALTO':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800';
      case 'MEDIO':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800';
      case 'NORMAL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl mb-8 transition-colors">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-red-500" />
            <span>Catálogo Completo de Inversiones Monitoreadas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {data.total} obras encontradas según los filtros seleccionados
          </p>
        </div>

        {/* Ordenamiento */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Ordenar por:</span>
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-red-500 text-xs cursor-pointer"
          >
            <option value="score_desc">Mayor Riesgo (Retraso o Sobrecosto)</option>
            <option value="monto_desc">Mayor Presupuesto (Más Dinero)</option>
            <option value="desfase_desc">Mayor Desfase (Pagado vs Hecho)</option>
            <option value="nombre_asc">Nombre de Obra (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Tabla de Obras */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-950/80 uppercase text-[11px] font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-3">CUI</th>
              <th className="py-3 px-4">Obra y Entidad Responsable</th>
              <th className="py-3 px-3">Ubicación</th>
              <th className="py-3 px-3 text-right">Presupuesto</th>
              <th className="py-3 px-3 text-center" title="Avance Físico reportado vs Dinero Pagado">¿Hecho / Pagado?</th>
              <th className="py-3 px-3 text-center" title="Diferencia de puntos porcentuales entre lo pagado y lo construido">Diferencia</th>
              <th className="py-3 px-3 text-center">Semáforo</th>
              <th className="py-3 px-3 text-center">Ficha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-10 text-slate-500 dark:text-slate-400">
                  Consultando registros del MEF...
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-10 text-slate-500 dark:text-slate-400">
                  No se encontraron obras con los criterios seleccionados.
                </td>
              </tr>
            ) : (
              data.items.map((o) => {
                const ev = o.evaluacion_riesgo || {};
                const diff = o.diferencia_avance || 0;
                const badgeClass = getColorBadge(ev.nivel_alerta);

                return (
                  <tr
                    key={o.cui}
                    onClick={() => onSelectProject(o.cui)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-3 font-mono font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                      {o.cui}
                    </td>

                    <td className="py-3.5 px-4 min-w-[260px] max-w-md">
                      <div className="font-semibold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors line-clamp-2">
                        {o.nombre}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                        {o.entidad}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      <div>{o.provincia}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{o.distrito}</div>
                    </td>

                    <td className="py-3.5 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatMoney(o.costo_actualizado)}
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{o.avance_fisico?.toFixed(0)}%</span>
                      <span className="text-slate-400 dark:text-slate-500 mx-1">/</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{o.avance_financiero?.toFixed(0)}%</span>
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {diff > 0 ? (
                        <span className="font-bold text-red-600 dark:text-red-400">+{diff.toFixed(1)} pp</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">{diff.toFixed(1)} pp</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                        {ev.nivel_alerta || 'NORMAL'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProject(o.cui);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-600 text-slate-600 hover:text-white dark:bg-slate-800 dark:hover:bg-red-600 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                        title="Ver Ficha Técnica"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {data.total_pages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Página <span className="font-semibold text-slate-900 dark:text-white">{data.page}</span> de <span className="font-semibold text-slate-900 dark:text-white">{data.total_pages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 dark:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={data.page >= data.total_pages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 dark:text-white transition-colors cursor-pointer"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
