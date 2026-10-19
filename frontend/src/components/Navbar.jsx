import React from 'react';
import { Search, ShieldAlert, Activity, Building2, Layers, Sun, Moon } from 'lucide-react';
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
          <button
            type="button"
            className="flex items-center gap-3 cursor-pointer group select-none text-left bg-transparent border-0 p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg"
            onClick={() => setActiveTab('command')}
            title="Ir al Centro de Mando del Observatorio"
            aria-label="Ir al Centro de Monitoreo del Observatorio de Obras Públicas"
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
          </button>

          {/* Buscador Universal */}
          <form
            role="search"
            aria-label="Búsqueda global de inversiones públicas"
            onSubmit={(e) => {
              e.preventDefault();
              onSearch();
            }}
            className="flex-1 max-w-md hidden md:block"
          >
            <div className="relative">
              <label htmlFor="navbar-desktop-search" className="sr-only">
                Buscar por CUI, obra o contratista
              </label>
              <input
                id="navbar-desktop-search"
                type="search"
                placeholder="Buscar por CUI (ej. 2141328), obra o contratista..."
                aria-label="Buscar por CUI, obra o contratista"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" aria-hidden="true" />
            </div>
          </form>

          {/* Pestañas de Navegación y Selector de Tema */}
          <div className="flex items-center gap-2">
            <nav
              aria-label="Navegación principal del observatorio"
              className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors"
            >
              <button
                type="button"
                onClick={() => setActiveTab('command')}
                aria-current={activeTab === 'command' ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'command'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Centro de Monitoreo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                aria-current={activeTab === 'dashboard' ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Críticos & KPIs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('obras')}
                aria-current={activeTab === 'obras' ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'obras'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Todas las Obras</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('empresas')}
                aria-current={activeTab === 'empresas' ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'empresas'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Contratistas</span>
              </button>
            </nav>

            {/* Botón de Modo Claro / Modo Oscuro */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Cambiar a modo claro (luz)' : 'Cambiar a modo oscuro'}
                className="p-2 rounded-xl border cursor-pointer transition-all bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-amber-400 dark:border-slate-800 hover:scale-105 active:scale-95"
                aria-label="Alternar tema de color"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" aria-hidden="true" />
                )}
              </button>
            )}
          </div>

        </div>

        {/* Buscador Universal en Móvil (< 768px) */}
        <form
          role="search"
          aria-label="Búsqueda móvil de inversiones públicas"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
          className="md:hidden pb-3"
        >
          <div className="relative">
            <label htmlFor="navbar-mobile-search" className="sr-only">
              Buscar por CUI, obra o contratista
            </label>
            <input
              id="navbar-mobile-search"
              type="search"
              placeholder="Buscar por CUI (ej. 2141328), obra o contratista..."
              aria-label="Buscar por CUI, obra o contratista"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" aria-hidden="true" />
          </div>
        </form>
      </div>
    </header>
  );
}

