from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from app.database import get_db
from app.models import ContratoEmpresa, Inversion, EvaluacionRiesgo

router = APIRouter(prefix="/api/empresas", tags=["Empresas y Contratistas"])

@router.get("")
def list_empresas(
    q: Optional[str] = Query(None, description="Búsqueda por RUC o Razón Social"),
    departamento: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db)
):
    """
    Lista las empresas contratistas y consorcios con mayor volumen de obras,
    monto adjudicado acumulado y cantidad de obras en estado crítico o en riesgo.
    """
    alerta_case = case(
        (EvaluacionRiesgo.nivel_alerta.in_(["CRITICO", "ALTO"]), 1),
        else_=0
    )

    query = (
        db.query(
            ContratoEmpresa.ruc_contratista,
            ContratoEmpresa.razon_social,
            ContratoEmpresa.es_consorcio,
            func.count(ContratoEmpresa.id).label("total_contratos"),
            func.sum(ContratoEmpresa.monto_contratado).label("monto_total_contratado"),
            func.sum(alerta_case).label("obras_en_alerta")
        )
        .join(Inversion, ContratoEmpresa.cui == Inversion.cui)
        .join(EvaluacionRiesgo, Inversion.cui == EvaluacionRiesgo.cui)
    )


    if departamento:
        query = query.filter(Inversion.departamento == departamento.upper())

    if q:
        q_term = f"%{q.strip()}%"
        query = query.filter(
            (ContratoEmpresa.razon_social.ilike(q_term)) |
            (ContratoEmpresa.ruc_contratista.like(q_term))
        )

    results = (
        query
        .group_by(
            ContratoEmpresa.ruc_contratista,
            ContratoEmpresa.razon_social,
            ContratoEmpresa.es_consorcio
        )
        .order_by(desc(func.sum(ContratoEmpresa.monto_contratado)))
        .limit(limit)
        .all()
    )

    return [
        {
            "ruc": r.ruc_contratista,
            "razon_social": r.razon_social,
            "es_consorcio": r.es_consorcio,
            "total_contratos": r.total_contratos,
            "monto_total_contratado": round(r.monto_total_contratado or 0.0, 2),
            "obras_en_alerta": r.obras_en_alerta
        }
        for r in results
    ]
