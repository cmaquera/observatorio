import sys
sys.stdout.reconfigure(encoding="utf-8")
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_endpoints():
    print("--- 1. Health check ---")
    r = client.get("/api/health")
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n--- 2. KPIs ---")
    r = client.get("/api/dashboard/kpis")
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n--- 3. Top Proyectos Críticos ---")
    r = client.get("/api/dashboard/criticos?limit=3")
    criticos = r.json()
    print(f"Total críticos obtenidos: {len(criticos)}")
    for c in criticos:
        print(f" - CUI: {c['cui']} | {c['nombre'][:60]}... | Costo: S/ {c['costo_actualizado']:,.2f} | Score: {c['evaluacion_riesgo']['score_criticidad']} | Nivel: {c['evaluacion_riesgo']['nivel_alerta']}")
    assert r.status_code == 200
    assert len(criticos) > 0

    print("\n--- 4. Jerarquía Geográfica ---")
    r = client.get("/api/geo/departamentos")
    print("Departamentos:", r.json())
    
    r = client.get("/api/geo/provincias?departamento=CUSCO")
    print(f"Provincias en Cusco: {len(r.json())}")

    print("\n--- 5. Detalle de una obra con Contratos y Documentos ---")
    first_cui = criticos[0]["cui"]
    r = client.get(f"/api/obras/{first_cui}")
    detalle = r.json()
    print("Detalle CUI:", detalle["cui"])
    print("Contratos vinculados:", len(detalle.get("contratos", [])))
    for con in detalle.get("contratos", []):
        print(f"  * Contratista: {con['razon_social']} (RUC: {con['ruc_contratista']}) | Monto: S/ {con['monto_contratado']:,.2f}")
    print("Documentos descargables:", len(detalle.get("documentos", [])))
    for doc in detalle.get("documentos", []):
        print(f"  * [{doc['tipo_documento']}] {doc['titulo']} -> {doc['url_descarga']}")
    assert r.status_code == 200

    print("\n--- 6. Empresas y Contratistas ---")
    r = client.get("/api/empresas?limit=3")
    print(r.status_code, r.json())
    assert r.status_code == 200

    print("\n=== TODOS LOS TESTS DEL BACKEND PASARON EXITOSAMENTE ===")

if __name__ == "__main__":
    test_endpoints()
