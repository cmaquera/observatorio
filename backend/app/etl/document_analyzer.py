"""
Módulo de Inteligencia y Extracción de Datos de Documentos de Contratación y Supervisión.

Estrategia Técnica de Extracción de Datos Oficiales:
1. FUENTES ABIERTAS SIN WAF: El Estado peruano publica mensualmente en el Portal Nacional de
   Datos Abiertos (PNDA) los datasets consolidados de:
   - "Obras Públicas Paralizadas a Nivel Nacional" (Contraloría General de la República)
   - "Contrataciones Abiertas OCDS" (OECE/SEACE en formato JSONL/CSV sin CAPTCHA)
2. PROCESAMIENTO DE ADENDAS Y CAUSALES:
   Se extraen las causales estandarizadas de retraso, penalidades impuestas,
   consorcios supervisores y el historial de adendas contractuales.
"""

import re
from typing import Dict, Any, Tuple

# Catálogo de Causales Oficiales de Retraso y Paralización (según Contraloría e Infobras)
CAUSALES_CATALOGO = [
    {
        "clave": "EXPEDIENTE_TECNICO",
        "descripcion": "Deficiencias graves e incompatibilidades en el expediente técnico original respecto al terreno real.",
        "tipo": "Planificación y Estudios"
    },
    {
        "clave": "ADICIONALES_SOBRECOSTO",
        "descripcion": "Aprobación reiterada de adicionales de obra y mayores metrados no previstos en el contrato inicial.",
        "tipo": "Modificaciones Presupuestarias"
    },
    {
        "clave": "INCUMPLIMIENTO_CONTRATISTA",
        "descripcion": "Incumplimiento de cronograma por falta de maquinaria, personal calificado o liquidez financiera de la empresa constructora.",
        "tipo": "Falla del Contratista"
    },
    {
        "clave": "SANEAMIENTO_TERRENO",
        "descripcion": "Falta de disponibilidad física o saneamiento legal de los terrenos donde se ejecuta el proyecto.",
        "tipo": "Gestión de la Entidad"
    },
    {
        "clave": "DISCREPANCIAS_ARBITRAJE",
        "descripcion": "Controversias contractuales entre la entidad y el consorcio ejecutor en trámite de arbitraje o resolución.",
        "tipo": "Legal / Arbitraje"
    },
    {
        "clave": "CLIMATICO_EMERGENCIA",
        "descripcion": "Suspensión de plazo por temporada de lluvias intensas o fenómenos climáticos en la zona.",
        "tipo": "Causas de Fuerza Mayor"
    }
]

def analizar_documentos_y_causales(
    cui: str,
    diferencia_avance: float,
    dias_atraso: int,
    costo: float,
    monto_viable: float = 0.0
) -> Dict[str, Any]:
    """
    Evalúa de forma determinista los indicadores objetivos declarados en el MEF
    (variación presupuestal respecto al monto viable, días de atraso y desfase financiero)
    sin inventar supervisores ni adendas sintéticas. Los contratos, supervisores y adendas
    específicas se concilian posteriormente desde las APIs en vivo de SEACE y Formato 12-B.
    """
    sobrecosto = 0.0
    if monto_viable and monto_viable > 0 and costo > monto_viable:
        sobrecosto = round(costo - monto_viable, 2)

    if dias_atraso > 0 and diferencia_avance >= 15.0:
        causal = (
            f"Desfase físico-financiero (+{diferencia_avance:.1f} pp) y plazo contractual vencido "
            f"({dias_atraso} días de atraso según cronograma MEF)."
        )
    elif dias_atraso > 0:
        causal = f"Plazo de ejecución física vencido ({dias_atraso} días de atraso respecto a la fecha programada en MEF)."
    elif diferencia_avance >= 15.0:
        causal = f"Desembolso financiero adelantado en +{diferencia_avance:.1f} pp respecto al avance físico reportado."
    else:
        causal = None

    return {
        "causal_retraso": causal,
        "supervisor_obra": None,
        "nro_adendas": 0,
        "sobrecosto_adendas": sobrecosto
    }
