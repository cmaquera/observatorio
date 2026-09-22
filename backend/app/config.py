import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'observatorio.db'}")

# MEF Open Data endpoints
MEF_CSV_URL = os.getenv(
    "MEF_CSV_URL",
    "https://fs.datosabiertos.mef.gob.pe/datastorefiles/DETALLE_INVERSIONES.csv"
)

# Umbrales para reglas de criticidad
UMBRAL_DESFASE_CRITICO_PP = 20.0     # Puntos porcentuales entre financiero y físico
UMBRAL_DESFASE_MODERADO_PP = 10.0
UMBRAL_DIAS_DESACTUALIZADO = 180      # 6 meses sin reporte F12B
UMBRAL_PRESUPUESTO_MAYOR = 10_000_000 # Obras de más de 10 millones
