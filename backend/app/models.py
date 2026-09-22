from datetime import date, datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Date, DateTime, ForeignKey, Index, Text
)
from sqlalchemy.orm import relationship
from pydantic import BaseModel
from app.database import Base

# ==================== MODELOS ORM (SQLAlchemy) ====================

class Inversion(Base):
    __tablename__ = "inversiones"

    cui = Column(String(30), primary_key=True, index=True)
    codigo_snip = Column(String(30), nullable=True, index=True)
    nombre = Column(Text, nullable=False)
    sector = Column(String(100), nullable=True, index=True)
    entidad = Column(String(250), nullable=True, index=True)
    nivel_gobierno = Column(String(50), nullable=True, index=True)
    
    # Jerarquía Geográfica
    departamento = Column(String(100), nullable=True, index=True)
    provincia = Column(String(100), nullable=True, index=True)
    distrito = Column(String(100), nullable=True, index=True)
    ubigeo = Column(String(10), nullable=True, index=True)
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)

    # Cifras Presupuestales y Financieras
    monto_viable = Column(Float, default=0.0)
    costo_actualizado = Column(Float, default=0.0, index=True)
    pia_actual = Column(Float, default=0.0)
    pim_actual = Column(Float, default=0.0)
    devengado_acumulado = Column(Float, default=0.0)
    devengado_actual = Column(Float, default=0.0)
    saldo_ejecutar = Column(Float, default=0.0)

    # Avances Físico vs Financiero
    avance_fisico = Column(Float, default=0.0)      # % reportado en Banco de Inversiones / F12B
    avance_financiero = Column(Float, default=0.0)  # % devengado / costo actualizado
    diferencia_avance = Column(Float, default=0.0)  # financiero - físico (puntos porcentuales)

    # Fechas
    fec_ini_ejec_fisica = Column(Date, nullable=True)
    fec_fin_ejec_fisica = Column(Date, nullable=True)
    ult_fecha_declaracion = Column(Date, nullable=True)
    dias_atraso = Column(Integer, default=0)
    dias_sin_reporte = Column(Integer, default=0)

    estado = Column(String(50), default="ACTIVO", index=True)
    situacion = Column(String(100), nullable=True)
    
    # Datos profundos extraídos de contratos, adendas y reportes Infobras
    causal_retraso = Column(Text, nullable=True)         # Causal detectada en reportes de supervisión
    supervisor_obra = Column(String(250), nullable=True) # Empresa o consorcio supervisor
    nro_adendas = Column(Integer, default=0)             # Cantidad de adendas de plazo/presupuesto
    sobrecosto_adendas = Column(Float, default=0.0)      # Monto adicional aprobado por adendas (S/)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    evaluacion_riesgo = relationship("EvaluacionRiesgo", back_populates="inversion", uselist=False, cascade="all, delete-orphan")
    contratos = relationship("ContratoEmpresa", back_populates="inversion", cascade="all, delete-orphan")
    documentos = relationship("DocumentoFuente", back_populates="inversion", cascade="all, delete-orphan")


class EvaluacionRiesgo(Base):
    __tablename__ = "evaluaciones_riesgo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cui = Column(String(30), ForeignKey("inversiones.cui"), unique=True, index=True, nullable=False)
    
    score_criticidad = Column(Float, default=0.0, index=True) # 0 a 100
    nivel_alerta = Column(String(20), default="NORMAL", index=True) # CRITICO, ALTO, MEDIO, NORMAL, SIN_DATOS
    
    alerta_plazo_vencido = Column(Boolean, default=False, index=True)
    alerta_desfase_financiero = Column(Boolean, default=False, index=True)
    alerta_avance_lento = Column(Boolean, default=False)
    alerta_sin_reporte = Column(Boolean, default=False)
    
    monto_en_riesgo = Column(Float, default=0.0) # Presupuesto comprometido bajo observación
    justificacion_tecnica = Column(Text, nullable=True)

    inversion = relationship("Inversion", back_populates="evaluacion_riesgo")


class ContratoEmpresa(Base):
    __tablename__ = "contratos_empresas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cui = Column(String(30), ForeignKey("inversiones.cui"), index=True, nullable=False)
    
    codigo_proceso_seace = Column(String(100), nullable=True, index=True)
    nro_contrato = Column(String(100), nullable=True)
    objeto = Column(Text, nullable=True)
    
    # Contratista
    ruc_contratista = Column(String(20), nullable=True, index=True)
    razon_social = Column(String(250), nullable=False, index=True)
    es_consorcio = Column(Boolean, default=False)
    detalle_consorcio = Column(Text, nullable=True)

    monto_contratado = Column(Float, default=0.0)
    fecha_suscripcion = Column(Date, nullable=True)
    plazo_dias = Column(Integer, default=0)
    estado_contrato = Column(String(50), default="VIGENTE")
    url_contrato_pdf = Column(String(500), nullable=True)

    inversion = relationship("Inversion", back_populates="contratos")


class DocumentoFuente(Base):
    __tablename__ = "documentos_fuentes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cui = Column(String(30), ForeignKey("inversiones.cui"), index=True, nullable=False)
    
    tipo_documento = Column(String(50), nullable=False) # CONTRATO_SEACE, BASES, FICHA_12B, INFOBRAS
    titulo = Column(String(250), nullable=False)
    url_descarga = Column(String(500), nullable=False)
    origen = Column(String(50), nullable=False) # MEF, SEACE, CONTRALORIA
    tamanio_mb = Column(Float, default=0.0)
    fecha_documento = Column(Date, nullable=True)

    inversion = relationship("Inversion", back_populates="documentos")

# Índices compuestos para máxima velocidad de consulta y filtrado jerárquico
Index("idx_inversion_geo", Inversion.departamento, Inversion.provincia, Inversion.distrito)
Index("idx_inversion_alerta_monto", Inversion.costo_actualizado.desc(), Inversion.diferencia_avance.desc())


# ==================== ESQUEMAS PYDANTIC ====================

class DocumentoOut(BaseModel):
    id: int
    tipo_documento: str
    titulo: str
    url_descarga: str
    origen: str
    tamanio_mb: Optional[float] = 0.0
    fecha_documento: Optional[date] = None

    class Config:
        from_attributes = True

class ContratoOut(BaseModel):
    id: int
    codigo_proceso_seace: Optional[str] = None
    nro_contrato: Optional[str] = None
    objeto: Optional[str] = None
    ruc_contratista: Optional[str] = None
    razon_social: str
    es_consorcio: bool
    detalle_consorcio: Optional[str] = None
    monto_contratado: float
    fecha_suscripcion: Optional[date] = None
    plazo_dias: int
    estado_contrato: str
    url_contrato_pdf: Optional[str] = None

    class Config:
        from_attributes = True

class EvaluacionRiesgoOut(BaseModel):
    score_criticidad: float
    nivel_alerta: str
    alerta_plazo_vencido: bool
    alerta_desfase_financiero: bool
    alerta_avance_lento: bool
    alerta_sin_reporte: bool
    monto_en_riesgo: float
    justificacion_tecnica: Optional[str] = None

    class Config:
        from_attributes = True

class InversionSimpleOut(BaseModel):
    cui: str
    nombre: str
    sector: Optional[str] = None
    entidad: Optional[str] = None
    nivel_gobierno: Optional[str] = None
    departamento: Optional[str] = None
    provincia: Optional[str] = None
    distrito: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    costo_actualizado: float
    pim_actual: float
    devengado_acumulado: float
    avance_fisico: float
    avance_financiero: float
    diferencia_avance: float
    fec_fin_ejec_fisica: Optional[date] = None
    dias_atraso: int
    estado: str
    causal_retraso: Optional[str] = None
    supervisor_obra: Optional[str] = None
    nro_adendas: Optional[int] = 0
    sobrecosto_adendas: Optional[float] = 0.0
    evaluacion_riesgo: Optional[EvaluacionRiesgoOut] = None

    class Config:
        from_attributes = True

class InversionDetalleOut(InversionSimpleOut):
    codigo_snip: Optional[str] = None
    monto_viable: float
    pia_actual: float
    devengado_actual: float
    saldo_ejecutar: float
    fec_ini_ejec_fisica: Optional[date] = None
    ult_fecha_declaracion: Optional[date] = None
    dias_sin_reporte: int
    situacion: Optional[str] = None
    contratos: List[ContratoOut] = []
    documentos: List[DocumentoOut] = []
    datos_en_vivo_mef: Optional[Dict[str, Any]] = None
    linea_tiempo: Optional[Dict[str, Any]] = None
    ejecucion_por_componentes: Optional[List[Dict[str, Any]]] = None
    fotos_obra: List[Dict[str, Any]] = []
    alertas_ssi: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

class DashboardKpisOut(BaseModel):
    total_inversiones: int
    presupuesto_total: float
    monto_en_riesgo: float
    total_criticos: int
    total_alertas: int
    desfase_promedio_pp: float
    plazo_vencido_count: int
