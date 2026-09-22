# Centroids de distritos y provincias de Cusco y principales capitales del Perú
# Sirve como fallback para obras con LATITUD/LONGITUD = 0.0 o vacías

PROVINCIA_CENTROIDS = {
    # CUSCO
    ("CUSCO", "CUSCO"): (-13.5319, -71.9675),
    ("CUSCO", "ACOMAYO"): (-13.9189, -71.6842),
    ("CUSCO", "ANTA"): (-13.4619, -72.1481),
    ("CUSCO", "CALCA"): (-13.3331, -71.9542),
    ("CUSCO", "CANAS"): (-14.2081, -71.4558),
    ("CUSCO", "CANCHIS"): (-14.2967, -71.2258),
    ("CUSCO", "CHUMBIVILCAS"): (-14.4503, -71.7825),
    ("CUSCO", "ESPINAR"): (-14.7933, -71.4117),
    ("CUSCO", "LA CONVENCION"): (-12.8631, -72.6978),
    ("CUSCO", "PARURO"): (-13.7631, -71.8447),
    ("CUSCO", "PAUCARTAMBO"): (-13.3156, -71.5956),
    ("CUSCO", "QUISPICANCHI"): (-13.6706, -71.6744),
    ("CUSCO", "URUBAMBA"): (-13.3044, -72.1158),
    
    # Capitales de Región
    ("LIMA", "LIMA"): (-12.0464, -77.0428),
    ("AREQUIPA", "AREQUIPA"): (-16.4090, -71.5375),
    ("PUNO", "PUNO"): (-15.8402, -70.0219),
    ("JUNIN", "HUANCAYO"): (-12.0651, -75.2049),
    ("LA LIBERTAD", "TRUJILLO"): (-8.1116, -79.0286),
    ("PIURA", "PIURA"): (-5.1945, -80.6328),
    ("ANCASH", "HUARAZ"): (-9.5278, -77.5278),
    ("AYACUCHO", "HUAMANGA"): (-13.1588, -74.2239),
    ("CAJAMARCA", "CAJAMARCA"): (-7.1617, -78.5128),
    ("SAN MARTIN", "MOYOBAMBA"): (-6.0342, -76.9717),
    ("LORETO", "MAYNAS"): (-3.7437, -73.2516),
}

DISTRITO_CENTROIDS = {
    # Cusco
    ("CUSCO", "CUSCO", "CUSCO"): (-13.5170, -71.9785),
    ("CUSCO", "CUSCO", "SANTIAGO"): (-13.5350, -71.9820),
    ("CUSCO", "CUSCO", "WANCHAQ"): (-13.5255, -71.9560),
    ("CUSCO", "CUSCO", "SAN JERONIMO"): (-13.5510, -71.8840),
    ("CUSCO", "CUSCO", "SAN SEBASTIAN"): (-13.5320, -71.9210),
    ("CUSCO", "URUBAMBA", "URUBAMBA"): (-13.3044, -72.1158),
    ("CUSCO", "URUBAMBA", "OLLANTAYTAMBO"): (-13.2580, -72.2630),
    ("CUSCO", "URUBAMBA", "MACHUPICCHU"): (-13.1631, -72.5450),
    ("CUSCO", "URUBAMBA", "CHINCHERO"): (-13.3917, -72.0489),
    ("CUSCO", "URUBAMBA", "MARAS"): (-13.3325, -72.1558),
    ("CUSCO", "ANTA", "ANCAHUASI"): (-13.4580, -72.2900),
    ("CUSCO", "ANTA", "ANTA"): (-13.4619, -72.1481),
    ("CUSCO", "ANTA", "PUCYURA"): (-13.4920, -72.1380),
    ("CUSCO", "CANAS", "YANAOCA"): (-14.2189, -71.4320),
    ("CUSCO", "CANCHIS", "SICUANI"): (-14.2694, -71.2260),
    ("CUSCO", "ESPINAR", "ESPINAR"): (-14.7933, -71.4117),
    ("CUSCO", "LA CONVENCION", "SANTA ANA"): (-12.8631, -72.6978),
    ("CUSCO", "LA CONVENCION", "PICHARI"): (-12.5189, -73.8260),
    ("CUSCO", "LA CONVENCION", "ECHARATE"): (-12.7710, -72.5800),
    ("CUSCO", "CALCA", "CALCA"): (-13.3331, -71.9542),
    ("CUSCO", "CALCA", "PISAC"): (-13.4225, -71.8481),
}

def resolver_coordenadas(lat, lon, departamento: str, provincia: str, distrito: str):
    """
    Retorna (lat, lon) válidas dentro del territorio peruano (-18.5 <= lat <= 0.0, -81.5 <= lon <= -68.0).
    Si vienen 0.0, None o fuera de rango, busca en el catálogo de centroides.
    """
    try:
        if lat is not None and lon is not None:
            lat = float(lat)
            lon = float(lon)
            if -18.5 <= lat <= -0.01 and -81.5 <= lon <= -68.0:
                return lat, lon
    except (ValueError, TypeError):
        pass

    dpto = departamento.strip().upper() if departamento else ""
    prov = provincia.strip().upper() if provincia else ""
    dist = distrito.strip().upper() if distrito else ""

    # Intentar por distrito
    if (dpto, prov, dist) in DISTRITO_CENTROIDS:
        return DISTRITO_CENTROIDS[(dpto, prov, dist)]

    # Intentar por provincia
    if (dpto, prov) in PROVINCIA_CENTROIDS:
        return PROVINCIA_CENTROIDS[(dpto, prov)]

    # Coordenadas de contingencia por departamento
    if dpto == "CUSCO":
        return -13.5319, -71.9675
    elif dpto == "LIMA":
        return -12.0464, -77.0428
    elif dpto == "AREQUIPA":
        return -16.4090, -71.5375

    # Centro geográfico aproximado del Perú
    return -9.1899, -75.0152
