"""
Script de Enriquecimiento y Reconciliación Masiva de la Base de Datos.
Consulta las APIs públicas oficiales de Invierte.pe / MEF / SEACE para reconciliar
el avance físico real y la fase de inversión, eliminando falsos positivos de riesgo.
"""

import sys
import time
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configurar salida UTF-8 en Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from datetime import datetime, timedelta, timezone
from app.database import SessionLocal, check_and_apply_migrations
from app.models import Inversion, EvaluacionRiesgo
from app.etl.enricher import enriquecer_y_evaluar_inversion

CURRENT_ENGINE_VERSION = 2  # Motor unificado: Conciliador SST + Soporte Formato 12-B


def enriquecer_obra_individual(cui: str):
    """Obtiene los datos enriquecidos para un CUI."""
    db = SessionLocal()
    try:
        inv = db.query(Inversion).filter(Inversion.cui == cui).first()
        if not inv:
            return None

        result = enriquecer_y_evaluar_inversion(
            cui=inv.cui,
            costo_actualizado=inv.costo_actualizado or 0.0,
            devengado_acumulado=inv.devengado_acumulado or 0.0,
            avance_fisico_inicial=inv.avance_fisico or 0.0,
            avance_financiero_inicial=inv.avance_financiero or 0.0,
            fec_ini=inv.fec_ini_ejec_fisica,
            fec_fin=inv.fec_fin_ejec_fisica,
            ult_fecha_declaracion=inv.ult_fecha_declaracion,
            estado_inicial=inv.estado or "ACTIVO",
            codigo_snip=inv.codigo_snip
        )
        return cui, result
    finally:
        db.close()


def aplicar_enriquecimiento(
    target_mode: str = "critical_and_zero",
    max_workers: int = 4,
    limit: int = 50,
    only_pending: bool = True,
    re_enrich_days: int = None,
    region: str = None,
    chunk_size: int = 50,
    delay_ms: int = 200
):
    start_time = time.time()
    check_and_apply_migrations()

    db = SessionLocal()
    try:
        total_inversiones = db.query(Inversion).count()
        total_al_dia = db.query(Inversion).filter(
            Inversion.estado_sincronizacion == "AL_DIA",
            Inversion.version_motor >= CURRENT_ENGINE_VERSION
        ).count()
        total_pendientes = db.query(Inversion).filter(
            (Inversion.estado_sincronizacion.in_(["PENDIENTE_REPROCESO", "NUNCA_PROCESADO"])) |
            (Inversion.version_motor < CURRENT_ENGINE_VERSION) |
            (Inversion.version_motor == None)
        ).count()

        print("================================================================")
        print("   ENRIQUECIMIENTO Y RECONCILIACIÓN EN LÍNEA DE INVERSIONES     ")
        print(f"   Motor: v{CURRENT_ENGINE_VERSION} (Conciliador SST + Formato 12-B)")
        print(f"   Modo: {target_mode} | Región: {region or 'TODAS'} | Hilos: {max_workers} | Límite lote: {limit if limit > 0 else 'SIN LÍMITE'}")
        print(f"   Estado BD: {total_al_dia}/{total_inversiones} AL DÍA ({total_pendientes} pendientes en cola de reproceso)")
        print("================================================================")

        query = db.query(Inversion).join(EvaluacionRiesgo)

        if region and region.strip():
            query = query.filter(Inversion.departamento == region.strip().upper())

        if only_pending and target_mode != "geo_missing":
            if re_enrich_days and re_enrich_days > 0:
                cutoff = datetime.now(timezone.utc) - timedelta(days=re_enrich_days)
                query = query.filter(
                    (Inversion.estado_sincronizacion.in_(["PENDIENTE_REPROCESO", "NUNCA_PROCESADO"])) |
                    (Inversion.version_motor < CURRENT_ENGINE_VERSION) |
                    (Inversion.version_motor == None) |
                    (Inversion.enriquecido == False) |
                    (Inversion.enriquecido == None) |
                    (Inversion.fecha_enriquecimiento == None) |
                    (Inversion.fecha_enriquecimiento < cutoff)
                )
            else:
                query = query.filter(
                    (Inversion.estado_sincronizacion.in_(["PENDIENTE_REPROCESO", "NUNCA_PROCESADO"])) |
                    (Inversion.version_motor < CURRENT_ENGINE_VERSION) |
                    (Inversion.version_motor == None) |
                    (Inversion.enriquecido == False) |
                    (Inversion.enriquecido == None)
                )

        if target_mode == "critical":
            query = query.filter(EvaluacionRiesgo.nivel_alerta == "CRITICO")
        elif target_mode == "zero_physics":
            query = query.filter(Inversion.avance_fisico == 0.0, Inversion.avance_financiero > 20.0)
        elif target_mode == "critical_and_zero":
            query = query.filter(
                (EvaluacionRiesgo.nivel_alerta.in_(["CRITICO", "ALTO"])) |
                ((Inversion.avance_fisico == 0.0) & (Inversion.avance_financiero > 20.0))
            )
        elif target_mode == "geo_missing":
            if only_pending:
                from sqlalchemy import or_
                geo_conds = [
                    Inversion.latitud == None,
                    Inversion.latitud == 0.0,
                    Inversion.longitud == None,
                    Inversion.longitud == 0.0,
                    Inversion.latitud == -9.1899,
                    Inversion.latitud < -18.5,
                    Inversion.latitud > -0.01,
                    Inversion.longitud < -81.5,
                    Inversion.longitud > -68.0,
                ]
                if region and region.strip().upper() == "TACNA":
                    geo_conds.extend([
                        Inversion.latitud < -18.45,
                        Inversion.latitud > -16.70,
                        Inversion.longitud < -71.25,
                        Inversion.longitud > -69.30,
                        Inversion.latitud == -18.0066,
                        Inversion.latitud == -18.0146,
                    ])
                query = query.filter(or_(*geo_conds))
        elif target_mode == "all":
            pass

        # Priorizar: 1. Movimiento financiero/declaración, 2. Criticidad, 3. Presupuesto
        from sqlalchemy import case, desc
        query = query.order_by(
            case(
                (Inversion.motivo_reproceso == "CAMBIO_FINANCIERO", 1),
                (Inversion.motivo_reproceso == "NUEVA_DECLARACION", 2),
                (Inversion.motivo_reproceso == "MIGRACION_V2", 3),
                else_=4
            ),
            case(
                (EvaluacionRiesgo.nivel_alerta == "CRITICO", 1),
                (EvaluacionRiesgo.nivel_alerta == "ALTO", 2),
                else_=3
            ),
            desc(Inversion.costo_actualizado)
        )

        if limit and limit > 0:
            query = query.limit(limit)

        candidatos = query.all()
        cuis_to_enrich = [inv.cui for inv in candidatos]
        total_candidatos = len(cuis_to_enrich)
    finally:
        db.close()

    print(f"[ENRICH] Se seleccionaron {total_candidatos} obras pendientes para procesar en este lote.")

    if not cuis_to_enrich:
        print("[ENRICH] No hay obras pendientes que requieran enriquecimiento bajo los filtros actuales.")
        return

    enriquecidos = 0
    actualizados = 0

    consecutive_errors = 0
    total_batches = (total_candidatos + chunk_size - 1) // chunk_size

    for batch_idx in range(0, total_candidatos, chunk_size):
        chunk = cuis_to_enrich[batch_idx : batch_idx + chunk_size]
        curr_batch_num = (batch_idx // chunk_size) + 1
        print(f"\n[BATCH {curr_batch_num}/{total_batches}] Procesando micro-lote de {len(chunk)} obras ({enriquecidos}/{total_candidatos} procesadas)...")

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(enriquecer_obra_individual, cui): cui for cui in chunk}

            db_write = SessionLocal()
            try:
                for future in as_completed(futures):
                    cui = futures[future]
                    try:
                        res = future.result()
                        inv = db_write.query(Inversion).filter(Inversion.cui == cui).first()
                        ev = db_write.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.cui == cui).first()

                        if inv:
                            inv.enriquecido = True
                            inv.estado_sincronizacion = "AL_DIA"
                            inv.motivo_reproceso = None
                            inv.version_motor = CURRENT_ENGINE_VERSION
                            inv.fecha_enriquecimiento = datetime.now(timezone.utc)

                        if res and inv and ev:
                            cui_res, data = res
                            prev_fisico = inv.avance_fisico
                            prev_alerta = ev.nivel_alerta

                            new_fisico = data["avance_fisico"]
                            new_diferencia = data["diferencia_avance"]
                            new_estado = data["estado"]
                            eval_data = data["evaluacion_riesgo"]

                            inv.avance_fisico = new_fisico
                            inv.diferencia_avance = new_diferencia
                            inv.estado = new_estado
                            if data.get("fec_fin"):
                                inv.fec_fin_ejec_fisica = data["fec_fin"]

                            mef_live = data.get("mef_live_data") or {}
                            if data.get("nro_adendas") is not None:
                                inv.nro_adendas = int(data["nro_adendas"] or 0)
                            elif mef_live.get("adicionales_reportados") is not None:
                                inv.nro_adendas = int(mef_live.get("adicionales_reportados") or 0)

                            if data.get("causal_retraso"):
                                inv.causal_retraso = str(data["causal_retraso"])[:500]
                            elif mef_live.get("causal_ampliacion"):
                                inv.causal_retraso = str(mef_live["causal_ampliacion"])[:500]
                            elif mef_live.get("ultimo_estado_situacional_f12b"):
                                inv.causal_retraso = str(mef_live["ultimo_estado_situacional_f12b"])[:500]

                            if data.get("supervisor_obra"):
                                inv.supervisor_obra = str(data["supervisor_obra"])[:250]
                            elif mef_live.get("responsable_uei"):
                                inv.supervisor_obra = str(mef_live["responsable_uei"])[:250]

                            contratos_seace = mef_live.get("contratos_seace") or []
                            if contratos_seace:
                                from app.models import ContratoEmpresa
                                db_write.query(ContratoEmpresa).filter(ContratoEmpresa.cui == cui).delete(synchronize_session=False)
                                for c_item in contratos_seace:
                                    db_write.add(ContratoEmpresa(
                                        cui=cui,
                                        codigo_proceso_seace=c_item["codigo_proceso_seace"],
                                        nro_contrato=c_item["nro_contrato"],
                                        objeto=c_item["objeto"],
                                        ruc_contratista=c_item["ruc_contratista"],
                                        razon_social=c_item["razon_social"],
                                        es_consorcio=c_item["es_consorcio"],
                                        detalle_consorcio=None,
                                        monto_contratado=c_item["monto_contratado"] or inv.costo_actualizado,
                                        fecha_suscripcion=inv.fec_ini_ejec_fisica,
                                        plazo_dias=0,
                                        estado_contrato=c_item["estado_contrato"],
                                        url_contrato_pdf=c_item["url_contrato_pdf"]
                                    ))

                            from app.utils.ubigeo_helper import (
                                es_coordenada_peru_valida,
                                normalizar_coordenadas_peru,
                                resolver_coordenadas
                            )
                            coords_invalidas = not es_coordenada_peru_valida(inv.latitud, inv.longitud, inv.departamento)
                            geo_oficial = mef_live.get("ubicacion_oficial")
                            if (
                                geo_oficial
                                and inv.departamento
                                and str(geo_oficial.get("departamento") or "").strip().upper() != inv.departamento.strip().upper()
                            ):
                                from app.etl.mef_live_client import fetch_geoinvierte_coords
                                geo_regional = fetch_geoinvierte_coords(cui, departamento=inv.departamento)
                                if geo_regional:
                                    geo_oficial = geo_regional

                            lat_geo, lon_geo = (
                                normalizar_coordenadas_peru(geo_oficial.get("latitud"), geo_oficial.get("longitud"))
                                if geo_oficial else (None, None)
                            )

                            if lat_geo is not None and lon_geo is not None and es_coordenada_peru_valida(lat_geo, lon_geo, inv.departamento):
                                if coords_invalidas or target_mode == "geo_missing" or not only_pending:
                                    inv.latitud = lat_geo
                                    inv.longitud = lon_geo
                                    print(f"[📍 GEO] CUI {cui}: Coordenadas fijadas desde GeoInvierte -> ({inv.latitud}, {inv.longitud})")
                            elif coords_invalidas or target_mode == "geo_missing":
                                lat_ubig, lon_ubig = resolver_coordenadas(
                                    inv.latitud, inv.longitud,
                                    inv.departamento, inv.provincia, inv.distrito,
                                    ubigeo=inv.ubigeo
                                )
                                if lat_ubig and lon_ubig:
                                    inv.latitud = lat_ubig
                                    inv.longitud = lon_ubig
                                    print(f"[📍 GEO] CUI {cui}: Coordenadas corregidas desde Catálogo Ubigeo -> ({inv.latitud}, {inv.longitud})")

                            ev.score_criticidad = eval_data["score_criticidad"]
                            ev.nivel_alerta = eval_data["nivel_alerta"]
                            ev.alerta_plazo_vencido = eval_data["alerta_plazo_vencido"]
                            ev.alerta_desfase_financiero = eval_data["alerta_desfase_financiero"]
                            ev.alerta_avance_lento = eval_data["alerta_avance_lento"]
                            ev.alerta_sin_reporte = eval_data["alerta_sin_reporte"]
                            ev.monto_en_riesgo = eval_data["monto_en_riesgo"]
                            ev.justificacion_tecnica = eval_data["justificacion_tecnica"]

                            actualizados += 1
                            consecutive_errors = 0

                            if prev_fisico != new_fisico or prev_alerta != ev.nivel_alerta:
                                print(f"[✓ ENRICH] CUI {cui}: Físico {prev_fisico}% -> {new_fisico}% | Alerta {prev_alerta} -> {ev.nivel_alerta}")
                            else:
                                print(f"[= ENRICH] CUI {cui}: Sin cambio sustancial ({ev.nivel_alerta})")
                        
                        db_write.commit()
                        enriquecidos += 1
                    except Exception as e:
                        print(f"[! ERROR] Error procesando CUI {cui}: {e}")
                        consecutive_errors += 1
                        db_write.rollback()

                        # Circuit Breaker: si el servidor del Estado rechaza o falla 5 veces consecutivas
                        if consecutive_errors >= 5:
                            print("[⚠️ CIRCUIT BREAKER] Se detectaron 5 errores consecutivos del MEF/WAF. Pausando 25 segundos para evitar bloqueo de IP...")
                            time.sleep(25)
                            consecutive_errors = 0
            finally:
                db_write.close()

        # Pausa suave adaptativa entre micro-lotes para respetar WAF del Estado
        if batch_idx + chunk_size < total_candidatos and delay_ms > 0:
            time.sleep(delay_ms / 1000.0)

    elapsed = time.time() - start_time
    print(f"\n[ENRIQUECIMIENTO FINALIZADO]")
    print(f" - Obras procesadas en este lote: {enriquecidos}/{total_candidatos}")
    print(f" - Tiempo transcurrido: {elapsed:.2f} segundos")

    # Resumen final de la base de datos
    db_final = SessionLocal()
    try:
        criticos = db_final.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.nivel_alerta == "CRITICO").count()
        altos = db_final.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.nivel_alerta == "ALTO").count()
        medios = db_final.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.nivel_alerta == "MEDIO").count()
        normales = db_final.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.nivel_alerta == "NORMAL").count()
        tot_al_dia = db_final.query(Inversion).filter(
            Inversion.estado_sincronizacion == "AL_DIA",
            Inversion.version_motor >= CURRENT_ENGINE_VERSION
        ).count()
        tot_all = db_final.query(Inversion).count()
        tot_pend = db_final.query(Inversion).filter(
            (Inversion.estado_sincronizacion.in_(["PENDIENTE_REPROCESO", "NUNCA_PROCESADO"])) |
            (Inversion.version_motor < CURRENT_ENGINE_VERSION) |
            (Inversion.version_motor == None)
        ).count()

        print(f"\n[ESTADO ACTUALIZADO DE LA BASE DE DATOS]")
        print(f"  Obras AL DÍA (Motor v{CURRENT_ENGINE_VERSION}): {tot_al_dia}/{tot_all} ({tot_al_dia/tot_all*100:.1f}%)")
        print(f"  Obras pendientes en cola: {tot_pend}")
        print(f"  🔴 Crítico: {criticos} | 🟠 Alto: {altos} | 🟡 Medio: {medios} | 🟢 Normal: {normales}")
    finally:
        db_final.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Enriquecimiento progresivo oficial MEF/SEACE en micro-lotes")
    parser.add_argument("--mode", type=str, default="critical_and_zero", choices=["critical", "zero_physics", "critical_and_zero", "geo_missing", "all"])
    parser.add_argument("--region", type=str, default=None, help="Filtrar por departamento (ej. TACNA, CUSCO, LIMA)")
    parser.add_argument("--workers", type=int, default=4, help="Número de hilos concurrentes hacia el MEF (default: 4)")
    parser.add_argument("--limit", type=int, default=50, help="Límite de obras a enriquecer en este lote (default: 50, 0 para todas)")
    parser.add_argument("--all-records", action="store_true", help="Ignorar si ya fueron enriquecidas y procesar de nuevo")
    parser.add_argument("--re-enrich-days", type=int, default=None, help="Re-enriquecer obras con más de N días desde último enriquecimiento")
    parser.add_argument("--chunk-size", type=int, default=50, help="Tamaño del micro-lote para checkpointing (default: 50)")
    parser.add_argument("--delay-ms", type=int, default=200, help="Pausa en milisegundos entre micro-lotes para evitar rate-limiting (default: 200)")
    parser.add_argument("--reset-all-reprocess", action="store_true", help="Reiniciar cola: marca todas las inversiones como PENDIENTE_REPROCESO")
    parser.add_argument("--status", action="store_true", help="Mostrar estado de sincronización y cola sin procesar")
    args = parser.parse_args()

    if args.status or args.reset_all_reprocess:
        check_and_apply_migrations()
        db_aux = SessionLocal()
        try:
            if args.reset_all_reprocess:
                db_aux.query(Inversion).update({
                    Inversion.estado_sincronizacion: "PENDIENTE_REPROCESO",
                    Inversion.motivo_reproceso: "MIGRACION_V2",
                    Inversion.version_motor: 1
                })
                db_aux.commit()
                print("[RESET] Se marcaron exitosamente todas las inversiones como PENDIENTE_REPROCESO (MIGRACION_V2).")

            tot_all = db_aux.query(Inversion).count()
            tot_al_dia = db_aux.query(Inversion).filter(
                Inversion.estado_sincronizacion == "AL_DIA",
                Inversion.version_motor >= CURRENT_ENGINE_VERSION
            ).count()
            tot_pend = db_aux.query(Inversion).filter(
                (Inversion.estado_sincronizacion.in_(["PENDIENTE_REPROCESO", "NUNCA_PROCESADO"])) |
                (Inversion.version_motor < CURRENT_ENGINE_VERSION) |
                (Inversion.version_motor == None)
            ).count()
            print(f"[COLA DE SINCRONIZACIÓN] Al día (v{CURRENT_ENGINE_VERSION}): {tot_al_dia}/{tot_all} ({tot_al_dia/tot_all*100:.1f}%) | Pendientes: {tot_pend}")
        finally:
            db_aux.close()
        sys.exit(0)

    aplicar_enriquecimiento(
        target_mode=args.mode,
        max_workers=args.workers,
        limit=args.limit,
        only_pending=not args.all_records,
        re_enrich_days=args.re_enrich_days,
        region=args.region,
        chunk_size=args.chunk_size,
        delay_ms=args.delay_ms
    )
