# Documento de Arquitectura y Diseño Técnico

## Observatorio de Obras Públicas del Perú 🇵🇪

Este documento detalla la arquitectura técnica, el modelo de datos, los flujos de integración y las decisiones de diseño implementadas en el **Observatorio de Obras Públicas del Perú**.

---

## 1. Visión General de la Arquitectura

El sistema está concebido bajo una arquitectura orientada a servicios desacoplados, con un pipeline de ingesta analítica en segundo plano y una API de lectura de alta velocidad:

```text
[ Fuentes Oficiales del Estado ]
  ├── MEF Datos Abiertos (DETALLE_INVERSIONES.csv)
  ├── Sistema de Seguimiento de Inversiones (SSI - MEF)
  ├── Banco de Inversiones / Invierte.pe (Fichas F07, F08, F09, F12-B, F14)
  ├── OECE / SEACE (Contratos, Procesos, Consorcios, Cuadernos de Obra)
  └── Contraloría General de la República (Infobras)
               │
               ▼
      [ Pipeline ETL Backend ]
         ├── Extractor (Streaming por bloques con urllib y codecs)
         ├── Transformador (Normalización de Ubigeos, Fechas y Métricas)
         ├── Evaluador de Riesgos (Cálculo del ISR de 0 a 100)
         ├── Reconciliador Concurrente (ThreadPoolExecutor)
         └── Loader (Carga transaccional en SQLite WAL Mode)
               │
               ▼
   [ Base de Datos Analítica Indexada ]
         └── SQLite 3 (WAL mode, PRAGMA synchronous = NORMAL)
               │
               ▼
    [ API REST de Alto Rendimiento ]
         ├── FastAPI + Pydantic v2 + SQLAlchemy 2.0
         ├── Cliente en vivo con Pool HTTP y reintentos (mef_live_client)
         └── Generador de descargas dinámicas (HTML, PDF, CSV)
               │
               ▼
     [ Frontend SPA Moderno ]
         └── React 18 + Vite + Tailwind CSS + Lucide Icons + Leaflet Maps
```

---

## 2. Componentes del Backend

### 2.1 Pipeline ETL (`app.etl`)

El pipeline se encarga de procesar grandes volúmenes de datos abiertos sin saturar la memoria RAM:

- **`extractor.py`**: Utiliza streaming HTTP por bloques para leer el archivo maestro `DETALLE_INVERSIONES.csv` de los Datos Abiertos del MEF (~235 MB). No carga el archivo completo en memoria, sino que transmite línea por línea con manejo de codificación `Latin-1` / `UTF-8`.
- **`transformer.py`**: Limpia campos monetarios con separadores de miles y decimales peruanos, normaliza fechas en formatos ISO, imputa coordenadas geográficas a partir de los centroides de distritos del INEI (`ubigeo_helper.py`), y calcula los desfases físicos vs. financieros.
- **`rules.py`**: Motor de scoring analítico que computa el **Índice de Severidad de Riesgo (ISR)** asignando pesos proporcionales a brechas presupuestales, días de atraso, falta de reportes y controversias contractuales.
- **`loader.py`**: Agrupa registros en lotes transaccionales de 50 a 100 operaciones `INSERT/UPDATE` para maximizar el throughput de escritura en SQLite.
- **`enrich_db.py`**: Ejecuta reconciliación concurrente para las obras prioritarias (`CRITICO` y `ALTO`) cruzando en tiempo real con SEACE y el aplicativo SSI del MEF.

### 2.2 Cliente en Vivo MEF y Motor de Alertas SSI (`mef_live_client.py`)

Debido a que los datos abiertos del MEF pueden presentar cierto retraso frente al estado operativo de campo, este módulo consulta en vivo los servicios oficiales gubernamentales:

1. **Catálogo Oficial de Alertas del SSI**:
   Recrea fielmente el motor algorítmico del MEF (`script_ssi01.js`):
   * `Alerta 1`: Desfase financiero vs. físico superior a 20 pp.
   * `Alerta 4`: Bandera `[5]` en `IND_ALERTAS` (omisión o retraso en Formato 12-B).
   * `Alerta 5`: Costo actualizado menor al devengado acumulado.
   * `Alerta 6`: Obra paralizada sin reactivación (`[7]` en `IND_ALERTAS`).
   * `Alerta 7`: Contrataciones resueltas, nulas o en proceso de arbitraje.
   * `Alertas 8, 9, 10`: Banderas de seguimiento de avance físico en `DES_ALERT_EJEC`.
   * `Alerta 11`: Plazo límite de días para la desactivación administrativa (`NUM_DIA_DESACT`).
2. **Reconciliación de Cierre (Formato 09)**:
   Consulta `https://ofi5.mef.gob.pe/InformeCierre/ConsultaInforme?cui={cui}` validando que el cuerpo HTML y el código renderizado pertenezcan inequívocamente a la obra solicitada, previniendo el fallback por defecto del servidor ASP.NET al SNIP 77845 (*Ampliación Bayóvar*).
3. **Resiliencia HTTP**:
   Implementa encabezados de navegación realistas (`User-Agent: Mozilla/5.0`), timeouts de conexión controlados (4 a 8 segundos), reintentos con backoff exponencial y contexto SSL permisivo para mitigar problemas de certificados intermedios en servidores del Estado.

---

## 3. Modelo de Datos (Esquema Relacional)

La base de datos analítica está estructurada en SQLite con soporte de transacciones concurrentes (WAL mode):

### 3.1 Tabla `inversiones`
- `cui` (VARCHAR, Primary Key): Código Único de Inversión del MEF.
- `codigo_snip` (VARCHAR, Index): Código SNIP histórico.
- `nombre` (TEXT): Denominación oficial de la inversión pública.
- `sector`, `entidad`, `nivel_gobierno` (VARCHAR): Datos institucionales del ejecutor.
- `departamento`, `provincia`, `distrito`, `ubigeo` (VARCHAR): Ubicación geográfica.
- `latitud`, `longitud` (FLOAT): Coordenadas geográficas normalizadas.
- `costo_actualizado`, `monto_viable`, `pim_actual`, `devengado_acumulado`, `saldo_ejecutar` (FLOAT): Datos presupuestales.
- `avance_fisico`, `avance_financiero`, `diferencia_avance` (FLOAT): Métricas comparativas de avance.
- `fec_ini_ejec_fisica`, `fec_fin_ejec_fisica` (DATE): Cronograma contractual vigente.
- `dias_atraso`, `dias_sin_reporte` (INTEGER): Indicadores temporales de demora.
- `estado`, `situacion`, `causal_retraso` (VARCHAR): Estado situacional y motivo reportado.
- `supervisor_obra`, `nro_adendas`, `sobrecosto_adendas` (VARCHAR / INTEGER / FLOAT): Datos de fiscalización.

### 3.2 Tabla `evaluacion_riesgo`
- `id` (INTEGER, Primary Key)
- `cui` (VARCHAR, Foreign Key -> `inversiones.cui`)
- `score_criticidad` (FLOAT): Índice de Severidad de Riesgo de 0 a 100.
- `nivel_alerta` (VARCHAR): Clasificación `CRITICO`, `ALTO`, `MEDIO`, `NORMAL`.
- `desfase_pp`, `dias_atraso`, `dias_sin_reporte`, `monto_en_riesgo` (FLOAT / INTEGER).
- `justificacion_tecnica` (TEXT): Explicación técnica del diagnóstico de criticidad.

### 3.3 Tabla `contratos`
- `id` (INTEGER, Primary Key)
- `cui` (VARCHAR, Foreign Key -> `inversiones.cui`)
- `codigo_proceso_seace`, `nro_contrato` (VARCHAR).
- `ruc_contratista`, `razon_social` (VARCHAR).
- `es_consorcio` (BOOLEAN), `detalle_consorcio` (TEXT con desglose de porcentajes).
- `monto_contratado` (FLOAT), `fecha_suscripcion` (DATE), `plazo_dias` (INTEGER).
- `estado_contrato` (VARCHAR), `url_contrato_pdf` (VARCHAR).

### 3.4 Tabla `documentos`
- `id` (INTEGER, Primary Key)
- `cui` (VARCHAR, Foreign Key -> `inversiones.cui`)
- `tipo_documento` (VARCHAR): `FICHA_OFICIAL`, `FICHA_12B_MEF`, `CONTRATO_SEACE`, `REPORTE_INFOBRAS`.
- `titulo`, `url_descarga`, `origen` (VARCHAR).
- `tamanio_mb` (FLOAT), `fecha_documento` (DATE).

---

## 4. Endpoints de la API REST (`app.routers`)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/kpis` | Métricas agregadas y totales del observatorio |
| `GET` | `/api/dashboard/top-criticos` | Top 10 de obras en mayor riesgo clasificadas por ISR |
| `GET` | `/api/obras` | Listado paginado de obras con filtros geográficos y de riesgo |
| `GET` | `/api/obras/{cui}` | Ficha técnica detallada, línea de tiempo, alertas SSI y contratos |
| `GET` | `/api/obras/{cui}/descargar/ficha` | Generación y descarga de Ficha Oficial de Auditoría (HTML/PDF) |
| `GET` | `/api/obras/{cui}/descargar/f12b` | Descarga de reporte de seguimiento F12-B en CSV |
| `GET` | `/api/obras/{cui}/descargar/contrato` | Descarga de datos de contratación SEACE en CSV |
| `GET` | `/api/obras/{cui}/descargar/infobras` | Descarga de ficha de control de Infobras en CSV |
| `GET` | `/api/empresas` | Directorio de contratistas ordenados por monto adjudicado |
| `GET` | `/api/geo/departamentos` | Catálogo de departamentos con conteo de obras |
| `GET` | `/api/geo/provincias/{dpto}` | Provincias pertenecientes a un departamento |
| `GET` | `/api/geo/distritos/{dpto}/{prov}` | Distritos pertenecientes a una provincia |
| `GET` | `/api/export/csv` | Exportación en streaming de los datos filtrados en CSV |

---

## 5. Diseño y Componentes del Frontend

Construido como una Single Page Application (SPA) modular y reactiva:

- **`App.jsx`**: Orquesta el estado global de la aplicación (filtros geográficos, criterios de búsqueda, modal de obra activa y selección de vistas).
- **`MapaObras.jsx`**: Renderiza el mapa georreferenciado con Leaflet, utilizando marcadores coloreados según el nivel de riesgo y clustering dinámico.
- **`FichaObraModal.jsx`**: Componente central de auditoría con 5 pestañas de navegación:
  1. *Resumen Ciudadano*: Diagnóstico visual, semáforo de plazos, comparativa financiera vs. física y causales del cuaderno de obra.
  2. *Fotos en Terreno*: Galería fotográfica oficial con metadatos técnicos.
  3. *Línea de Tiempo & Metas*: Reconciliación de hitos y metrados del Formato 14.
  4. *Contratos & Alertas*: Panel con las alertas oficiales del SSI (MEF) y datos de contratistas del SEACE.
  5. *Documentos & MEF*: Descarga directa de expedientes y reportes oficiales sin CAPTCHA.
- **`TopCriticos.jsx`**: Carrusel y lista destacada de obras con mayor Índice de Severidad de Riesgo.
- **`TablaObras.jsx`**: Tabla interactiva con ordenamiento multi-columna, badges de criticidad y paginación rápida.
