"""Valida el paquete ejecutable sin Python ni recursos del repositorio."""

import argparse
import json
import os
import socket
import subprocess
import time
import urllib.request
from pathlib import Path

PUERTOS = (5500, 8000, 8001, 8002, 8003)


def libre(puerto: int) -> bool:
    with socket.socket() as conexion:
        return conexion.connect_ex(("127.0.0.1", puerto)) != 0


def consultar(ruta: str) -> dict:
    with urllib.request.urlopen(f"http://127.0.0.1:5500{ruta}", timeout=5) as respuesta:
        return json.load(respuesta)


def esperar(puerto: int, proceso: subprocess.Popen) -> None:
    for _ in range(300):
        if not libre(puerto):
            return
        if proceso.poll() is not None:
            break
        time.sleep(0.1)
    raise AssertionError(f"El paquete no abrió el puerto {puerto}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--binario", type=Path, required=True)
    args = parser.parse_args()
    assert args.binario.is_file(), args.binario
    fuentes = args.binario.parent / "fuentes"
    assert all(
        (fuentes / archivo).is_file()
        for archivo in (
            "balanceador.py",
            "servidores.py",
            "web/index.html",
            "web/estilos.css",
            "web/script.js",
        )
    ), "Faltan los archivos fuente exigidos por el PDF"
    assert all(libre(puerto) for puerto in PUERTOS)
    entorno = os.environ.copy()
    for variable in ("PYTHONPATH", "PYTHONHOME", "VIRTUAL_ENV"):
        entorno.pop(variable, None)
    proceso = subprocess.Popen(
        [str(args.binario.resolve()), "--no-browser"],
        cwd=args.binario.parent,
        env=entorno,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        for puerto in PUERTOS:
            esperar(puerto, proceso)
        with urllib.request.urlopen("http://127.0.0.1:5500/", timeout=5) as respuesta:
            assert b"Panel de administraci" in respuesta.read()
        control = consultar("/__demo/estado")
        assert len(control["servidores"]) == 3
        peticion = urllib.request.Request(
            "http://127.0.0.1:5500/__demo/servidor",
            data=b'{"numero":2}',
            headers={
                "Origin": "http://127.0.0.1:5500",
                "Content-Type": "application/json",
                "X-Aether-Token": control["token"],
            },
            method="POST",
        )
        with urllib.request.urlopen(peticion, timeout=15) as respuesta:
            assert json.load(respuesta) == {"numero": 2, "activo": False}
        with urllib.request.urlopen(
            "http://127.0.0.1:8000/servidores", timeout=5
        ) as respuesta:
            assert json.load(respuesta)["servidores"][1]["estado"] == "Inactivo"
        with urllib.request.urlopen(peticion, timeout=15) as respuesta:
            assert json.load(respuesta) == {"numero": 2, "activo": True}
        salida, errores = proceso.communicate("q\n", timeout=30)
        assert proceso.returncode == 0, (salida, errores)
        assert all(libre(puerto) for puerto in PUERTOS)

    except Exception as error:
        if proceso.poll() is None:
            proceso.terminate()
        try:
            _, errores = proceso.communicate(timeout=10)
        except subprocess.TimeoutExpired:
            errores = "La salida quedó abierta tras detener el proceso"
        raise AssertionError(
            f"{error}; salida del lanzador: {errores[-4000:]}"
        ) from error
    finally:
        if proceso.poll() is None:
            proceso.terminate()
            proceso.wait(timeout=10)


if __name__ == "__main__":
    main()
