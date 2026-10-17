import re
from datetime import datetime, date
from typing import Dict, Any, Tuple
from app.utils.ubigeo_helper import resolver_coordenadas
from app.rules import evaluar_obra

def parse_float(val: Any) -> float:
    if val is None:
        return 0.0
    s = str(val).strip().replace(",", "").replace("%", "")
    if not s or s == "-":
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0

def parse_date(val: Any) -> date | None:
    if not val:
        return None
    s = str(val).strip()
    if not s or s in ["-", "0000-00-00"]:
        return None
    # Casos comunes: 2021-05-03 o 2021-05-03 00:00:00
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    return None

def transformar_registro(raw: Dict[str, str]) -> Dict[str, Any]:
    cui = raw.get("CODIGO_UNICO", "").strip().strip('"')
    if not cui:
        return None

    costo_actualizado = parse_float(raw.get("COSTO_ACTUALIZADO"))
    pim_actual = parse_float(raw.get("PIM_ANIO_ACTUAL"))
    pia_actual = parse_float(raw.get("PIA_ANIO_ACTUAL"))
    devengado_acum_ant = parse_float(raw.get("DEVEN_ACUMUL_ANIO_ANT"))
    devengado_actual = parse_float(raw.get("DEV_ANIO_ACTUAL"))
    
    # Devengado acumulado total
    devengado_acumulado = round(devengado_acum_ant + devengado_actual, 2)
    saldo_ejecutar = max(0.0, round(costo_actualizado - devengado_acumulado, 2))

    # Avance físico
    avance_fisico = parse_float(raw.get("AVANCE_FISICO"))
    
    # Avance financiero: devengado acumulado / costo actualizado
    avance_financiero = 0.0
    if costo_actualizado > 0:
        avance_financiero = round((devengado_acumulado / costo_actualizado) * 100.0, 2)
        # Si el MEF trae ya AVANCE_EJECUCION, corroborar
        mef_exec = parse_float(raw.get("AVANCE_EJECUCION"))
        if mef_exec > 0 and abs(mef_exec - avance_financiero) > 10.0:
            avance_financiero = mef_exec

    fec_ini = parse_date(raw.get("FEC_INI_EJEC_FISICA"))
    fec_fin = parse_date(raw.get("FEC_FIN_EJEC_FISICA"))
    ult_fec = parse_date(raw.get("ULT_FEC_DECLA_ESTIM"))

    dpto = raw.get("DEPARTAMENTO", "").strip().strip('"').upper()
    prov = raw.get("PROVINCIA", "").strip().strip('"').upper()
    dist = raw.get("DISTRITO", "").strip().strip('"').upper()
    ubigeo = raw.get("UBIGEO", "").strip().strip('"')

    lat_raw = raw.get("LATITUD")
    lon_raw = raw.get("LONGITUD")
    lat, lon = resolver_coordenadas(lat_raw, lon_raw, dpto, prov, dist, ubigeo=ubigeo)

    estado = raw.get("ESTADO", "ACTIVO").strip().strip('"').upper()

    # Evaluación de Riesgo y Alertas
    evaluacion = evaluar_obra(
        costo_actualizado=costo_actualizado,
        devengado_acumulado=devengado_acumulado,
        avance_fisico=avance_fisico,
        avance_financiero=avance_financiero,
        fec_ini_ejec_fisica=fec_ini,
        fec_fin_ejec_fisica=fec_fin,
        ult_fecha_declaracion=ult_fec,
        estado=estado
    )

    monto_viable = parse_float(raw.get("MONTO_VIABLE"))

    # Análisis de Documentos, Adendas y Causales
    from app.etl.document_analyzer import analizar_documentos_y_causales
    doc_insights = analizar_documentos_y_causales(
        cui=cui,
        diferencia_avance=evaluacion["diferencia_avance"],
        dias_atraso=evaluacion["dias_atraso"],
        costo=costo_actualizado,
        monto_viable=monto_viable
    )

    # Inversión limpia
    inversion_data = {
        "cui": cui,
        "codigo_snip": raw.get("CODIGO_SNIP", "").strip().strip('"') or cui,
        "nombre": raw.get("NOMBRE_INVERSION", "").strip().strip('"'),
        "sector": raw.get("SECTOR", "").strip().strip('"'),
        "entidad": raw.get("ENTIDAD", "").strip().strip('"'),
        "nivel_gobierno": raw.get("NIVEL", "GL").strip().strip('"'),
        "departamento": dpto,
        "provincia": prov,
        "distrito": dist,
        "ubigeo": ubigeo,
        "latitud": lat,
        "longitud": lon,
        "monto_viable": monto_viable,
        "costo_actualizado": costo_actualizado,
        "pia_actual": pia_actual,
        "pim_actual": pim_actual,
        "devengado_acumulado": devengado_acumulado,
        "devengado_actual": devengado_actual,
        "saldo_ejecutar": saldo_ejecutar,
        "avance_fisico": avance_fisico,
        "avance_financiero": avance_financiero,
        "diferencia_avance": evaluacion["diferencia_avance"],
        "fec_ini_ejec_fisica": fec_ini,
        "fec_fin_ejec_fisica": fec_fin,
        "ult_fecha_declaracion": ult_fec,
        "dias_atraso": evaluacion["dias_atraso"],
        "dias_sin_reporte": evaluacion["dias_sin_reporte"],
        "estado": estado,
        "situacion": raw.get("SITUACION", "").strip().strip('"'),
        "causal_retraso": doc_insights["causal_retraso"],
        "supervisor_obra": doc_insights["supervisor_obra"],
        "nro_adendas": doc_insights["nro_adendas"],
        "sobrecosto_adendas": doc_insights["sobrecosto_adendas"]
    }

    # Contratos SEACE: solo se registran si vienen explícitamente en la fuente o tras enriquecimiento SEACE en vivo
    contratos_data = []
    ruc_raw = raw.get("RUC_CONTRATISTA", "").strip().strip('"')
    razon_raw = raw.get("RAZON_SOCIAL", "").strip().strip('"')
    if ruc_raw and razon_raw:
        nro_contrato = raw.get("NRO_CONTRATO", "").strip().strip('"') or f"SEACE-{cui}"
        contratos_data.append({
            "cui": cui,
            "codigo_proceso_seace": raw.get("CODIGO_PROCESO", "").strip().strip('"') or f"SEACE-{cui}",
            "nro_contrato": nro_contrato,
            "objeto": f"EJECUCIÓN DE OBRA: {inversion_data['nombre'][:120]}",
            "ruc_contratista": ruc_raw,
            "razon_social": razon_raw,
            "es_consorcio": "CONSORCIO" in razon_raw.upper(),
            "detalle_consorcio": None,
            "monto_contratado": parse_float(raw.get("MONTO_CONTRATADO")) or costo_actualizado,
            "fecha_suscripcion": fec_ini,
            "plazo_dias": int(parse_float(raw.get("PLAZO_DIAS")) or 0),
            "estado_contrato": "VIGENTE" if estado != "CERRADO" else "CULMINADO",
            "url_contrato_pdf": f"https://ofi5.mef.gob.pe/invierteWS/Repseguim/RepContratac?codigo={cui}"
        })

    # Documentos oficiales descargables (Generados directamente por el Observatorio)
    documentos_data = [
        {
            "cui": cui,
            "tipo_documento": "FICHA_OFICIAL",
            "titulo": f"Expediente Oficial de Auditoría - CUI {cui} (PDF / Imprimible)",
            "url_descarga": f"/api/obras/{cui}/descargar/ficha",
            "origen": "OBSERVATORIO",
            "tamanio_mb": 0.45,
            "fecha_documento": ult_fec or date.today()
        },
        {
            "cui": cui,
            "tipo_documento": "FICHA_12B_MEF",
            "titulo": f"Seguimiento Financiero F12B - CUI {cui} (Banco de Inversiones MEF).csv",
            "url_descarga": f"/api/obras/{cui}/descargar/f12b",
            "origen": "MEF",
            "tamanio_mb": 0.12,
            "fecha_documento": ult_fec
        },
        {
            "cui": cui,
            "tipo_documento": "CONTRATO_SEACE",
            "titulo": f"Ficha Contractual y Adjudicación - CUI {cui} (SEACE).csv",
            "url_descarga": f"/api/obras/{cui}/descargar/contrato",
            "origen": "SEACE",
            "tamanio_mb": 0.18,
            "fecha_documento": fec_ini
        },
        {
            "cui": cui,
            "tipo_documento": "REPORTE_INFOBRAS",
            "titulo": f"Ficha de Control y Supervisión - CUI {cui} (Infobras).csv",
            "url_descarga": f"/api/obras/{cui}/descargar/infobras",
            "origen": "CONTRALORIA",
            "tamanio_mb": 0.15,
            "fecha_documento": ult_fec
        }
    ]

    return {
        "inversion": inversion_data,
        "evaluacion": {
            "cui": cui,
            "score_criticidad": evaluacion["score_criticidad"],
            "nivel_alerta": evaluacion["nivel_alerta"],
            "alerta_plazo_vencido": evaluacion["alerta_plazo_vencido"],
            "alerta_desfase_financiero": evaluacion["alerta_desfase_financiero"],
            "alerta_avance_lento": evaluacion["alerta_avance_lento"],
            "alerta_sin_reporte": evaluacion["alerta_sin_reporte"],
            "monto_en_riesgo": evaluacion["monto_en_riesgo"],
            "justificacion_tecnica": evaluacion["justificacion_tecnica"]
        },
        "contratos": contratos_data,
        "documentos": documentos_data
    }
