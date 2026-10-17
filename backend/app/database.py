from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 30.0}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

# Activar WAL mode para SQLite (lecturas concurrentes no bloqueadas)
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_and_apply_migrations():
    """Añade columnas nuevas a SQLite si no existen aún (migración segura sin pérdida de datos)."""
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(inversiones);")).fetchall()
            if result:
                col_names = [row[1] for row in result]
                if "enriquecido" not in col_names:
                    conn.execute(text("ALTER TABLE inversiones ADD COLUMN enriquecido BOOLEAN DEFAULT 0;"))
                    conn.commit()
                if "fecha_enriquecimiento" not in col_names:
                    conn.execute(text("ALTER TABLE inversiones ADD COLUMN fecha_enriquecimiento DATETIME;"))
                    conn.commit()

                # Auto-sanear coordenadas invertidas (X/Y) o fuera del rango continental del Perú (ej. salto al Polo Sur)
                bad_rows = conn.execute(text(
                    "SELECT cui, latitud, longitud, departamento, provincia, distrito, ubigeo "
                    "FROM inversiones "
                    "WHERE latitud IS NULL OR longitud IS NULL "
                    "OR latitud < -18.5 OR latitud > -0.01 "
                    "OR longitud < -81.5 OR longitud > -68.0;"
                )).fetchall()
                if bad_rows:
                    from app.utils.ubigeo_helper import resolver_coordenadas
                    for r in bad_rows:
                        cui_r, lat_r, lon_r, dpto_r, prov_r, dist_r, ubig_r = r
                        new_lat, new_lon = resolver_coordenadas(
                            lat_r, lon_r, dpto_r or "", prov_r or "", dist_r or "", ubigeo=ubig_r
                        )
                        conn.execute(
                            text("UPDATE inversiones SET latitud = :lat, longitud = :lon WHERE cui = :cui"),
                            {"lat": new_lat, "lon": new_lon, "cui": cui_r}
                        )
                    conn.commit()
                    print(f"[DB MIGRATION] Se corrigieron automáticamente las coordenadas de {len(bad_rows)} obras fuera del rango del Perú.")
    except Exception as e:
        print(f"[DB MIGRATION] Aviso en migración: {e}")

