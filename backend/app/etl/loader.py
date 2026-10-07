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

            # Inversión (Insert o Update)
            if cui in existing_inversiones:
                inv_obj = existing_inversiones[cui]
                for key, val in inv_dict.items():
                    setattr(inv_obj, key, val)
            else:
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
