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
    except Exception as e:
        print(f"[DB MIGRATION] Aviso en migración: {e}")

