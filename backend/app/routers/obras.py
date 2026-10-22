import io
import os
import re
import csv
import html
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc
from app.database import get_db
from app.models import (
    Inversion, EvaluacionRiesgo, ContratoEmpresa,
    InversionSimpleOut, InversionDetalleOut
)
from app.etl.mef_live_client import (
    get_cached_mef_data,
    get_mef_live_data,
    sintetizar_linea_tiempo_ciudadana,
    download_mef_archivo
)
from app.etl.conciliador import conciliar_datos_inversion
from app.rules import aplicar_filtro_nivel_alerta

router = APIRouter(prefix="/api/obras", tags=["Obras"])

@router.get("")
def list_obras(
    q: Optional[str] = Query(None, description="Búsqueda por CUI, nombre o contratista"),
    departamento: Optional[str] = Query(None),
    provincia: Optional[str] = Query(None),
    distrito: Optional[str] = Query(None),
    nivel_alerta: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    nivel_gobierno: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    sort_by: str = Query("score_desc", description="score_desc, monto_desc, desfase_desc, nombre_asc"),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Inversion)
        .outerjoin(EvaluacionRiesgo)
        .options(joinedload(Inversion.evaluacion_riesgo))
    )

    # Filtros geográficos
    if departamento:
        query = query.filter(Inversion.departamento == departamento.upper())
    if provincia:
        query = query.filter(Inversion.provincia == provincia.upper())
    if distrito:
        query = query.filter(Inversion.distrito == distrito.upper())

    # Filtro de alerta semafórica unificado
    query = aplicar_filtro_nivel_alerta(query, EvaluacionRiesgo.nivel_alerta, nivel_alerta)

    # Filtro de sector
    if sector:
        query = query.filter(Inversion.sector == sector.upper())

    # Filtro de nivel de gobierno
    if nivel_gobierno:
        query = query.filter(Inversion.nivel_gobierno == nivel_gobierno.upper())

    # Búsqueda global por CUI, Nombre o Contratista
    if q:
        q_term = f"%{q.strip()}%"
        query = query.outerjoin(ContratoEmpresa).filter(
            or_(
                Inversion.cui.like(q_term),
                Inversion.nombre.ilike(q_term),
                Inversion.entidad.ilike(q_term),
                ContratoEmpresa.razon_social.ilike(q_term),
                ContratoEmpresa.ruc_contratista.like(q_term)
            )
        ).distinct()

    # Ordenamiento
    if sort_by == "score_desc":
        query = query.order_by(desc(EvaluacionRiesgo.score_criticidad), desc(Inversion.costo_actualizado))
    elif sort_by == "monto_desc":
        query = query.order_by(desc(Inversion.costo_actualizado))
    elif sort_by == "desfase_desc":
        query = query.order_by(desc(Inversion.diferencia_avance))
    elif sort_by == "nombre_asc":
        query = query.order_by(asc(Inversion.nombre))
    else:
        query = query.order_by(desc(EvaluacionRiesgo.score_criticidad))

    total = query.count()
    total_pages = (total + page_size - 1) // page_size

    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "items": [InversionSimpleOut.model_validate(item) for item in items]
    }


@router.get("/map/points")
def get_map_points(
    departamento: Optional[str] = Query(None),
    provincia: Optional[str] = Query(None),
    distrito: Optional[str] = Query(None),
    nivel_alerta: Optional[str] = Query(None),
    limit: int = Query(1000, le=3000),
    db: Session = Depends(get_db)
):
    """
    Retorna puntos ligeros optimizados para renderizado fluido en el mapa Leaflet.
    """
    query = (
        db.query(
            Inversion.cui,
            Inversion.nombre,
            Inversion.sector,
            Inversion.entidad,
            Inversion.latitud,
            Inversion.longitud,
            Inversion.costo_actualizado,
            Inversion.avance_fisico,
            Inversion.avance_financiero,
            Inversion.diferencia_avance,
            Inversion.departamento,
            Inversion.provincia,
            Inversion.distrito,
            EvaluacionRiesgo.nivel_alerta,
            EvaluacionRiesgo.score_criticidad
        )
        .join(EvaluacionRiesgo)
        .filter(Inversion.latitud.isnot(None), Inversion.longitud.isnot(None))
    )

    if departamento:
        query = query.filter(Inversion.departamento == departamento.upper())
    if provincia:
        query = query.filter(Inversion.provincia == provincia.upper())
    if distrito:
        query = query.filter(Inversion.distrito == distrito.upper())
    query = aplicar_filtro_nivel_alerta(query, EvaluacionRiesgo.nivel_alerta, nivel_alerta)

    points = query.limit(limit).all()

    from app.utils.ubigeo_helper import es_coordenada_peru_valida, resolver_coordenadas
    result_points = []
    for p in points:
        lat_p, lng_p = p.latitud, p.longitud
        if not es_coordenada_peru_valida(lat_p, lng_p, p.departamento):
            lat_p, lng_p = resolver_coordenadas(lat_p, lng_p, p.departamento or "", p.provincia or "", p.distrito or "")
        result_points.append({
            "cui": p.cui,
            "nombre": p.nombre,
            "sector": p.sector or "OTRO",
            "entidad": p.entidad or "Entidad Pública",
            "lat": lat_p,
            "lng": lng_p,
            "costo": p.costo_actualizado,
            "avance_fisico": p.avance_fisico,
            "avance_financiero": p.avance_financiero,
            "diferencia_avance": p.diferencia_avance,
            "dpto": p.departamento,
            "prov": p.provincia,
            "dist": p.distrito,
            "nivel_alerta": p.nivel_alerta or "NORMAL",
            "score": p.score_criticidad or 0.0
        })
    return result_points


@router.get("/archivos/mef")
def get_archivo_mef(cui: str = Query(...), nroseg: int = Query(...), archivo: str = Query(...)):
    """
    Sirve con caché persistente en disco y proxy seguro los archivos oficiales adjuntos del MEF
    (fotografías de obra en JPG y resúmenes de valorización mensual en PDF).
    """
    clean_cui = cui.strip()
    safe_filename = re.sub(r"[^A-Za-z0-9._-]", "", os.path.basename(archivo.strip()))
    if not re.fullmatch(r"\d{4,12}", clean_cui) or not safe_filename:
        raise HTTPException(status_code=400, detail="Parámetros de archivo o CUI inválidos.")

    data, mime_type = download_mef_archivo(clean_cui, nroseg, safe_filename)
    if not data:
        raise HTTPException(status_code=404, detail="Archivo no encontrado o no disponible en los servidores del MEF.")
    
    headers = {
        "Cache-Control": "public, max-age=604800, immutable",
        "Content-Disposition": f'inline; filename="{safe_filename}"'
    }
    return Response(content=data, media_type=mime_type, headers=headers)


@router.get("/{cui}", response_model=InversionDetalleOut)
def get_obra_detalle(
    cui: str,
    live: bool = Query(True, description="Si es True, consulta e hidrata datos en vivo del MEF/SEACE. Si es False, entrega la ficha local de inmediato."),
    db: Session = Depends(get_db)
):
    """
    Retorna la ficha técnica completa de la obra, incluyendo contratos SEACE,
    empresas adjudicatarias, documentos descargables y justificación de alertas.
    Soporta carga progresiva: si live=False entrega la ficha local de inmediato (<5ms)
    o aprovecha la memoria caché si ya fue consultada.
    """
    cui_clean = cui.strip()
    obra = (
        db.query(Inversion)
        .options(
            joinedload(Inversion.evaluacion_riesgo),
            joinedload(Inversion.contratos),
            joinedload(Inversion.documentos)
        )
        .filter(Inversion.cui == cui_clean)
        .first()
    )

    # Auto-bootstrap on-demand si el CUI no fue indexado inicialmente pero existe en Invierte.pe
    if not obra and cui_clean.isdigit() and len(cui_clean) in (6, 7):
        try:
            live_bootstrap = get_mef_live_data(cui_clean)
            if live_bootstrap and live_bootstrap.get("disponible"):
                geo_u = live_bootstrap.get("ubicacion_oficial") or {}
                dpto = str(geo_u.get("departamento") or "LIMA").upper()
                prov = str(geo_u.get("provincia") or "").upper()
                dist = str(geo_u.get("distrito") or "").upper()
                mto_et = float(live_bootstrap.get("monto_expediente_tecnico") or 0.0)

                new_inv = Inversion(
                    cui=cui_clean,
                    nombre=f"Inversión Pública CUI {cui_clean}",
                    departamento=dpto,
                    provincia=prov,
                    distrito=dist,
                    latitud=float(geo_u.get("latitud") or 0.0) or None,
                    longitud=float(geo_u.get("longitud") or 0.0) or None,
                    costo_actualizado=mto_et,
                    devengado_acumulado=0.0,
                    avance_fisico=float(live_bootstrap.get("avance_fisico_seace") or live_bootstrap.get("porc_avance_fis_f12b") or 0.0),
                    avance_financiero=0.0,
                    situacion=str(live_bootstrap.get("modalidad_ejecucion") or "")[:100],
                    estado="ACTIVO",
                    enriquecido=True,
                    estado_sincronizacion="AL_DIA",
                    motivo_reproceso=None,
                    version_motor=2,
                    fecha_enriquecimiento=datetime.now(timezone.utc)
                )
                db.add(new_inv)
                ev_init = EvaluacionRiesgo(
                    cui=cui_clean,
                    score_criticidad=10.0,
                    nivel_alerta="NORMAL",
                    alerta_desfase_financiero=False,
                    alerta_avance_lento=False,
                    alerta_plazo_vencido=False,
                    alerta_sin_reporte=False,
                    monto_en_riesgo=0.0,
                    justificacion_tecnica="Inversión auto-sincronizada en vivo desde el Banco de Inversiones (Invierte.pe)."
                )
                db.add(ev_init)
                db.commit()
                db.refresh(new_inv)
                obra = new_inv
        except Exception:
            db.rollback()

    if not obra:
        raise HTTPException(status_code=404, detail=f"Inversión con CUI {cui} no encontrada en la base de datos ni en el Banco de Inversiones (Invierte.pe).")

    out = InversionDetalleOut.model_validate(obra)
    try:
        # Si no se solicitó live, verificar primero si ya está en caché para responder al instante
        mef_data = None
        if not live:
            mef_data = get_cached_mef_data(obra.cui)
        else:
            mef_data = get_mef_live_data(obra.cui)

        conciliado = conciliar_datos_inversion(obra, mef_data)

        out.datos_en_vivo_mef = mef_data
        out.sincronizado_en_vivo = conciliado["sincronizado_en_vivo"]
        out.avance_fisico = conciliado["avance_fisico"]
        out.avance_financiero = conciliado["avance_financiero"]
        out.diferencia_avance = conciliado["diferencia_avance"]
        out.estado = conciliado["estado"]
        if conciliado.get("modalidad_ejecucion"):
            out.modalidad_ejecucion = conciliado["modalidad_ejecucion"]
        if conciliado.get("causal_retraso"):
            out.causal_retraso = conciliado["causal_retraso"]
        if conciliado.get("supervisor_obra"):
            out.supervisor_obra = conciliado["supervisor_obra"]
        if conciliado.get("nro_adendas") is not None:
            out.nro_adendas = conciliado["nro_adendas"]

        if out.evaluacion_riesgo and conciliado.get("evaluacion_riesgo"):
            ev_data = conciliado["evaluacion_riesgo"]
            out.evaluacion_riesgo.nivel_alerta = ev_data.get("nivel_alerta", out.evaluacion_riesgo.nivel_alerta)
            out.evaluacion_riesgo.score_criticidad = ev_data.get("score_criticidad", out.evaluacion_riesgo.score_criticidad)
            out.evaluacion_riesgo.alerta_desfase_financiero = ev_data.get("alerta_desfase_financiero", False)
            out.evaluacion_riesgo.alerta_avance_lento = ev_data.get("alerta_avance_lento", False)
            out.evaluacion_riesgo.alerta_plazo_vencido = ev_data.get("alerta_plazo_vencido", False)
            out.evaluacion_riesgo.alerta_sin_reporte = ev_data.get("alerta_sin_reporte", False)
            out.evaluacion_riesgo.monto_en_riesgo = ev_data.get("monto_en_riesgo", 0.0)
            if ev_data.get("justificacion_tecnica"):
                out.evaluacion_riesgo.justificacion_tecnica = ev_data["justificacion_tecnica"]

        out.linea_tiempo = conciliado["linea_tiempo"]
        out.ejecucion_por_componentes = conciliado["ejecucion_por_componentes"]
        out.fotos_obra = conciliado["fotos_obra"]
        out.alertas_ssi = conciliado["alertas_ssi"]

        # Georreferenciación oficial
        from app.utils.ubigeo_helper import es_coordenada_peru_valida, normalizar_coordenadas_peru, resolver_coordenadas
        if mef_data and mef_data.get("ubicacion_oficial"):
            geo_info = mef_data["ubicacion_oficial"]
            lat_geo, lon_geo = normalizar_coordenadas_peru(geo_info.get("latitud"), geo_info.get("longitud"))
            if lat_geo is not None and lon_geo is not None and es_coordenada_peru_valida(lat_geo, lon_geo, obra.departamento):
                if not es_coordenada_peru_valida(out.latitud, out.longitud, obra.departamento):
                    out.latitud = lat_geo
                    out.longitud = lon_geo
        if not es_coordenada_peru_valida(out.latitud, out.longitud, obra.departamento):
            out.latitud, out.longitud = resolver_coordenadas(
                out.latitud, out.longitud,
                obra.departamento or "", obra.provincia or "", obra.distrito or "",
                ubigeo=obra.ubigeo
            )

        # Persistencia Write-Through en vivo para mantener SQLite permanentemente sincronizada
        if live and conciliado.get("sincronizado_en_vivo"):
            try:
                obra.avance_fisico = conciliado["avance_fisico"]
                obra.avance_financiero = conciliado["avance_financiero"]
                obra.diferencia_avance = conciliado["diferencia_avance"]
                obra.estado = conciliado["estado"]
                if conciliado.get("modalidad_ejecucion"):
                    obra.situacion = str(conciliado["modalidad_ejecucion"])[:100]
                if conciliado.get("causal_retraso"):
                    obra.causal_retraso = conciliado["causal_retraso"]
                if conciliado.get("supervisor_obra"):
                    obra.supervisor_obra = conciliado["supervisor_obra"]
                if conciliado.get("nro_adendas") is not None:
                    obra.nro_adendas = conciliado["nro_adendas"]
                if conciliado.get("fec_fin"):
                    obra.fec_fin_ejec_fisica = conciliado["fec_fin"]
                obra.latitud = out.latitud
                obra.longitud = out.longitud
                obra.enriquecido = True
                obra.estado_sincronizacion = "AL_DIA"
                obra.motivo_reproceso = None
                obra.version_motor = 2
                obra.fecha_enriquecimiento = datetime.now(timezone.utc)

                if obra.evaluacion_riesgo and conciliado.get("evaluacion_riesgo"):
                    ev_db = obra.evaluacion_riesgo
                    ev_info = conciliado["evaluacion_riesgo"]
                    ev_db.nivel_alerta = ev_info.get("nivel_alerta", ev_db.nivel_alerta)
                    ev_db.score_criticidad = ev_info.get("score_criticidad", ev_db.score_criticidad)
                    ev_db.alerta_desfase_financiero = ev_info.get("alerta_desfase_financiero", False)
                    ev_db.alerta_avance_lento = ev_info.get("alerta_avance_lento", False)
                    ev_db.alerta_plazo_vencido = ev_info.get("alerta_plazo_vencido", False)
                    ev_db.alerta_sin_reporte = ev_info.get("alerta_sin_reporte", False)
                    ev_db.monto_en_riesgo = ev_info.get("monto_en_riesgo", 0.0)
                    if ev_info.get("justificacion_tecnica"):
                        ev_db.justificacion_tecnica = ev_info["justificacion_tecnica"]

                # Sincronizar contratos SEACE si se detectaron nuevos
                contratos_mef = conciliado.get("contratos_seace") or []
                if contratos_mef and not obra.contratos:
                    for c_item in contratos_mef:
                        db.add(ContratoEmpresa(
                            cui=obra.cui,
                            codigo_proceso_seace=c_item["codigo_proceso_seace"],
                            nro_contrato=c_item["nro_contrato"],
                            objeto=c_item["objeto"],
                            ruc_contratista=c_item["ruc_contratista"],
                            razon_social=c_item["razon_social"],
                            es_consorcio=c_item["es_consorcio"],
                            monto_contratado=c_item["monto_contratado"] or obra.costo_actualizado,
                            fecha_suscripcion=obra.fec_ini_ejec_fisica,
                            estado_contrato=c_item["estado_contrato"],
                            url_contrato_pdf=c_item["url_contrato_pdf"]
                        ))

                db.commit()
            except Exception as commit_err:
                import logging
                logging.warning(f"Error persistiendo write-through para CUI {obra.cui}: {commit_err}")
                db.rollback()
    except Exception as e:
        import logging
        logging.error(f"Error enriqueciendo CUI {cui_clean}: {e}", exc_info=True)
        out.datos_en_vivo_mef = None
        conciliado = conciliar_datos_inversion(obra, None)
        out.linea_tiempo = conciliado["linea_tiempo"]

    return out


# ==================== ENDPOINTS DE DESCARGA DIRECTA DE ARCHIVOS ====================

@router.get("/{cui}/descargar/f12b")
def descargar_reporte_f12b(cui: str, db: Session = Depends(get_db)):
    """
    Genera y descarga el archivo CSV oficial del Formato 12B (Seguimiento MEF) para el CUI.
    """
    obra = db.query(Inversion).filter(Inversion.cui == cui.strip()).first()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")

    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["MINISTERIO DE ECONOMIA Y FINANZAS - BANCO DE INVERSIONES"])
    writer.writerow(["REPORTE DE SEGUIMIENTO FINANCIERO Y FISICO - FORMATO 12B"])
    writer.writerow(["FECHA DE GENERACION", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow([])
    writer.writerow(["PARAMETRO", "VALOR"])
    writer.writerow(["CODIGO_UNICO_INVERSION (CUI)", obra.cui])
    writer.writerow(["CODIGO_SNIP", obra.codigo_snip or obra.cui])
    writer.writerow(["NOMBRE_INVERSION", obra.nombre])
    writer.writerow(["ENTIDAD_EJECUTORA", obra.entidad])
    writer.writerow(["NIVEL_GOBIERNO", obra.nivel_gobierno])
    writer.writerow(["SECTOR", obra.sector])
    writer.writerow(["DEPARTAMENTO", obra.departamento])
    writer.writerow(["PROVINCIA", obra.provincia])
    writer.writerow(["DISTRITO", obra.distrito])
    writer.writerow(["UBIGEO", obra.ubigeo])
    writer.writerow(["LATITUD", obra.latitud])
    writer.writerow(["LONGITUD", obra.longitud])
    writer.writerow(["ESTADO_INVERSION", obra.estado])
    writer.writerow(["SITUACION", obra.situacion or "ACTIVO"])
    writer.writerow([])
    writer.writerow(["ESTRUCTURA_PRESUPUESTAL_Y_FINANCIERA", "MONTO_SOLES"])
    writer.writerow(["MONTO_VIABLE", f"{obra.monto_viable:.2f}"])
    writer.writerow(["COSTO_ACTUALIZADO", f"{obra.costo_actualizado:.2f}"])
    writer.writerow(["PIA_ANUAL", f"{obra.pia_actual:.2f}"])
    writer.writerow(["PIM_ANUAL", f"{obra.pim_actual:.2f}"])
    writer.writerow(["DEVENGADO_ACUMULADO_TOTAL", f"{obra.devengado_acumulado:.2f}"])
    writer.writerow(["DEVENGADO_EJERCICIO_ACTUAL", f"{obra.devengado_actual:.2f}"])
    writer.writerow(["SALDO_POR_EJECUTAR", f"{obra.saldo_ejecutar:.2f}"])
    writer.writerow([])
    writer.writerow(["SEGUIMIENTO_FISICO_VS_FINANCIERO", "INDICADOR"])
    writer.writerow(["AVANCE_FISICO_REPORTADO_PCT", f"{obra.avance_fisico:.2f}%"])
    writer.writerow(["AVANCE_FINANCIERO_CALCULADO_PCT", f"{obra.avance_financiero:.2f}%"])
    writer.writerow(["DIFERENCIA_AVANCE_PP", f"{obra.diferencia_avance:.2f} puntos porcentuales"])
    writer.writerow(["FECHA_INICIO_EJECUCION_FISICA", str(obra.fec_ini_ejec_fisica or "No registrado")])
    writer.writerow(["FECHA_FIN_EJECUCION_FISICA", str(obra.fec_fin_ejec_fisica or "No registrado")])
    writer.writerow(["ULTIMA_FECHA_DECLARACION_ESTIMACION", str(obra.ult_fecha_declaracion or "No registrado")])
    writer.writerow(["DIAS_ATRASO_CONTRACTUAL", obra.dias_atraso])
    writer.writerow(["DIAS_SIN_REPORTE", obra.dias_sin_reporte])

    csv_data = output.getvalue()
    filename = f"Reporte_F12B_CUI_{obra.cui}.csv"
    return Response(
        content=csv_data.encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{cui}/descargar/contrato")
def descargar_contrato_seace(cui: str, db: Session = Depends(get_db)):
    """
    Genera y descarga el archivo oficial de contratación SEACE / OECE para el CUI.
    """
    obra = db.query(Inversion).options(joinedload(Inversion.contratos)).filter(Inversion.cui == cui.strip()).first()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["SISTEMA ELECTRONICO DE CONTRATACIONES DEL ESTADO (SEACE) / OECE"])
    writer.writerow(["FICHA RESUMEN DE CONTRATACION PUBLICA"])
    writer.writerow(["FECHA DE EMISION", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow(["CUI VINCULADO", obra.cui])
    writer.writerow(["NOMBRE_PROYECTO", obra.nombre])
    writer.writerow(["ENTIDAD_CONVOCANTE", obra.entidad])
    writer.writerow([])
    writer.writerow([
        "CODIGO_PROCESO_SEACE", "NRO_CONTRATO", "OBJETO_CONTRATO",
        "RUC_CONTRATISTA", "RAZON_SOCIAL", "ES_CONSORCIO", "DETALLE_CONSORCIO",
        "MONTO_CONTRATADO_S/", "FECHA_SUSCRIPCION", "PLAZO_DIAS", "ESTADO_CONTRATO"
    ])

    if obra.contratos:
        for c in obra.contratos:
            writer.writerow([
                c.codigo_proceso_seace,
                c.nro_contrato,
                c.objeto,
                c.ruc_contratista,
                c.razon_social,
                "SI" if c.es_consorcio else "NO",
                c.detalle_consorcio or "-",
                f"{c.monto_contratado:.2f}",
                str(c.fecha_suscripcion or "-"),
                c.plazo_dias,
                c.estado_contrato
            ])
    else:
        writer.writerow(["SIN REGISTRO", "-", "Ejecución por Administración Directa u otro", "-", "-", "NO", "-", "0.00", "-", 0, "NO APLICA"])

    csv_data = output.getvalue()
    filename = f"Contrato_SEACE_CUI_{obra.cui}.csv"
    return Response(
        content=csv_data.encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{cui}/descargar/infobras")
def descargar_reporte_infobras(cui: str, db: Session = Depends(get_db)):
    """
    Genera y descarga la Ficha de Seguimiento y Supervisión de Obras (Contraloría - Infobras).
    """
    obra = db.query(Inversion).options(joinedload(Inversion.evaluacion_riesgo)).filter(Inversion.cui == cui.strip()).first()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")

    ev = obra.evaluacion_riesgo
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["CONTRALORIA GENERAL DE LA REPUBLICA - SISTEMA INFOBRAS"])
    writer.writerow(["FICHA DE SEGUIMIENTO Y CONTROL DE OBRAS PUBLICAS"])
    writer.writerow(["FECHA DE GENERACION", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow([])
    writer.writerow(["PARAMETRO", "VALOR"])
    writer.writerow(["CUI", obra.cui])
    writer.writerow(["NOMBRE_DE_OBRA", obra.nombre])
    writer.writerow(["ENTIDAD_RESPONSABLE", obra.entidad])
    writer.writerow(["NIVEL_DE_GOBIERNO", obra.nivel_gobierno])
    writer.writerow(["UBICACION", f"{obra.departamento} / {obra.provincia} / {obra.distrito}"])
    writer.writerow(["COSTO_ACTUALIZADO_S/", f"{obra.costo_actualizado:.2f}"])
    writer.writerow(["ESTADO_SITUACIONAL", obra.estado])
    writer.writerow(["SEVERIDAD_RIESGO_OBSERVATORIO", ev.nivel_alerta if ev else "NORMAL"])
    writer.writerow(["SCORE_CRITICIDAD_ISR", ev.score_criticidad if ev else 0.0])
    writer.writerow(["ALERTA_PLAZO_VENCIDO", "SI" if (ev and ev.alerta_plazo_vencido) else "NO"])
    writer.writerow(["DIAS_ATRASO", obra.dias_atraso])
    writer.writerow(["ALERTA_DESFASE_FINANCIERO", "SI" if (ev and ev.alerta_desfase_financiero) else "NO"])
    writer.writerow(["PUNTOS_DESFASE_PP", obra.diferencia_avance])
    writer.writerow(["PRESUPUESTO_EN_OBSERVACION_S/", f"{ev.monto_en_riesgo:.2f}" if ev else "0.00"])
    writer.writerow(["SUPERVISOR_DE_OBRA", obra.supervisor_obra or "No especificado"])
    writer.writerow(["CAUSAL_OFICIAL_RETRASO_O_PARALIZACION", obra.causal_retraso or "Sin causales extraordinarias"])
    writer.writerow(["NUMERO_ADENDAS_APROBADAS", obra.nro_adendas or 0])
    writer.writerow(["SOBRECOSTO_ACUMULADO_ADENDAS_S/", f"{obra.sobrecosto_adendas or 0.0:.2f}"])
    writer.writerow(["OBSERVACIONES_DE_AUDITORIA", ev.justificacion_tecnica if ev else "Sin observaciones críticas registradas."])

    csv_data = output.getvalue()
    filename = f"Ficha_Infobras_CUI_{obra.cui}.csv"
    return Response(
        content=csv_data.encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{cui}/descargar/ficha")
def descargar_ficha_completa_html(cui: str, db: Session = Depends(get_db)):
    """
    Genera el Expediente Oficial de Auditoría Cívica en HTML imprimible / exportable a PDF.
    """
    obra = (
        db.query(Inversion)
        .options(
            joinedload(Inversion.evaluacion_riesgo),
            joinedload(Inversion.contratos),
            joinedload(Inversion.documentos)
        )
        .filter(Inversion.cui == cui.strip())
        .first()
    )
    if not obra:
        raise HTTPException(status_code=404, detail="Obra no encontrada")

    def _esc(val: object) -> str:
        return html.escape(str(val or ""))

    ev = obra.evaluacion_riesgo
    contratos_html = ""
    if obra.contratos:
        for c in obra.contratos:
            contratos_html += f"""
            <tr>
              <td>{_esc(c.codigo_proceso_seace)}</td>
              <td><strong>{_esc(c.razon_social)}</strong><br><small>RUC: {_esc(c.ruc_contratista)} {'(Consorcio)' if c.es_consorcio else ''}</small></td>
              <td>{_esc(c.nro_contrato)}</td>
              <td>S/ {c.monto_contratado:,.2f}</td>
              <td>{_esc(c.estado_contrato)}</td>
            </tr>
            """
    else:
        contratos_html = "<tr><td colspan='5' style='text-align:center;'>No se registran contratos en SEACE</td></tr>"

    cui_esc = _esc(obra.cui)
    nombre_esc = _esc(obra.nombre)
    entidad_esc = _esc(obra.entidad)
    ubicacion_esc = f"{_esc(obra.departamento)} / {_esc(obra.provincia)} / {_esc(obra.distrito)}"
    nivel_gob_esc = _esc(obra.nivel_gobierno)
    nivel_alerta_esc = _esc(ev.nivel_alerta if ev else "NORMAL")
    justificacion_esc = _esc(ev.justificacion_tecnica if ev else "Dentro de parámetros.")
    causal_esc = _esc(obra.causal_retraso or "Sin incidencias críticas reportadas en cuaderno de obra.")
    supervisor_esc = _esc(obra.supervisor_obra or "No asignada / En proceso")

    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ficha Oficial de Inversión - CUI {cui_esc}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #1e293b; margin: 0; padding: 30px; }}
    .header {{ display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #dc2626; padding-bottom: 15px; margin-bottom: 25px; }}
    .logo {{ font-size: 24px; font-weight: 900; color: #dc2626; }}
    .subtitle {{ font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }}
    h1 {{ font-size: 18px; margin: 0 0 10px 0; color: #0f172a; }}
    .badge {{ display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; background: #fee2e2; color: #991b1b; border: 1px solid #f87171; }}
    .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }}
    .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }}
    .card-title {{ font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }}
    .card-val {{ font-size: 16px; font-weight: bold; color: #0f172a; }}
    table {{ width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }}
    th, td {{ border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }}
    th {{ background: #f1f5f9; font-weight: bold; color: #475569; }}
    .alert-box {{ background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 0 8px 8px 0; margin-bottom: 25px; font-size: 13px; }}
    .footer {{ font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px; }}
    @media print {{
      body {{ padding: 0; font-size: 11px; }}
      .no-print {{ display: none; }}
    }}
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">🖨️ Imprimir o Guardar como PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="logo">🇵🇪 OBSERVATORIO DE OBRAS PÚBLICAS DEL PERÚ</div>
      <div class="subtitle">Expediente Oficial de Auditoría Cívica y Transparencia de Inversiones</div>
    </div>
    <div style="text-align: right;">
      <span class="badge">CUI {cui_esc}</span>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Generado: {datetime.now().strftime("%d/%m/%Y %H:%M")}</div>
    </div>
  </div>

  <h1>{nombre_esc}</h1>
  <p style="color: #475569; font-size: 13px; margin-bottom: 20px;">
    <strong>Entidad:</strong> {entidad_esc} | <strong>Ubicación:</strong> {ubicacion_esc} | <strong>Nivel:</strong> {nivel_gob_esc}
  </p>

  <div class="grid">
    <div class="card">
      <div class="card-title">Costo Actualizado</div>
      <div class="card-val">S/ {obra.costo_actualizado:,.2f}</div>
    </div>
    <div class="card">
      <div class="card-title">Devengado Acumulado</div>
      <div class="card-val">S/ {obra.devengado_acumulado:,.2f}</div>
    </div>
    <div class="card">
      <div class="card-title">Avance Físico</div>
      <div class="card-val" style="color: #059669;">{obra.avance_fisico:.1f}%</div>
    </div>
    <div class="card">
      <div class="card-title">Avance Financiero</div>
      <div class="card-val" style="color: #2563eb;">{obra.avance_financiero:.1f}%</div>
    </div>
  </div>

  <div class="alert-box">
    <strong>Diagnóstico de Alertas y Severidad de Riesgo (ISR {ev.score_criticidad if ev else 0}):</strong><br>
    Nivel: <strong>{nivel_alerta_esc}</strong>. {justificacion_esc}<br>
    <em>Diferencia de avances: {obra.diferencia_avance:.1f} puntos porcentuales. Días de atraso: {obra.dias_atraso} días.</em>
  </div>

  <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 25px; font-size: 13px;">
    <strong style="color: #334155; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">🔍 Inteligencia Documental (Adendas, Supervisión y Causales):</strong>
    <p style="margin: 8px 0 4px 0;"><strong>• Causal documentada de retraso:</strong> {causal_esc}</p>
    <p style="margin: 4px 0;"><strong>• Empresa Supervisora:</strong> {supervisor_esc}</p>
    <p style="margin: 4px 0;"><strong>• Modificaciones Contractuales:</strong> {obra.nro_adendas or 0} adendas aprobadas con sobrecosto estimado de S/ {obra.sobrecosto_adendas or 0.0:,.2f}</p>
  </div>

  <h3 style="font-size: 14px; margin-bottom: 10px;">Contratos y Proveedores Adjudicados (SEACE / OECE)</h3>
  <table>
    <thead>
      <tr>
        <th>Código Proceso</th>
        <th>Contratista</th>
        <th>N° Contrato</th>
        <th>Monto Adjudicado</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      {contratos_html}
    </tbody>
  </table>

  <div class="footer">
    Documento certificado con datos abiertos del Ministerio de Economía y Finanzas (MEF), Organismo Especializado para las Contrataciones Públicas Eficientes (OECE) y Contraloría General de la República (Infobras).
  </div>
</body>
</html>"""

    safe_cui = re.sub(r"[^A-Za-z0-9_-]", "", str(obra.cui))
    filename = f"Ficha_Oficial_CUI_{safe_cui}.html"
    return Response(
        content=html_content.encode("utf-8"),
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )

