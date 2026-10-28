import json
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[1]


def consultar():
    with urllib.request.urlopen(
        "http://127.0.0.1:8000/servidores", timeout=3
    ) as respuesta:
        return json.load(respuesta)["servidores"]


def esperar_estado(estado):
    for _ in range(60):
        try:
            actual = consultar()[1]["estado"]
            if actual == estado:
                return
        except OSError:
            pass
        time.sleep(0.1)
    pytest.fail(f"Servidor 2 no llegó a {estado}")


def test_lanzador_local_controla_servidores_y_limpia_procesos():
    for puerto in (5500, 8000, 8001, 8002, 8003):
        with socket.socket() as conexion:
            assert conexion.connect_ex(("127.0.0.1", puerto)) != 0, (
                f"Puerto {puerto} ocupado"
            )

    proceso = subprocess.Popen(
        [sys.executable, str(RAIZ / "scripts/demo.py"), "--no-browser"],
        cwd=RAIZ,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )
    assert proceso.stdin is not None
    assert proceso.stderr is not None
    try:
        esperar_estado("Activo")
        proceso.stdin.write("2\n")
        proceso.stdin.flush()
        esperar_estado("Inactivo")
        proceso.stdin.write("2\n")
        proceso.stdin.flush()
        esperar_estado("Activo")
        with urllib.request.urlopen("http://127.0.0.1:5500/", timeout=3) as respuesta:
            assert b"Panel de administraci" in respuesta.read()
        proceso.stdin.write("q\n")
        proceso.stdin.flush()
        assert proceso.wait(timeout=10) == 0, proceso.stderr.read()
        for puerto in (5500, 8000, 8001, 8002, 8003):
            with socket.socket() as conexion:
                assert conexion.connect_ex(("127.0.0.1", puerto)) != 0
    finally:
        if proceso.poll() is None:
            proceso.stdin.write("q\n")
            proceso.stdin.flush()
            proceso.wait(timeout=10)
