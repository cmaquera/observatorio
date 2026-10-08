import React from 'react';

/**
 * ObservatorioLogo - Logo oficial de Auditoría Cívica de Obras Públicas del Perú 🇵🇪
 * Simboliza la infraestructura pública (edificación / puente) bajo la lupa y escudo
 * de fiscalización y validación ciudadana con los colores patrios.
 */
export default function ObservatorioLogo({ size = 40, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        {/* Gradiente Rojo Peruano */}
        <linearGradient id="peRedGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>

        {/* Brillo Superior */}
        <linearGradient id="peGlossGrad" x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>

        {/* Gradiente Lente Auditoría */}
        <linearGradient id="lensGrad" x1="18" y1="18" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.85" />
        </linearGradient>

        {/* Sombra de relieve */}
        <filter id="softShadow" x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* 1. Fondo Escudo / Squircle con relieve */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="12"
        fill="url(#peRedGrad)"
        stroke="#ffffff"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />

      {/* 2. Franja blanca central sutil (Bandera del Perú institucional) */}
      <rect
        x="16"
        y="2"
        width="16"
        height="44"
        fill="#ffffff"
        fillOpacity="0.12"
      />

      {/* 3. Brillo de volumen tridimensional */}
      <rect
        x="3"
        y="3"
        width="42"
        height="20"
        rx="10"
        fill="url(#peGlossGrad)"
      />

      {/* 4. Silueta de Obra Pública (Edificio / Hospital / Colegio / Puente en construcción) */}
      <g filter="url(#softShadow)">
        {/* Grúa / Estructura de obra */}
        <path
          d="M10 36V22L16 16V36H10Z"
          fill="#ffffff"
          fillOpacity="0.45"
        />
        {/* Ventanitas de edificación pública */}
        <rect x="12" y="24" width="2" height="2" rx="0.5" fill="#ffffff" fillOpacity="0.8" />
        <rect x="12" y="28" width="2" height="2" rx="0.5" fill="#ffffff" fillOpacity="0.8" />
        <rect x="12" y="32" width="2" height="2" rx="0.5" fill="#ffffff" fillOpacity="0.8" />

        {/* Edificio central / Obra principal */}
        <path
          d="M17 36V18L25 12V36H17Z"
          fill="#ffffff"
          fillOpacity="0.9"
        />
        <rect x="19" y="17" width="2.5" height="3" rx="0.5" fill="#dc2626" fillOpacity="0.8" />
        <rect x="19" y="23" width="2.5" height="3" rx="0.5" fill="#dc2626" fillOpacity="0.8" />
        <rect x="19" y="29" width="2.5" height="3" rx="0.5" fill="#dc2626" fillOpacity="0.8" />

        {/* Base de cimientos */}
        <rect x="8" y="36" width="32" height="2.5" rx="1" fill="#ffffff" fillOpacity="0.9" />
      </g>

      {/* 5. Lupa de Auditoría y Validación Ciudadana (Ojo Auditor) */}
      <g filter="url(#softShadow)">
        {/* Lente con aro dorado / blanco */}
        <circle
          cx="30"
          cy="23"
          r="9.5"
          fill="url(#lensGrad)"
          stroke="#ffffff"
          strokeWidth="2.2"
        />

        {/* Mango de la Lupa */}
        <path
          d="M37 30L42.5 35.5"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M37 30L42.5 35.5"
          stroke="#991b1b"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Checkmark de Verificación / Validación de Obra */}
        <path
          d="M26 23.2L28.8 26L34.5 19.8"
          stroke="#16a34a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Destello de transparencia en el lente */}
        <circle
          cx="27.5"
          cy="20.5"
          r="1.5"
          fill="#ffffff"
        />
      </g>
    </svg>
  );
}
