import React from 'react';
import { DollarSign, AlertOctagon, Clock, TrendingUp, ShieldAlert, CheckCircle2 } from 'lucide-react';

const formatMoney = (amount) => {
  if (!amount && amount !== 0) return 'S/ 0.00';
  if (amount >= 1_000_000_000) {
    return `S/ ${(amount / 1_000_000_000).toFixed(2)} Mil Millones`;
  }
  if (amount >= 1_000_000) {
    return `S/ ${(amount / 1_000_000).toFixed(2)} Millones`;
  }
  return `S/ ${amount.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;
};

export default function MetricCards({ kpis, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800/60 rounded-2xl border border-slate-300 dark:border-slate-700/60"></div>
        ))}
      </div>
    );
  }

  const {
    total_inversiones = 0,
    presupuesto_total = 0,
    monto_en_riesgo = 0,
    total_criticos = 0,
    total_alertas = 0,
    desfase_promedio_pp = 0,
    plazo_vencido_count = 0
  } = kpis || {};

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 transition-colors">
      
      {/* 1. Presupuesto Total */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Inversión Vigilada
          </span>
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatMoney(presupuesto_total)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="font-semibold text-blue-600 dark:text-blue-400">{total_inversiones} obras públicas</span>
            <span>auditadas</span>
          </div>
        </div>
      </div>

      {/* 2. Dinero Público en Riesgo */}
      <div className="bg-white dark:bg-slate-900/90 border border-red-200 dark:border-red-900/40 hover:border-red-300 dark:hover:border-red-800/60 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
            Monto en Observación
          </span>
          <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50">
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black text-red-600 dark:text-red-400 tracking-tight">
            {formatMoney(monto_en_riesgo)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            En proyectos con retrasos o pagos adelantados
          </div>
        </div>
      </div>

      {/* 3. Obras en Peligro Crítico */}
      <div className="bg-white dark:bg-slate-900/90 border border-amber-200 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-800/60 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Alertas de Fiscalización
          </span>
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {total_criticos}
          </div>
          <span className="text-[11px] font-bold text-red-700 dark:text-red-400 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60">
            críticas prioritarias
          </span>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          De {total_alertas} obras con observaciones técnicas
        </div>
      </div>

      {/* 4. Obras Retrasadas */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 shadow-sm dark:shadow-lg relative overflow-hidden transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Plazos y Cronogramas
          </span>
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
            <span>{plazo_vencido_count}</span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-normal">obras vencidas</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span>Desfase medio:</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">+{desfase_promedio_pp}% financiero</span>
          </div>
        </div>
      </div>

    </div>
  );
}

