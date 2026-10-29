import importlib
import json
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from urllib.error import HTTPError

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


def test_controles_locales_desde_la_ui_no_alteran_la_api():
    proceso = subprocess.Popen(
        [sys.executable, str(RAIZ / "scripts/demo.py"), "--no-browser"],
        cwd=RAIZ,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    assert proceso.stdin is not None
    try:
        esperar_estado("Activo")
        for _ in range(30):
            with socket.socket() as conexion:
                if conexion.connect_ex(("127.0.0.1", 5500)) == 0:
                    break
            time.sleep(0.1)
        with urllib.request.urlopen("http://127.0.0.1:5500/__demo/estado") as respuesta:
            control = json.load(respuesta)
        assert len(control["servidores"]) == 3
        assert all(servidor["activo"] for servidor in control["servidores"])
        for esperado in ("Inactivo", "Activo"):
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
            with urllib.request.urlopen(peticion) as respuesta:
                assert respuesta.status == 200
            esperar_estado(esperado)
        with urllib.request.urlopen("http://127.0.0.1:8000/servidores") as respuesta:
            assert len(json.load(respuesta)["servidores"]) == 3
    finally:
        if proceso.poll() is None:
            proceso.stdin.write("q\n")
            proceso.stdin.flush()
            assert proceso.wait(timeout=10) == 0


def test_token_no_ascii_rechaza_sin_derribar_servidor_local():
    proceso = subprocess.Popen(
        [sys.executable, str(RAIZ / "scripts/demo.py"), "--no-browser"],
        cwd=RAIZ,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    assert proceso.stdin is not None
    try:
        esperar_estado("Activo")
        for _ in range(30):
            with socket.socket() as conexion:
                if conexion.connect_ex(("127.0.0.1", 5500)) == 0:
                    break
            time.sleep(0.1)
        peticion = urllib.request.Request(
            "http://127.0.0.1:5500/__demo/servidor",
            data=b'{"numero":2}',
            headers={
                "Origin": "http://127.0.0.1:5500",
                "Content-Type": "application/json",
                "X-Aether-Token": "ñ",
            },
            method="POST",
        )
        with pytest.raises(HTTPError) as error:
            urllib.request.urlopen(peticion)
        assert error.value.code == 403
        assert consultar()[1]["estado"] == "Activo"
    finally:
        if proceso.poll() is None:
            proceso.stdin.write("q\n")
            proceso.stdin.flush()
            assert proceso.wait(timeout=10) == 0


def test_binario_portable_reutiliza_su_ejecutable_para_cada_servicio(monkeypatch):
    monkeypatch.syspath_prepend(str(RAIZ / "scripts"))
    demo = importlib.import_module("demo")
    monkeypatch.setattr(demo.sys, "frozen", True, raising=False)
    for puerto in (8000, 8001, 8002, 8003):
        assert demo.comando_servicio(puerto) == [
            demo.sys.executable,
            "--servicio",
            str(puerto),
        ]


def test_hijos_portables_no_heredan_entrada_y_reinician_bootloader(monkeypatch):
    monkeypatch.syspath_prepend(str(RAIZ / "scripts"))
    demo = importlib.import_module("demo")
    monkeypatch.setattr(demo.sys, "frozen", True, raising=False)
    monkeypatch.setattr(demo, "libre", lambda puerto: True)
    monkeypatch.setattr(demo, "esperar", lambda puerto, proceso: None)
    llamados = []

    def lanzar(*args, **kwargs):
        llamados.append((args, kwargs))
        return object()

    monkeypatch.setattr(demo.subprocess, "Popen", lanzar)
    demo.iniciar(8002)
    assert llamados[0][1]["stdin"] == subprocess.DEVNULL
    assert llamados[0][1]["env"]["PYINSTALLER_RESET_ENVIRONMENT"] == "1"


def test_control_local_no_entrega_token_a_origen_ajeno():
    proceso = subprocess.Popen(
        [sys.executable, str(RAIZ / "scripts/demo.py"), "--no-browser"],
        cwd=RAIZ,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    assert proceso.stdin is not None
    try:
        esperar_estado("Activo")
        for _ in range(30):
            with socket.socket() as conexion:
                if conexion.connect_ex(("127.0.0.1", 5500)) == 0:
                    break
            time.sleep(0.1)
        for cabeceras in (
            {"Origin": "https://example.invalid"},
            {"Host": "example.invalid"},
        ):
            peticion = urllib.request.Request(
                "http://127.0.0.1:5500/__demo/estado", headers=cabeceras
            )
            with pytest.raises(HTTPError) as error:
                urllib.request.urlopen(peticion)
            assert error.value.code == 403
    finally:
        if proceso.poll() is None:
            proceso.stdin.write("q\n")
            proceso.stdin.flush()
            assert proceso.wait(timeout=10) == 0
