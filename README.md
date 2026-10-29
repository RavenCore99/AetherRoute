# AetherRoute — demo local

La entrega del taller usa `web/index.html`, `web/estilos.css` y `web/script.js` para consultar un balanceador FastAPI y tres servidores. **Se ejecuta en una sola terminal:** `scripts/demo.py` inicia la API, los tres servidores y la web, y abre el navegador. No necesita React, npm, Firebase ni `.env`.

## Windows: instalar y abrir con un comando

Instala [Python 3.14 para Windows](https://www.python.org/downloads/windows/) con su lanzador `py`. Abre PowerShell y pega esta línea del repositorio oficial:

```powershell
$f=Join-Path $env:TEMP 'aetherroute-instalar.ps1'; Invoke-WebRequest 'https://raw.githubusercontent.com/RavenCore99/AetherRoute/main/scripts/instalar-windows.ps1' -OutFile $f; powershell.exe -NoProfile -ExecutionPolicy Bypass -File $f
```

El script pregunta en qué **carpeta nueva** guardar el proyecto: descarga el ZIP público de `main`, lo descomprime allí, crea `.venv`, instala las dependencias y abre la demo. No requiere Git ni WSL. El script es código ejecutable descargado de este repositorio; puedes [revisarlo antes de ejecutarlo](scripts/instalar-windows.ps1). No introduzcas credenciales ni uses una URL distinta.

En la misma terminal, escribe `1`, `2` o `3` para detener o recuperar ese servidor y ver el cambio en el navegador; escribe `q` para detener todo. El instalador muestra el comando para volver a abrir la demo sin descargarla de nuevo. Necesitas internet para la descarga y la instalación inicial, pero no para ejecutar el proyecto ya instalado.

## Requisitos para Linux/WSL

- Linux o Windows con WSL (los scripts siguientes usan Bash y `/proc`).
- Python 3.14 con `venv`, Git y conexión a internet para instalar paquetes la primera vez.
- Puertos locales 5500 y 8000–8003 libres.

## Desde un clon nuevo (Linux/WSL)

En una sola terminal:

```sh
git clone https://github.com/RavenCore99/AetherRoute.git
cd AetherRoute
python3.14 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/demo.py
```

El lanzador abre `http://127.0.0.1:5500/`; si no se abre automáticamente, usa esa dirección. Para volver a ejecutar el clon instalado, basta `.venv/bin/python scripts/demo.py` en su carpeta. **No** abras `web/index.html` directamente. Cada equipo arranca su propia API; las solicitudes y estadísticas solo viven en la memoria de sus procesos y se reinician al apagarlos.

## Probar fallos y recuperación

- En la terminal de la demo, escribe `2` y pulsa **Actualizar** para ver el servidor 2 inactivo. Escribe `2` otra vez y pulsa **Actualizar** para recuperarlo.
- Escribe `1`, `2`, `3` para detenerlos todos; **Enviar solicitud** mostrará el error 503. Repite `1`, `2`, `3` para recuperarlos sin reiniciar el balanceador.
- Escribe `q` para cerrar la demo y detener sus cinco procesos. `scripts/demo.py` no detiene procesos ajenos si un puerto ya estaba ocupado.

`scripts/iniciar.sh` y `scripts/detener.sh` quedan disponibles para pruebas manuales avanzadas, pero no son necesarios para arrancar ni probar la demo habitual.

## Pruebas automatizadas (opcional)

Con los puertos 8000–8003 libres:

```sh
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests -q
```

La web pública de Firebase no forma parte de esta demo local: Hosting no arranca los procesos FastAPI y la publicación con backend HTTPS está aplazada.
