# AetherRoute — demo local

La entrega del taller usa `web/index.html`, `web/estilos.css` y `web/script.js` para consultar un balanceador FastAPI y tres servidores. No necesita Firebase, `.env` ni archivos privados para ejecutarse.

## Requisitos

- Linux o Windows con WSL (los scripts usan Bash y `/proc`).
- Python 3.14 con `venv`, Git y conexión a internet para instalar paquetes la primera vez.
- Puertos locales 5500 y 8000–8003 libres.

## Desde un clon nuevo

En una terminal:

```sh
git clone https://github.com/RavenCore99/AetherRoute.git
cd AetherRoute
python3.14 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
./scripts/iniciar.sh
```

En otra terminal, dentro de `AetherRoute`:

```sh
.venv/bin/python -m http.server 5500 --bind 127.0.0.1 --directory web
```

Abre `http://127.0.0.1:5500/` en el navegador. **No** abras `web/index.html` directamente: el servidor HTTP reproduce la demo y sus rutas estáticas. Cada equipo arranca su propia API; las solicitudes y estadísticas solo viven en la memoria de sus procesos y se reinician al apagarlos.

## Probar fallos y recuperación

- Para ver un servidor inactivo: `./scripts/detener.sh 8002`, luego pulsa **Actualizar**.
- Para recuperarlo sin reiniciar el balanceador, abre una tercera terminal en el repositorio y ejecuta `.venv/bin/python servidores.py 8002 "Servidor 2"`; pulsa **Actualizar**. Detén ese proceso manual con Ctrl+C al terminar.
- Para probar el error 503, detén los tres servidores (`./scripts/detener.sh 8001`, `./scripts/detener.sh 8002`, `./scripts/detener.sh 8003`) y pulsa **Enviar solicitud**. Si alguno se inició manualmente, detenlo antes con Ctrl+C.
- Para volver al estado inicial, detén también el balanceador (`./scripts/detener.sh 8000`) y ejecuta `./scripts/iniciar.sh`. Esto reinicia los contadores.
- Al finalizar, ejecuta `./scripts/detener.sh` y detén el servidor web con Ctrl+C.

Los scripts solo detienen los procesos que registraron; no fuerzan la salida de un proceso ajeno que ocupe esos puertos. Si un puerto está ocupado, `iniciar.sh` lo indica y no arranca.

## Pruebas automatizadas (opcional)

Con los puertos 8000–8003 libres:

```sh
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests -q
```

La web pública de Firebase no forma parte de esta demo local: Hosting no arranca los procesos FastAPI y la publicación con backend HTTPS está aplazada.
