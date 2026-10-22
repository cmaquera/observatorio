"""
Módulo de Enriquecimiento para el Pipeline ETL y Re-enriquecimiento Masivo.
Delega directamente en el motor unificado de conciliación (Single Source of Truth)
para garantizar que las columnas persistidas en SQLite coincidan con la vista en vivo.
"""

from typing import Dict, Any, Optional
from datetime import date
from app.etl.mef_live_client import get_mef_live_data
from app.etl.conciliador import conciliar_datos_inversion


def enriquecer_y_evaluar_inversion(
    cui: str,
    costo_actualizado: float,
    devengado_acumulado: float,
    avance_fisico_inicial: float,
    avance_financiero_inicial: float,
    fec_ini: Optional[date] = None,
    fec_fin: Optional[date] = None,
    ult_fecha_declaracion: Optional[date] = None,
    estado_inicial: str = "ACTIVO",
    codigo_snip: Optional[str] = None
) -> Dict[str, Any]:
    """
    Enriquece una inversión con los registros oficiales en vivo del MEF/SEACE.
    Usa el motor canónico de conciliación para garantizar coherencia total.
    """
    cui_str = str(cui).strip()
    mef_data = get_mef_live_data(cui_str)

    obra_dict = {
        "cui": cui_str,
        "costo_actualizado": costo_actualizado,
        "devengado_acumulado": devengado_acumulado,
        "avance_fisico": avance_fisico_inicial,
        "avance_financiero": avance_financiero_inicial,
        "fec_ini_ejec_fisica": fec_ini,
        "fec_fin_ejec_fisica": fec_fin,
        "ult_fecha_declaracion": ult_fecha_declaracion,
        "estado": estado_inicial,
        "codigo_snip": codigo_snip
    }

    return conciliar_datos_inversion(obra_dict, mef_data)
