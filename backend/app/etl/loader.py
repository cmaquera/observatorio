from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Inversion, EvaluacionRiesgo, ContratoEmpresa, DocumentoFuente

def cargar_lote(db: Session, batch: List[Dict[str, Any]]) -> int:
    """
    Inserta o actualiza un lote de inversiones con sus evaluaciones de riesgo,
    contratos y documentos asociados en una única transacción de base de datos.
    """
    if not batch:
        return 0

    inserted = 0
    try:
        for item in batch:
            inv_dict = item["inversion"]
            cui = inv_dict["cui"]

            # Verificar si ya existe
            existing = db.query(Inversion).filter(Inversion.cui == cui).first()
            if existing:
                for key, val in inv_dict.items():
                    setattr(existing, key, val)
                inv_obj = existing
            else:
                inv_obj = Inversion(**inv_dict)
                db.add(inv_obj)
                inserted += 1

            # Evaluación de riesgo
            eval_dict = item["evaluacion"]
            existing_eval = db.query(EvaluacionRiesgo).filter(EvaluacionRiesgo.cui == cui).first()
            if existing_eval:
                for key, val in eval_dict.items():
                    setattr(existing_eval, key, val)
            else:
                db.add(EvaluacionRiesgo(**eval_dict))

            # Contratos
            db.query(ContratoEmpresa).filter(ContratoEmpresa.cui == cui).delete()
            for c in item["contratos"]:
                db.add(ContratoEmpresa(**c))

            # Documentos
            db.query(DocumentoFuente).filter(DocumentoFuente.cui == cui).delete()
            for d in item["documentos"]:
                db.add(DocumentoFuente(**d))

        db.commit()
        return inserted
    except Exception as e:
        db.rollback()
        print(f"[ETL Loader] Error en lote: {e}")
        raise e
