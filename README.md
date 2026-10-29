# AetherRoute — demo local portable

La entrega usa `web/index.html`, `web/estilos.css` y `web/script.js` para consultar el balanceador FastAPI y tres servidores. Los paquetes portables incluyen esos archivos fuente y la demo completa. **En los equipos de los compañeros no hay que instalar Python, Git ni Node.**

## Windows x64: obtener archivos y abrir con un comando

Abre PowerShell (incluido en Windows) y pega este comando del repositorio oficial:

```powershell
$f=Join-Path $env:TEMP 'aetherroute-obtener.ps1'; Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/RavenCore99/AetherRoute/main/scripts/obtener-windows.ps1' -OutFile $f; powershell.exe -NoProfile -ExecutionPolicy Bypass -File $f
```

Descarga el último paquete publicado en [GitHub Releases](https://github.com/RavenCore99/AetherRoute/releases/latest), comprueba su SHA-256 contra GitHub, lo descomprime en `AetherRoute` dentro de tu carpeta personal y abre `AetherRoute.exe`. Los fuentes del taller están dentro de `AetherRoute/fuentes/`. Si la carpeta ya existe, crea otra sin sobrescribirla. Puedes [revisar el script](scripts/obtener-windows.ps1) antes de ejecutarlo. Windows puede advertir sobre un ejecutable no firmado: verifica que el enlace proviene de este repositorio; no introduzcas credenciales.

Para volver a abrirla, ejecuta el `.exe` de la carpeta descargada. Internet solo se necesita para la primera descarga; la demo funciona local y sin conexión después. Mantén abierta la ventana de la demo; `q` cierra sus servicios al terminar.

## Linux x64 (CachyOS): paquete sin instalar Python

En Bash, con `curl` y `tar` del sistema:

```sh
curl -fsSL https://raw.githubusercontent.com/RavenCore99/AetherRoute/main/scripts/obtener-linux.sh | bash
```

Los archivos quedan en `~/AetherRoute/AetherRoute/`; ejecútalo de nuevo con `~/AetherRoute/AetherRoute/AetherRoute`. Es un paquete Linux x64, no un binario de Windows/WSL. En Linux puede requerir bibliotecas básicas del sistema (glibc), pero no Python ni npm.

## Probar las seis situaciones del PDF sin salir de la interfaz

Con los puertos 5500 y 8000–8003 libres, el lanzador abre `http://127.0.0.1:5500/`. En la página:

1. Consulta los tres servidores activos en **Estado**.
2. Pulsa **Enviar solicitud** cinco veces; observa la rotación y el total.
3. Pulsa **Detener servidor 2** en **Simular fallos**; la tabla lo muestra inactivo.
4. Comprueba que **Reparto** cambia al enviar solicitudes.
5. Detén los servidores 1 y 3 desde los mismos botones; **Enviar solicitud** muestra «No hay servidores disponibles».
6. Pulsa **Recuperar servidor 1/2/3**; la tabla y las solicitudes vuelven a funcionar.

El control de demo es local y está separado de las cuatro rutas de la API del taller; en Hosting público no se muestra. El tema claro/oscuro, el skeleton y la iluminación no sustituyen los datos reales. El contador se reinicia al cerrar la demo.

## Desarrollo desde un clon (opcional)

Para editar el código, sí se necesita Git y Python 3.14. Desde un clon nuevo:

```sh
git clone https://github.com/RavenCore99/AetherRoute.git
cd AetherRoute
python3.14 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/demo.py
```

El lanzador abre `http://127.0.0.1:5500/`; si no se abre automáticamente, usa esa dirección. Para volver a ejecutar el clon instalado, basta `.venv/bin/python scripts/demo.py`. **No** abras `web/index.html` directamente.

## Control avanzado por terminal (opcional)

- En la terminal de la demo, escribe `2` y pulsa **Actualizar** para ver el servidor 2 inactivo. Escribe `2` otra vez y pulsa **Actualizar** para recuperarlo.
- Escribe `1`, `2`, `3` para detenerlos todos; **Enviar solicitud** mostrará el error 503. Repite `1`, `2`, `3` para recuperarlos sin reiniciar el balanceador.
- Escribe `q` para cerrar la demo y detener sus cinco procesos. `scripts/demo.py` no detiene procesos ajenos si un puerto ya estaba ocupado.

`scripts/iniciar.sh` y `scripts/detener.sh` quedan disponibles para diagnósticos. `scripts/instalar-windows.ps1` es el instalador anterior, que sí exige Python; no es la ruta principal para compañeros.

## Pruebas automatizadas (opcional)

Con los puertos 8000–8003 libres:

```sh
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests -q
```

La web pública de Firebase no forma parte de esta demo local: Hosting no arranca los procesos FastAPI y la publicación con backend HTTPS está aplazada.
