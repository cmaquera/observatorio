# Observatorio de Obras Públicas del Perú 🇵🇪

Plataforma integral de auditoría cívica, georreferenciación y transparencia para monitorear, fiscalizar y auditar las inversiones y obras públicas del Estado peruano en tiempo real.

El valor distintivo del proyecto radica en el **cruce y reconciliación automatizada de fuentes abiertas oficiales**:
1. **Ministerio de Economía y Finanzas (MEF)**:
   - **Banco de Inversiones / Invierte.pe**: Viabilidad, costos actualizados, Formato 07, Formato 08, Formato 09 (Cierre) y Formato 14 (Metas por componentes).
   - **Formato 12-B**: Seguimiento de ejecución física y financiera mensualizado.
   - **Sistema de Seguimiento de Inversiones (SSI)**: Catálogo oficial de alertas preventivas de riesgo (desfases >20%, omisiones de F12-B, obras paralizadas, riesgo de desactivación).
   - **Consulta Amigable (SIAF)**: Presupuestos vigentes (PIA, PIM), compromisos, devengados acumulados y saldos.
2. **OECE / SEACE (Sistema Electrónico de Contrataciones del Estado)**:
   - Contratos de obras, procesos de selección, bases integradas, contratistas individuales y consorcios (RUCs, integrantes y participaciones).
   - Cuadernos de obra digitalizados, suspensiones de plazo, arbitrajes y controversias contractuales.
3. **Contraloría General de la República (Infobras)**:
   - Registro de avances físicos de campo, supervisiones técnicas, estado de recepción de obra e informes de control.

---

## 🌟 Características Principales

### 1. Dashboard Ejecutivo y Top de Proyectos Críticos
- **Índice de Severidad de Riesgo (ISR)** calibrado de 0 a 100 puntos para priorizar las intervenciones que requieren mayor fiscalización ciudadana.
- **KPIs globales consolidados**: Presupuesto total auditado, monto en riesgo financiero, cantidad de proyectos en peligro crítico, obras con plazo vencido y desfase promedio en puntos porcentuales.
- **Filtros jerárquicos y buscador universal**:
  - Filtrado encadenado por **Departamento ➔ Provincia ➔ Distrito**.
  - Buscador predictivo por **Código Único de Inversión (CUI)**, **Nombre del Proyecto**, **RUC** o **Razón Social de la Empresa Contratista**.

### 2. Mapa Georreferenciado Interactivo (Leaflet)
- Geocodificación inteligente con normalización de centroides distritales para evitar coordenadas nulas o en el océano (0,0).
- Marcadores semafóricos según criticidad:
  - 🔴 **Crítico** (ISR $\ge 70$ o desfase $>20$ pp con retraso severo)
  - 🟠 **Alto** (ISR 50–69)
  - 🟡 **Medio** (ISR 30–49)
  - 🟢 **Normal / En Cronograma** (ISR $< 30$)
- Tooltips y popups informativos con apertura instantánea de la ficha técnica.

### 3. Ficha Técnica Integral y Diagnóstico para el Ciudadano
La ficha técnica traduce el lenguaje técnico-financiero estatal en diagnósticos sencillos:
- **Semáforo Ciudadano**:
  1. *Plazo de Entrega*: Estado del calendario contractual y días de demora acumulados.
  2. *Dinero vs Construcción*: Explicación didáctica (ej. *"De cada S/ 100 de presupuesto, se han desembolsado S/ 98, pero la construcción va al 11%"*).
  3. *Adendas y Supervisión*: Sobrecostos autorizados por adendas y nombre del supervisor o inspector de obra.
  4. *Cuaderno de Obra*: Identificación de causales de retraso o confirmación de obras sin causales adversas registradas.
- **Gráficos comparativos de avance**: Barra de avance físico reportado vs. avance financiero devengado con cálculo exacto de la brecha en puntos porcentuales (pp).
- **Tarjetas de control presupuestal**: Costo Actualizado, Devengado Acumulado, Saldo por Ejecutar y Plazo de Culminación.

### 4. Motor de Alertas Oficiales del Sistema de Seguimiento de Inversiones (SSI - MEF)
Reproducción algorítmica fidedigna del motor de alertas preventivas de riesgo del MEF (`script_ssi01.js` / `#modAlertassi`):
- **Alerta 1 (CRÍTICO)**: Inconsistencia entre ejecución financiera y física superior al 20%.
- **Alerta 4 (ALTO)**: Inversión no cuenta con Formato N°12-B actualizado (bandera oficial `[5]`).
- **Alerta 5 (CRÍTICO)**: Costo actualizado menor al devengado acumulado (sobrecostos / sobregiro).
- **Alerta 6 (ALTO)**: Inversión con obra paralizada sin acciones de reactivación actualizada (bandera `[7]`).
- **Alerta 7 (CRÍTICO)**: Contrataciones en estado resuelto o nulo o en arbitraje (controversias SEACE).
- **Alertas 8, 9, 10**: Incumplimientos de reporte físico, incoherencia de porcentajes y avances físicos congelados por 3 meses o más.
- **Alerta 11 / Desactivación**: Riesgo de desactivación administrativa en el Banco de Inversiones.
- **Badge animado en pestaña**: Muestra un pill pulsante (`X alertas SSI`) en el botón *Contratos & Alertas*.
- **Enlace directo verificado**: Botón *Abrir en SSI Oficial* con acceso inmediato a la ficha oficial del CUI en el MEF.

### 5. Línea de Tiempo Ciudadana y Metas Físicas por Componentes
- Reconciliación temporal de 6 hitos clave:
  1. *Viabilidad / Aprobación del Perfil* (Banco de Inversiones).
  2. *Expediente Técnico / Aprobación Definitiva*.
  3. *Inicio de Trabajos en Terreno* (verificación de avance $>0\%$).
  4. *Fecha Prevista de Culminación* (alertas de plazo vencido).
  5. *Ejecución Física por Componentes y Metas* (infraestructura, equipamiento, supervisión, liquidación con avance real en metrados vía Formato 14).
  6. *Liquidación y Transferencia* (Formato 09 oficial, entrega de obra al sector o liquidación de corte para obras inconclusas).
- Adaptado dinámicamente según modalidad de ejecución: **Contrata**, **Administración Directa** o **Mixta/Híbrida**.

### 6. Galería Oficial de Fotos de Obra en Terreno
- Extracción automatizada de paneles fotográficos de supervisión técnica cargados ante SEACE e Infobras.
- Visualizador tipo modal con zoom, fecha de periodo de inspección, avance físico certificado y descripción técnica.

### 7. Centro de Descargas Oficiales Sin Bloqueos de CAPTCHA
Generación en tiempo real y descarga directa desde el backend:
- 📄 **Expediente Oficial de Auditoría**: Ficha completa formateada para impresión o guardado en PDF con código QR y metadatos oficiales.
- 📊 **Seguimiento Financiero F12-B (MEF)**: CSV estructurado con cronogramas mensuales, devengados y valorizaciones.
- 📑 **Ficha Contractual y Adjudicación SEACE**: CSV detallado con datos de contratistas, consorciados, montos adjudicados y adendas.
- 📋 **Ficha de Control y Supervisión Infobras**: CSV con registros de inspección física y recepción.

### 8. Directorio de Contratistas y Consorcios
- Módulo de fiscalización corporativa con récord de contratos ganados, montos adjudicados, composición societaria de consorcios y tasa de obras en alerta de riesgo.

### 9. Exportación Masiva de Datos
- Descarga en formato **CSV (UTF-8 con BOM)** del conjunto de obras y filtros aplicados para análisis en Excel, Power BI, R o Python.

---

## 🏛️ Arquitectura del Sistema

El sistema implementa una arquitectura desacoplada y orientada a rendimiento:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │              Fuentes Abiertas Gubernamentales           │
                  │  MEF (Datos Abiertos, SSI, F12B, F09) · SEACE · Infobras │
                  └───────────────────────────┬─────────────────────────────┘
                                              │
                                              ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │                 Pipeline ETL / Runner                   │
                  │   - Ingesta Streaming por lotes (chunked)               │
                  │   - Normalización de Ubigeos y Centroides Geográficos   │
                  │   - Motor de Evaluación de Riesgos (ISR y Alertas SSI)  │
                  │   - Enriquecedor en línea concurrente (ThreadPool)       │
                  └───────────────────────────┬─────────────────────────────┘
                                              │
                                              ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │          Base de Datos Analítica (SQLite WAL Mode)       │
                  │   - Tablas indexadas: inversiones, contratos, documentos│
                  │   - Read-model optimizado para consultas < 20 ms        │
                  └───────────────────────────┬─────────────────────────────┘
                                              │
                                              ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │               FastAPI REST Backend (Python)             │
                  │   - Endpoints `/api/obras`, `/api/dashboard`, `/export` │
                  │   - Generador de Fichas Oficiales y Descargas Seguras   │
                  │   - Cliente HTTP resiliente con pools SSL para el MEF   │
                  └───────────────────────────┬─────────────────────────────┘
                                              │
                                              ▼
                  ┌─────────────────────────────────────────────────────────┐
                  │            Frontend SPA (React 18 + Vite + Tailwind)    │
                  │   - Mapa interactivo Leaflet con clustering semafórico  │
                  │   - Ficha modal de obra con 5 pestañas de inspección    │
                  │   - Responsive, dark mode nativo y alta accesibilidad   │
                  └─────────────────────────────────────────────────────────┘
```

---

## 📂 Estructura del Repositorio

```text
observatorio/
├── backend/
│   ├── app/
│   │   ├── etl/
│   │   │   ├── extractor.py         # Descarga y lectura streaming de datasets MEF
│   │   │   ├── transformer.py       # Transformación, cálculo de ISR y normalización
│   │   │   ├── loader.py            # Carga por lotes transaccionales a la BD
│   │   │   ├── enricher.py          # Enriquecimiento con datos de SEACE y F12-B
│   │   │   ├── enrich_db.py         # Reconciliación en línea de proyectos críticos
│   │   │   ├── mef_live_client.py   # Motor de Alertas SSI y cliente en vivo del MEF
│   │   │   ├── document_analyzer.py # Clasificación de causales en cuadernos de obra
│   │   │   └── runner.py            # Script principal de ejecución del pipeline ETL
│   │   ├── routers/
│   │   │   ├── dashboard.py         # KPIs globales y rankings de riesgo
│   │   │   ├── obras.py             # Detalle de obras, línea de tiempo y descargas
│   │   │   ├── empresas.py          # Estadísticas y contratos por contratista
│   │   │   ├── geo.py               # Jerarquía de departamentos, provincias y distritos
│   │   │   └── export.py            # Exportación de datos a CSV
│   │   ├── utils/
│   │   │   └── ubigeo_helper.py     # Diccionario y resolución de coordenadas
│   │   ├── config.py                # Variables de entorno y umbrales de criticidad
│   │   ├── database.py              # Configuración de SQLAlchemy y sesiones
│   │   ├── models.py                # Modelos ORM SQLAlchemy y esquemas Pydantic
│   │   ├── rules.py                 # Algoritmo del Índice de Severidad de Riesgo (ISR)
│   │   └── main.py                  # Instancia principal de la aplicación FastAPI
│   ├── data/
│   │   └── observatorio.db          # Base de datos SQLite analítica inicial
│   ├── Dockerfile                   # Imagen Docker para el backend FastAPI
│   ├── requirements.txt             # Dependencias del backend Python
│   ├── run_server.py                # Lanzador del servidor Uvicorn
│   ├── test_api.py                  # Pruebas automatizadas de los endpoints REST
│   └── test_downloads.py            # Pruebas automatizadas de descarga de documentos
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DashboardKpis.jsx        # Tarjetas de indicadores clave de riesgo
│   │   │   ├── FichaObraModal.jsx       # Modal integral con 5 pestañas y alertas SSI
│   │   │   ├── GaleriaFotosObra.jsx     # Visor de fotos oficiales de supervisión
│   │   │   ├── LineaTiempoProyecto.jsx  # Reconciliación de hitos y metas físicas
│   │   │   ├── MapaObras.jsx            # Mapa interactivo Leaflet
│   │   │   ├── TablaObras.jsx           # Tabla de inversiones con filtros y orden
│   │   │   ├── TopCriticos.jsx          # Carrusel del Top de obras en mayor riesgo
│   │   │   ├── FiltrosAvanzados.jsx     # Filtros geográficos y de criticidad
│   │   │   └── DocumentStrategyModal.jsx# Explicación de descargas directas
│   │   ├── services/
│   │   │   └── api.js               # Cliente HTTP Axios para consumir el backend
│   │   ├── App.jsx                  # Componente principal de la aplicación
│   │   ├── index.css                # Estilos globales y utilidades Tailwind
│   │   └── main.jsx                 # Punto de entrada de React
│   ├── Dockerfile                   # Multi-stage Dockerfile para React + Nginx
│   ├── nginx.conf                   # Configuración Nginx de producción y reverse proxy
│   ├── package.json                 # Dependencias y scripts de Node.js
│   ├── tailwind.config.js           # Configuración de Tailwind CSS
│   └── vite.config.js               # Configuración del bundler Vite
├── docs/
│   ├── ARQUITECTURA.md              # Documentación técnica profunda de la arquitectura
│   ├── DESPLIEGUE_DOKPLOY_CLOUDFLARE.md # Guía paso a paso de Dokploy + Cloudflare
│   └── REGLAS_AUDITORIA.md          # Manual de reglas de auditoría y cálculo del ISR
├── docker-compose.yml               # Orquestación de contenedores para Dokploy
├── start_project.ps1                # Script PowerShell de inicio rápido unificado
├── .gitignore                       # Configuración de exclusiones de Git
└── README.md                        # Documentación principal del proyecto
```

---

## 🚀 Guía de Instalación y Puesta en Marcha

### Prerrequisitos
- **Python 3.10 o superior**
- **Node.js 18 o superior** y **npm**
- **Git**

### Opción 1: Inicio Rápido con PowerShell (Windows)
El proyecto incluye un script automatizado que levanta ambos servidores concurrentemente:
```powershell
.\start_project.ps1
```
* **Frontend**: `http://localhost:5173`
* **Backend**: `http://127.0.0.1:8000`

---

### Opción 2: Inicio Manual Paso a Paso

#### 1. Clonar el Repositorio
```bash
git clone https://github.com/cmaquera/observatorio.git
cd observatorio
```

#### 2. Configurar y Levantar el Backend (FastAPI)
```bash
cd backend

# (Opcional) Crear y activar entorno virtual:
python -m venv .venv
# En Windows:
.venv\Scripts\activate
# En Linux/macOS:
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor
python run_server.py
```
- API REST disponible en: `http://127.0.0.1:8000`
- Documentación interactiva Swagger en: `http://127.0.0.1:8000/docs`
- Documentación ReDoc en: `http://127.0.0.1:8000/redoc`

#### 3. Configurar y Levantar el Frontend (React + Vite)
En una nueva terminal:
```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```
- Aplicación web accesible en: `http://localhost:5173`

---

### Opción 3: Despliegue en Producción con Dokploy (Ubuntu Local) + Cloudflare
El repositorio incluye configuración de **Docker Compose** lista para producción en Dokploy:
1. En Dokploy (servidor Ubuntu), crea un servicio de tipo **Compose** apuntando a este repositorio (`cmaquera/observatorio`).
2. Configura el túnel de **Cloudflare Tunnel (Zero Trust)** apuntando tu dominio a `http://localhost:3000` (sin necesidad de abrir puertos en tu router).
3. Consulta el manual paso a paso con capturas y comandos en:  
   👉 **[Guía de Despliegue en Dokploy y Cloudflare](docs/DESPLIEGUE_DOKPLOY_CLOUDFLARE.md)**.

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con suites de verificación automatizadas para asegurar la integridad de los datos y de las descargas:

```bash
# Probar endpoints de la API, KPIs, filtros geográficos y contratos:
python backend/test_api.py

# Probar la generación de fichas PDF/HTML y descargas CSV sin CAPTCHA:
python backend/test_downloads.py

# Validar la compilación de producción del frontend:
cd frontend
npm run build
```

---

## 🔄 Ejecución y Actualización del Pipeline ETL

Para actualizar la base de datos o descargar datos de cualquier departamento del Perú:

```bash
cd backend

# Extraer y procesar 500 registros del departamento del Cusco:
python -m app.etl.runner --region CUSCO --limit 500

# Extraer obras de Lima Metropolitana:
python -m app.etl.runner --region LIMA --limit 1000

# Extraer a nivel nacional (sin filtro de región):
python -m app.etl.runner --region "" --limit 2000

# Carga masiva completa de todo el Perú (sin límite y sin llamadas externas en lote):
python -m app.etl.runner --region "" --limit 0 --skip-enrich
```

El runner realiza automáticamente:
1. Conexión streaming con el portal de Datos Abiertos del MEF.
2. Limpieza de datos numéricos y geográficos.
3. Normalización con el catálogo nacional de Ubigeos del INEI.
4. Cálculo del Índice de Severidad de Riesgo (ISR).
5. Ingesta por lotes ACID optimizada a SQLite (upsert transaccional).
6. Reconciliación en vivo con SEACE y el Sistema de Seguimiento de Inversiones (SSI) (omitiendo con `--skip-enrich` para cargas masivas desatendidas).

---

## 📐 Reglas Metodológicas de Auditoría

El **Índice de Severidad de Riesgo (ISR)** se calcula ponderando 5 dimensiones objetivas:
1. **Desfase Físico vs. Financiero (35%)**: Brecha en puntos porcentuales entre lo pagado acumulado y el avance físico certificado.
2. **Plazo Vencido de Obra (25%)**: Días transcurridos desde la fecha de culminación vigente sin entrega formal de la obra.
3. **Omisión de Reportes en Formato 12-B (15%)**: Meses transcurridos sin actualización de valorizaciones en el Banco de Inversiones del MEF.
4. **Magnitud Presupuestal (15%)**: Monto del proyecto (mayor asignación de recursos implica mayor impacto ante riesgos).
5. **Controversias Contractuales y Paralizaciones (10%)**: Existencia de arbitrajes, contratos resueltos o alertas en SEACE.

> **Nota Cívica**: El Observatorio no emite juicios de valor ni reemplaza las auditorías formales de la Contraloría. Presenta y contrasta los datos declarados oficialmente por las entidades ejecutoras para facilitar la supervisión ciudadana.

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**. Para más detalles, consulta el archivo `LICENSE`.
