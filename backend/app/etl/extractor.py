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
    is_http = str(url).startswith("http://") or str(url).startswith("https://")
    if is_http:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Observatorio Obras Publicas Peru)"})
        stream_ctx = urllib.request.urlopen(req, timeout=45)
    else:
        file_path = str(url).replace("file:///", "").replace("file://", "")
        stream_ctx = open(file_path, "rb")

    with stream_ctx as response:
        text_stream = io.TextIOWrapper(response, encoding="utf-8-sig", errors="replace", newline="")
        reader = csv.reader(text_stream)

        try:
            raw_headers = next(reader)
        except StopIteration:
            return

        fieldnames = [col.strip().strip('"') for col in raw_headers]
        num_cols = len(fieldnames)
        print(f"[ETL Extractor] Encabezados detectados: {num_cols} columnas.")

        yielded_count = 0
        target_dpto_upper = target_dpto.strip().upper() if target_dpto else None

        for r in reader:
            if not r or len(r) != num_cols:
                continue
            row_dict = dict(zip(fieldnames, r))
            dpto = row_dict.get("DEPARTAMENTO", "").strip().upper()
            if target_dpto_upper is None or dpto == target_dpto_upper:
                yield row_dict
                yielded_count += 1
                if limit and yielded_count >= limit:
                    print(f"[ETL Extractor] Límite de {limit} registros alcanzado.")
                    return
