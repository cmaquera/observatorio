"""
Módulo de Enriquecimiento en Línea para el Pipeline ETL.
Consulta en tiempo real los registros oficiales de Invierte.pe / SSI del MEF / SEACE
para conciliar el avance físico real y la fase de inversión antes de evaluar el riesgo.
"""

import re
from typing import Dict, Any, Optional
from datetime import date
from app.etl.mef_live_client import get_mef_live_data
from app.rules import evaluar_obra


def _parse_mef_date(val: Any) -> Optional[date]:
    if not val:
        return None
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


def enriquecer_y_evaluar_inversion(
    cui: str,
    costo_actualizado: float,
    devengado_acumulado: float,
    avance_fisico_inicial: float,
    avance_financiero_inicial: float,
    fec_ini: Optional[date] = None,
    fec_fin: Optional[date] = None,
    ult_fecha_declaracion: Optional[date] = None,
    estado_inicial: str = "ACTIVO",
    codigo_snip: Optional[str] = None
) -> Dict[str, Any]:
    """
    Enriquece una inversión con los registros oficiales en vivo del MEF/SEACE.
    Concilia el avance físico real, detecta culminaciones y re-evalúa el nivel de riesgo.
    """
    cui_str = str(cui).strip()
    mef_data = get_mef_live_data(cui_str)

    avance_fisico = float(avance_fisico_inicial or 0.0)
    avance_financiero = float(avance_financiero_inicial or 0.0)
    estado = str(estado_inicial or "ACTIVO").upper()

    modalidad = None
    estado_cierre = None
    en_servicio = None
    fase_ejec = None

    if mef_data and mef_data.get("disponible"):
        modalidad = mef_data.get("modalidad_ejecucion")
        estado_cierre = mef_data.get("estado_cierre")
        en_servicio = mef_data.get("en_funcionamiento")
        fase_ejec = str(mef_data.get("fase_ejecucion") or "").upper()
        cierre_str = str(estado_cierre or "").upper()

        av_seace = mef_data.get("avance_fisico_seace")
        comp_weighted = mef_data.get("avance_fisico_componentes")
        av_cierre = mef_data.get("avance_fisico_cierre")
        ult_sit = str(mef_data.get("ultimo_estado_situacional_f12b") or "").upper()
        tiene_f09 = bool(mef_data.get("tiene_informe_cierre"))
        porc_f12b = float(mef_data.get("porc_avance_fis_f12b") or 0.0)
        estado_hito = str(mef_data.get("estado_hito_seace") or "").upper()

        # Actualizar fecha de fin si el MEF reporta una ampliación de plazo aprobada
        fec_fin_prog_str = mef_data.get("fecha_fin_programada")
        if fec_fin_prog_str:
            parsed_fec = _parse_mef_date(fec_fin_prog_str)
            if parsed_fec and (not fec_fin or parsed_fec > fec_fin):
                fec_fin = parsed_fec

        # Detección de culminación física efectiva en terreno
        obra_culminada_declarada = (
            ("CULMINAD" in ult_sit and ("100" in ult_sit or "EJECUCI" in ult_sit or "PROGRAMADO" in ult_sit))
            or "EN FUNCIONAMIENTO" in ult_sit
            or "LIQUIDACI" in ult_sit
            or "LIQUIDACI" in estado_hito
            or "CULMINAD" in estado_hito
            or tiene_f09
            or en_servicio is True
            or "CULMINAD" in fase_ejec
            or "EN_TRAMITE_F09" in cierre_str
            or "LIQUIDACI" in cierre_str
            or "CERRAD" in cierre_str
            or cierre_str in ("S", "SI")
            or porc_f12b >= 95.0
        )

        # 1. Conciliación del avance físico
        if obra_culminada_declarada:
            avance_fisico = 100.0
            estado = "CULMINADA"
        elif av_seace and av_seace > 0.0:
            avance_fisico = float(av_seace)
        elif av_cierre and av_cierre > 0.0:
            avance_fisico = float(av_cierre)
        elif porc_f12b > 0.0:
            avance_fisico = float(porc_f12b)
        elif modalidad and "DIRECTA" in modalidad.upper() and avance_financiero >= 85.0:
            if "LIQUIDACI" in cierre_str or "CULMINAD" in fase_ejec or "CERRAD" in cierre_str:
                avance_fisico = 100.0
                estado = "CULMINADA"

    # 2. Diferencia de avance calculada con rigor (para evitar falsos sobrepagos)
    diferencia_avance = round(max(0.0, avance_financiero - avance_fisico), 2)

    # 3. Evaluar riesgo con las reglas oficiales depuradas
    evaluacion = evaluar_obra(
        costo_actualizado=costo_actualizado,
        devengado_acumulado=devengado_acumulado,
        avance_fisico=avance_fisico,
        avance_financiero=avance_financiero,
        fec_ini_ejec_fisica=fec_ini,
        fec_fin_ejec_fisica=fec_fin,
        ult_fecha_declaracion=ult_fecha_declaracion,
        estado=estado
    )

    return {
        "cui": cui_str,
        "avance_fisico": round(avance_fisico, 2),
        "avance_financiero": round(avance_financiero, 2),
        "diferencia_avance": diferencia_avance,
        "fec_fin": fec_fin,
        "estado": estado,
        "modalidad_ejecucion": modalidad,
        "evaluacion_riesgo": evaluacion,
        "mef_live_data": mef_data
    }
