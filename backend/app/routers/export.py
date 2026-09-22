import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Inversion, EvaluacionRiesgo

router = APIRouter(prefix="/api/export", tags=["Exportación"])

@router.get("/csv")
def export_obras_csv(
    departamento: Optional[str] = Query(None),
    provincia: Optional[str] = Query(None),
    distrito: Optional[str] = Query(None),
    nivel_alerta: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Descarga en formato CSV el conjunto de obras con sus alertas y métricas filtradas.
    """
    query = db.query(Inversion).join(EvaluacionRiesgo)

    if departamento:
        query = query.filter(Inversion.departamento == departamento.upper())
    if provincia:
        query = query.filter(Inversion.provincia == provincia.upper())
    if distrito:
        query = query.filter(Inversion.distrito == distrito.upper())
    if nivel_alerta and nivel_alerta != "TODAS":
        query = query.filter(EvaluacionRiesgo.nivel_alerta == nivel_alerta.upper())

    obras = query.limit(2000).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Encabezados
    writer.writerow([
        "CUI", "NOMBRE_INVERSION", "ENTIDAD", "DEPARTAMENTO", "PROVINCIA", "DISTRITO",
        "COSTO_ACTUALIZADO", "PIM_ACTUAL", "DEVENGADO_ACUMULADO",
        "AVANCE_FISICO_PCT", "AVANCE_FINANCIERO_PCT", "DIFERENCIA_AVANCE_PP",
        "NIVEL_ALERTA", "SCORE_CRITICIDAD", "PLAZO_VENCIDO", "DIAS_ATRASO",
        "JUSTIFICACION_TECNICA"
    ])

    for o in obras:
        ev = o.evaluacion_riesgo
        writer.writerow([
            o.cui,
            o.nombre,
            o.entidad,
            o.departamento,
            o.provincia,
            o.distrito,
            o.costo_actualizado,
            o.pim_actual,
            o.devengado_acumulado,
            o.avance_fisico,
            o.avance_financiero,
            o.diferencia_avance,
            ev.nivel_alerta if ev else "NORMAL",
            ev.score_criticidad if ev else 0.0,
            ev.alerta_plazo_vencido if ev else False,
            o.dias_atraso,
            ev.justificacion_tecnica if ev else ""
        ])

    csv_data = output.getvalue()
    filename = f"observatorio_obras_{departamento or 'nacional'}.csv"
    
    return Response(
        content=csv_data.encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
