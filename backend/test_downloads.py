from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
cui = '2716769'

for endpoint, name in [
    (f'/api/obras/{cui}/descargar/ficha', 'Ficha HTML/PDF'),
    (f'/api/obras/{cui}/descargar/f12b', 'Reporte F12B CSV'),
    (f'/api/obras/{cui}/descargar/contrato', 'Contrato SEACE CSV'),
    (f'/api/obras/{cui}/descargar/infobras', 'Reporte Infobras CSV')
]:
    r = client.get(endpoint)
    ctype = r.headers.get("content-type")
    cdisp = r.headers.get("content-disposition")
    print(f"{name} -> Status: {r.status_code}, Content-Type: {ctype}, Disp: {cdisp}, Size: {len(r.content)} bytes")
    assert r.status_code == 200
    assert len(r.content) > 100

print("\nTODOS LOS ENDPOINTS DE DESCARGA FUNCIONAN AL 100%")
