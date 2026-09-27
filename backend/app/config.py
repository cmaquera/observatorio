import os
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# Copiar base de datos semilla si el volumen persistente montado en producción está vacío
SEED_DB = BASE_DIR / "data_seed" / "observatorio.db"
TARGET_DB = DATA_DIR / "observatorio.db"
if not TARGET_DB.exists() and SEED_DB.exists():
    try:
        shutil.copy2(SEED_DB, TARGET_DB)
    except Exception:
        pass

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{TARGET_DB}")

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
