from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import get_db
from app.models import Inversion, EvaluacionRiesgo, InversionSimpleOut, DashboardKpisOut

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/kpis", response_model=DashboardKpisOut)
def get_kpis(
    departamento: Optional[str] = Query(None),
    provincia: Optional[str] = Query(None),
    distrito: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Inversion).join(EvaluacionRiesgo)

    if departamento:
        query = query.filter(Inversion.departamento == departamento.upper())
    if provincia:
        query = query.filter(Inversion.provincia == provincia.upper())
    if distrito:
        query = query.filter(Inversion.distrito == distrito.upper())

    total = query.count()
    if total == 0:
        return DashboardKpisOut(
            total_inversiones=0,
            presupuesto_total=0.0,
            monto_en_riesgo=0.0,
            total_criticos=0,
            total_alertas=0,
            desfase_promedio_pp=0.0,
            plazo_vencido_count=0
        )

    presupuesto_total = query.with_entities(func.sum(Inversion.costo_actualizado)).scalar() or 0.0
    monto_en_riesgo = query.with_entities(func.sum(EvaluacionRiesgo.monto_en_riesgo)).scalar() or 0.0
    
    criticos_count = query.filter(EvaluacionRiesgo.nivel_alerta == "CRITICO").count()
    alertas_count = query.filter(EvaluacionRiesgo.nivel_alerta.in_(["CRITICO", "ALTO"])).count()
    
    # Desfase promedio (solo obras que tienen avance declarado)
    obras_con_avance = query.filter(Inversion.costo_actualizado > 0)
    desfase_prom = obras_con_avance.with_entities(func.avg(Inversion.diferencia_avance)).scalar() or 0.0

    plazo_vencido_count = query.filter(EvaluacionRiesgo.alerta_plazo_vencido == True).count()

    return DashboardKpisOut(
        total_inversiones=total,
        presupuesto_total=round(presupuesto_total, 2),
        monto_en_riesgo=round(monto_en_riesgo, 2),
        total_criticos=criticos_count,
        total_alertas=alertas_count,
        desfase_promedio_pp=round(desfase_prom, 2),
        plazo_vencido_count=plazo_vencido_count
    )


@router.get("/criticos", response_model=List[InversionSimpleOut])
def get_proyectos_criticos(
    departamento: Optional[str] = Query(None),
    provincia: Optional[str] = Query(None),
    distrito: Optional[str] = Query(None),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db)
):
    """
    Retorna el Top de inversiones más críticas del Perú o de la región seleccionada,
    ordenadas por el Score de Severidad de Riesgo (ISR) descendente.
    """
    query = db.query(Inversion).join(EvaluacionRiesgo).options(joinedload(Inversion.evaluacion_riesgo))

    if departamento:
        query = query.filter(Inversion.departamento == departamento.upper())
    if provincia:
        query = query.filter(Inversion.provincia == provincia.upper())
    if distrito:
        query = query.filter(Inversion.distrito == distrito.upper())

    # Priorizar obras con alertas críticas y altos montos
    criticos = (
        query
        .filter(EvaluacionRiesgo.nivel_alerta.in_(["CRITICO", "ALTO"]))
        .order_by(EvaluacionRiesgo.score_criticidad.desc(), Inversion.costo_actualizado.desc())
        .limit(limit)
        .all()
    )
    return criticos


@router.get("/sectores")
def get_distribucion_sectores(
    departamento: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(
        Inversion.sector,
        func.count(Inversion.cui).label("total_obras"),
        func.sum(Inversion.costo_actualizado).label("monto_total")
    )
    if departamento:
        query = query.filter(Inversion.departamento == departamento.upper())

    results = (
        query
        .group_by(Inversion.sector)
        .order_by(func.sum(Inversion.costo_actualizado).desc())
        .limit(8)
        .all()
    )

    return [
        {
            "sector": r.sector or "OTROS",
            "total_obras": r.total_obras,
            "monto_total": round(r.monto_total or 0.0, 2)
        }
        for r in results
    ]
