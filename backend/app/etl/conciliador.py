"""
Módulo Central de Conciliación de Inversiones (Single Source of Truth - SST).
Consolida las reglas de avance físico, estado situacional, detección de culminación,
causales de retraso y evaluación de riesgo oficiales del MEF / SEACE / Invierte.pe.
Garantiza coherencia total entre el proceso de enriquecimiento masivo (batch/cola)
y la consulta interactiva en vivo (routers/obras.py).
"""

import re
from typing import Dict, Any, Optional
from datetime import date
from app.rules import evaluar_obra
from app.etl.mef_live_client import sintetizar_linea_tiempo_ciudadana


def _parse_date_safe(val: Any) -> Optional[date]:
    if not val:
        return None
    if isinstance(val, date):
        return val
    s = str(val).strip()
    m1 = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m1:
        try:
            return date(int(m1.group(3)), int(m1.group(2)), int(m1.group(1)))
        except ValueError:
            pass
    m2 = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m2:
        try:
            return date(int(m2.group(1)), int(m2.group(2)), int(m2.group(3)))
        except ValueError:
            pass
    return None


def conciliar_datos_inversion(
    obra: Any,
    mef_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Función pura y canónica de conciliación.
    Toma un registro de inversión (modelo ORM o diccionario) y los datos en vivo del MEF/SEACE
    y devuelve la verdad consolidada para persistir en BD o enviar al frontend.
    """
    cui_str = str(getattr(obra, 'cui', '') or (obra.get('cui') if isinstance(obra, dict) else '')).strip()
    costo_act = float(getattr(obra, 'costo_actualizado', 0.0) or (obra.get('costo_actualizado') if isinstance(obra, dict) else 0.0) or 0.0)
    dev_acum = float(getattr(obra, 'devengado_acumulado', 0.0) or (obra.get('devengado_acumulado') if isinstance(obra, dict) else 0.0) or 0.0)
    
    avance_fis = float(getattr(obra, 'avance_fisico', 0.0) or (obra.get('avance_fisico') if isinstance(obra, dict) else 0.0) or 0.0)
    avance_fin = float(getattr(obra, 'avance_financiero', 0.0) or (obra.get('avance_financiero') if isinstance(obra, dict) else 0.0) or 0.0)
    if costo_act > 0.0 and avance_fin == 0.0:
        avance_fin = round((dev_acum / costo_act) * 100.0, 2)

    fec_ini = getattr(obra, 'fec_ini_ejec_fisica', None) or (obra.get('fec_ini_ejec_fisica') if isinstance(obra, dict) else None)
    fec_fin = getattr(obra, 'fec_fin_ejec_fisica', None) or (obra.get('fec_fin_ejec_fisica') if isinstance(obra, dict) else None)
    ult_fec = getattr(obra, 'ult_fecha_declaracion', None) or (obra.get('ult_fecha_declaracion') if isinstance(obra, dict) else None)
    
    estado_base = str(getattr(obra, 'estado', 'ACTIVO') or (obra.get('estado') if isinstance(obra, dict) else 'ACTIVO') or 'ACTIVO').upper()
    modalidad = getattr(obra, 'modalidad_ejecucion', None) or (obra.get('modalidad_ejecucion') if isinstance(obra, dict) else None)
    causal_retraso = getattr(obra, 'causal_retraso', None) or (obra.get('causal_retraso') if isinstance(obra, dict) else None)
    supervisor = getattr(obra, 'supervisor_obra', None) or (obra.get('supervisor_obra') if isinstance(obra, dict) else None)
    nro_adendas = int(getattr(obra, 'nro_adendas', 0) or (obra.get('nro_adendas') if isinstance(obra, dict) else 0) or 0)

    disponible = bool(mef_data and mef_data.get("disponible"))

    if disponible and mef_data:
        mod_mef = mef_data.get("modalidad_ejecucion")
        if mod_mef:
            modalidad = mod_mef

        av_seace = mef_data.get("avance_fisico_seace")
        comp_weighted = mef_data.get("avance_fisico_componentes")
        av_cierre = mef_data.get("avance_fisico_cierre")
        porc_f12b = float(mef_data.get("porc_avance_fis_f12b") or 0.0)

        ult_sit = str(mef_data.get("ultimo_estado_situacional_f12b") or "").upper()
        hist_situ = mef_data.get("historial_situacion") or []
        tiene_f09 = bool(mef_data.get("tiene_informe_cierre"))
        en_servicio = mef_data.get("en_funcionamiento")
        fase_ejec = str(mef_data.get("fase_ejecucion") or "").upper()
        cierre_str = str(mef_data.get("estado_cierre") or "").upper()
        estado_hito = str(mef_data.get("estado_hito_seace") or "").upper()

        # Actualizar fecha de fin programada si el MEF reporta prórroga/ampliación aprobada
        fec_fin_prog_str = mef_data.get("fecha_fin_programada")
        if fec_fin_prog_str:
            parsed_fec = _parse_date_safe(fec_fin_prog_str)
            if parsed_fec and (not fec_fin or parsed_fec > fec_fin):
                fec_fin = parsed_fec

        # Detección de controversia, arbitraje o incumplimiento contractual
        es_controversia = bool(
            any(k in ult_sit for k in ["CONTROVERSIA", "ARBITRAJE", "INCUMPLIMIENTO", "JUDICIAL"]) or
            any(h.get("es_controversia") for h in hist_situ)
        )

        # Detección de paralización o corte
        es_paralizada = bool(
            any(k in ult_sit for k in ["PARALIZAD", "SUSPENDID", "CORTE DE OBRA", "FALTA DE ASIGNACION PRESUPUESTAL", "FALTA DE ASIGANCION", "FALTA DE PRESUPUESTO", "SIN PRESUPUESTO", "LIMITA LA EJECUC"]) or
            any(h.get("es_paralizada") for h in hist_situ)
        )

        # Detección estricta de culminación física efectiva en terreno
        obra_culminada = (not es_controversia) and (not es_paralizada) and (
            ("CULMINAD" in ult_sit and ("100" in ult_sit or "EJECUCI" in ult_sit or "PROGRAMADO" in ult_sit))
            or "EN FUNCIONAMIENTO" in ult_sit
            or "LIQUIDACI" in ult_sit
            or "LIQUIDACI" in estado_hito
            or "CULMINAD" in estado_hito
            or tiene_f09
            or (en_servicio is True)
            or "CULMINAD" in fase_ejec
            or "EN_TRAMITE_F09" in cierre_str
            or "LIQUIDACI" in cierre_str
            or "CERRAD" in cierre_str
            or cierre_str in ("S", "SI")
            or porc_f12b >= 95.0
            or (comp_weighted is not None and comp_weighted >= 95.0)
            or (av_seace is not None and av_seace >= 95.0)
        )

        # ==================== JERARQUÍA UNIFICADA DE AVANCE FÍSICO ====================
        if obra_culminada:
            avance_fis = 100.0
            estado_base = "CULMINADA"
        elif av_seace is not None and av_seace > 0.0:
            avance_fis = round(float(av_seace), 2)
        elif comp_weighted is not None and comp_weighted > 0.0:
            avance_fis = round(float(comp_weighted), 2)
        elif av_cierre is not None and av_cierre > 0.0:
            avance_fis = round(float(av_cierre), 2)
        elif porc_f12b > 0.0:
            avance_fis = round(porc_f12b, 2)
        elif modalidad and "DIRECTA" in modalidad.upper() and avance_fin >= 85.0:
            if "LIQUIDACI" in cierre_str or "CULMINAD" in fase_ejec or "CERRAD" in cierre_str:
                avance_fis = 100.0
                estado_base = "CULMINADA"

        # Determinación del estado situacional
        if obra_culminada:
            estado_base = "CULMINADA"
        elif es_paralizada:
            estado_base = "PARALIZADA"
        elif avance_fis == 0.0 and dev_acum == 0.0:
            estado_base = "EN_INICIO"
        elif estado_base not in ("PARALIZADA", "CULMINADA", "EN_INICIO"):
            estado_base = "ACTIVO"

        # Actualizar adendas y causales oficiales
        if mef_data.get("adicionales_reportados") is not None:
            nro_adendas = int(mef_data["adicionales_reportados"] or 0)
        
        causal_mef = mef_data.get("causal_ampliacion") or mef_data.get("ultimo_estado_situacional_f12b")
        if causal_mef:
            causal_retraso = str(causal_mef)[:500]

        if mef_data.get("responsable_uei"):
            supervisor = str(mef_data["responsable_uei"])[:250]

    # Diferencia de avance físico vs. financiero
    diferencia_avance = round(max(0.0, avance_fin - avance_fis), 2)

    # Evaluación de riesgo determinista depurada
    eval_riesgo = evaluar_obra(
        costo_actualizado=costo_act,
        devengado_acumulado=dev_acum,
        avance_fisico=avance_fis,
        avance_financiero=avance_fin,
        fec_ini_ejec_fisica=fec_ini,
        fec_fin_ejec_fisica=fec_fin,
        ult_fecha_declaracion=ult_fec,
        estado=estado_base
    )

    # Si la obra alcanzó o superó el 95% de avance real en terreno, neutralizar falsas alarmas financieras
    if avance_fis >= 95.0:
        eval_riesgo["nivel_alerta"] = "BAJO"
        eval_riesgo["score_criticidad"] = min(eval_riesgo.get("score_criticidad") or 0.0, 15.0)
        eval_riesgo["alerta_desfase_financiero"] = False
        eval_riesgo["alerta_avance_lento"] = False
        eval_riesgo["alerta_plazo_vencido"] = False
        eval_riesgo["monto_en_riesgo"] = 0.0
        eval_riesgo["justificacion_tecnica"] = (
            f"Obra física con culminación efectiva al {avance_fis:.1f}% según el seguimiento oficial MEF/SEACE/F12-B. "
            f"Trabajos concluidos en terreno; se encuentra en fase de liquidación o entrega sin riesgo financiero adverso."
        )

    # Obtener línea de tiempo oficial (Nivel 1 SEACE, Nivel 2 Formato 12-B, o Nivel 3 Sin Datos)
    linea_tiempo = None
    if mef_data and mef_data.get("linea_tiempo"):
        linea_tiempo = mef_data["linea_tiempo"]
    else:
        linea_tiempo = sintetizar_linea_tiempo_ciudadana(obra, mef_data)

    return {
        "cui": cui_str,
        "avance_fisico": avance_fis,
        "avance_financiero": avance_fin,
        "diferencia_avance": diferencia_avance,
        "fec_fin": fec_fin,
        "estado": estado_base,
        "modalidad_ejecucion": modalidad,
        "supervisor_obra": supervisor,
        "causal_retraso": causal_retraso,
        "nro_adendas": nro_adendas,
        "evaluacion_riesgo": eval_riesgo,
        "linea_tiempo": linea_tiempo,
        "alertas_ssi": (mef_data.get("alertas_ssi_mef") if mef_data else None) or [],
        "fotos_obra": (mef_data.get("fotos_obra") if mef_data else None) or [],
        "ejecucion_por_componentes": (mef_data.get("ejecucion_por_componentes") if mef_data else None),
        "avance_fisico_componentes": (mef_data.get("avance_fisico_componentes") if mef_data else None),
        "contratos_seace": (mef_data.get("contratos_seace") if mef_data else None) or [],
        "sincronizado_en_vivo": disponible,
        "mef_live_data": mef_data
    }
