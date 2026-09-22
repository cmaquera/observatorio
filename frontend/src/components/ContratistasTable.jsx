import React, { useEffect, useState } from 'react';
import { Building2, Search, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { getEmpresas } from '../services/api';

const formatMoney = (val) => {
  if (!val && val !== 0) return 'S/ 0.00';
  if (val >= 1_000_000_000) return `S/ ${(val / 1_000_000_000).toFixed(2)} Mil Millones`;
  if (val >= 1_000_000) return `S/ ${(val / 1_000_000).toFixed(2)} Millones`;
  return `S/ ${val.toLocaleString('es-PE')}`;
};

export default function ContratistasTable({ departamento, onSelectCompany }) {
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-500" />
            <span>Empresas y Contratistas Involucrados (Data SEACE / OECE)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Volumen de obras públicas adjudicadas, montos contratados y ratio de proyectos en alerta.
          </p>
        </div>

        {/* Buscador de Empresas */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar por RUC o Razón Social..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </form>
      </div>

      {/* Tabla de Empresas */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 uppercase text-[11px] font-semibold text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">RUC / Identificador</th>
              <th className="py-3 px-4">Razón Social / Contratista</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4 text-center">N° Contratos</th>
              <th className="py-3 px-4 text-right">Monto Adjudicado Acumulado</th>
              <th className="py-3 px-4 text-center">Obras en Alerta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-slate-400">
                  Cargando empresas del SEACE...
                </td>
              </tr>
            ) : empresas.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-slate-400">
                  No se encontraron contratistas con los criterios especificados.
                </td>
              </tr>
            ) : (
              empresas.map((emp) => (
                <tr
                  key={emp.ruc || emp.razon_social}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-400">
                    {emp.ruc || 'No registrado'}
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-white">
                    {emp.razon_social}
                  </td>

                  <td className="py-3.5 px-4">
                    {emp.es_consorcio ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/80 text-purple-400 border border-purple-800/60">
                        Consorcio
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        Empresa
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center font-medium text-white">
                    {emp.total_contratos}
                  </td>

                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                    {formatMoney(emp.monto_total_contratado)}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {emp.obras_en_alerta > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-red-950 text-red-400 border border-red-800">
                        <AlertTriangle className="w-3 h-3" />
                        {emp.obras_en_alerta} en riesgo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
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

    </div>
  );
}
