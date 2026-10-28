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

RAIZ = Path(__file__).resolve().parents[1]
SERVICIOS = (8001, 8002, 8003, 8000, 5500)
LOGGER = logging.getLogger(__name__)


def libre(puerto: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", puerto), timeout=0.2):
            return False
    except OSError:
        return True


def esperar(puerto: int, proceso: subprocess.Popen) -> None:
    for _ in range(50):
        if not libre(puerto):
            return
        if proceso.poll() is not None:
            break
        time.sleep(0.1)
    raise RuntimeError(
        f"El servicio {puerto} no arrancó; revisa su salida en la terminal"
    )


def iniciar(puerto: int) -> subprocess.Popen:
    if not libre(puerto):
        raise RuntimeError(
            f"Puerto {puerto} ocupado; no se detiene ningún proceso ajeno"
        )
    if puerto == 8000:
        comando = [
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
    elif puerto == 5500:
        comando = [
            sys.executable,
            "-m",
            "http.server",
            "5500",
            "--bind",
            "127.0.0.1",
            "--directory",
            str(RAIZ / "web"),
        ]
    else:
        comando = [
            sys.executable,
            str(RAIZ / "servidores.py"),
            str(puerto),
            f"Servidor {puerto - 8000}",
        ]
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
    argumentos = parser.parse_args()
    procesos = {}
    try:
        for puerto in SERVICIOS:
            if not libre(puerto):
                raise RuntimeError(
                    f"Puerto {puerto} ocupado; libera los puertos antes de iniciar"
                )
        for puerto in SERVICIOS:
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
            puerto = 8000 + int(orden)
            proceso = procesos.get(puerto)
            if proceso and proceso.poll() is None:
                detener(proceso)
                LOGGER.info("Servidor %s detenido", orden)
            else:
                procesos[puerto] = iniciar(puerto)
                LOGGER.info("Servidor %s recuperado", orden)
    except (OSError, RuntimeError) as error:
        LOGGER.error("No se pudo ejecutar la demo: %s", error)
        return 1
    except KeyboardInterrupt:
        return 0
    finally:
        for proceso in procesos.values():
            detener(proceso)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    sys.exit(main())
