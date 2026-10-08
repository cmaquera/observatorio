import React, { useState, useEffect } from 'react';
import {
  Camera, FileText, Download, ExternalLink, Maximize2,
  ChevronLeft, ChevronRight, X, Calendar, CheckCircle2,
  AlertTriangle, TrendingUp, Sparkles, Image as ImageIcon
} from 'lucide-react';

const formatMoney = (val) => {
  if (!val && val !== 0) return 'S/ 0.00';
  return `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function GaleriaFotosObra({ fotos = [], cui }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [filterYear, setFilterYear] = useState('ALL');

  if (!fotos || fotos.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3 transition-colors shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center mx-auto text-slate-500 dark:text-slate-400 shadow-xs">
          <Camera className="w-7 h-7 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">
            No hay fotos digitales registradas
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Esta obra no cuenta con reportes fotográficos mensuales cargados en el aplicativo digital de SEACE/MEF (común en obras por Administración Directa o anteriores a la digitalización del cuaderno de obra).
          </p>
        </div>
      </div>
    );
  }

  // Años disponibles para filtrar
  const years = ['ALL', ...Array.from(new Set(fotos.map(f => f.periodo?.split('-')[0]).filter(Boolean)))];

  const fotosFiltradas = filterYear === 'ALL'
    ? fotos
    : fotos.filter(f => f.periodo?.startsWith(filterYear));

  // Manejo de teclado para el Lightbox (Escape, Flechas)
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev > 0 ? prev - 1 : fotosFiltradas.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev < fotosFiltradas.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, fotosFiltradas.length]);

  const fotoActual = lightboxIndex !== null ? fotosFiltradas[lightboxIndex] : null;

  return (
    <div className="space-y-4">
      {/* Encabezado y Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Evidencia Fotográfica de Trabajos en Terreno</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800">
              {fotos.length} Fotografías Oficiales
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Fotos mensuales adjuntadas por la supervisión de obra en SEACE/MEF para constatar el avance físico real
          </p>
        </div>

        {/* Filtros por Año si hay más de un año */}
        {years.length > 2 && (
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
            {years.map((yr) => (
              <button
                key={yr}
                onClick={() => setFilterYear(yr)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterYear === yr
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {yr === 'ALL' ? 'Todos' : yr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid de Fotografías */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {fotosFiltradas.map((foto, idx) => {
          const isFotoPdf = foto.archivo_foto?.toLowerCase().endsWith('.pdf') || foto.url_foto?.toLowerCase().includes('.pdf');
          const hasImage = !!foto.url_foto && !isFotoPdf;
          const hasPdf = !!foto.url_pdf;

          return (
            <div
              key={idx}
              className="group bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/90 hover:border-emerald-500/50 rounded-2xl overflow-hidden transition-all duration-300 shadow-xs hover:shadow-xl hover:shadow-emerald-950/20 flex flex-col"
            >
              {/* Contenedor de Imagen o Documento PDF */}
              <div
                onClick={() => (hasImage || isFotoPdf) && setLightboxIndex(idx)}
                className={`relative aspect-[16/10] bg-slate-100 dark:bg-slate-900 overflow-hidden ${(hasImage || isFotoPdf) ? 'cursor-pointer' : ''}`}
              >
                {isFotoPdf ? (
                  <div className="w-full h-full flex flex-col justify-center items-center p-4 bg-gradient-to-br from-purple-50 via-slate-50 to-purple-100/40 dark:from-slate-900 dark:via-slate-950 dark:to-purple-950/40 text-center space-y-1.5 group-hover:from-purple-100 dark:group-hover:from-slate-800 transition-all">
                    <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-900/50 border border-purple-300 dark:border-purple-600/60 flex items-center justify-center text-purple-700 dark:text-purple-300 shadow-xs group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Panel Fotográfico Oficial
                      </span>
                      <span className="text-[10px] text-purple-700 dark:text-purple-300 block">
                        Documento PDF con fotografías de obra
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/90 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      Clic para visualizar
                    </span>
                  </div>
                ) : hasImage ? (
                  <>
                    <img
                      src={foto.url_foto}
                      alt={`Obra CUI ${cui} - Periodo ${foto.periodo}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                    <div className="hidden w-full h-full items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400 text-xs">
                      <ImageIcon className="w-8 h-8 opacity-40" />
                    </div>

                    {/* Overlay al pasar el cursor */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                      <span className="text-xs text-white font-medium flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Clic para ampliar</span>
                      </span>
                      <span className="text-[10px] text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-sm">
                        HD Oficial MEF
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 space-y-1">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                    <span className="text-[11px]">Foto no disponible</span>
                  </div>
                )}

                {/* Badge de Periodo */}
                <div className="absolute top-2.5 left-2.5">
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono bg-white/95 text-slate-800 border border-slate-200/90 shadow-xs dark:bg-slate-900/90 dark:text-white dark:border-slate-700/80 backdrop-blur-md">
                    {foto.periodo}
                  </span>
                </div>

                {/* Badge de Avance Real */}
                {foto.avance_real !== undefined && (
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-800/80 backdrop-blur-md">
                      {foto.avance_real}% físico
                    </span>
                  </div>
                )}
              </div>

              {/* Información y Acciones */}
              <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Descripción del Supervisor */}
                  <p className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed" title={foto.descripcion}>
                    {foto.descripcion || 'Sin descripción detallada de actividades en la declaración mensual.'}
                  </p>

                  {/* Detalle cuantitativo */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>Monto valorizado:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">{formatMoney(foto.monto_real)}</span>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2 pt-1">
                  {hasImage && (
                    <button
                      onClick={() => setLightboxIndex(idx)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-800 dark:text-slate-200 dark:hover:text-white text-xs font-semibold dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Ver Foto</span>
                    </button>
                  )}

                  {isFotoPdf && (
                    <button
                      onClick={() => setLightboxIndex(idx)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/80 dark:hover:bg-purple-900 dark:text-purple-200 text-xs font-semibold dark:border-purple-700/80 transition-colors shadow-xs cursor-pointer"
                      title="Visualizar Panel Fotográfico Oficial en PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
                      <span>Ver Panel PDF</span>
                    </button>
                  )}

                  {hasPdf && (
                    <a
                      href={foto.url_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/70 dark:hover:bg-blue-900/70 dark:text-blue-300 text-xs font-semibold dark:border-blue-800/80 transition-colors shadow-xs"
                      title="Ver resumen oficial de valorización en PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Valoriz. PDF</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* LIGHTBOX MODAL EN PANTALLA COMPLETA */}
      {fotoActual && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 animate-in fade-in duration-200">
          {/* Barra superior de Lightbox */}
          <div className="flex items-center justify-between gap-3 text-white max-w-6xl mx-auto w-full pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                Periodo {fotoActual.periodo}
              </span>
              <span className="text-xs text-slate-400">
                Foto {lightboxIndex + 1} de {fotosFiltradas.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {fotoActual.url_pdf && (
                <a
                  href={fotoActual.url_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950 text-blue-300 hover:bg-blue-900 border border-blue-800 text-xs font-semibold transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Resumen Valorización (PDF)</span>
                </a>
              )}

              {fotoActual.url_foto && (
                <a
                  href={fotoActual.url_foto}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {fotoActual.archivo_foto?.toLowerCase().endsWith('.pdf') ? 'Descargar PDF' : 'Descargar Foto'}
                  </span>
                </a>
              )}

              <button
                onClick={() => setLightboxIndex(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Área Principal de la Imagen o Visor PDF con Flechas */}
          <div className="relative flex-1 flex items-center justify-center my-3 max-w-6xl mx-auto w-full min-h-0">
            {/* Flecha Anterior */}
            {fotosFiltradas.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev > 0 ? prev - 1 : fotosFiltradas.length - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 transition-all hover:scale-110 shadow-xl"
                title="Anterior (Flecha izquierda)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Imagen Principal o Visor de Documento PDF */}
            {fotoActual && (fotoActual.archivo_foto?.toLowerCase().endsWith('.pdf') || fotoActual.url_foto?.toLowerCase().includes('.pdf')) ? (
              <div className="w-full h-[68vh] rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 flex flex-col shadow-2xl">
                <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-purple-300 font-semibold">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Panel Fotográfico Oficial de Obra - Periodo {fotoActual.periodo}</span>
                  </div>
                  <a
                    href={fotoActual.url_foto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors shadow-sm"
                  >
                    <span>Abrir en Pantalla Completa</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <iframe
                  src={fotoActual.url_foto}
                  className="w-full flex-1 border-0 bg-white"
                  title={`Panel Fotográfico Periodo ${fotoActual.periodo}`}
                />
              </div>
            ) : fotoActual?.url_foto ? (
              <img
                src={fotoActual.url_foto}
                alt={`Foto de obra en terreno - Periodo ${fotoActual.periodo}`}
                className="max-h-full max-w-full object-contain rounded-2xl border border-slate-800 shadow-2xl"
              />
            ) : (
              <div className="text-slate-500">Documento no disponible</div>
            )}

            {/* Flecha Siguiente */}
            {fotosFiltradas.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev < fotosFiltradas.length - 1 ? prev + 1 : 0))}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 transition-all hover:scale-110 shadow-xl"
                title="Siguiente (Flecha derecha)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Pie de foto descriptivo */}
          <div className="max-w-6xl mx-auto w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white text-sm">
                  Avance Físico: {fotoActual.avance_real}%
                </span>
                <span className="text-slate-400">
                  (Programado: {fotoActual.avance_programado}%)
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-emerald-400 font-semibold">
                  Monto: {formatMoney(fotoActual.monto_real)}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                fotoActual.situacion?.includes('ATRASADA')
                  ? 'bg-red-950 text-red-300 border border-red-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {fotoActual.situacion || 'EN PLAZO'}
              </span>
            </div>

            {fotoActual.descripcion && (
              <p className="text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <strong className="text-slate-400">Anotación oficial de supervisión: </strong>
                {fotoActual.descripcion}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
