from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Inversion, EvaluacionRiesgo, ContratoEmpresa, DocumentoFuente

def cargar_lote(db: Session, batch: List[Dict[str, Any]]) -> int:
    """
    Inserta o actualiza un lote de inversiones con sus evaluaciones de riesgo,
    contratos y documentos asociados en una única transacción de base de datos.
    Optimizado con búsquedas y eliminaciones por lote para máximo rendimiento en SQLite.
    """
    if not batch:
        return 0

    inserted = 0
    try:
        cuis = [item["inversion"]["cui"] for item in batch]

        # Búsqueda en bloque de registros existentes en el lote actual
        existing_inversiones = {
            inv.cui: inv
            for inv in db.query(Inversion).filter(Inversion.cui.in_(cuis)).all()
        }
        existing_evals = {
            ev.cui: ev
            for ev in db.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.cui.in_(cuis)).all()
        }

        # Limpiar contratos y documentos antiguos para los CUIs de este lote
        db.query(ContratoEmpresa).filter(ContratoEmpresa.cui.in_(cuis)).delete(synchronize_session=False)
        db.query(DocumentoFuente).filter(DocumentoFuente.cui.in_(cuis)).delete(synchronize_session=False)

        for item in batch:
            inv_dict = item["inversion"]
            cui = inv_dict["cui"]

            # Inversión (Insert o Update con Change Data Capture presupuestal)
            if cui in existing_inversiones:
                inv_obj = existing_inversiones[cui]
                old_devengado = inv_obj.devengado_acumulado or 0.0
                old_costo = inv_obj.costo_actualizado or 0.0
                old_ult_fec = inv_obj.ult_fecha_declaracion
                
                new_devengado = float(inv_dict.get("devengado_acumulado") or 0.0)
                new_costo = float(inv_dict.get("costo_actualizado") or 0.0)
                new_ult_fec = inv_dict.get("ult_fecha_declaracion")
                
                cambio_financiero = (abs(new_devengado - old_devengado) > 1.0) or (abs(new_costo - old_costo) > 1.0)
                nuevo_reporte = bool(new_ult_fec and (not old_ult_fec or new_ult_fec > old_ult_fec))

                for key, val in inv_dict.items():
                    if key in ["enriquecido", "fecha_enriquecimiento", "estado_sincronizacion", "motivo_reproceso", "version_motor"]:
                        continue
                    setattr(inv_obj, key, val)

                # Si detectamos movimiento financiero o nuevo reporte, programar para re-enriquecimiento prioritario
                if cambio_financiero or nuevo_reporte:
                    inv_obj.estado_sincronizacion = "PENDIENTE_REPROCESO"
                    inv_obj.motivo_reproceso = "CAMBIO_FINANCIERO" if cambio_financiero else "NUEVA_DECLARACION"
            else:
                inv_dict.setdefault("enriquecido", False)
                inv_dict.setdefault("estado_sincronizacion", "PENDIENTE_REPROCESO")
                inv_dict.setdefault("motivo_reproceso", "NUEVA_INVERSION")
                inv_dict.setdefault("version_motor", 1)
                inv_obj = Inversion(**inv_dict)
                db.add(inv_obj)
                existing_inversiones[cui] = inv_obj
                inserted += 1

            # Evaluación de riesgo (Insert o Update)
            eval_dict = item["evaluacion"]
            if cui in existing_evals:
                ev_obj = existing_evals[cui]
                for key, val in eval_dict.items():
                    setattr(ev_obj, key, val)
            else:
                ev_obj = EvaluacionRiesgo(**eval_dict)
                db.add(ev_obj)
                existing_evals[cui] = ev_obj

            # Contratos
            for c in item.get("contratos", []):
                db.add(ContratoEmpresa(**c))

            # Documentos
            for d in item.get("documentos", []):
                db.add(DocumentoFuente(**d))

        db.commit()
        return inserted
    except Exception as e:
        db.rollback()
        print(f"[ETL Loader] Error en lote: {e}")
        raise e
