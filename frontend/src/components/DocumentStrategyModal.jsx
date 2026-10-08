import React from 'react';
import {
  X, FileSearch, ShieldCheck, Database, FileText, CheckCircle2,
  AlertTriangle, Sparkles, Server
} from 'lucide-react';

export default function DocumentStrategyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 transition-colors">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col transition-colors">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/80 dark:text-red-400 dark:border-red-800/80">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Estrategia de Inteligencia y Extracción Documental</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                  Auditoría Cívica
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cómo superamos los bloqueos de portales estatales y analizamos los datos ocultos de contratos y adendas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-700 dark:text-slate-300">
          
          {/* El Problema Real */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">
                ¿Por qué fallan las descargas directas en los portales del Estado (SEACE, Infobras, MEF)?
              </h3>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Los servidores del Estado peruano están blindados con firewalls (<strong>Imperva Incapsula WAF</strong>), tokens de sesión que vencen a los pocos minutos y comprobaciones <strong>CAPTCHA</strong> obligatorias. Cuando una web externa intenta enlazar directamente a sus archivos internos, los servidores devuelven errores <strong>404 (No encontrado)</strong> o pantallas de bloqueo de acceso.
              </p>
            </div>
          </div>

          {/* Los 4 Pilares de la Solución */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Nuestra Estrategia en 4 Pasos para Obtener y Analizar los Datos</span>
            </h3>

            {/* Paso 1 */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex gap-4">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 flex items-center justify-center font-bold text-sm shrink-0">
                1
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Ingesta de Volcados Masivos (PNDA y Estándar OCDS) sin Bloqueos WAF
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  En lugar de consultar páginas web individuales con CAPTCHA, ingerimos los <strong>datasets oficiales masivos (Dumps mensuales)</strong> que MEF, OECE y Contraloría publican por ley en el Portal Nacional de Datos Abiertos (PNDA). Estos repositorios abiertos no tienen cortafuegos y contienen el histórico íntegro de proyectos y contratos.
                </p>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex gap-4">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800 flex items-center justify-center font-bold text-sm shrink-0">
                2
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Análisis Automático de Adendas, Sobrecostos y Causales de Retraso
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  La información clave sobre por qué una obra falla está en las <strong>adendas contractuales</strong> y resoluciones de ampliación de plazo. Nuestro módulo de análisis extrae:
                </p>
                <ul className="list-disc pl-5 text-slate-700 dark:text-slate-300 space-y-1 mt-1">
                  <li><strong>Causal clasificada:</strong> Deficiencias en expediente técnico, adicionales de obra, fallas del contratista o problemas de terreno (según el marco de la Ley N° 30225).</li>
                  <li><strong>Sobrecosto acumulado:</strong> Suma de presupuestos extraordinarios aprobados por encima del monto contractual original.</li>
                </ul>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex gap-4">
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800 flex items-center justify-center font-bold text-sm shrink-0">
                3
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Identificación de la Empresa Supervisora Responsable
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Detrás de cada obra hay una <strong>empresa o consorcio supervisor pagado con dinero público</strong> para vigilar la calidad y el cumplimiento de los plazos. Vinculamos los reportes de supervisión de Infobras para mostrar el RUC y nombre del supervisor responsable de alertar irregularidades.
                </p>
              </div>
            </div>

            {/* Paso 4 */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex gap-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                4
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Generación Certificada y Descargas Locales Inmediatas
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Para evitar enlaces rotos, el Observatorio compila los datos y genera al instante los expedientes estructurados listos para descargar:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                    <span><strong>Expediente PDF / Web:</strong> Dossier cívico oficial imprimible.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span><strong>Formato 12B MEF:</strong> Seguimiento físico y financiero en CSV.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <span><strong>Contratos SEACE:</strong> RUCs y miembros de consorcios en CSV.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <Server className="w-4 h-4 text-purple-500 dark:text-purple-400 shrink-0" />
                    <span><strong>Ficha Infobras:</strong> Reporte de supervisión y alertas en CSV.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cómo verificar por cuenta propia */}
          <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>¿Cómo verificar tú mismo en los portales del Estado?</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              En cada ficha de obra incluimos el botón <strong>"Copiar CUI"</strong>. Al pulsarlo, el código único de la inversión queda listo para pegar en el <em>Buscador Público del SEACE</em>, el <em>Banco de Inversiones del MEF</em> o <em>Infobras de Contraloría</em>, superando las protecciones antibot sin inconvenientes.
            </p>
          </div>

        </div>

        {/* Pie */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Transparencia cívica con datos abiertos certificados</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Entendido, cerrar
          </button>
        </div>

      </div>
    </div>
  );
}

