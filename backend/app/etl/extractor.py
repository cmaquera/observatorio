import csv
import io
import urllib.request
from typing import Generator, Dict, Optional
from app.config import MEF_CSV_URL

def stream_mef_csv(
    url: str = MEF_CSV_URL,
    target_dpto: Optional[str] = None,
    limit: Optional[int] = None,
    chunk_size_bytes: int = 4 * 1024 * 1024 # 4MB por chunk
) -> Generator[Dict[str, str], None, None]:
    """
    Lee en streaming el archivo CSV del MEF directamente desde la URL o cache local
    sin cargar los 235 MB completos en RAM. Filtra en vuelo por departamento si se especifica.
    """
    print(f"[ETL Extractor] Conectando a fuente MEF: {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Observatorio Obras Publicas Peru)"})
    
    with urllib.request.urlopen(req, timeout=45) as response:
        buffer = ""
        header_parsed = False
        reader = None
        fieldnames = []
        yielded_count = 0
        target_dpto_upper = target_dpto.strip().upper() if target_dpto else None

        while True:
            chunk = response.read(chunk_size_bytes)
            if not chunk:
                # Procesar remanente al final
                if buffer.strip():
                    lines = buffer.splitlines()
                    for line in lines:
                        if not line.strip():
                            continue
                        row_reader = csv.reader([line])
                        for r in row_reader:
                            if len(r) == len(fieldnames):
                                row_dict = dict(zip(fieldnames, r))
                                dpto = row_dict.get("DEPARTAMENTO", "").strip().upper()
                                if target_dpto_upper is None or dpto == target_dpto_upper:
                                    yield row_dict
                                    yielded_count += 1
                                    if limit and yielded_count >= limit:
                                        return
                break

            text = chunk.decode("utf-8-sig", errors="replace")
            buffer += text

            # Partir por saltos de línea manteniendo la última línea incompleta en el buffer
            lines = buffer.splitlines()
            if not buffer.endswith("\n") and not buffer.endswith("\r"):
                buffer = lines.pop() if lines else ""
            else:
                buffer = ""

            for line in lines:
                line_str = line.strip()
                if not line_str:
                    continue

                if not header_parsed:
                    header_reader = csv.reader([line_str])
                    fieldnames = next(header_reader)
                    fieldnames = [col.strip().strip('"') for col in fieldnames]
                    header_parsed = True
                    print(f"[ETL Extractor] Encabezados detectados: {len(fieldnames)} columnas.")
                    continue

                # Procesar fila de datos
                row_reader = csv.reader([line_str])
                for r in row_reader:
                    if len(r) >= len(fieldnames):
                        row_dict = dict(zip(fieldnames, r[:len(fieldnames)]))
                        dpto = row_dict.get("DEPARTAMENTO", "").strip().upper()
                        if target_dpto_upper is None or dpto == target_dpto_upper:
                            yield row_dict
                            yielded_count += 1
                            if limit and yielded_count >= limit:
                                print(f"[ETL Extractor] Límite de {limit} registros alcanzado.")
                                return
