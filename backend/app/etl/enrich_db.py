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

from app.database import SessionLocal
from app.models import Inversion, EvaluacionRiesgo
from app.etl.enricher import enriquecer_y_evaluar_inversion


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


def aplicar_enriquecimiento(target_mode: str = "critical_and_zero", max_workers: int = 8):
    start_time = time.time()
    db = SessionLocal()

    print("================================================================")
    print("   ENRIQUECIMIENTO Y RECONCILIACIÓN EN LÍNEA DE INVERSIONES     ")
    print(f"   Modo: {target_mode} | Hilos de consulta: {max_workers}")
    print("================================================================")

    query = db.query(Inversion).join(EvaluacionRiesgo)

    if target_mode == "critical":
        query = query.filter(EvaluacionRiesgo.nivel_alerta == "CRITICO")
    elif target_mode == "zero_physics":
        query = query.filter(Inversion.avance_fisico == 0.0, Inversion.avance_financiero > 20.0)
    elif target_mode == "critical_and_zero":
        query = query.filter(
            (EvaluacionRiesgo.nivel_alerta.in_(["CRITICO", "ALTO"])) |
            ((Inversion.avance_fisico == 0.0) & (Inversion.avance_financiero > 20.0))
        )
    elif target_mode == "all":
        pass

    candidatos = query.all()
    cuis_to_enrich = [inv.cui for inv in candidatos]
    total_candidatos = len(cuis_to_enrich)
    db.close()

    print(f"[ENRICH] Se identificaron {total_candidatos} obras candidatas para enriquecer.")

    if not cuis_to_enrich:
        print("[ENRICH] No hay registros que cumplan el criterio de enriquecimiento.")
        return

    enriquecidos = 0
    actualizados = 0

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(enriquecer_obra_individual, cui): cui for cui in cuis_to_enrich}

        db_write = SessionLocal()
        try:
            for future in as_completed(futures):
                cui = futures[future]
                try:
                    res = future.result()
                    if not res:
                        continue
                    cui_res, data = res

                    inv = db_write.query(Inversion).filter(Inversion.cui == cui_res).first()
                    ev = db_write.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.cui == cui_res).first()

                    if inv and ev:
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

                        ev.score_criticidad = eval_data["score_criticidad"]
                        ev.nivel_alerta = eval_data["nivel_alerta"]
                        ev.alerta_plazo_vencido = eval_data["alerta_plazo_vencido"]
                        ev.alerta_desfase_financiero = eval_data["alerta_desfase_financiero"]
                        ev.alerta_avance_lento = eval_data["alerta_avance_lento"]
                        ev.alerta_sin_reporte = eval_data["alerta_sin_reporte"]
                        ev.monto_en_riesgo = eval_data["monto_en_riesgo"]
                        ev.justificacion_tecnica = eval_data["justificacion_tecnica"]

                        db_write.commit()
                        actualizados += 1

                        if prev_fisico != new_fisico or prev_alerta != ev.nivel_alerta:
                            print(f"[✓ ENRICH] CUI {cui_res}: Físico {prev_fisico}% -> {new_fisico}% | Alerta {prev_alerta} -> {ev.nivel_alerta}")
                        else:
                            print(f"[= ENRICH] CUI {cui_res}: Sin cambio sustancial ({ev.nivel_alerta})")
                    
                    enriquecidos += 1
                except Exception as e:
                    print(f"[! ERROR] Error procesando CUI {cui}: {e}")
                    db_write.rollback()
        finally:
            db_write.close()

    elapsed = time.time() - start_time
    print(f"\n[ENRIQUECIMIENTO FINALIZADO]")
    print(f" - Obras enriquecidas: {actualizados}/{total_candidatos}")
    print(f" - Tiempo transcurrido: {elapsed:.2f} segundos")

    # Resumen final de la base de datos
    db_final = SessionLocal()
    try:
        criticos = db_final.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.nivel_alerta == "CRITICO").count()
        altos = db_final.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.nivel_alerta == "ALTO").count()
        medios = db_final.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.nivel_alerta == "MEDIO").count()
        normales = db_final.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.nivel_alerta == "NORMAL").count()

        print(f"\n[NUEVA DISTRIBUCIÓN DE RIESGO TRAS CONCILIACIÓN OFICIAL]")
        print(f"  🔴 Crítico: {criticos}")
        print(f"  🟠 Alto: {altos}")
        print(f"  🟡 Medio: {medios}")
        print(f"  🟢 Normal: {normales}")
    finally:
        db_final.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Enriquecimiento oficial MEF/SEACE de inversiones en BD")
    parser.add_argument("--mode", type=str, default="critical_and_zero", choices=["critical", "zero_physics", "critical_and_zero", "all"])
    parser.add_argument("--workers", type=int, default=8)
    args = parser.parse_args()

    aplicar_enriquecimiento(target_mode=args.mode, max_workers=args.workers)
