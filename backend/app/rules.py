import math
from datetime import date
from typing import Dict, Any, Tuple
from app.config import (
    UMBRAL_DESFASE_CRITICO_PP,
    UMBRAL_DESFASE_MODERADO_PP,
    UMBRAL_DIAS_DESACTUALIZADO
)

def evaluar_obra(
    costo_actualizado: float,
    devengado_acumulado: float,
    avance_fisico: float,
    avance_financiero: float,
    fec_ini_ejec_fisica: date | None,
    fec_fin_ejec_fisica: date | None,
    ult_fecha_declaracion: date | None,
    estado: str,
    today: date = None
) -> Dict[str, Any]:
    """
    Evalúa una obra según las 4 reglas transparentes de detección de retrasos
    y calcula el Índice de Severidad de Riesgo (ISR: 0 - 100).
    """
    if today is None:
        today = date.today()

    es_cerrada = estado and any(term in estado.upper() for term in ["CERRAD", "CULMINAD", "LIQUID"])
    
    # 1. Diferencia de avances (puntos porcentuales)
    diferencia_avance = round(avance_financiero - avance_fisico, 2)
    
    # 2. Plazo vencido y días de atraso
    alerta_plazo_vencido = False
    dias_atraso = 0
    if fec_fin_ejec_fisica and not es_cerrada and avance_fisico < 99.0:
        if fec_fin_ejec_fisica < today:
            alerta_plazo_vencido = True
            dias_atraso = max(0, (today - fec_fin_ejec_fisica).days)

    # 3. Desfase físico-financiero
    alerta_desfase = (diferencia_avance >= UMBRAL_DESFASE_CRITICO_PP) and not es_cerrada

    # 4. Información desactualizada (sin reporte)
    dias_sin_reporte = 0
    alerta_sin_reporte = False
    if ult_fecha_declaracion and not es_cerrada:
        dias_sin_reporte = max(0, (today - ult_fecha_declaracion).days)
        if dias_sin_reporte > UMBRAL_DIAS_DESACTUALIZADO:
            alerta_sin_reporte = True

    # 5. Avance físico bajo respecto al tiempo transcurrido
    alerta_avance_lento = False
    if fec_ini_ejec_fisica and fec_fin_ejec_fisica and not es_cerrada:
        plazo_total = (fec_fin_ejec_fisica - fec_ini_ejec_fisica).days
        tiempo_transcurrido = (today - fec_ini_ejec_fisica).days
        if plazo_total > 30 and tiempo_transcurrido > (plazo_total * 0.5):
            pct_tiempo = (tiempo_transcurrido / plazo_total) * 100.0
            if avance_fisico < (pct_tiempo * 0.4): # Avance físico menos de la mitad de lo esperado
                alerta_avance_lento = True

    # Monto en riesgo estimado:
    # Si hay desfase, el monto pagado en exceso respecto al avance físico real
    monto_en_riesgo = 0.0
    if diferencia_avance > 0 and costo_actualizado > 0:
        monto_en_riesgo = round(costo_actualizado * (diferencia_avance / 100.0), 2)
    elif alerta_plazo_vencido and costo_actualizado > 0:
        monto_en_riesgo = round(costo_actualizado * ((100.0 - avance_fisico) / 100.0), 2)

    # Cálculo del Score de Criticidad (0 a 100)
    # Componentes:
    # - Desfase (hasta 45 pts)
    # - Días atraso (hasta 30 pts)
    # - Monto en riesgo (hasta 15 pts)
    # - Falta de reporte (hasta 10 pts)
    score_desfase = min(45.0, max(0.0, diferencia_avance * 1.5))
    score_atraso = min(30.0, (dias_atraso / 180.0) * 30.0) if alerta_plazo_vencido else 0.0
    
    score_monto = 0.0
    if monto_en_riesgo > 0:
        score_monto = min(15.0, math.log10(max(10.0, monto_en_riesgo)) * 2.0)

    score_reporte = 10.0 if alerta_sin_reporte else 0.0

    score_total = round(min(100.0, score_desfase + score_atraso + score_monto + score_reporte), 1)

    es_culminada = es_cerrada or (avance_fisico >= 95.0)

    # Clasificación
    if avance_fisico == 0 and avance_financiero == 0 and not alerta_plazo_vencido:
        nivel_alerta = "SIN_DATOS"
    elif es_culminada:
        nivel_alerta = "NORMAL"
        score_total = min(score_total, 15.0)
        alerta_desfase = False
        alerta_plazo_vencido = False
        alerta_avance_lento = False
        monto_en_riesgo = 0.0
    elif score_total >= 65 or (alerta_desfase and alerta_plazo_vencido):
        nivel_alerta = "CRITICO"
    elif score_total >= 40 or alerta_desfase or alerta_plazo_vencido:
        nivel_alerta = "ALTO"
    elif score_total >= 20 or diferencia_avance >= UMBRAL_DESFASE_MODERADO_PP or alerta_sin_reporte:
        nivel_alerta = "MEDIO"
    else:
        nivel_alerta = "NORMAL"

    # Construir justificación técnica transparente
    razones = []
    if es_culminada:
        razones.append(f"Obra física con culminación efectiva al {avance_fisico:.1f}%. En fase de liquidación final sin riesgo adverso.")
    else:
        if alerta_desfase:
            razones.append(f"Desfase físico-financiero de {diferencia_avance:.1f} puntos porcentuales (Pagado: {avance_financiero:.1f}% vs Ejecutado: {avance_fisico:.1f}%).")
        elif diferencia_avance >= UMBRAL_DESFASE_MODERADO_PP:
            razones.append(f"Desfase moderado de {diferencia_avance:.1f} pp.")
        
        if alerta_plazo_vencido:
            razones.append(f"Plazo contractual vencido hace {dias_atraso} días sin culminación reportada.")
        
        if alerta_avance_lento:
            razones.append("Ritmo de ejecución física significativamente inferior al tiempo contractual consumido.")
            
        if alerta_sin_reporte:
            razones.append(f"Información desactualizada: {dias_sin_reporte} días sin declaración en Banco de Inversiones.")

    if not razones:
        justificacion = "Obra con ejecución y cronograma dentro de los parámetros esperados."
    else:
        justificacion = " ".join(razones)

    return {
        "score_criticidad": score_total,
        "nivel_alerta": nivel_alerta,
        "alerta_plazo_vencido": alerta_plazo_vencido,
        "alerta_desfase_financiero": alerta_desfase,
        "alerta_avance_lento": alerta_avance_lento,
        "alerta_sin_reporte": alerta_sin_reporte,
        "monto_en_riesgo": monto_en_riesgo,
        "dias_atraso": dias_atraso,
        "dias_sin_reporte": dias_sin_reporte,
        "diferencia_avance": diferencia_avance,
        "justificacion_tecnica": justificacion
    }
