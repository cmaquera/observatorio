import React, { useEffect, useState } from 'react';
import { Building2, Search, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { getEmpresas } from '../services/api';
import { formatCompactMoney as formatMoney } from '../utils/formatters';

export default function ContratistasTable({ departamento }) {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchEmpresas = () => {
    setLoading(true);
    getEmpresas({
      departamento: departamento || undefined,
      q: search.trim() || undefined,
      limit: 50
    })
      .then((data) => {
        setEmpresas(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando empresas:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEmpresas();
  }, [departamento]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEmpresas();
  };

  return (
    <section
      aria-labelledby="contratistas-heading"
      className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl mb-8 transition-colors"
    >
      
      {/* Cabecera */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 id="contratistas-heading" className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-500" aria-hidden="true" />
            <span>Empresas y Contratistas Involucrados (Data SEACE / OECE)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Volumen de obras públicas adjudicadas, montos contratados y ratio de proyectos en alerta.
          </p>
        </div>

        {/* Buscador de Empresas */}
        <form
          onSubmit={handleSearchSubmit}
          role="search"
          aria-label="Búsqueda de empresas contratistas"
          className="relative w-full sm:w-72"
        >
          <label htmlFor="search-contratistas-input" className="sr-only">
            Buscar por RUC o Razón Social
          </label>
          <input
            id="search-contratistas-input"
            type="search"
            placeholder="Buscar por RUC o Razón Social..."
            aria-label="Buscar por RUC o Razón Social"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" aria-hidden="true" />
        </form>
      </header>

      {/* Tabla de Empresas */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-xs text-slate-700 dark:text-slate-300"
          aria-label="Empresas y contratistas de obras públicas adjudicadas"
        >
          <caption className="sr-only">
            Relación de contratistas del SEACE con detalle de obras asignadas y nivel de alerta
          </caption>
          <thead className="bg-slate-50 dark:bg-slate-950/80 uppercase text-[11px] font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th scope="col" className="py-3 px-4">RUC / Identificador</th>
              <th scope="col" className="py-3 px-4">Razón Social / Contratista</th>
              <th scope="col" className="py-3 px-4">Tipo</th>
              <th scope="col" className="py-3 px-4 text-center">N° Contratos</th>
              <th scope="col" className="py-3 px-4 text-right">Monto Adjudicado Acumulado</th>
              <th scope="col" className="py-3 px-4 text-center">Obras en Alerta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              <tr>
                <td colSpan="6" role="status" aria-live="polite" className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Cargando empresas del SEACE...
                </td>
              </tr>
            ) : empresas.length === 0 ? (
              <tr>
                <td colSpan="6" role="status" aria-live="polite" className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No se encontraron contratistas con los criterios especificados.
                </td>
              </tr>
            ) : (
              empresas.map((emp) => (
                <tr
                  key={emp.ruc || emp.razon_social}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-500 dark:text-slate-400">
                    {emp.ruc || 'No registrado'}
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {emp.razon_social}
                  </td>

                  <td className="py-3.5 px-4">
                    {emp.es_consorcio ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/80 dark:text-purple-400 dark:border-purple-800/60">
                        Consorcio
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                        Empresa
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center font-medium text-slate-900 dark:text-white">
                    {emp.total_contratos}
                  </td>

                  <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(emp.monto_total_contratado)}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {emp.obras_en_alerta > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                        <AlertTriangle className="w-3 h-3" />
                        {emp.obras_en_alerta} en riesgo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle className="w-3 h-3" />
                        En regla
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </section>
  );
}
