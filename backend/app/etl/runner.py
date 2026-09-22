import argparse
import sys
import time

sys.stdout.reconfigure(encoding="utf-8")

from app.database import engine, Base, SessionLocal

from app.etl.extractor import stream_mef_csv
from app.etl.transformer import transformar_registro
from app.etl.loader import cargar_lote
from app.models import Inversion, EvaluacionRiesgo

def run_etl(region: str = "CUSCO", limit: int = 500):
    start_time = time.time()
    print(f"==================================================")
    print(f"  INICIANDO PIPELINE ETL - OBSERVATORIO DE OBRAS  ")
    print(f"  Región objetivo: {region.upper() if region else 'NACIONAL'}")
    print(f"  Límite de registros: {limit}")
    print(f"==================================================")

    # Asegurar que las tablas existan
    print("[ETL] Inicializando esquema de base de datos...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    batch = []
    total_processed = 0
    total_loaded = 0

    try:
        for raw_row in stream_mef_csv(target_dpto=region, limit=limit):
            transformed = transformar_registro(raw_row)
            if transformed:
                batch.append(transformed)
                total_processed += 1

            if len(batch) >= 50:
                cargar_lote(db, batch)
                total_loaded += len(batch)
                print(f"[ETL] Progreso: {total_loaded} obras procesadas y guardadas...")
                batch = []

        if batch:
            cargar_lote(db, batch)
            total_loaded += len(batch)

        # Fase de Enriquecimiento y Reconciliación Oficial en Línea
        print("\n[ETL] Ejecutando reconciliación oficial en vivo con MEF/SEACE (eliminación de falsos positivos)...")
        from app.etl.enrich_db import aplicar_enriquecimiento
        aplicar_enriquecimiento(target_mode="critical_and_zero", max_workers=8)

        elapsed = time.time() - start_time
        print(f"\n[ETL FINALIZADO CON ÉXITO]")
        print(f" - Obras procesadas e indexadas: {total_loaded}")
        print(f" - Tiempo de ejecución: {elapsed:.2f} segundos")
        
        # Muestra estadística
        criticos = db.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.nivel_alerta == "CRITICO").count()
        altos = db.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.nivel_alerta == "ALTO").count()
        medios = db.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.nivel_alerta == "MEDIO").count()
        normales = db.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.nivel_alerta == "NORMAL").count()
        
        print(f"\n[DISTRIBUCIÓN DE ALERTAS CALCULADAS]")
        print(f"  🔴 Crítico: {criticos}")
        print(f"  🟠 Alto: {altos}")
        print(f"  🟡 Medio: {medios}")
        print(f"  🟢 Normal: {normales}")

    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Runner de ingesta ETL para Observatorio de Obras")
    parser.add_argument("--region", type=str, default="CUSCO", help="Departamento a filtrar (ej. CUSCO, LIMA, AREQUIPA)")
    parser.add_argument("--limit", type=int, default=500, help="Límite de registros a extraer")
    args = parser.parse_args()

    run_etl(region=args.region, limit=args.limit)
