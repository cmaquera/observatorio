# Guía de Despliegue en Dokploy (Ubuntu Local) con Dominio en Cloudflare 🚀

Esta guía detalla paso a paso cómo desplegar el **Observatorio de Obras Públicas del Perú** en una instancia local de **Dokploy** (instalada sobre un servidor Ubuntu en tu red local / homelab) y exponerlo de forma segura a internet con tu dominio gestionado en **Cloudflare**.

---

## 🏗️ 1. Arquitectura de Despliegue

La solución utiliza una arquitectura contenerizada multi-servicio:

```text
       [ Usuario en Internet ]
                  │
                  ▼ (HTTPS seguro con SSL)
      [ Red Edge de Cloudflare ]
                  │
                  ▼ (Cloudflare Tunnel seguro sin abrir puertos en el router)
      [ Servidor Local Ubuntu ]
                  │
                  ▼
         [ Dokploy (PaaS) ]
                  │
         ┌────────┴────────┐
         │ docker-compose  │
         ▼                 ▼
   [ frontend ]      [ backend ]
   (Nginx + SPA)     (FastAPI:8000)
    Puerto: 80             │
         │                 ▼
         └─────► /api ─────┘
                           │
                           ▼
                 [ observatorio_data ]
                 (Volumen SQLite persistente)
```

### Ventajas de esta configuración:
1. **Cero problemas de CORS**: Nginx sirve el frontend en `/` y redirige internamente `/api/` hacia el backend en `http://backend:8000`.
2. **Persistencia garantizada**: La base de datos SQLite se almacena en el volumen Docker `observatorio_data`, por lo que nunca se borra al actualizar o reiniciar los contenedores.
3. **Seguridad máxima con Cloudflare Tunnel**: No necesitas abrir puertos 80 o 443 en el router de tu casa/oficina, no revelas tu IP pública y funciona incluso detrás de CGNAT (doble NAT de operadoras de internet).

---

## 📦 2. Archivos Incluidos en el Repositorio

El repositorio ya viene 100% preparado para Dokploy con los siguientes archivos:
* `docker-compose.yml` (en la raíz): Define los servicios `frontend`, `backend` y el volumen `observatorio_data`.
* `backend/Dockerfile`: Imagen Python 3.12-slim con base de datos inicial y healthcheck.
* `frontend/Dockerfile`: Multi-stage build con Node 20 para compilar y Nginx Alpine para servir.
* `frontend/nginx.conf`: Reverse proxy que enlaza `/api/` con el backend y sirve el SPA con compresión Gzip y caché.

---

## 🌐 3. Conectar Cloudflare con tu Servidor Local Ubuntu

Para que tu dominio en Cloudflare apunte a tu servidor local de forma segura, el método recomendado y más profesional es **Cloudflare Tunnel (Cloudflare Zero Trust)**.

### Método Recomendado: Cloudflare Tunnel (Sin abrir puertos en el router)

#### Paso 3.1: Crear el Túnel en Cloudflare
1. Inicia sesión en tu cuenta de [Cloudflare](https://dash.cloudflare.com/).
2. En el menú lateral izquierdo, haz clic en **Zero Trust** (si es tu primera vez, actívalo con el plan gratuito).
3. Dentro del panel de Zero Trust, ve a: **Networks ➔ Tunnels**.
4. Haz clic en **Add a tunnel** ➔ Selecciona **Cloudflare Tunnel (cloudflared)** ➔ Haz clic en **Next**.
5. Asigna un nombre al túnel (por ejemplo: `dokploy-homelab`) y haz clic en **Save tunnel**.

#### Paso 3.2: Instalar el conector `cloudflared` en tu Ubuntu
Cloudflare te mostrará comandos listos para ejecutar según tu sistema operativo:
1. Selecciona la pestaña **Debian / Ubuntu** (arquitectura de 64 bits `amd64` o `arm64`).
2. Copia el comando `curl` que te proporciona Cloudflare y ejecútalo en la terminal de tu servidor Ubuntu:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   sudo cloudflared service install <TU_TOKEN_DE_CLOUDFLARE>
   ```
3. Verifica que el conector esté corriendo:
   ```bash
   sudo systemctl status cloudflared
   ```
4. En el panel de Cloudflare verás que el conector cambia su estado a **ACTIVE** (en verde). Haz clic en **Next**.

#### Paso 3.3: Configurar el Nombre de Dominio Público
En la pestaña **Public Hostnames**:
1. **Subdomain**: El subdominio que quieras (ejemplo: `observatorio` o déjalo vacío si usarás el dominio raíz).
2. **Domain**: Selecciona tu dominio registrado en Cloudflare (ejemplo: `tudominio.com`).
3. **Service**:
   * **Type**: `HTTP`
   * **URL**: `localhost:3080` (o la IP local de tu Ubuntu: `http://192.168.1.XX:3080`).
4. Haz clic en **Save Tunnel**.

¡Listo! A partir de este momento, cualquier petición a `https://observatorio.tudominio.com` llegará de forma directa, cifrada y protegida por Cloudflare a tu servidor local.

---

## 🚢 4. Desplegar la Aplicación en Dokploy

Una vez que tengas tu servidor Ubuntu con Dokploy corriendo (usualmente en `http://<IP_UBUNTU>:3000` o en el puerto donde tengas Dokploy):

### Paso 4.1: Crear el Proyecto
1. Ingresa a tu panel de **Dokploy**.
2. En el menú lateral, selecciona **Projects**.
3. Haz clic en **Create Project** y nómbralo `Observatorio`.

### Paso 4.2: Crear el Servicio Compose
1. Dentro del proyecto, haz clic en **Create Service** y selecciona **Compose**.
2. Nombra el servicio (ejemplo: `observatorio-app`).

### Paso 4.3: Configurar el Repositorio Git
1. En la pestaña **Source** o **General**:
   * **Source Type**: `Git` o `GitHub`.
   * **Repository URL**: `https://github.com/cmaquera/observatorio.git`
   * **Branch**: `main`
   * **Compose Path**: `docker-compose.yml` (por defecto).

### Paso 4.4: Desplegar
1. Haz clic en el botón **Deploy** (o **Save and Deploy**).
2. Dokploy ejecutará:
   * La descarga del código.
   * La construcción de la imagen del backend (FastAPI).
   * La construcción y minificación del frontend (Vite + React).
   * El levantamiento de ambos contenedores y la creación del volumen `observatorio_data`.
3. Puedes observar el log de construcción en tiempo real en la pestaña **Deployments / Logs**.

### Paso 4.5: Probar el Acceso
* En tu red local: Accede a `http://<IP_UBUNTU>:3080` y verás la aplicación cargando de inmediato.
* En internet: Ingresa a `https://observatorio.tudominio.com` y verás tu plataforma funcionando con certificado SSL seguro de Cloudflare.

---

## ⚡ 5. Despliegues Automáticos con Git Push (CI/CD)

Para que cada vez que hagas un cambio en tu código y ejecutes `git push`, Dokploy lo compile y actualice automáticamente:

1. En Dokploy, dentro del servicio Compose, ve a la sección **General / Webhooks**.
2. Copia la URL del **Webhook URL** que te entrega Dokploy.
3. Ve a tu repositorio en GitHub:
   * **Settings ➔ Webhooks ➔ Add webhook**.
   * **Payload URL**: Pega la URL del webhook de Dokploy.
   * **Content type**: `application/json`.
   * **Which events would you like to trigger this webhook?**: `Just the push event`.
   * Haz clic en **Add webhook**.

A partir de ahora, cada actualización en la rama `main` se desplegará sola en tu servidor local en 1 minuto.

---

## 🛡️ 6. Configuración Recomendada en Cloudflare

En el panel de tu dominio en Cloudflare:

1. **SSL/TLS**:
   * Si usas Cloudflare Tunnel: El modo de cifrado puede estar en **Full** o **Flexible** (el túnel ya viaja 100% cifrado por defecto).
2. **Speed & Caching**:
   * **Brotli**: Activado.
   * **Auto Minify**: Puedes dejar que Nginx y Vite se encarguen, o activarlo.
3. **WebSockets**:
   * Activado (por si en el futuro se agregan notificaciones en vivo del MEF).

---

## 🔧 7. Comandos de Mantenimiento Útiles en el Servidor Ubuntu

Si necesitas interactuar directamente con la aplicación desde la terminal de Ubuntu:

```bash
# Ver el estado de los contenedores
docker ps | grep observatorio

# Ver logs del backend en tiempo real
docker logs -f observatorio_backend

# Ver logs del frontend (Nginx)
docker logs -f observatorio_frontend

# Ejecutar el pipeline ETL manual dentro del contenedor para actualizar datos
docker exec -it observatorio_backend python -m app.etl.runner --region CUSCO --limit 500

# Carga inicial completa de todo el Perú (sin enriquecimiento en lote para máxima velocidad)
docker exec -it observatorio_backend python -m app.etl.runner --region "" --limit 0 --skip-enrich

# Tarea programada recomendada en Dokploy / Crontab (todos los domingos 3:00 AM)
# 0 3 * * 0 docker exec observatorio_backend python -m app.etl.runner --region "" --limit 0 --skip-enrich

# Respaldar la base de datos SQLite persistida
docker cp observatorio_backend:/app/data/observatorio.db ~/backup_observatorio_$(date +%F).db
```
