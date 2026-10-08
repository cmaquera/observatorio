import React from 'react';
import { Search, ShieldAlert, MapPin, Building2, Layers, Sun, Moon } from 'lucide-react';
import ObservatorioLogo from './ObservatorioLogo';

export default function Navbar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onSearch,
  theme = 'dark',
  onToggleTheme
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <header className="bg-white/90 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo Oficial y Nombre */}
          <div
            className="flex items-center gap-3 cursor-pointer group select-none"
            onClick={() => setActiveTab('dashboard')}
            title="Ir al inicio del Observatorio"
          >
            <div className="transition-transform group-hover:scale-105">
              <ObservatorioLogo size={42} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                  OBSERVATORIO
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/60">
                  OBRAS PÚBLICAS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Auditoría cívica · Cruce MEF, SEACE e Infobras
              </p>
            </div>
          </div>

          {/* Buscador Universal */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por CUI (ej. 2141328), obra o contratista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Pestañas de Navegación y Selector de Tema */}
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Críticos & KPIs</span>
              </button>

              <button
                onClick={() => setActiveTab('mapa')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'mapa'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Mapa</span>
              </button>

              <button
                onClick={() => setActiveTab('obras')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'obras'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Todas las Obras</span>
              </button>

              <button
                onClick={() => setActiveTab('empresas')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'empresas'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Contratistas</span>
              </button>
            </nav>

            {/* Botón de Modo Claro / Modo Oscuro */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Cambiar a modo claro (luz)' : 'Cambiar a modo oscuro'}
                className="p-2 rounded-xl border cursor-pointer transition-all bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-amber-400 dark:border-slate-800 hover:scale-105 active:scale-95"
                aria-label="Alternar tema de color"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

