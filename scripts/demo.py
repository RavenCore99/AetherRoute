"""Inicia y supervisa la demo local sin cambiar la API del taller."""

import argparse
import logging
import os
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from threading import Lock, Thread

from control_local import crear_servidor

RAIZ = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[1]))
SERVICIOS = (8001, 8002, 8003, 8000, 5500)
LOGGER = logging.getLogger(__name__)


def libre(puerto: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", puerto), timeout=0.2):
            return False
    except OSError:
        return True


def esperar(puerto: int, proceso: subprocess.Popen) -> None:
    for _ in range(120):
        if not libre(puerto):
            return
        if proceso.poll() is not None:
            break
        time.sleep(0.1)
    raise RuntimeError(
        f"El servicio {puerto} no arrancó; revisa su salida en la terminal"
    )


def comando_servicio(puerto: int) -> list[str]:
    if getattr(sys, "frozen", False):
        return [sys.executable, "--servicio", str(puerto)]
    if puerto == 8000:
        return [
            sys.executable,
            "-m",
            "uvicorn",
            "balanceador:app",
            "--app-dir",
            str(RAIZ),
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ]
    return [
        sys.executable,
        str(RAIZ / "servidores.py"),
        str(puerto),
        f"Servidor {puerto - 8000}",
    ]


def iniciar(puerto: int) -> subprocess.Popen:
    if not libre(puerto):
        raise RuntimeError(
            f"Puerto {puerto} ocupado; no se detiene ningún proceso ajeno"
        )
    comando = comando_servicio(puerto)
    banderas = (
        getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) if os.name == "nt" else 0
    )
    proceso = subprocess.Popen(comando, cwd=RAIZ, creationflags=banderas)
    esperar(puerto, proceso)
    return proceso


def detener(proceso: subprocess.Popen) -> None:
    if proceso.poll() is not None:
        return
    proceso.terminate()
    try:
        proceso.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proceso.kill()
        proceso.wait()


def main() -> int:
    parser = argparse.ArgumentParser(description="Demo local de AetherRoute")
    parser.add_argument(
        "--no-browser", action="store_true", help="No abrir el navegador"
    )
    parser.add_argument("--servicio", type=int, choices=(8000, 8001, 8002, 8003))
    argumentos = parser.parse_args()
    if argumentos.servicio is not None:
        import uvicorn

        if argumentos.servicio == 8000:
            from balanceador import app
        else:
            import servidores

            servidores.puerto = argumentos.servicio
            servidores.nombre = f"Servidor {argumentos.servicio - 8000}"
            app = servidores.app
        uvicorn.run(app, host="127.0.0.1", port=argumentos.servicio)
        return 0
    procesos = {}
    cerrojo = Lock()
    servidor_web = None

    def estado_control() -> list[dict[str, object]]:
        with cerrojo:
            return [
                {"numero": numero, "activo": procesos[8000 + numero].poll() is None}
                for numero in (1, 2, 3)
            ]

    def alternar_control(numero: int) -> dict[str, object]:
        puerto = 8000 + numero
        with cerrojo:
            proceso = procesos[puerto]
            if proceso.poll() is None:
                detener(proceso)
                LOGGER.info("Servidor %s detenido", numero)
            else:
                procesos[puerto] = iniciar(puerto)
                LOGGER.info("Servidor %s recuperado", numero)
            return {"numero": numero, "activo": procesos[puerto].poll() is None}

    try:
        for puerto in SERVICIOS:
            if not libre(puerto):
                raise RuntimeError(
                    f"Puerto {puerto} ocupado; libera los puertos antes de iniciar"
                )
        for puerto in SERVICIOS:
            if puerto == 5500:
                web = crear_servidor(RAIZ / "web", estado_control, alternar_control)
                Thread(target=web.serve_forever, daemon=True).start()
                servidor_web = web
            else:
                procesos[puerto] = iniciar(puerto)
        LOGGER.info("Demo disponible en http://127.0.0.1:5500/")
        if not argumentos.no_browser:
            webbrowser.open("http://127.0.0.1:5500/")
        while True:
            try:
                orden = input("1/2/3: alternar servidor · q: salir > ").strip().lower()
            except EOFError:
                return 0
            if orden == "q":
                return 0
            if orden not in {"1", "2", "3"}:
                LOGGER.info("Usa 1, 2, 3 o q")
                continue
            alternar_control(int(orden))
    except (OSError, RuntimeError) as error:
        LOGGER.error("No se pudo ejecutar la demo: %s", error)
        return 1
    except KeyboardInterrupt:
        return 0
    finally:
        if servidor_web is not None:
            servidor_web.shutdown()
            servidor_web.server_close()
        for proceso in procesos.values():
            detener(proceso)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    sys.exit(main())
