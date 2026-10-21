"""
Cliente de Enriquecimiento en Tiempo Real desde el Sistema Invierte.pe / SSI del MEF.
Consulta directamente los endpoints descubiertos de ofi5.mef.gob.pe (sin CAPTCHA)
con caché en memoria para máxima velocidad y tolerancia a fallos.
"""

import os
import socket
import urllib.request
import urllib.parse
import ssl
import json
import re
import time
import datetime
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Optional, List, Tuple


def _prefer_ipv4() -> None:
    """
    Fuerza preferencia por IPv4 en resolución DNS para evitar bloqueos o timeouts
    en contenedores Docker sin enrutamiento IPv6 cuando ofi5.mef.gob.pe publica registros AAAA.
    """
    orig_getaddrinfo = getattr(socket, "_orig_getaddrinfo", None)
    if orig_getaddrinfo is not None:
        return
    orig_getaddrinfo = socket.getaddrinfo
    socket._orig_getaddrinfo = orig_getaddrinfo  # type: ignore[attr-defined]

    def _ipv4_first_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        res = orig_getaddrinfo(host, port, family, type, proto, flags)
        ipv4 = [r for r in res if r[0] == socket.AF_INET]
        return ipv4 if ipv4 else res

    socket.getaddrinfo = _ipv4_first_getaddrinfo


_prefer_ipv4()

# Caché en memoria con TTL de 1 hora y límite de tamaño para evitar fugas de memoria
_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_LOCK = threading.Lock()
CACHE_TTL_SECONDS = 3600
MAX_CACHE_ENTRIES = 1000

# Directorio de caché en disco para fotos y PDFs oficiales del MEF
_ATTACHMENT_CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "cache_adjuntos"))
try:
    os.makedirs(_ATTACHMENT_CACHE_DIR, exist_ok=True)
except OSError:
    pass

# Tokens de sesión confidencial para descarga de archivos MEF
_SESSION_TOKEN_CACHE: Dict[str, Tuple[str, str, float]] = {}

# Contexto SSL tolerante a certificados intermedios del Estado
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

_COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html, */*; q=0.01',
}


def _parse_dotnet_date(d_val: Any) -> Optional[str]:
    """Convierte fechas en formato .NET /Date(1749775350000)/ a string ISO YYYY-MM-DD."""
    if not d_val:
        return None
    val_str = str(d_val).strip()
    m = re.search(r'/Date\((\d+)(?:[+-]\d+)?\)/', val_str)
    if m:
        try:
            ms = int(m.group(1))
            dt = datetime.datetime.fromtimestamp(ms / 1000.0, datetime.timezone.utc)
            return dt.strftime('%Y-%m-%d')
        except Exception:
            return None
    # Si ya es fecha string legible, retornar
    if re.match(r'^\d{4}-\d{2}-\d{2}', val_str) or re.match(r'^\d{2}/\d{2}/\d{4}', val_str):
        return val_str
    return None


def get_cached_mef_data(cui: str) -> Optional[Dict[str, Any]]:
    """Devuelve los datos enriquecidos en caché si existen y no han expirado (< CACHE_TTL_SECONDS)."""
    cui = str(cui).strip()
    now = time.time()
    with _CACHE_LOCK:
        cached_entry = _CACHE.get(cui)
        if cached_entry and (now - cached_entry["timestamp"] < CACHE_TTL_SECONDS):
            return cached_entry["data"]
    return None


def get_mef_live_data(cui: str) -> Dict[str, Any]:
    """
    Obtiene los datos enriquecidos en tiempo real del MEF para un CUI.
    Si ya fue consultado recientemente, devuelve la copia en caché.
    Si la consulta externa falla o supera el timeout, retorna un objeto seguro con los URLs directos.
    """
    cui = str(cui).strip()
    now = time.time()

    # 1. Verificar caché de forma thread-safe
    cached_data = get_cached_mef_data(cui)
    if cached_data is not None:
        return cached_data

    # URLs oficiales directas (sin pasar por la pantalla con CAPTCHA)
    direct_urls = {
        "url_formato_12b": f"https://ofi5.mef.gob.pe/inviertews/Repseguim/ResumF12B?codigo={cui}",
        "url_ssi": f"https://ofi5.mef.gob.pe/ssi/Ssi/Index?codigo={cui}&tipo=2",
        "url_modificaciones_ejecucion": f"https://ofi5.mef.gob.pe/invierte/ejecucion/traeListaEjecucionSimplePublica/{cui}",
        "url_informe_cierre": None,
        "url_contrataciones_seace": f"https://ofi5.mef.gob.pe/invierteWS/Repseguim/RepContratac?codigo={cui}",
        "url_linea_seguimiento": f"https://ofi5.mef.gob.pe/invierteWS/Repseguim/RepLinSeguim?codigo={cui}",
        "url_geoinvierte": f"https://ofi5.mef.gob.pe/geoinvierteportals/index.html?query=cartografia_pip_georef_edicion_lectura_7101,COD_UNICO,{cui}",
    }

    result: Dict[str, Any] = {
        "disponible": False,
        "direct_urls": direct_urls,
        "modalidad_ejecucion": None,
        "estado_cierre": None,
        "en_funcionamiento": None,
        "fase_ejecucion": None,
        "fecha_liquidacion_prevista": None,
        "responsable_uei": None,
        "telefono_contacto": None,
        "email_contacto": None,
        "fecha_fin_programada": None,
        "monto_expediente_tecnico": None,
        "adicionales_reportados": 0,
        "causal_ampliacion": None,
        "url_cuaderno_obra": None,
        "nroseg": None,
        "linea_tiempo": None,
        "ejecucion_por_componentes": None,
        "avance_fisico_componentes": None,
        "avance_fisico_cierre": None,
        "ultimo_estado_situacional_f12b": None,
        "historial_situacion": [],
        "fotos_obra": [],
        "alertas_ssi_mef": [],
        "ubicacion_oficial": None
    }

    try:
        def _safe_res(fut, default=None, timeout=3.5):
            try:
                return fut.result(timeout=timeout)
            except Exception:
                return default

        with ThreadPoolExecutor(max_workers=7) as pool:
            fut_f12b = pool.submit(_fetch_f12b_api, cui)
            fut_hist = pool.submit(_fetch_historial_situacional_f12b, cui)
            fut_comp = pool.submit(_fetch_factor_productivo_accion, cui)
            fut_ssi = pool.submit(_fetch_det_inv_ssi, cui)
            fut_geo = pool.submit(fetch_geoinvierte_coords, cui)
            fut_cierre = pool.submit(_fetch_informe_cierre, cui)
            fut_seguim = pool.submit(_fetch_seguimiento_completo, cui)

            f12b_data = _safe_res(fut_f12b, None, timeout=3.0)
            if f12b_data:
                result["disponible"] = True
                result["modalidad_ejecucion"] = f12b_data.get("MODAL_EJEC")
                result["estado_cierre"] = f12b_data.get("CIERRE_REGISTRADO")
                result["fecha_fin_programada"] = f12b_data.get("FEC_FIN_EJ")
                result["monto_expediente_tecnico"] = f12b_data.get("MTO_ET_SNIP") or f12b_data.get("MTO_ULT_ET")
                result["ultimo_estado_situacional_f12b"] = f12b_data.get("ULT_ESTADO_SITUACIONAL")
                result["porc_avance_fis_f12b"] = f12b_data.get("PORC_AVANCE_FIS")

            hist_situ = _safe_res(fut_hist, [], timeout=3.0)
            cierre_data = _safe_res(fut_cierre, None, timeout=3.0)
            seguim_data = _safe_res(fut_seguim, None, timeout=3.5)
            comp_res = _safe_res(fut_comp, (None, 0.0), timeout=3.0)
            comp_items, comp_weighted = comp_res if isinstance(comp_res, (list, tuple)) and len(comp_res) == 2 else (None, 0.0)
            det_ssi = _safe_res(fut_ssi, None, timeout=3.0)
            geo_info = _safe_res(fut_geo, None, timeout=3.0)

        if hist_situ:
            result["disponible"] = True
            result["historial_situacion"] = hist_situ

        if cierre_data and cierre_data.get("tiene_informe_cierre"):
            result["disponible"] = True
            result["en_funcionamiento"] = cierre_data.get("en_funcionamiento")
            result["fase_ejecucion"] = cierre_data.get("fase_ejecucion")
            result["fecha_liquidacion_prevista"] = cierre_data.get("fecha_liquidacion_prevista")
            result["fecha_real_culminacion"] = cierre_data.get("fecha_real_culminacion")
            result["responsable_uei"] = cierre_data.get("responsable_uei")
            result["telefono_contacto"] = cierre_data.get("telefono_contacto")
            result["email_contacto"] = cierre_data.get("email_contacto")
            result["tiene_informe_cierre"] = True
            if cierre_data.get("avance_fisico_cierre"):
                result["avance_fisico_cierre"] = cierre_data["avance_fisico_cierre"]
            if cierre_data.get("url_cierre_valida"):
                result["direct_urls"]["url_informe_cierre"] = cierre_data["url_cierre_valida"]
            if cierre_data.get("tiene_informe_cierre") or cierre_data.get("en_funcionamiento"):
                if result.get("estado_cierre") == "NO" or not result.get("estado_cierre"):
                    result["estado_cierre"] = "EN_TRAMITE_F09"
        else:
            result["tiene_informe_cierre"] = False
            result["direct_urls"]["url_informe_cierre"] = None

        if seguim_data:
            result["disponible"] = True
            result["adicionales_reportados"] = seguim_data.get("total_adicionales", 0)
            result["causal_ampliacion"] = seguim_data.get("causal")
            result["url_cuaderno_obra"] = seguim_data.get("url_cuaderno_obra")
            result["nroseg"] = seguim_data.get("nroseg")
            result["linea_tiempo"] = seguim_data.get("linea_tiempo")
            if result.get("linea_tiempo") and hist_situ:
                result["linea_tiempo"]["historial_situacion"] = hist_situ
            result["fotos_obra"] = list(seguim_data.get("fotos_obra", []))
            result["avance_fisico_seace"] = seguim_data.get("avance_fisico_seace")
            result["estado_hito_seace"] = seguim_data.get("estado_hito")
            result["contratos_seace"] = seguim_data.get("contratos_seace", [])
            
            if seguim_data.get("nroseg"):
                url_rep_ejec = f"https://ofi5.mef.gob.pe/invierteWS/Repseguim/RepEjecFisObra?codigo={cui}&nroseg={seguim_data.get('nroseg')}"
                result["direct_urls"]["url_ejecucion_fisica_obra"] = url_rep_ejec

        # Complementar fotos_obra con archivos declarados directamente en Formato 12-B (RUTA_FOTO*, FOTO_SITUAC, DOC_SUSTENTO_HITO_EF)
        if f12b_data:
            existing_files = set()
            for ft in result["fotos_obra"]:
                if ft.get("archivo_foto"):
                    existing_files.add(ft["archivo_foto"])
                if ft.get("archivo_pdf"):
                    existing_files.add(ft["archivo_pdf"])

            nroseg_f12 = int(result.get("nroseg") or 0)
            av_f12 = round(float(f12b_data.get("PORC_AVANCE_FIS") or f12b_data.get("PORC_AVANCE_EJEC") or 0.0), 2)
            mto_f12 = round(float(f12b_data.get("DEV_ACUM_INV") or 0.0), 2)
            situ_f12 = (f12b_data.get("ULT_ESTADO_SITUACIONAL") or "").strip() or None

            f12_photo_pairs = [
                ("RUTA_FOTO", "PER_FOTO", "Registro fotográfico de avance físico en Formato 12-B"),
                ("RUTA_FOTO_2", "PER_FOTO_2", "Registro fotográfico complementario en Formato 12-B"),
                ("RUTA_FOTO_3", "PER_FOTO_3", "Registro fotográfico adicional en Formato 12-B"),
                ("RUTA_FOTO_4", "PER_FOTO_4", "Registro fotográfico adicional en Formato 12-B"),
                ("FOTO_SITUAC", "FECHA_ULT_ACT_F12B", "Documento de sustento situacional en Formato 12-B"),
                ("DOC_SUSTENTO_HITO_EF", "FEC_CUMPLIMIENTO_HITO_EF", "Documento de sustento de ejecución física en Formato 12-B"),
            ]
            for ruta_key, per_key, default_desc in f12_photo_pairs:
                raw_ruta = f12b_data.get(ruta_key)
                if not raw_ruta or str(raw_ruta).strip() == "No se encontraron fotos.":
                    continue
                m_arch = re.search(r"idArchivo=([A-Za-z0-9._-]+)", str(raw_ruta))
                arch_name = m_arch.group(1) if m_arch else None
                if not arch_name or arch_name in existing_files:
                    continue
                existing_files.add(arch_name)
                raw_per = str(f12b_data.get(per_key) or "").strip()
                if not raw_per or raw_per == "No se encontraron fotos.":
                    raw_per = _parse_dotnet_date(f12b_data.get("FECHA_ULT_ACT_F12B")) or "F12-B"
                elif "/Date(" in raw_per:
                    raw_per = _parse_dotnet_date(raw_per) or "F12-B"
                is_pdf_only = arch_name.lower().endswith(".pdf") and ruta_key in ("FOTO_SITUAC", "DOC_SUSTENTO_HITO_EF")
                file_url = f"/api/obras/archivos/mef?cui={cui}&nroseg={nroseg_f12}&archivo={arch_name}"
                result["fotos_obra"].append({
                    "periodo": raw_per[:7] if re.match(r"^\d{4}-\d{2}", raw_per) else raw_per,
                    "periodo_raw": raw_per,
                    "archivo_foto": None if is_pdf_only else arch_name,
                    "url_foto": None if is_pdf_only else file_url,
                    "archivo_pdf": arch_name if is_pdf_only else None,
                    "url_pdf": file_url if is_pdf_only else None,
                    "avance_real": av_f12,
                    "avance_programado": av_f12,
                    "monto_real": mto_f12,
                    "descripcion": situ_f12 or default_desc,
                    "situacion": "FORMATO 12-B"
                })
            if result.get("linea_tiempo") and result["fotos_obra"]:
                result["linea_tiempo"]["fotos_obra"] = result["fotos_obra"]

        if comp_items and len(comp_items) > 0:
            result["disponible"] = True
            result["ejecucion_por_componentes"] = comp_items
            result["avance_fisico_componentes"] = comp_weighted
            result["direct_urls"]["url_ejecucion_factor_accion"] = f"https://ofi5.mef.gob.pe/repseguim/proyinv14.html?codigo={cui}"

        if det_ssi:
            result["disponible"] = True
            if not result.get("modalidad_ejecucion") and det_ssi.get("MODAL_EJEC"):
                result["modalidad_ejecucion"] = det_ssi.get("MODAL_EJEC")
            if not result.get("estado_cierre") and det_ssi.get("CIERRE_REGISTRADO"):
                result["estado_cierre"] = det_ssi.get("CIERRE_REGISTRADO")
            if not result.get("responsable_uei") and det_ssi.get("DES_UNIDAD_UEI"):
                result["responsable_uei"] = det_ssi.get("DES_UNIDAD_UEI")

        dev_acum_calc = float(det_ssi.get("DEV_ACUMULADO") or 0.0) if det_ssi else (float(f12b_data.get("DEV_ACUM_INV") or 0.0) if f12b_data else 0.0)
        costo_act_calc = float(det_ssi.get("COSTO_ACTUALIZADO") or 0.0) if det_ssi else (float(f12b_data.get("MTO_ET_INVIERTE") or 0.0) if f12b_data else 0.0)
        av_fis_calc = float(result.get("avance_fisico_cierre") or result.get("avance_fisico_seace") or result.get("porc_avance_fis_f12b") or 0.0)
        es_cont_calc = bool(
            any(k in str(result.get("ultimo_estado_situacional_f12b") or "").upper() for k in ["CONTROVERSIA", "ARBITRAJE", "INCUMPLIMIENTO", "JUDICIAL"]) or
            any(h.get("es_controversia") for h in result.get("historial_situacion", []))
        )
        es_par_calc = bool(
            any(k in str(result.get("ultimo_estado_situacional_f12b") or "").upper() for k in ["PARALIZAD", "SUSPENDID", "CORTE DE OBRA", "FALTA DE ASIGNACION PRESUPUESTAL", "FALTA DE ASIGANCION", "FALTA DE PRESUPUESTO", "SIN PRESUPUESTO", "LIMITA LA EJECUC"]) or
            any(h.get("es_paralizada") for h in result.get("historial_situacion", []))
        )
        es_culm_calc = bool(result.get("tiene_informe_cierre") or result.get("en_funcionamiento") or "CULMINAD" in str(result.get("fase_ejecucion") or "").upper())

        alertas_ssi = _evaluar_alertas_ssi(
            cui=cui,
            det_ssi=det_ssi,
            dev_acum=dev_acum_calc,
            costo_act=costo_act_calc,
            av_fis=av_fis_calc,
            es_controversia=es_cont_calc,
            es_paralizada=es_par_calc,
            es_culminada=es_culm_calc
        )
        result["alertas_ssi_mef"] = alertas_ssi

        if geo_info:
            result["disponible"] = True
            result["ubicacion_oficial"] = geo_info

    except Exception:
        # Fallback silencioso y seguro
        pass

    # Guardar en caché con control de concurrencia y límite de entradas
    with _CACHE_LOCK:
        if len(_CACHE) >= MAX_CACHE_ENTRIES and cui not in _CACHE:
            oldest_key = min(_CACHE, key=lambda k: _CACHE[k]["timestamp"])
            _CACHE.pop(oldest_key, None)
        _CACHE[cui] = {
            "timestamp": now,
            "data": result
        }

    return result


def _get_mef_download_token(cui: str, nroseg: int, force_refresh: bool = False) -> Tuple[Optional[str], Optional[str]]:
    """Obtiene o reutiliza el token de sesión confidencial y cookies para descargar archivos del MEF."""
    now = time.time()
    cache_key = f"{cui}_{nroseg}"
    with _CACHE_LOCK:
        if force_refresh:
            _SESSION_TOKEN_CACHE.pop(cache_key, None)
        elif cache_key in _SESSION_TOKEN_CACHE:
            token, cookie_str, ts = _SESSION_TOKEN_CACHE[cache_key]
            if now - ts < 1800:  # 30 minutos de validez
                return token, cookie_str

    clean_cui = str(cui).strip()
    if not re.fullmatch(r"\d{4,12}", clean_cui):
        return None, None

    candidate_urls = []
    if int(nroseg) > 0:
        candidate_urls.append(f"https://ofi5.mef.gob.pe/invierteWS/Repseguim/RepEjecFisObra?codigo={clean_cui}&nroseg={int(nroseg)}")
    candidate_urls.append(f"https://ofi5.mef.gob.pe/inviertews/Repseguim/ResumF12B?codigo={clean_cui}")

    for html_url in candidate_urls:
        req = urllib.request.Request(html_url, headers=_COMMON_HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=8, context=_SSL_CTX) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
                cookies = resp.headers.get_all('Set-Cookie') or []
                cookie_str = '; '.join([c.split(';')[0] for c in cookies])
                m = re.search(r'strTokenConfidencial\s*=\s*"([^"]+)"', html)
                if m:
                    token = m.group(1).strip()
                    with _CACHE_LOCK:
                        if len(_SESSION_TOKEN_CACHE) >= MAX_CACHE_ENTRIES:
                            oldest_k = min(_SESSION_TOKEN_CACHE, key=lambda k: _SESSION_TOKEN_CACHE[k][2])
                            _SESSION_TOKEN_CACHE.pop(oldest_k, None)
                        _SESSION_TOKEN_CACHE[cache_key] = (token, cookie_str, now)
                    return token, cookie_str
        except Exception:
            continue
    return None, None


def download_mef_archivo(cui: str, nroseg: int, archivo_id: str) -> Tuple[Optional[bytes], str]:
    """
    Descarga con reintentos y caché persistente en disco los archivos oficiales adjuntos del MEF
    (fotos de obra en JPG/PNG y resúmenes de valorización física en PDF).
    """
    clean_cui = str(cui).strip()
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "", os.path.basename(archivo_id.strip()))
    if not re.fullmatch(r"\d{4,12}", clean_cui) or not safe_name:
        return None, "application/octet-stream"

    cache_path = os.path.join(_ATTACHMENT_CACHE_DIR, safe_name)
    ext = os.path.splitext(safe_name)[1].lower()
    if ext in ('.jpg', '.jpeg'):
        default_mime = 'image/jpeg'
    elif ext == '.png':
        default_mime = 'image/png'
    elif ext == '.pdf':
        default_mime = 'application/pdf'
    else:
        default_mime = 'application/octet-stream'

    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 500:
        with open(cache_path, 'rb') as f:
            return f.read(), default_mime

    for attempt in range(2):
        token, cookie_str = _get_mef_download_token(clean_cui, int(nroseg), force_refresh=(attempt > 0))
        if not token:
            continue

        # Importante: strTokenConfidencial en el HTML del MEF ya viene URL-encoded (%2F, %2B, %3D).
        # Si se pasa por urllib.parse.urlencode directamente, se codifica doblemente (%253D) y el MEF responde "Acceso no autorizado".
        encoded_token = token if "%" in token else urllib.parse.quote(token, safe="")
        dl_url = f"https://ofi5.mef.gob.pe/invierte/general/downloadArchivoPublico?idArchivo={urllib.parse.quote(safe_name)}&token={encoded_token}"
        headers = dict(_COMMON_HEADERS)
        if int(nroseg) > 0:
            headers['Referer'] = f"https://ofi5.mef.gob.pe/invierteWS/Repseguim/RepEjecFisObra?codigo={clean_cui}&nroseg={int(nroseg)}"
        else:
            headers['Referer'] = f"https://ofi5.mef.gob.pe/inviertews/Repseguim/ResumF12B?codigo={clean_cui}"
        if cookie_str:
            headers['Cookie'] = cookie_str

        req = urllib.request.Request(dl_url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=12, context=_SSL_CTX) as resp:
                data = resp.read()
                if (
                    len(data) > 400
                    and not data.startswith(b'"Acceso')
                    and not data.startswith(b'<!DOCTYPE')
                    and not data.startswith(b'<html')
                ):
                    with open(cache_path, 'wb') as f:
                        f.write(data)
                    return data, default_mime
        except Exception:
            pass

        with _CACHE_LOCK:
            _SESSION_TOKEN_CACHE.pop(f"{clean_cui}_{int(nroseg)}", None)

    return None, default_mime


def _fetch_det_inv_ssi(cui: str) -> Optional[Dict[str, Any]]:
    """
    Consulta traeDetInvSSI para obtener las banderas oficiales de alertas de riesgo,
    indicadores de seguimiento y fechas críticas del Sistema de Seguimiento de Inversiones (SSI - MEF).
    """
    url = "https://ofi5.mef.gob.pe/invierteWS/Ssi/traeDetInvSSI"
    for tipo in ["2", "1"]:
        try:
            data = urllib.parse.urlencode({"id": cui, "tipo": tipo}).encode("utf-8")
            headers = {
                **_COMMON_HEADERS,
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
            }
            req = urllib.request.Request(url, data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=3.5, context=_SSL_CTX) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                if body and isinstance(body, list) and len(body) > 0:
                    return body[0]
        except Exception:
            continue
    return None


def fetch_geoinvierte_coords(cui: str, departamento: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Consulta el servidor oficial ArcGIS del MEF / MINECON (GeoInvierte):
    cartografia_pip_georef_edicion_lectura para obtener las coordenadas exactas
    georreferenciadas durante la Fase de Formulación y Evaluación.
    Prioriza la geometría espacial (geometry.x/y) sobre los atributos de texto (X/Y)
    y corrige automáticamente inversiones de ejes X/Y para evitar saltos al Polo Sur.
    """
    from app.utils.ubigeo_helper import normalizar_coordenadas_peru

    cui_str = str(cui).strip()
    dpto_target = departamento.strip().upper() if departamento else None
    base_url = "https://ws.mineco.gob.pe/server/rest/services/cartografia_pip_georef_edicion_lectura/MapServer"
    for layer in [0, 1, 2]:
        url = f"{base_url}/{layer}/query?where=COD_UNICO%3D{cui_str}&outFields=X,Y,NOMBRE_LOC,DEPARTAMEN,PROVINCIA,DISTRITO&returnGeometry=true&f=json"
        req = urllib.request.Request(url, headers=_COMMON_HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=6.0, context=_SSL_CTX) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                features = data.get("features", [])
                if dpto_target and len(features) > 1:
                    features = sorted(
                        features,
                        key=lambda f: 0 if str((f.get("attributes") or {}).get("DEPARTAMEN") or "").strip().upper() == dpto_target else 1
                    )
                for feat in features:
                    attrs = feat.get("attributes") or {}
                    geom = feat.get("geometry") or {}

                    # 1. Priorizar geometría espacial real del servidor ArcGIS (geom.y = lat, geom.x = lon)
                    lat, lon = normalizar_coordenadas_peru(geom.get("y"), geom.get("x"))

                    # 2. Si es polilínea (paths) o polígono (rings), extraer vértice representativo
                    if lat is None or lon is None:
                        paths = geom.get("paths") or geom.get("rings")
                        if paths and isinstance(paths, list) and len(paths) > 0 and len(paths[0]) > 0:
                            pt = paths[0][len(paths[0]) // 2]
                            if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                                lat, lon = normalizar_coordenadas_peru(pt[1], pt[0])

                    # 3. Fallback a atributos X/Y (auto-corrigiendo si el MEF invirtió X e Y)
                    if lat is None or lon is None:
                        lat, lon = normalizar_coordenadas_peru(attrs.get("Y"), attrs.get("X"))

                    if lat is not None and lon is not None:
                        return {
                            "latitud": round(float(lat), 7),
                            "longitud": round(float(lon), 7),
                            "localidad": attrs.get("NOMBRE_LOC"),
                            "departamento": attrs.get("DEPARTAMEN"),
                            "provincia": attrs.get("PROVINCIA"),
                            "distrito": attrs.get("DISTRITO"),
                            "url_geoinvierte": f"https://ofi5.mef.gob.pe/geoinvierteportals/index.html?query=cartografia_pip_georef_edicion_lectura_7101,COD_UNICO,{cui_str}",
                            "fuente": "GeoInvierte MEF (Cartografía PIP)"
                        }
        except Exception:
            continue
    return None


def _evaluar_alertas_ssi(
    cui: str,
    det_ssi: Optional[Dict[str, Any]],
    dev_acum: float,
    costo_act: float,
    av_fis: float,
    es_controversia: bool = False,
    es_paralizada: bool = False,
    es_culminada: bool = False
) -> List[Dict[str, Any]]:
    """
    Evalúa el catálogo oficial de alertas de riesgo del aplicativo SSI (MEF),
    replicando fielmente el motor algorítmico del MEF (script_ssi01.js).
    """
    det = det_ssi or {}
    ind_alertas = str(det.get("IND_ALERTAS") or "")
    des_alert_ejec = str(det.get("DES_ALERT_EJEC") or "")
    avan_fis_ssi = float(det.get("AVAN_FISICO") or -1.0)
    cierre_ssi = str(det.get("CIERRE_REGISTRADO") or "").upper()
    num_dia_desact = int(det.get("NUM_DIA_DESACT") or 0)
    ind_desactiv = det.get("IND_DESACTIV")

    fis_eval = avan_fis_ssi if avan_fis_ssi >= 0 else av_fis
    fin_eval = (dev_acum / costo_act * 100.0) if costo_act > 0 else 0.0

    alertas = []

    # Alerta 1 SSI: Inconsistencia física vs financiera > 20%
    if dev_acum > 0 and fis_eval >= 0:
        desfase = fin_eval - fis_eval
        if desfase > 20.0 and not es_culminada and "CULMINAD" not in cierre_ssi and "LIQUIDACI" not in cierre_ssi:
            alertas.append({
                "codigo": "ALERTA_01_SSI",
                "numero": 1,
                "titulo": "Inconsistencia entre la ejecución financiera y física (superior al 20%)",
                "descripcion": "Una diferencia superior al 20% indica un riesgo de que los recursos financieros no se conviertan en activos. Esto afecta directamente el avance físico y el cumplimiento de los objetivos de inversión.",
                "severidad": "CRITICO",
                "color": "red",
                "icono": "AlertCircle",
                "detalle_calculo": f"Avance financiero: {fin_eval:.1f}% vs Avance físico: {fis_eval:.1f}% (Desfase: {desfase:.1f} pp)",
                "origen": "Sistema de Seguimiento de Inversiones (SSI - MEF)",
                "url_oficial": f"https://ofi5.mef.gob.pe/ssi/Ssi/Index?codigo={cui}&tipo=2"
            })

    # Alerta 4 SSI: Formato 12-B no actualizado ([5] en IND_ALERTAS)
    if "[5]" in ind_alertas and not es_culminada:
        alertas.append({
            "codigo": "ALERTA_04_SSI",
            "numero": 4,
            "titulo": "Inversión no cuenta con Formato N°12-B actualizado",
            "descripcion": "Incumplimiento en el registro oportuno del Formato N°12-B, compromete la calidad de la información y limita un seguimiento efectivo de la inversión.",
            "severidad": "ALTO",
            "color": "amber",
            "icono": "AlertTriangle",
            "detalle_calculo": "Alerta [5] activa en el Banco de Inversiones del MEF",
            "origen": "Sistema de Seguimiento de Inversiones (SSI - MEF)",
            "url_oficial": f"https://ofi5.mef.gob.pe/ssi/Ssi/Index?codigo={cui}&tipo=2"
        })

    # Alerta 5 SSI: Costo actualizado menor al devengado acumulado
    if dev_acum > (costo_act + 1.0) and costo_act > 10:
        alertas.append({
            "codigo": "ALERTA_05_SSI",
            "numero": 5,
            "titulo": "Costo actualizado no debe ser menor al devengado acumulado",
            "descripcion": "El presupuesto ejecutado por encima del valor real de la inversión indica sobrecostos y excedentes de liquidez.",
            "severidad": "CRITICO",
            "color": "red",
            "icono": "AlertCircle",
            "detalle_calculo": f"Devengado (S/ {dev_acum:,.2f}) supera al costo actualizado (S/ {costo_act:,.2f})",
            "origen": "Sistema de Seguimiento de Inversiones (SSI - MEF)",
            "url_oficial": f"https://ofi5.mef.gob.pe/ssi/Ssi/Index?codigo={cui}&tipo=2"
        })

    # Alerta 6 SSI: Obra paralizada sin acciones de reactivación ([7] en IND_ALERTAS o paralizada)
    if ("[7]" in ind_alertas or es_paralizada) and not es_culminada:
        alertas.append({
            "codigo": "ALERTA_06_SSI",
            "numero": 6,
            "titulo": "Inversión con obra paralizada sin acciones de reactivación actualizada",
            "descripcion": "Los registros desactualizados de acciones de reactivación comprometen la calidad, trazabilidad y seguimiento de la inversión.",
            "severidad": "ALTO",
            "color": "amber",
            "icono": "AlertTriangle",
            "detalle_calculo": "Alerta [7] o paralización formal de obra registrada en SEACE/MEF",
            "origen": "Sistema de Seguimiento de Inversiones (SSI - MEF)",
            "url_oficial": f"https://ofi5.mef.gob.pe/ssi/Ssi/Index?codigo={cui}&tipo=2"
        })

    # Alerta 7 SSI: Contrataciones en arbitraje o resueltas
    if es_controversia:
        alertas.append({
            "codigo": "ALERTA_07_SSI",
            "numero": 7,
            "titulo": "Contrataciones en estado resuelto o nulo o en arbitraje",
            "descripcion": "La resolución, nulidad o existencia de controversias en los contratos registrados en el SEACE, genera el riesgo de retrasos o paralización en la ejecución de la inversión.",
            "severidad": "CRITICO",
            "color": "rose",
            "icono": "ShieldAlert",
            "detalle_calculo": "Controversia legal o proceso arbitral por incumplimiento contractual",
            "origen": "Sistema de Seguimiento de Inversiones (SSI - MEF)",
            "url_oficial": f"https://ofi5.mef.gob.pe/ssi/Ssi/Index?codigo={cui}&tipo=2"
        })

    # Alerta 8 SSI: Pendiente de registro de avance físico ([8] en DES_ALERT_EJEC)
    if "[8]" in des_alert_ejec and not es_culminada:
        alertas.append({
            "codigo": "ALERTA_08_SSI",
            "numero": 8,
            "titulo": "Inversión pendiente del registro del avance de la ejecución física",
            "descripcion": "Incumplimiento en el registro oportuno del avance de la ejecución física compromete la calidad de la información y limita un seguimiento efectivo de la inversión.",
            "severidad": "MEDIO",
            "color": "blue",
            "icono": "Info",
            "detalle_calculo": "Alerta [8] activa en seguimiento de ejecución física",
            "origen": "Sistema de Seguimiento de Inversiones (SSI - MEF)",
            "url_oficial": f"https://ofi5.mef.gob.pe/ssi/Ssi/Index?codigo={cui}&tipo=2"
        })

    # Alerta 9 SSI: Avance físico incoherente ([9] en DES_ALERT_EJEC)
    if "[9]" in des_alert_ejec and not es_culminada:
        alertas.append({
            "codigo": "ALERTA_09_SSI",
            "numero": 9,
            "titulo": "Avance de la ejecución física presenta datos incoherentes en los porcentajes registrados",
            "descripcion": "Los registros inadecuados e incoherentes comprometen la calidad de la información y limitan un seguimiento efectivo de la inversión.",
            "severidad": "ALTO",
            "color": "amber",
            "icono": "AlertTriangle",
            "detalle_calculo": "Alerta [9] activa en seguimiento de ejecución física",
            "origen": "Sistema de Seguimiento de Inversiones (SSI - MEF)",
            "url_oficial": f"https://ofi5.mef.gob.pe/ssi/Ssi/Index?codigo={cui}&tipo=2"
        })

    # Alerta 10 SSI: Sin variación física por 3 meses o más ([10] en DES_ALERT_EJEC)
    if "[10]" in des_alert_ejec and not es_culminada and fis_eval < 95.0:
        alertas.append({
            "codigo": "ALERTA_10_SSI",
            "numero": 10,
            "titulo": "Inversión sin variación del avance de la ejecución física por 3 meses o más",
            "descripcion": "La falta de avance de la ejecución física por 3 o más meses consecutivos genera el riesgo de cumplimiento de las metas y objetivos de la inversión.",
            "severidad": "CRITICO",
            "color": "red",
            "icono": "AlertCircle",
            "detalle_calculo": "Alerta [10] activa: Avance físico congelado sin variaciones mensuales reportadas",
            "origen": "Sistema de Seguimiento de Inversiones (SSI - MEF)",
            "url_oficial": f"https://ofi5.mef.gob.pe/ssi/Ssi/Index?codigo={cui}&tipo=2"
        })

    # Alerta 11 SSI: Riesgo de Desactivación
    if (num_dia_desact > 0 or ind_desactiv) and not es_culminada:
        alertas.append({
            "codigo": "ALERTA_DESACT_SSI",
            "numero": 11,
            "titulo": "Riesgo de Desactivación en el Banco de Inversiones",
            "descripcion": f"Faltan {num_dia_desact} días para la pérdida de vigencia o desactivación administrativa en el MEF.",
            "severidad": "CRITICO",
            "color": "red",
            "icono": "Clock",
            "detalle_calculo": f"Plazo límite del Banco de Inversiones: {num_dia_desact} días restantes",
            "origen": "Sistema de Seguimiento de Inversiones (SSI - MEF)",
            "url_oficial": f"https://ofi5.mef.gob.pe/ssi/Ssi/Index?codigo={cui}&tipo=2"
        })

    return alertas


def _fetch_f12b_api(cui: str) -> Optional[Dict[str, Any]]:
    """Consulta el endpoint JSON del Formato 12B."""
    url = "https://ofi5.mef.gob.pe/invierteWS/Ssi/traeInfSeguimF12B"
    data = urllib.parse.urlencode({"id": cui}).encode("utf-8")
    headers = {
        **_COMMON_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
    }
    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=3.5, context=_SSL_CTX) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            if body and isinstance(body, list) and len(body) > 0:
                return body[0]
    except Exception:
        pass
    return None


def _fetch_historial_situacional_f12b(cui: str) -> List[Dict[str, Any]]:
    """
    Consulta traeHistSituPFA con tipo 'SIT' para obtener la cronología oficial
    de situaciones, controversias contractuales, arbitrajes y problemas reportados en el Formato 12-B.
    """
    url = "https://ofi5.mef.gob.pe/invierteWS/Ssi/traeHistSituPFA"
    raw_items = _post_mef_json(url, {"id": cui, "tipo": "SIT"}, timeout=3.5)
    if not raw_items or not isinstance(raw_items, list):
        return []

    historial = []
    seen = set()
    for item in raw_items:
        fec = item.get("FEC_SITU_HIST")
        tipo = (item.get("DES_TIPO") or "SITUACION").strip().upper()
        des = item.get("DES_SITUACION") or item.get("DES_PROBLEMA") or ""
        des_clean = re.sub(r"<[^>]+>", " ", des).strip()
        des_clean = re.sub(r"\s+", " ", des_clean)

        if not des_clean:
            continue

        key = (fec, tipo, des_clean)
        if key in seen:
            continue
        seen.add(key)

        es_controversia = any(k in des_clean.upper() for k in ["CONTROVERSIA", "ARBITRAJE", "INCUMPLIMIENTO", "JUDICIAL"])
        es_paralizada = any(k in des_clean.upper() for k in [
            "PARALIZAD", "SUSPENDID", "CORTE DE OBRA", "FALTA DE ASIGNACION PRESUPUESTAL",
            "FALTA DE ASIGANCION", "FALTA DE PRESUPUESTO", "SIN PRESUPUESTO", "LIMITA LA EJECUC"
        ])
        es_ampliacion = any(k in des_clean.upper() for k in ["RESOLUCIÓN", "RESOLUCION", "MODIFICACIÓN", "MODIFICACION", "AMPLIACIÓN", "AMPLIACION"])

        historial.append({
            "fecha": fec,
            "tipo": tipo,
            "descripcion": des_clean,
            "es_controversia": es_controversia,
            "es_paralizada": es_paralizada,
            "es_ampliacion": es_ampliacion
        })

    return historial


def _fetch_informe_cierre(cui: str, snip: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Consulta el Formato 09 de Cierre y extrae estado de funcionamiento, avance físico y funcionarios."""
    targets = [cui]
    if snip and str(snip).strip() and str(snip).strip() != cui:
        targets.append(str(snip).strip())

    for target in targets:
        candidate_urls = [
            f"https://ofi5.mef.gob.pe/invierte/informecierre/consultaCierre/{target}",
            f"https://ofi5.mef.gob.pe/InformeCierre/ConsultaInforme?cui={target}",
            f"https://ofi5.mef.gob.pe/appcierre/Default.aspx?proyecto={target}"
        ]
        for url in candidate_urls:
            req = urllib.request.Request(url, headers=_COMMON_HEADERS)
            try:
                with urllib.request.urlopen(req, timeout=4.0, context=_SSL_CTX) as resp:
                    if resp.status != 200:
                        continue
                    html = resp.read().decode("utf-8", errors="ignore")
                    if len(html) < 500 or "Server Error" in html or "Runtime Error" in html:
                        continue

                    tiene_f09 = bool(
                        "I. DATOS GENERALES" in html.upper() or
                        "A. DATOS GENERALES" in html.upper() or
                        "INFORME DE CIERRE" in html.upper() or
                        "REGISTRO DE CIERRE" in html.upper() or
                        "FORMATO 09" in html.upper() or
                        "FORMATO N" in html.upper() or
                        "PRINCIPALES METAS" in html.upper()
                    )
                    if not tiene_f09:
                        continue
                    
                    # Validación de integridad: el reporte debe pertenecer al CUI o SNIP solicitado.
                    # ASP.NET replica el query param en <form action="..."> lo que causaba falsos positivos,
                    # y por defecto devuelve la ficha de SNIP 77845 (Bayóvar) si el código no tiene registro.
                    html_body = re.sub(r'<form[^>]*>', '', html, flags=re.I)
                    if (cui not in html_body) and (not snip or str(snip) not in html_body):
                        continue
                    
                    m_snip_rendered = re.search(r'id=["\'](?:lblCodigoSnip|lblCodigo|lbl_snip)["\'][^>]*>([^<]*)<', html, re.I)
                    if m_snip_rendered:
                        cod_rend = m_snip_rendered.group(1).strip()
                        if cod_rend and cod_rend != str(cui) and (not snip or cod_rend != str(snip)):
                            continue
                    
                    # ¿Está brindando servicio / Se logró el objetivo?
                    en_funcionamiento = None
                    m_func = re.search(r"(?:se\s+encuentra\s+en\s+funcionamiento|se\s+encuentra\s+brindando\s+servicio)\??\s*</td>\s*<td[^>]*>(.*?)</td>", html, re.I | re.S)
                    if not m_func:
                        m_func = re.search(r"(?:se\s+encuentra\s+en\s+funcionamiento|se\s+encuentra\s+brindando\s+servicio)\??\s*([^<\n\r]+)", html, re.I)
                    if m_func and any(k in m_func.group(1).upper() for k in ["SÍ", "SI", "S&#205;"]):
                        en_funcionamiento = True

                    # Detección Formato 09 SNIP / Invierte: ¿Se logró el objetivo del Proyecto? Sí
                    m_obj = re.search(r"logr[óo]\s+el\s+objetivo\s+del\s+Proyecto\??\s*</t[dh]>\s*<t[dh][^>]*>\s*(S[ÍI]|S&#205;|SI)", html, re.I | re.S)
                    if m_obj or ("logr" in html.lower() and "objetivo" in html.lower() and any(k in html.lower() for k in ["s&#205;", ">s&iacute;<", ">sí<", ">si<"])):
                        en_funcionamiento = True

                    # Detección de culminación de metas físicas en Formato 09
                    m_culm = re.search(r"culmin[óo]\s+con\s+la\s+ejecuci[óo]n\s+de\s+metas\s+f[íi]sicas\??\s*</td>\s*<td[^>]*>(.*?)</td>", html, re.I | re.S)
                    if not m_culm:
                        m_culm = re.search(r"culmin[óo]\s+con\s+la\s+ejecuci[óo]n\s+de\s+metas\s+f[íi]sicas\??\s*([^<\n\r]+)", html, re.I)
                    culmino_metas = bool(m_culm and any(k in m_culm.group(1).upper() for k in ["SÍ", "SI", "S&#205;"]))

                    fase_culminada = "CULMINADA" if ("CULMINADA" in html.upper() or en_funcionamiento is True or culmino_metas is True) else None

                    # Fecha real de culminación física
                    m_fec_culm = re.search(r"Fecha\s+real\s+de\s+culminaci[óo]n\s+de\s+ejecuci[óo]n:?\s*</td>\s*<td[^>]*>(.*?)</td>", html, re.I | re.S)
                    if not m_fec_culm:
                        m_fec_culm = re.search(r"Fecha\s+real\s+de\s+culminaci[óo]n\s+de\s+ejecuci[óo]n:?\s*(\d{1,2}/\d{1,2}/\d{4})", html, re.I)
                    fecha_real_culm = re.sub(r"<[^>]+>", "", m_fec_culm.group(1)).strip().split()[0] if m_fec_culm else None

                    # Extraer avance físico si está declarado en el Formato 09 (ej. 100%)
                    m_av_fis = re.search(r"avance de la ejecuci[óo]n f[íi]sica.*?(\d+(?:\.\d+)?)\s*%", html, re.I | re.S)
                    avance_fisico_cierre = float(m_av_fis.group(1)) if m_av_fis else None

                    # Si el objetivo del proyecto se logró, culminó metas o el informe de cierre tiene metas 100/100
                    if avance_fisico_cierre is None and (en_funcionamiento is True or culmino_metas is True or tiene_f09):
                        if "100" in html and ("Cant. Ejec." in html or "Global" in html or "4 AMBIENTES" in html):
                            avance_fisico_cierre = 100.0
                        elif en_funcionamiento is True or culmino_metas is True:
                            avance_fisico_cierre = 100.0

                    m_liq = re.search(r"Fecha\s+prevista\s+de\s+(?:la\s+)?liquidaci[óo]n[^<]*</td>\s*<td[^>]*>(.*?)</td>", html, re.I | re.S)
                    if not m_liq:
                        m_liq = re.search(r"Fecha\s+prevista\s+de\s+(?:la\s+)?liquidaci[óo]n:?\s*(\d{1,2}/\d{1,2}/\d{4})", html, re.I)
                    fecha_liq = re.sub(r"<[^>]+>", "", m_liq.group(1)).strip().split()[0] if m_liq else None

                    m_resp = re.search(r"Responsable\s+de\s+la\s+(?:UEI|Unidad\s+Ejecutora)[^<]*:?\s*</td>\s*<td[^>]*>(.*?)</td>", html, re.I | re.S)
                    if not m_resp:
                        m_resp = re.search(r"Responsable\s+de\s+la\s+(?:UEI|Unidad\s+Ejecutora)[^<]*:?\s*<[^>]+>\s*([^<\n\r]+)", html, re.I)
                    resp_nombre = re.sub(r"<[^>]+>", "", m_resp.group(1)).strip() if m_resp else None

                    m_tel = re.search(r"Tel[ée]fono/Fax:?\s*</td>\s*<td[^>]*>(.*?)</td>", html, re.I | re.S)
                    if not m_tel:
                        m_tel = re.search(r"Tel[ée]fono/Fax:?\s*<[^>]+>\s*([^<\n\r]+)", html, re.I)
                    telefono = re.sub(r"<[^>]+>", "", m_tel.group(1)).strip() if m_tel else None

                    m_mail = re.search(r"Correo\s+electr[óo]nico:?\s*</td>\s*<td[^>]*>(.*?)</td>", html, re.I | re.S)
                    if not m_mail:
                        m_mail = re.search(r"Correo\s+electr[óo]nico:?\s*<[^>]+>\s*([^<\n\r]+)", html, re.I)
                    email = re.sub(r"<[^>]+>", "", m_mail.group(1)).strip() if m_mail else None

                    return {
                        "tiene_informe_cierre": True,
                        "en_funcionamiento": en_funcionamiento,
                        "culmino_metas": culmino_metas,
                        "fase_ejecucion": fase_culminada,
                        "fecha_real_culminacion": fecha_real_culm,
                        "avance_fisico_cierre": avance_fisico_cierre,
                        "fecha_liquidacion_prevista": fecha_liq,
                        "responsable_uei": resp_nombre,
                        "telefono_contacto": telefono,
                        "email_contacto": email,
                        "url_cierre_valida": url
                    }
            except Exception:
                continue
    return None


def _post_mef_json(url: str, post_data: Dict[str, Any], timeout: float = 3.5) -> Optional[Any]:
    """Helper para peticiones POST con formato application/x-www-form-urlencoded al MEF."""
    try:
        data = urllib.parse.urlencode(post_data).encode("utf-8")
        headers = {
            **_COMMON_HEADERS,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
        }
        req = urllib.request.Request(url, data=data, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CTX) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def _fetch_seguimiento_completo(cui: str, avance_f12b: Optional[float] = None) -> Optional[Dict[str, Any]]:
    """
    Consulta verListProySE para detectar si existe seguimiento digital de obra (NUM_SEGUIM > 0).
    Si existe, obtiene hitos (HIT), curva física mensual (FIS) y cronogramas (CRON).
    """
    proy_se_url = "https://ofi5.mef.gob.pe/inviertews/DashboardSeace/verListProySE"
    items = _post_mef_json(proy_se_url, {"codigo": cui}, timeout=6.0)
    if not items or not isinstance(items, list):
        return None

    total_adicionales = sum(1 for it in items if it.get("NRO_ADICIONAL"))
    causales = [it.get("DES_CAUSAL") for it in items if it.get("DES_CAUSAL")]
    cuadernos = [it.get("URL_CUAD_OBRA") for it in items if it.get("URL_CUAD_OBRA")]
    estado_hito = next((it.get("ESTADO_HITO") for it in items if it.get("ESTADO_HITO")), None)

    contratos_seace = []
    for it in items:
        razon = (
            it.get("NOM_CONTRATISTA")
            or it.get("DES_CONTRATISTA")
            or it.get("RAZON_SOCIAL")
            or ""
        ).strip()
        ruc = str(it.get("RUC_CONTRATISTA") or it.get("NUM_RUC") or "").strip()
        nro_cont = str(it.get("NUM_CONTRATO") or it.get("NRO_CONTRATO") or "").strip()
        if razon or nro_cont:
            try:
                mto_cont = float(it.get("MTO_CONTRATO") or it.get("MTO_CONTRATADO") or 0.0)
            except (ValueError, TypeError):
                mto_cont = 0.0
            contratos_seace.append({
                "codigo_proceso_seace": str(it.get("DES_PROCESO") or it.get("NOM_PROCESO") or f"SEACE-{cui}"),
                "nro_contrato": nro_cont or f"SEACE-{cui}",
                "objeto": str(it.get("DES_OBJETO") or it.get("DES_CONTRATO") or "EJECUCIÓN DE OBRA"),
                "ruc_contratista": ruc or "S/R",
                "razon_social": razon or "CONTRATISTA REGISTRADO EN SEACE",
                "es_consorcio": "CONSORCIO" in razon.upper(),
                "monto_contratado": round(mto_cont, 2),
                "estado_contrato": str(it.get("ESTADO_HITO") or "VIGENTE"),
                "url_contrato_pdf": str(it.get("URL_CONTRATO") or f"https://ofi5.mef.gob.pe/invierteWS/Repseguim/RepContratac?codigo={cui}")
            })

    # Recopilar todos los números de seguimiento válidos sin duplicados (priorizando OBRAS)
    seen_ns: Dict[int, bool] = {}
    for it in items:
        ns = it.get("NUM_SEGUIM")
        if ns and int(ns) > 0:
            ns_int = int(ns)
            es_obra = (it.get("DES_OBJETO") == "OBRAS")
            seen_ns[ns_int] = seen_ns.get(ns_int, False) or es_obra

    # Ordenar: primero OBRAS, y luego número de seguimiento más alto (los más recientes suelen tener la ejecución activa)
    candidate_nrosegs = sorted(seen_ns.items(), key=lambda x: (1 if x[1] else 0, x[0]), reverse=True)

    selected_nroseg = None
    hitos_raw = []
    fis_raw = []
    cron_raw = []
    all_fis_with_ns: List[Tuple[int, Dict[str, Any]]] = []

    for ns, _ in candidate_nrosegs[:4]:
        temp_fis = _post_mef_json(
            "https://ofi5.mef.gob.pe/inviertews/DashboardSeace/verListAvanFisico",
            {"codigo": cui, "n_seg": ns, "tipo": "FIS"},
            timeout=5.5
        ) or []
        temp_hit = _post_mef_json(
            "https://ofi5.mef.gob.pe/inviertews/DashboardSeace/verListHitoSE",
            {"codigo": cui, "n_seg": ns, "tipo": "HIT"},
            timeout=5.5
        ) or []

        if isinstance(temp_fis, list):
            for f_it in temp_fis:
                all_fis_with_ns.append((ns, f_it))

        if (temp_fis or temp_hit) and (selected_nroseg is None or (not fis_raw and temp_fis)):
            selected_nroseg = ns
            if temp_fis:
                fis_raw = temp_fis
            if temp_hit and not hitos_raw:
                hitos_raw = temp_hit
            cron_raw = _post_mef_json(
                "https://ofi5.mef.gob.pe/inviertews/DashboardSeace/verListAvanFisico",
                {"codigo": cui, "n_seg": ns, "tipo": "CRON"},
                timeout=5.0
            ) or []
            if fis_raw and any(it.get("URL_ARCH_AMPLIAC") or it.get("URL_ARCH_AVANCE") for it in fis_raw):
                break
    linea_tiempo: Optional[Dict[str, Any]] = None
    ultimo_avance_seace = None

    if selected_nroseg and selected_nroseg > 0:
        # Extraer primero el último avance físico real registrado en SEACE/MEF para contrastar hitos
        ultimo_avance_seace = None
        if fis_raw and len(fis_raw) > 0:
            try:
                ultimo_avance_seace = round(float(fis_raw[0].get("POR_AVAN_REAL") or 0.0), 2)
            except (ValueError, TypeError):
                ultimo_avance_seace = None

        # Estructurar Hitos ciudadanos teniendo en cuenta IND_HITO_CUMPL, IND_HITO_VIG y avance real (Regla Homologada 1)
        hitos_ciudadanos = []
        av_efectivo = max(float(avance_f12b or 0.0), float(ultimo_avance_seace or 0.0))

        for h in hitos_raw:
            nombre = (h.get("DES_HITO") or "Hito de Obra").strip()
            fec_str = _parse_dotnet_date(h.get("FEC_HITO"))
            est_raw = (h.get("DES_ESTADO") or "").strip().upper()
            cumplido = str(h.get("IND_HITO_CUMPL") or "").strip().upper() == "S"
            vigente = str(h.get("IND_HITO_VIG") or "").strip().upper() == "S"
            
            es_culminacion = any(k in nombre.upper() for k in ["CULMINAC", "RECEPC", "ENTREGA", "TERMINAC"])
            es_liquidacion = "LIQUIDAC" in nombre.upper()
            es_inicio = "INICIO" in nombre.upper()

            sin_recepcionar = "SIN RECEPCIONAR" in est_raw or "PENDIENTE" in est_raw
            obra_inconclusa = (av_efectivo < 90.0)

            if es_culminacion:
                if obra_inconclusa or sin_recepcionar:
                    av_txt = f"{av_efectivo:.1f}%" if av_efectivo > 0 else "parcial"
                    estado_desc = f"Corte de obra inconclusa (Físico detenido al {av_txt})"
                    nivel = "RETRASADO"
                    comentario = h.get("DES_COMENT") or f"La entidad reportó el cese de etapa constructiva en el sistema, pero los trabajos físicos quedaron inconclusos y sin recepción conforme al alcanzar únicamente el {av_txt} de avance físico."
                else:
                    estado_desc = "Culminación física cumplida"
                    nivel = "COMPLETADO"
                    comentario = h.get("DES_COMENT") or "Trabajos físicos concluidos en terreno según acta de culminación."
            elif es_liquidacion:
                if obra_inconclusa:
                    av_txt = f"{av_efectivo:.1f}%" if av_efectivo > 0 else "parcial"
                    estado_desc = f"Liquidación de corte / Cierre de obra inconclusa ({av_txt} físico)"
                    nivel = "RETRASADO"
                    comentario = h.get("DES_COMENT") or "En trámite de liquidación financiera de corte debido a la paralización de trabajos sin conclusión física integral."
                elif vigente or "PENDIENTE" in est_raw:
                    estado_desc = "En fase de liquidación final"
                    nivel = "EN_CURSO"
                    comentario = h.get("DES_COMENT") or "Revisión de cuentas finales y liquidación técnico-financiera."
                else:
                    estado_desc = "Liquidación culminada"
                    nivel = "COMPLETADO"
                    comentario = h.get("DES_COMENT") or "Liquidación final aprobada formalmente."
            elif es_inicio:
                if ultimo_avance_seace is not None and ultimo_avance_seace == 0.0:
                    estado_desc = "Obra iniciada en calendario (0.0% físico)"
                    nivel = "EN_CURSO"
                    comentario = h.get("DES_COMENT") or "Inicio formal de plazo, sin valorización física registrada en terreno."
                else:
                    estado_desc = "Obra iniciada en terreno"
                    nivel = "COMPLETADO"
                    comentario = h.get("DES_COMENT") or "Comenzó la intervención efectiva de la obra."
            elif cumplido or "INICIADO" in est_raw or "RECEPCIONADA" in est_raw:
                estado_desc = "Hito cumplido"
                nivel = "COMPLETADO"
                comentario = h.get("DES_COMENT")
            elif "PENDIENTE" in est_raw:
                estado_desc = "Pendiente de ejecución"
                nivel = "PENDIENTE"
                comentario = h.get("DES_COMENT")
            elif "APROBADO" in est_raw:
                estado_desc = "Aprobado formalmente"
                nivel = "COMPLETADO"
                comentario = h.get("DES_COMENT")
            else:
                estado_desc = est_raw.capitalize() if est_raw else ("En proceso" if vigente else "Programado")
                nivel = "EN_CURSO" if vigente else "PENDIENTE"
                comentario = h.get("DES_COMENT")

            hitos_ciudadanos.append({
                "nombre": nombre,
                "fecha": fec_str,
                "estado": estado_desc,
                "nivel": nivel,
                "comentario": comentario
            })

        # Estructurar Curva Física Mensual (orden cronológico ascendente)
        curva_fisica = []
        ultimos_riesgos = []
        # En la respuesta de MEF vienen del más reciente al más antiguo
        for item in reversed(fis_raw):
            per_val = item.get("PERIODO")
            if not per_val:
                continue
            per_str = str(per_val)
            mes_anio = f"{per_str[:4]}-{per_str[4:6]}" if len(per_str) == 6 else per_str
            
            prog = float(item.get("POR_AVAN_PROG") or 0.0)
            real = float(item.get("POR_AVAN_REAL") or 0.0)
            mto_prog = float(item.get("MTO_AVAN_PROG") or 0.0)
            mto_real = float(item.get("MTO_AVAN_REAL") or 0.0)
            situacion = item.get("EST_SITUACIONAL") or "EN PLAZO"
            des_riesgo = item.get("DES_RIESGO")
            obs_riesgo = item.get("OBS_RIESGO")
            mitigacion = item.get("OBS_MITIGACION_RIESGO")
            comentario = (item.get("DES_COMENT") or "").strip() or None

            arch_foto = item.get("URL_ARCH_AMPLIAC")
            arch_pdf = item.get("URL_ARCH_AVANCE")

            entry = {
                "periodo": mes_anio,
                "avance_programado": round(prog, 2),
                "avance_real": round(real, 2),
                "monto_programado": round(mto_prog, 2),
                "monto_real": round(mto_real, 2),
                "situacion": situacion,
                "comentario": comentario,
                "archivo_foto": arch_foto,
                "url_foto": f"/api/obras/archivos/mef?cui={cui}&nroseg={selected_nroseg}&archivo={arch_foto}" if arch_foto else None,
                "archivo_pdf": arch_pdf,
                "url_pdf": f"/api/obras/archivos/mef?cui={cui}&nroseg={selected_nroseg}&archivo={arch_pdf}" if arch_pdf else None,
            }
            if des_riesgo:
                entry["riesgo"] = des_riesgo
                entry["observacion_riesgo"] = obs_riesgo
                entry["mitigacion"] = mitigacion
                ultimos_riesgos.append({
                    "periodo": mes_anio,
                    "riesgo": des_riesgo,
                    "detalle": obs_riesgo or comentario,
                    "mitigacion": mitigacion,
                    "responsable": item.get("ENT_RESP_RIESGO")
                })
            
            curva_fisica.append(entry)

        # Extracción de fotos en terreno y resúmenes de valorización (PDF)
        fotos_obra = []
        seen_photo_keys = set()
        source_fis = all_fis_with_ns if all_fis_with_ns else [(selected_nroseg, it) for it in fis_raw]
        for item_ns, item in source_fis:
            arch_foto = (item.get("URL_ARCH_AMPLIAC") or "").strip() or None
            arch_pdf = (item.get("URL_ARCH_AVANCE") or "").strip() or None
            if arch_foto or arch_pdf:
                dedup_k = (arch_foto, arch_pdf, item.get("PERIODO"))
                if dedup_k in seen_photo_keys:
                    continue
                seen_photo_keys.add(dedup_k)
                per_val = item.get("PERIODO")
                per_str = str(per_val) if per_val else ""
                mes_anio = f"{per_str[:4]}-{per_str[4:6]}" if len(per_str) == 6 else per_str
                com = (item.get("DES_COMENT") or item.get("DES_ACCIONES") or "").strip() or None
                fotos_obra.append({
                    "periodo": mes_anio,
                    "periodo_raw": per_val,
                    "archivo_foto": arch_foto,
                    "url_foto": f"/api/obras/archivos/mef?cui={cui}&nroseg={item_ns}&archivo={arch_foto}" if arch_foto else None,
                    "archivo_pdf": arch_pdf,
                    "url_pdf": f"/api/obras/archivos/mef?cui={cui}&nroseg={item_ns}&archivo={arch_pdf}" if arch_pdf else None,
                    "avance_real": round(float(item.get("POR_AVAN_REAL") or 0.0), 2),
                    "avance_programado": round(float(item.get("POR_AVAN_PROG") or 0.0), 2),
                    "monto_real": round(float(item.get("MTO_AVAN_REAL") or 0.0), 2),
                    "descripcion": com,
                    "situacion": item.get("EST_SITUACIONAL") or "EN PLAZO"
                })

        # Cronogramas únicos / reprogramaciones
        reprogramaciones = []
        vistos_cron = set()
        for cr in cron_raw:
            id_cro = cr.get("ID_CRONOGRAMA")
            if id_cro and id_cro not in vistos_cron:
                vistos_cron.add(id_cro)
                reprogramaciones.append({
                    "descripcion": cr.get("DES_CRONO") or f"Cronograma #{len(vistos_cron)}",
                    "fecha_inicio": _parse_dotnet_date(cr.get("FEC_INI")),
                    "fecha_fin": _parse_dotnet_date(cr.get("FEC_FIN")),
                    "fecha_aprobacion": _parse_dotnet_date(cr.get("FEC_APROBACION")),
                    "es_reprogramacion": "REPROGRAMADO" in (cr.get("DES_CRONO") or "").upper()
                })

        linea_tiempo = {
            "origen": "MEF_SEACE",
            "nroseg": selected_nroseg,
            "url_reporte_mef": f"https://ofi5.mef.gob.pe/invierteWS/Repseguim/RepEjecFisObra?codigo={cui}&nroseg={selected_nroseg}",
            "resumen_estado": "Seguimiento físico activo reportado por la supervisión de obra en SEACE/MEF",
            "hitos": hitos_ciudadanos,
            "curva_avance": curva_fisica,
            "reprogramaciones": reprogramaciones,
            "alertas_campo": ultimos_riesgos[-3:] if ultimos_riesgos else [],
            "fotos_obra": fotos_obra
        }

    return {
        "total_adicionales": total_adicionales,
        "causal": causales[0] if causales else None,
        "url_cuaderno_obra": cuadernos[0] if cuadernos else None,
        "nroseg": selected_nroseg,
        "avance_fisico_seace": ultimo_avance_seace,
        "estado_hito": estado_hito,
        "linea_tiempo": linea_tiempo,
        "fotos_obra": fotos_obra if (selected_nroseg and selected_nroseg > 0) else [],
        "contratos_seace": contratos_seace
    }


def _fetch_factor_productivo_accion(cui: str) -> Tuple[Optional[List[Dict[str, Any]]], float]:
    """
    Consulta verDetEjecFisF8y12 (Reporte proyinv14) para obtener la ejecución física real
    por factor productivo, acción y componente de la inversión.
    """
    url = f"https://ofi5.mef.gob.pe/inviertews/Dashboard/verDetEjecFisF8y12/{cui}"
    req = urllib.request.Request(url, headers=_COMMON_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=3.5, context=_SSL_CTX) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if not data or not isinstance(data, list):
                return None, 0.0

            products = {}
            for item in data:
                p = (item.get('DES_PRODUCTO') or 'GENERAL').strip()
                a = (item.get('DES_ACCION') or '').strip()
                key = (p, a)
                if key not in products:
                    products[key] = {
                        'producto': p,
                        'accion': a,
                        'componente': item.get('DES_TIPO_COMPONENTE'),
                        'unidad_medida': item.get('DES_UM_CAPAC'),
                        'meta_capacidad': item.get('VAL_META_CAPAC_PRODU'),
                        'costo_inversion': float(item.get('COS_INV') or 0.0),
                        'registros': []
                    }
                products[key]['registros'].append(item)

            result_items = []
            total_costo = 0.0
            total_valorizado = 0.0

            for key, p_info in products.items():
                latest = None
                for reg in p_info['registros']:
                    per = reg.get('PER_VALORIZ')
                    if per and (not latest or per > latest.get('PER_VALORIZ', '')):
                        latest = reg

                mto_val = float(latest.get('MONTO') or 0.0) if latest else 0.0
                pct_av = float(latest.get('AVANCE') or 0.0) if latest else 0.0
                motivo = latest.get('MOTIVO') if latest else None
                per_ult = latest.get('PER_VALORIZ') if latest else None

                costo = p_info['costo_inversion']
                total_costo += costo
                total_valorizado += mto_val

                result_items.append({
                    'producto': p_info['producto'],
                    'accion': p_info['accion'],
                    'componente': p_info['componente'],
                    'unidad_medida': p_info['unidad_medida'],
                    'meta_capacidad': p_info['meta_capacidad'],
                    'costo_inversion': round(costo, 2),
                    'monto_valorizado': round(mto_val, 2),
                    'porcentaje_avance': round(pct_av, 2),
                    'ultimo_periodo': per_ult,
                    'situacion': motivo
                })

            weighted_progress = (total_valorizado / total_costo * 100.0) if total_costo > 0 else 0.0
            return result_items, round(weighted_progress, 2)
    except Exception:
        return None, 0.0


def sintetizar_linea_tiempo_ciudadana(inversion: Any, mef_live: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Sintetiza una línea de tiempo ciudadana pedagógica y completa para cualquier obra pública
    a partir del ciclo de vida oficial registrado en el Banco de Inversiones (Invierte.pe / SNIP),
    asegurando que el ciudadano siempre entienda en qué etapa se encuentra la obra.
    """
    cui = str(getattr(inversion, 'cui', ''))
    fec_viable = getattr(inversion, 'fec_viable', None) or getattr(inversion, 'fec_registro', None)
    fec_aprob_et = getattr(inversion, 'fec_aprob_et', None)
    mto_et = getattr(inversion, 'mto_et_snip', None) or (mef_live.get("monto_expediente_tecnico") if mef_live else None) or getattr(inversion, 'costo_actualizado', 0)
    fec_ini = getattr(inversion, 'fec_ini_ejec_fisica', None)
    fec_fin = getattr(inversion, 'fec_fin_ejec_fisica', None) or (mef_live.get("fecha_fin_programada") if mef_live else None)
    
    devengado = float(getattr(inversion, 'devengado_acumulado', 0.0) or 0.0)
    costo_act = float(getattr(inversion, 'costo_actualizado', 0.0) or 0.0)
    avance_fis = float(getattr(inversion, 'avance_fisico', 0.0) or 0.0)
    avance_fin = float(getattr(inversion, 'avance_financiero', 0.0) or 0.0)
    dias_atraso = int(getattr(inversion, 'dias_atraso', 0) or 0)
    
    comp_items = mef_live.get("ejecucion_por_componentes") if mef_live else None
    comp_weighted = float((mef_live.get("avance_fisico_componentes") if mef_live else 0.0) or 0.0)
    av_cierre = float((mef_live.get("avance_fisico_cierre") if mef_live else 0.0) or 0.0)
    if avance_fis == 0.0:
        if comp_weighted > 0.0:
            avance_fis = comp_weighted
        elif av_cierre > 0.0:
            avance_fis = av_cierre
    
    modalidad = (mef_live.get("modalidad_ejecucion") if mef_live else None) or getattr(inversion, 'modalidad_ejecucion', '') or ''
    cierre_reg_str = str((mef_live.get("estado_cierre") if mef_live else None) or "NO")
    en_servicio = mef_live.get("en_funcionamiento") if mef_live else None
    fase_ejec = str((mef_live.get("fase_ejecucion") if mef_live else None) or "")
    fec_liq = mef_live.get("fecha_liquidacion_prevista") if mef_live else None
    ult_situ = mef_live.get("ultimo_estado_situacional_f12b") if mef_live else None
    ult_situ_str = str(ult_situ or "").upper()
    hist_situ = (mef_live.get("historial_situacion") if mef_live else None) or []

    # Detección de controversia, arbitraje o incumplimiento contractual
    es_controversia = bool(
        any(k in ult_situ_str for k in ["CONTROVERSIA", "ARBITRAJE", "INCUMPLIMIENTO", "JUDICIAL"]) or
        any(h.get("es_controversia") for h in hist_situ)
    )

    # Detección de paralización o corte por desfinanciamiento
    es_paralizada = bool(
        any(k in ult_situ_str for k in ["PARALIZAD", "SUSPENDID", "CORTE DE OBRA", "FALTA DE ASIGNACION PRESUPUESTAL", "FALTA DE ASIGANCION", "FALTA DE PRESUPUESTO", "SIN PRESUPUESTO", "LIMITA LA EJECUC"]) or
        any(h.get("es_paralizada") for h in hist_situ)
    )

    tiene_f09 = bool(mef_live.get("tiene_informe_cierre")) if mef_live else False

    # Determinar si la obra ha alcanzado su culminación física o está en liquidación/cierre
    es_culminada = (not es_controversia) and (not es_paralizada) and (
        ("CULMINAD" in fase_ejec.upper()) or
        ("LIQUIDACI" in cierre_reg_str.upper()) or
        ("CERRAD" in cierre_reg_str.upper()) or
        (cierre_reg_str.strip().upper() == "SI") or
        (tiene_f09 is True) or
        (en_servicio is True) or
        (avance_fis >= 95.0) or
        (comp_weighted >= 95.0) or
        (avance_fin >= 85.0 and ("DIRECTA" in modalidad.upper() and "," not in modalidad) and avance_fis >= 80.0)
    )

    if avance_fis == 0.0 and es_culminada and (en_servicio is True or "CULMINAD" in fase_ejec.upper()):
        avance_fis = 100.0

    es_admin_directa = "DIRECTA" in modalidad.upper() and "," not in modalidad

    hitos = []

    # 1. Viabilidad
    hitos.append({
        "nombre": "Viabilidad y Aprobación del Perfil",
        "fecha": str(fec_viable) if fec_viable else "Fecha inicial registrada",
        "estado": "Aprobado en Banco de Inversiones",
        "nivel": "COMPLETADO",
        "comentario": "El proyecto demostró ser socialmente rentable y necesario para la comunidad."
    })

    # 2. Expediente Técnico
    hitos.append({
        "nombre": "Aprobación del Expediente Técnico",
        "fecha": str(fec_aprob_et) if fec_aprob_et else "Aprobado formalmente",
        "estado": "Planos y presupuesto definidos",
        "nivel": "COMPLETADO",
        "comentario": f"Se fijó el presupuesto de ingeniería y especificaciones de construcción (S/ {mto_et:,.2f})."
    })

    # 3. Inicio Físico de Obra
    if fec_ini:
        if avance_fis == 0.0:
            hitos.append({
                "nombre": "Inicio de Trabajos en Terreno",
                "fecha": str(fec_ini),
                "estado": "Fecha de inicio fijada en cronograma (Sin avance reportado)",
                "nivel": "EN_CURSO",
                "comentario": f"Fecha inicial programada en cronograma ({fec_ini}). Las valorizaciones técnicas aún no registran avance físico reportado en terreno (0.0%)."
            })
        else:
            hitos.append({
                "nombre": "Inicio de Trabajos en Terreno",
                "fecha": str(fec_ini),
                "estado": "Trabajos iniciados en terreno",
                "nivel": "COMPLETADO",
                "comentario": "Comenzó la intervención efectiva de la obra."
            })

    # 4. Plazo Contractual / Culminación
    fec_culm_real = mef_live.get("fecha_real_culminacion") if mef_live else None
    if fec_fin or (es_culminada and fec_culm_real):
        str_fin = fec_culm_real or (str(fec_fin).split()[0] if fec_fin else "Culminado en campo")
        if es_culminada:
            hitos.append({
                "nombre": "Plazo y Culminación Física de Obra",
                "fecha": str_fin,
                "estado": "Culminación física alcanzada (Fase de liquidación)",
                "nivel": "COMPLETADO",
                "comentario": f"Los trabajos físicos en campo fueron concluidos ({str_fin}) y el proyecto cerró formalmente su fase constructiva."
            })
        elif es_controversia:
            hitos.append({
                "nombre": "Plazo Contractual de Culminación",
                "fecha": str_fin,
                "estado": f"Plazo vencido (+{dias_atraso} días) - En controversia legal",
                "nivel": "RETRASADO",
                "comentario": f"La fecha programada para la entrega venció el {str_fin}. El proyecto se encuentra paralizado y en controversia legal por incumplimiento contractual o proceso arbitral en curso."
            })
        elif es_paralizada:
            hitos.append({
                "nombre": "Plazo Contractual de Culminación",
                "fecha": str_fin,
                "estado": f"Plazo vencido (+{dias_atraso} días) - Obra paralizada",
                "nivel": "RETRASADO",
                "comentario": f"La fecha programada para la entrega venció el {str_fin}. La ejecución física se encuentra formalmente paralizada o detenida por desfinanciamiento según reportes en el Banco de Inversiones."
            })
        else:
            es_vencido = dias_atraso > 0 and avance_fis < 95.0
            hitos.append({
                "nombre": "Plazo Contractual de Culminación",
                "fecha": str_fin,
                "estado": "Plazo vencido (en retraso)" if es_vencido else "Plazo vigente en calendario",
                "nivel": "RETRASADO" if es_vencido else "EN_CURSO",
                "comentario": f"Fecha programada para la entrega de la obra." + (f" Acumula un desfase de {dias_atraso} días." if es_vencido else "")
            })

    # 5. Estado Actual de Ejecución
    if comp_items and len(comp_items) > 0:
        all_comp_zero = all(float(c.get('porcentaje_avance') or 0.0) == 0.0 and float(c.get('monto_valorizado') or 0.0) == 0.0 for c in comp_items)
        if all_comp_zero and (es_controversia or es_paralizada or (avance_fin - avance_fis) > 15.0):
            comp_names = ", ".join([f"{c.get('componente') or c.get('producto')} (S/ {float(c.get('costo_inversion') or 0):,.0f})" for c in comp_items[:3]])
            hitos.append({
                "nombre": "Ejecución Física por Componentes (Formato 14 / 12-B)",
                "fecha": f"Avance físico reportado: {avance_fis:.1f}%",
                "estado": f"Metas al 0.0% valorizado | Financiero: {avance_fin:.1f}%",
                "nivel": "RETRASADO",
                "comentario": f"En el reporte oficial de Formato 14, los componentes programados ({comp_names}) no registran valorizaciones mensuales aprobadas. El avance físico reportado en Formato 12-B se sitúa en {avance_fis:.1f}%, mientras que financieramente se ha devengado el {avance_fin:.1f}% (S/ {devengado:,.2f})."
            })
        else:
            resumen_prods = ", ".join([f"{c['producto'].title()} ({c['porcentaje_avance']}%)" for c in comp_items[:3]])
            hitos.append({
                "nombre": "Ejecución Física por Componentes y Metas (proyinv14)",
                "fecha": f"Avance físico ponderado: {comp_weighted:.1f}%",
                "estado": f"Metas al {comp_weighted:.1f}% | Financiero: {avance_fin:.1f}%",
                "nivel": "COMPLETADO" if es_culminada else ("RETRASADO" if (avance_fin - comp_weighted) > 15.0 or es_controversia or es_paralizada else "EN_CURSO"),
                "comentario": f"El reporte oficial de Factor Productivo y Acción (proyinv14) registra la valorización física detallada de cada producto: {resumen_prods}." + (" La obra alcanzó su culminación física en campo conforme a las actas técnicas." if es_culminada else " Presenta desfase físico frente a los desembolsos financieros.")
            })
    elif es_admin_directa and avance_fis == 0.0 and es_culminada:
        hitos.append({
            "nombre": "Modalidad de Ejecución Directa",
            "fecha": f"Presupuesto devengado al {avance_fin:.1f}%",
            "estado": f"Administración Directa: Devengado S/ {devengado:,.2f}",
            "nivel": "COMPLETADO",
            "comentario": f"La obra fue ejecutada directamente por la entidad pública (sin contratista privado). Al no haber empresa privada que presente valorizaciones mensuales en SEACE, el porcentaje digital figura en 0%, pero el presupuesto de S/ {costo_act:,.2f} fue ejecutado en su práctica totalidad ({avance_fin:.1f}% devengado)."
        })
    elif es_controversia:
        hitos.append({
            "nombre": "Estado Actual del Avance - Controversia Contractual",
            "fecha": f"Físico: {avance_fis:.1f}% | Financiero: {avance_fin:.1f}%",
            "estado": f"Desfase Crítico: {(avance_fin - avance_fis):.1f} pp (Detenido)",
            "nivel": "RETRASADO",
            "comentario": f"Existe un desfase crítico de {(avance_fin - avance_fis):.1f} puntos porcentuales. La entidad pagó/comprometió S/ {devengado:,.2f} ({avance_fin:.1f}%), pero el avance físico oficial se encuentra detenido en {avance_fis:.1f}% por controversia legal o proceso arbitral en curso."
        })
    elif es_paralizada:
        hitos.append({
            "nombre": "Estado Actual del Avance - Obra Paralizada",
            "fecha": f"Físico: {avance_fis:.1f}% | Financiero: {avance_fin:.1f}%",
            "estado": f"Desfase Crítico: {(avance_fin - avance_fis):.1f} pp (Paralizada)",
            "nivel": "RETRASADO",
            "comentario": f"Existe un desfase crítico de {(avance_fin - avance_fis):.1f} puntos porcentuales. Se devengó el {avance_fin:.1f}% del presupuesto (S/ {devengado:,.2f} de S/ {costo_act:,.2f}), pero la ejecución física quedó paralizada e inconclusa al {avance_fis:.1f}%."
        })
    else:
        es_retraso = (avance_fin - avance_fis) > 15.0 or dias_atraso > 30
        hitos.append({
            "nombre": "Estado Actual del Avance",
            "fecha": "Actualizado a la fecha",
            "estado": f"Avance Físico: {avance_fis:.1f}% | Financiero: {avance_fin:.1f}%",
            "nivel": "COMPLETADO" if es_culminada else ("RETRASADO" if es_retraso else "EN_CURSO"),
            "comentario": f"Se ha devengado el {avance_fin:.1f}% del presupuesto (S/ {devengado:,.2f} de S/ {costo_act:,.2f}) frente a un avance físico reportado del {avance_fis:.1f}%." + (f" Desfase físico-financiero de {(avance_fin - avance_fis):.1f} pp." if (avance_fin - avance_fis) > 5.0 else "")
        })

    # 6. Liquidación y Cierre
    if es_culminada:
        hitos.append({
            "nombre": "Culminación, Liquidación y Transferencia",
            "fecha": str(fec_liq) if fec_liq else "Fase final / Al servicio de la población",
            "estado": "En funcionamiento y en proceso de liquidación (F09)",
            "nivel": "COMPLETADO",
            "comentario": "La infraestructura pública se encuentra terminada y brindando servicio a la comunidad. El proyecto cuenta con Formato 09 de Cierre registrado ante el MEF y se encuentra en trámite administrativo de liquidación técnico-financiera."
        })
    elif es_controversia:
        hitos.append({
            "nombre": "Liquidación y Cierre (Formato 09)",
            "fecha": "Pendiente de resolución legal",
            "estado": "Sin Formato 09 emitido (En controversia legal)",
            "nivel": "PENDIENTE",
            "comentario": "El proyecto no cuenta con Formato 09 de Cierre registrado en el MEF. El cierre formal y la liquidación técnico-financiera se encuentran paralizados a la espera de la resolución judicial o arbitral del incumplimiento contractual."
        })
    elif es_paralizada or (avance_fis < 90.0 and avance_fin >= 80.0):
        hitos.append({
            "nombre": "Liquidación y Cierre (Formato 09)",
            "fecha": "Sin culminación física",
            "estado": "Sin Formato 09 emitido (Obra inconclusa)",
            "nivel": "PENDIENTE",
            "comentario": "El proyecto no cuenta con Formato 09 de Cierre registrado en el MEF debido a que la obra quedó inconclusa física y contractualmente."
        })
    else:
        hitos.append({
            "nombre": "Liquidación y Entrega a la Comunidad",
            "fecha": str(fec_liq) if fec_liq else "Pendiente a la culminación de la obra",
            "estado": "Etapa posterior a la entrega física",
            "nivel": "PENDIENTE",
            "comentario": "Revisión de cuentas finales y entrega oficial para su mantenimiento y operación."
        })

    # Alertas pedagógicas de campo (controversias, paralizaciones o notas históricas)
    alertas_campo = []
    entidad_nombre = getattr(inversion, 'entidad', None) or "Entidad Ejecutora"

    if (es_controversia or es_paralizada) and hist_situ:
        vistos_riesgos = set()
        for hs in hist_situ:
            if hs.get("es_controversia") or hs.get("es_paralizada"):
                desc = hs.get("descripcion", "")
                if desc in vistos_riesgos:
                    continue
                vistos_riesgos.add(desc)
                fec_str = hs.get("fecha", "").split()[0] if hs.get("fecha") else "Registro F12-B"
                tipo_situ = "Controversia Contractual / Legal" if hs.get("es_controversia") else "Paralización de Obra / Falta de Presupuesto"
                mitigacion_txt = (
                    "La entidad pública mantiene abierta la controversia arbitral/legal por incumplimiento de contrato."
                    if hs.get("es_controversia")
                    else "La obra requiere asignación de saldos presupuestales o expediente de saldo de obra para su reactivación física."
                )
                alertas_campo.append({
                    "riesgo": f"{tipo_situ} ({hs.get('tipo', 'SITUACION')})",
                    "periodo": fec_str,
                    "detalle": desc,
                    "mitigacion": mitigacion_txt,
                    "responsable": entidad_nombre
                })

    if ult_situ and ("COVID" in ult_situ.upper() or "2020" in ult_situ):
        alertas_campo.append({
            "riesgo": "Anotación Histórica de Emergencia Sanitaria (COVID-19)",
            "periodo": "2020",
            "detalle": ult_situ,
            "mitigacion": f"Nota de seguimiento: La anotación en el F12B sobre la paralización por COVID-19 corresponde a julio de 2020. Con posterioridad, los trabajos se retomaron: entre 2020 y 2022 la entidad devengó más de S/ 800,000 adicionales alcanzando S/ {devengado:,.2f} (el {avance_fin:.1f}% del costo), culminando la restauración física y registrando el Formato 09 de Cierre.",
            "responsable": entidad_nombre
        })

    return {
        "origen": "SINTESIS_INVIERTE",
        "nroseg": None,
        "url_reporte_mef": f"https://ofi5.mef.gob.pe/inviertews/Repseguim/ResumF12B?codigo={cui}",
        "resumen_estado": "Ciclo de vida oficial reconstruido pedagógicamente a partir del Banco de Inversiones del MEF",
        "hitos": hitos,
        "curva_avance": [],
        "reprogramaciones": [],
        "alertas_campo": alertas_campo,
        "historial_situacion": hist_situ
    }
