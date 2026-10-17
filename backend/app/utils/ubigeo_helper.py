# Centroids de distritos y provincias de Cusco, Tacna y las 25 regiones del Perú
# Sirve como fallback para obras con LATITUD/LONGITUD = 0.0 o vacías

DEPARTAMENTO_CENTROIDS = {
    "AMAZONAS": (-6.2294, -77.8728),
    "ANCASH": (-9.5278, -77.5278),
    "APURIMAC": (-13.6339, -72.8814),
    "AREQUIPA": (-16.4090, -71.5375),
    "AYACUCHO": (-13.1588, -74.2239),
    "CAJAMARCA": (-7.1617, -78.5128),
    "CALLAO": (-12.0565, -77.1181),
    "CUSCO": (-13.5319, -71.9675),
    "HUANCAVELICA": (-12.7872, -74.9727),
    "HUANUCO": (-9.9306, -76.2422),
    "ICA": (-14.0678, -75.7286),
    "JUNIN": (-12.0651, -75.2049),
    "LA LIBERTAD": (-8.1116, -79.0286),
    "LAMBAYEQUE": (-6.7714, -79.8409),
    "LIMA": (-12.0464, -77.0428),
    "LORETO": (-3.7437, -73.2516),
    "MADRE DE DIOS": (-12.5933, -69.1891),
    "MOQUEGUA": (-17.1939, -70.9356),
    "PASCO": (-10.6675, -76.2567),
    "PIURA": (-5.1945, -80.6328),
    "PUNO": (-15.8402, -70.0219),
    "SAN MARTIN": (-6.0342, -76.9717),
    "TACNA": (-18.0066, -70.2463),
    "TUMBES": (-3.5669, -80.4515),
    "UCAYALI": (-8.3791, -74.5539),
}

# Código de departamento según INEI (primeros 2 dígitos de UBIGEO)
UBIGEO_DPTO = {
    "01": (-6.2294, -77.8728),  # Amazonas
    "02": (-9.5278, -77.5278),  # Ancash
    "03": (-13.6339, -72.8814), # Apurímac
    "04": (-16.4090, -71.5375), # Arequipa
    "05": (-13.1588, -74.2239), # Ayacucho
    "06": (-7.1617, -78.5128),  # Cajamarca
    "07": (-12.0565, -77.1181), # Callao
    "08": (-13.5319, -71.9675), # Cusco
    "09": (-12.7872, -74.9727), # Huancavelica
    "10": (-9.9306, -76.2422),  # Huánuco
    "11": (-14.0678, -75.7286), # Ica
    "12": (-12.0651, -75.2049), # Junín
    "13": (-8.1116, -79.0286),  # La Libertad
    "14": (-6.7714, -79.8409),  # Lambayeque
    "15": (-12.0464, -77.0428), # Lima
    "16": (-3.7437, -73.2516),  # Loreto
    "17": (-12.5933, -69.1891), # Madre de Dios
    "18": (-17.1939, -70.9356), # Moquegua
    "19": (-10.6675, -76.2567), # Pasco
    "20": (-5.1945, -80.6328),  # Piura
    "21": (-15.8402, -70.0219), # Puno
    "22": (-6.0342, -76.9717),  # San Martín
    "23": (-18.0066, -70.2463), # Tacna
    "24": (-3.5669, -80.4515),  # Tumbes
    "25": (-8.3791, -74.5539),  # Ucayali
}

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
    
    # TACNA
    ("TACNA", "TACNA"): (-18.0146, -70.2536),
    ("TACNA", "JORGE BASADRE"): (-17.6536, -70.7633),
    ("TACNA", "CANDARAVE"): (-17.2678, -70.2494),
    ("TACNA", "TARATA"): (-17.4744, -70.0328),

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
    ("UCAYALI", "CORONEL PORTILLO"): (-8.3791, -74.5539),
    ("MADRE DE DIOS", "TAMBOPATA"): (-12.5933, -69.1891),
    ("MOQUEGUA", "MARISCAL NIETO"): (-17.1939, -70.9356),
    ("TUMBES", "TUMBES"): (-3.5669, -80.4515),
    ("LAMBAYEQUE", "CHICLAYO"): (-6.7714, -79.8409),
    ("HUANUCO", "HUANUCO"): (-9.9306, -76.2422),
    ("HUANCAVELICA", "HUANCAVELICA"): (-12.7872, -74.9727),
    ("ICA", "ICA"): (-14.0678, -75.7286),
    ("PASCO", "PASCO"): (-10.6675, -76.2567),
    ("AMAZONAS", "CHACHAPOYAS"): (-6.2294, -77.8728),
    ("APURIMAC", "ABANCAY"): (-13.6339, -72.8814),
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

    # Tacna - Provincia Tacna
    ("TACNA", "TACNA", "CORONEL GREGORIO ALBARRACIN LANCHIPA"): (-18.0514, -70.2789),
    ("TACNA", "TACNA", "TACNA"): (-18.0146, -70.2536),
    ("TACNA", "TACNA", "ALTO DE LA ALIANZA"): (-18.0019, -70.2472),
    ("TACNA", "TACNA", "CIUDAD NUEVA"): (-17.9942, -70.2417),
    ("TACNA", "TACNA", "POCOLLAY"): (-18.0089, -70.2231),
    ("TACNA", "TACNA", "CALANA"): (-17.9558, -70.1919),
    ("TACNA", "TACNA", "PACHIA"): (-17.8964, -70.1556),
    ("TACNA", "TACNA", "PALCA"): (-17.7767, -69.9542),
    ("TACNA", "TACNA", "SAMA"): (-17.8861, -70.5281),
    ("TACNA", "TACNA", "INCLAN"): (-17.7850, -70.4939),
    ("TACNA", "TACNA", "LA YARADA LOS PALOS"): (-18.1722, -70.3683),
    # Tacna - Provincia Jorge Basadre
    ("TACNA", "JORGE BASADRE", "LOCUMBA"): (-17.6139, -70.7638),
    ("TACNA", "JORGE BASADRE", "ILABAYA"): (-17.4228, -70.5128),
    ("TACNA", "JORGE BASADRE", "ITE"): (-17.8617, -70.9639),
    # Tacna - Provincia Candarave
    ("TACNA", "CANDARAVE", "CANDARAVE"): (-17.2678, -70.2494),
    ("TACNA", "CANDARAVE", "CAIRANI"): (-17.2847, -70.3547),
    ("TACNA", "CANDARAVE", "CAMILACA"): (-17.2674, -70.3788),
    ("TACNA", "CANDARAVE", "CURIBAYA"): (-17.3825, -70.3344),
    ("TACNA", "CANDARAVE", "HUANUARA"): (-17.3134, -70.3211),
    ("TACNA", "CANDARAVE", "QUILAHUANI"): (-17.3164, -70.2581),
    # Tacna - Provincia Tarata
    ("TACNA", "TARATA", "TARATA"): (-17.4744, -70.0328),
    ("TACNA", "TARATA", "HEROES ALBARRACIN"): (-17.4814, -70.1056),
    ("TACNA", "TARATA", "ESTIQUE"): (-17.5419, -70.0178),
    ("TACNA", "TARATA", "ESTIQUE-PAMPA"): (-17.5403, -70.0442),
    ("TACNA", "TARATA", "ESTIQUE PAMPA"): (-17.5403, -70.0442),
    ("TACNA", "TARATA", "SITAJARA"): (-17.3769, -70.1342),
    ("TACNA", "TARATA", "SUSAPAYA"): (-17.3536, -70.1322),
    ("TACNA", "TARATA", "TARUCACHI"): (-17.5255, -70.0310),
    ("TACNA", "TARATA", "TICACO"): (-17.4453, -70.0472),
}

# Diccionario por UBIGEO distrital específico
UBIGEO_DISTRITAL = {
    "230110": (-18.0514, -70.2789), # Crnl. Gregorio Albarracin Lanchipa
    "230101": (-18.0146, -70.2536), # Tacna
    "230102": (-18.0019, -70.2472), # Alto de la Alianza
    "230103": (-17.9558, -70.1919), # Calana
    "230104": (-17.9942, -70.2417), # Ciudad Nueva
    "230105": (-17.7850, -70.4939), # Inclán
    "230106": (-17.8964, -70.1556), # Pachía
    "230107": (-17.7767, -69.9542), # Palca
    "230108": (-18.0089, -70.2231), # Pocollay
    "230109": (-17.8861, -70.5281), # Sama
    "230111": (-18.1722, -70.3683), # La Yarada Los Palos
    "230201": (-17.2678, -70.2494), # Candarave
    "230202": (-17.2847, -70.3547), # Cairani
    "230203": (-17.2674, -70.3788), # Camilaca
    "230204": (-17.3825, -70.3344), # Curibaya
    "230205": (-17.3134, -70.3211), # Huanuara
    "230206": (-17.3164, -70.2581), # Quilahuani
    "230301": (-17.6139, -70.7638), # Locumba
    "230302": (-17.4228, -70.5128), # Ilabaya
    "230303": (-17.8617, -70.9639), # Ite
    "230401": (-17.4744, -70.0328), # Tarata
    "230402": (-17.4814, -70.1056), # Héroes Albarracín
    "230403": (-17.5419, -70.0178), # Estique
    "230404": (-17.5403, -70.0442), # Estique-Pampa
    "230405": (-17.3769, -70.1342), # Sitajara
    "230406": (-17.3536, -70.1322), # Susapaya
    "230407": (-17.5255, -70.0310), # Tarucachi
    "230408": (-17.4453, -70.0472), # Ticaco
    "080101": (-13.5170, -71.9785), # Cusco
    "080106": (-13.5350, -71.9820), # Santiago
    "080108": (-13.5255, -71.9560), # Wanchaq
    "080104": (-13.5510, -71.8840), # San Jerónimo
    "080105": (-13.5320, -71.9210), # San Sebastián
}


def es_coordenada_peru_valida(lat, lon, departamento: str = None) -> bool:
    """
    Verifica si (lat, lon) está dentro de los límites continentales del Perú (excluyendo el fallback -9.1899).
    Si se especifica `departamento`, verifica además que la coordenada caiga dentro del ámbito geográfico
    de esa región (evitando que una obra de Tacna conserve coordenadas de otra región o del Polo Sur).
    """
    try:
        if lat is None or lon is None:
            return False
        lat_f = float(lat)
        lon_f = float(lon)
        if abs(lat_f - (-9.1899)) < 0.0001 and abs(lon_f - (-75.0152)) < 0.0001:
            return False
        if not (-18.5 <= lat_f <= -0.01 and -81.5 <= lon_f <= -68.0):
            return False
        if departamento:
            dpto = departamento.strip().upper()
            for orig, norm in [("Á", "A"), ("É", "E"), ("Í", "I"), ("Ó", "O"), ("Ú", "U")]:
                dpto = dpto.replace(orig, norm)
            if dpto == "TACNA":
                return -18.45 <= lat_f <= -16.70 and -71.25 <= lon_f <= -69.30
            if dpto in DEPARTAMENTO_CENTROIDS:
                c_lat, c_lon = DEPARTAMENTO_CENTROIDS[dpto]
                max_delta = 5.0 if dpto in ("LORETO", "UCAYALI", "MADRE DE DIOS", "CUSCO", "AREQUIPA", "PUNO") else 3.2
                if abs(lat_f - c_lat) > max_delta or abs(lon_f - c_lon) > max_delta:
                    return False
        return True
    except (ValueError, TypeError):
        return False


def normalizar_coordenadas_peru(lat, lon):
    """
    Valida y corrige coordenadas para el territorio peruano (-18.5 <= lat <= -0.01, -81.5 <= lon <= -68.0).
    Si detecta que latitud y longitud vienen invertidas (ej. lat=-70.51, lon=-17.42 como ocurre en
    algunos registros de GeoInvierte en Tacna), las intercambia automáticamente.
    Retorna (lat_valida, lon_valida) o (None, None) si son inválidas.
    """
    try:
        if lat is None or lon is None:
            return None, None
        lat_f = float(lat)
        lon_f = float(lon)
        # Caso 1: Orden correcto (latitud en [-18.5, -0.01], longitud en [-81.5, -68.0])
        if -18.5 <= lat_f <= -0.01 and -81.5 <= lon_f <= -68.0:
            return lat_f, lon_f
        # Caso 2: Orden invertido X/Y (latitud trae la longitud ~ -70 y longitud trae la latitud ~ -17)
        if -81.5 <= lat_f <= -68.0 and -18.5 <= lon_f <= -0.01:
            return lon_f, lat_f
    except (ValueError, TypeError):
        pass
    return None, None


def resolver_coordenadas(lat, lon, departamento: str, provincia: str, distrito: str, ubigeo: str = None):
    """
    Retorna (lat, lon) válidas dentro del territorio peruano y del departamento correspondiente.
    Si vienen invertidas las corrige; si vienen 0.0, None o fuera del rango regional, busca en cascada:
      1. Catálogo por código UBIGEO exacto (6 dígitos).
      2. Catálogo por Distrito (dpto, prov, dist).
      3. Catálogo por Provincia (dpto, prov).
      4. Catálogo por Departamento (dpto o 2 dígitos ubigeo).
      5. Fallback geográfico de contingencia.
    """
    lat_norm, lon_norm = normalizar_coordenadas_peru(lat, lon)
    if lat_norm is not None and lon_norm is not None:
        if es_coordenada_peru_valida(lat_norm, lon_norm, departamento):
            return lat_norm, lon_norm

    # 1. Intentar por código UBIGEO distrital exacto
    if ubigeo:
        ubigeo_clean = str(ubigeo).strip().zfill(6)
        if ubigeo_clean in UBIGEO_DISTRITAL:
            return UBIGEO_DISTRITAL[ubigeo_clean]

    dpto = departamento.strip().upper() if departamento else ""
    prov = provincia.strip().upper() if provincia else ""
    dist = distrito.strip().upper() if distrito else ""

    # Normalización básica de tildes
    for orig, norm in [("Á", "A"), ("É", "E"), ("Í", "I"), ("Ó", "O"), ("Ú", "U")]:
        dpto = dpto.replace(orig, norm)
        prov = prov.replace(orig, norm)
        dist = dist.replace(orig, norm)

    # 2. Intentar por distrito
    if (dpto, prov, dist) in DISTRITO_CENTROIDS:
        return DISTRITO_CENTROIDS[(dpto, prov, dist)]

    # 3. Intentar por provincia
    if (dpto, prov) in PROVINCIA_CENTROIDS:
        return PROVINCIA_CENTROIDS[(dpto, prov)]

    # 4. Intentar por departamento
    if dpto in DEPARTAMENTO_CENTROIDS:
        return DEPARTAMENTO_CENTROIDS[dpto]

    # 5. Intentar por los 2 primeros dígitos de UBIGEO (departamento)
    if ubigeo:
        dpto_code = str(ubigeo).strip().zfill(6)[:2]
        if dpto_code in UBIGEO_DPTO:
            return UBIGEO_DPTO[dpto_code]

    # Centro geográfico aproximado del Perú (contingencia absoluta)
    return -9.1899, -75.0152
