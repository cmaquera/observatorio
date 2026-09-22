from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Inversion

router = APIRouter(prefix="/api/geo", tags=["Geografía"])

@router.get("/departamentos")
def get_departamentos(db: Session = Depends(get_db)):
    results = (
        db.query(Inversion.departamento, func.count(Inversion.cui).label("obras_count"))
        .filter(Inversion.departamento.isnot(None), Inversion.departamento != "")
        .group_by(Inversion.departamento)
        .order_by(Inversion.departamento.asc())
        .all()
    )
    return [{"departamento": r.departamento, "obras_count": r.obras_count} for r in results]


@router.get("/provincias")
def get_provincias(
    departamento: str = Query(..., description="Nombre del departamento"),
    db: Session = Depends(get_db)
):
    results = (
        db.query(Inversion.provincia, func.count(Inversion.cui).label("obras_count"))
        .filter(
            Inversion.departamento == departamento.upper(),
            Inversion.provincia.isnot(None),
            Inversion.provincia != ""
        )
        .group_by(Inversion.provincia)
        .order_by(Inversion.provincia.asc())
        .all()
    )
    return [{"provincia": r.provincia, "obras_count": r.obras_count} for r in results]


@router.get("/distritos")
def get_distritos(
    departamento: str = Query(..., description="Nombre del departamento"),
    provincia: str = Query(..., description="Nombre de la provincia"),
    db: Session = Depends(get_db)
):
    results = (
        db.query(Inversion.distrito, func.count(Inversion.cui).label("obras_count"))
        .filter(
            Inversion.departamento == departamento.upper(),
            Inversion.provincia == provincia.upper(),
            Inversion.distrito.isnot(None),
            Inversion.distrito != ""
        )
        .group_by(Inversion.distrito)
        .order_by(Inversion.distrito.asc())
        .all()
    )
    return [{"distrito": r.distrito, "obras_count": r.obras_count} for r in results]
