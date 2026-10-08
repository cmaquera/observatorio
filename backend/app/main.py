from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, check_and_apply_migrations
from app.routers import dashboard, geo, obras, empresas, export

# Crear tablas en base de datos si no existen y aplicar migraciones
Base.metadata.create_all(bind=engine)
check_and_apply_migrations()

app = FastAPI(
    title="Observatorio de Obras Públicas del Perú 🇵🇪",
    description="API de Auditoría y Transparencia de Inversiones Públicas con cruce de fuentes MEF, SEACE e Infobras.",
    version="1.0.0"
)

# CORS para permitir peticiones desde el frontend en desarrollo o producción
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar Routers
app.include_router(dashboard.router)
app.include_router(geo.router)
app.include_router(obras.router)
app.include_router(empresas.router)
app.include_router(export.router)

@app.get("/api/health", tags=["Salud"])
def health_check():
    return {
        "status": "ok",
        "service": "Observatorio de Obras Públicas del Perú",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
