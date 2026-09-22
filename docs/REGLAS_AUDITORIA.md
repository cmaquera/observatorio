# Manual Metodológico de Reglas de Auditoría y Detección de Riesgo

## Observatorio de Obras Públicas del Perú 🇵🇪

Este manual expone la metodología analítica, las fórmulas matemáticas y las 5 Reglas Universales de Homologación aplicadas para detectar desfases, retrasos, obras paralizadas y controversias en las inversiones públicas del Estado peruano.

---

## 1. Índice de Severidad de Riesgo (ISR)

El **Índice de Severidad de Riesgo (ISR)** es una métrica continua de 0 a 100 puntos que cuantifica el grado de peligro técnico-financiero en el que se encuentra una inversión pública. Se compone de 5 subíndices ponderados:

$$\text{ISR} = W_1 \cdot S_{\text{desfase}} + W_2 \cdot S_{\text{atraso}} + W_3 \cdot S_{\text{reporte}} + W_4 \cdot S_{\text{presupuesto}} + W_5 \cdot S_{\text{controversia}}$$

### Ponderaciones Oficiales ($W_i$)

| Dimensión | Ponderación ($W_i$) | Criterio de Evaluación |
| :--- | :---: | :--- |
| **1. Desfase Físico-Financiero** | $0.35$ (35%) | Brecha en pp entre avance financiero devengado y avance físico reportado |
| **2. Plazo Vencido de Obra** | $0.25$ (25%) | Días calendario de demora acumulados respecto al calendario contractual |
| **3. Falta de Reportes en F12-B** | $0.15$ (15%) | Días transcurridos sin actualización de valorizaciones en el MEF |
| **4. Magnitud Presupuestal** | $0.15$ (15%) | Costo actualizado del proyecto (mayor asignación presupuestal = mayor impacto) |
| **5. Controversias y Paralización** | $0.10$ (10%) | Estado resuelto, arbitraje en SEACE o paralización formal de campo |

### Categorización Semafórica

| Rango de ISR | Nivel de Alerta | Acción Recomendada |
| :---: | :---: | :--- |
| $\ge 70.0$ | 🔴 **CRÍTICO** | Intervención urgente y auditoría especial de la Contraloría / OCI |
| $50.0 - 69.9$ | 🟠 **ALTO** | Requerimiento formal de actualización de F12-B y verificación de campo |
| $30.0 - 49.9$ | 🟡 **MEDIO** | Monitoreo preventivo del calendario de valorizaciones |
| $< 30.0$ | 🟢 **NORMAL** | Obra en ejecución regular conforme a cronograma |

---

## 2. Las 5 Reglas Universales de Homologación

Para evitar distorsiones entre diferentes sistemas estatales (SEACE, Infobras y MEF) y tratar equitativamente obras ejecutadas por **Contrata**, **Administración Directa** o modalidad **Mixta**, se aplican 5 reglas homologadas:

### Regla 1: Validación Físico-Temporal para Culminación de Obra
* **El Problema**: En SEACE o Infobras, algunas entidades registran el hito *Culminación de Obra* con bandera cumplida (`IND_HITO_CUMPL = 'S'`) aun cuando el avance físico real es del 26% o 64%, debido a que la obra fue abandonada o el presupuesto se agotó.
* **Regla Homologada**: Se valida el avance físico efectivo:
  $$\text{Avance Efectivo} = \max(\text{Avance}_{F12B}, \text{Avance}_{SEACE})$$
  - Si $\text{Avance Efectivo} < 90\%$ o el estado es `SIN RECEPCIONAR`:
    - El hito se clasifica universalmente como:  
      **`Corte de obra inconclusa (Físico detenido al X%) [RETRASADO]`**.
    - La etapa de liquidación se clasifica como:  
      **`Liquidación de corte / Cierre de obra inconclusa [RETRASADO]`**.
  - Si $\text{Avance Efectivo} \ge 90\%$:
    - Se certifica legítimamente como **`Culminación física cumplida [COMPLETADO]`**.

### Regla 2: Formateo y Tratamiento Dinámico de Modalidades Mixtas
* **El Problema**: El uso de cadenas de texto estáticas provocaba que proyectos con modalidad mixta mostrasen textos erróneos de otros rubros.
* **Regla Homologada**: La modalidad de ejecución se procesa mediante normalización y split dinámico de los componentes oficiales del Formato 14:
  `modalidad.split(',').map(m => m.trim().replace(/^ADMINISTRACI[ÓO]N\s+/i, 'Adm. ').replace(/^POR\s+/i, '')).join(' + ')`
  Describiendo dinámicamente cada componente según su denominación oficial (ej. Infraestructura por Administración Directa + Equipamiento por Contrata).

### Regla 3: Detección Universal de Paralizaciones y Desfinanciamiento
* **El Problema**: Las paralizaciones por falta de asignación presupuestal en obras por Administración Directa no siempre son etiquetadas con la palabra exacta "paralizada".
* **Regla Homologada**: El sistema escanea un vocabulario controlado que incluye: `PARALIZAD`, `SUSPENDID`, `CORTE DE OBRA`, `FALTA DE ASIGNACION PRESUPUESTAL`, `FALTA DE ASIGANCION`, `LIMITA LA EJECUC`.
  Al detectarse, el semáforo y la línea de tiempo reflejan:
  - Badge: `Obra Paralizada (+X días)`.
  - Hito: `Plazo vencido - Obra paralizada [RETRASADO]`.
  - Hito de cierre: `Sin Formato 09 emitido (Obra inconclusa) [PENDIENTE]`.

### Regla 4: Sincronización del Inicio de Trabajos con Avance Físico Efectivo
* **El Problema**: Si una obra contaba con fecha inicial contractual pero con avance físico certificado de **0.0%**, los reportes indicaban erróneamente *"Comenzó la intervención efectiva"*.
* **Regla Homologada**: Si $\text{Avance Físico} = 0.0\%$, el hito de inicio de trabajos se clasifica como:
  - **`Fecha de inicio fijada en cronograma (Sin avance reportado) [EN_CURSO]`**.
  - Detalle: Se aclara que las valorizaciones técnicas aún no reportan trabajos físicos en terreno (0.0%), evitando falsas expectativas ciudadanas.

### Regla 5: Generalización de Componentes en Cero
* **El Problema**: Cuando un proyecto presenta partidas sin metrado tradicional (como adquisición de bienes biomédicos o servicios), los gráficos de avance físico por partida mostraban ceros sin contexto técnico.
* **Regla Homologada**: El sistema lista dinámicamente los nombres y montos de los componentes registrados en el Formato 14, contextualizando si se encuentran pendientes por controversia legal, arbitraje, suspensión temporal o trámite de recepción.

---

## 3. Catálogo Oficial de Alertas del SSI (MEF)

El Observatorio replica el motor oficial del Sistema de Seguimiento de Inversiones (SSI):

```text
┌────────────┬─────────────┬─────────────────────────────────────────────────────────────────────────┐
│ Alerta SSI │  Severidad  │ Criterio de Activación Técnica                                          │
├────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────┤
│ Alerta 1   │   CRÍTICO   │ (Devengado / Costo * 100) - Avance Físico > 20 pp                       │
│ Alerta 4   │    ALTO     │ Indicador [5] en IND_ALERTAS (Formato 12-B no actualizado)              │
│ Alerta 5   │   CRÍTICO   │ Devengado Acumulado > Costo Actualizado + 1.0                           │
│ Alerta 6   │    ALTO     │ Indicador [7] en IND_ALERTAS o paralización formal sin reactivación     │
│ Alerta 7   │   CRÍTICO   │ Contrataciones resueltas, nulas o en proceso de arbitraje en SEACE      │
│ Alerta 8   │    MEDIO    │ Indicador [8] en DES_ALERT_EJEC (Pendiente de reporte físico)           │
│ Alerta 9   │    ALTO     │ Indicador [9] en DES_ALERT_EJEC (Incoherencia de porcentajes)           │
│ Alerta 10  │   CRÍTICO   │ Indicador [10] en DES_ALERT_EJEC (Físico congelado por 3 meses o más)   │
│ Alerta 11  │   CRÍTICO   │ NUM_DIA_DESACT > 0 (Riesgo inminente de desactivación administrativa)   │
└────────────┴─────────────┴─────────────────────────────────────────────────────────────────────────┘
```
