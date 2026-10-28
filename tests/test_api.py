import os
import socket
import subprocess
import time
from pathlib import Path

import httpx
import pytest

RAIZ = Path(__file__).resolve().parents[1]
PUERTOS = (8000, 8001, 8002, 8003)


@pytest.fixture
def red(tmp_path):
    for puerto in PUERTOS:
        try:
            with socket.create_connection(("127.0.0.1", puerto), timeout=0.2):
                pytest.fail(
                    f"El puerto {puerto} ya está ocupado; no se detiene un proceso ajeno"
                )
        except ConnectionRefusedError:
            pass

    entorno = {**os.environ, "XDG_RUNTIME_DIR": str(tmp_path)}
    inicio = subprocess.run(
        [str(RAIZ / "scripts/iniciar.sh")],
        cwd=RAIZ,
        check=False,
        env=entorno,
        capture_output=True,
        text=True,
        timeout=20,
    )
    assert inicio.returncode == 0, inicio.stderr
    hijos = []
    try:
        with httpx.Client(base_url="http://127.0.0.1:8000", timeout=5) as cliente:
            yield cliente, entorno, hijos
    finally:
        for hijo in hijos:
            if hijo.poll() is None:
                hijo.terminate()
                hijo.wait(timeout=5)
        parada = subprocess.run(
            [str(RAIZ / "scripts/detener.sh")],
            cwd=RAIZ,
            check=False,
            env=entorno,
            capture_output=True,
            text=True,
            timeout=20,
        )
        assert parada.returncode == 0, parada.stderr


def detener(entorno, puerto):
    resultado = subprocess.run(
        [str(RAIZ / "scripts/detener.sh"), str(puerto)],
        cwd=RAIZ,
        check=False,
        env=entorno,
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert resultado.returncode == 0, resultado.stderr


def test_rotacion_y_contadores(red):
    cliente, _, _ = red
    inicio = cliente.get("/").json()
    servidores = cliente.get("/servidores").json()
    assert set(inicio) == {
        "Sistema",
        "servidores_configurados",
        "Solicitudes_envidadas",
        "mensaje",
    }
    assert inicio["servidores_configurados"] == 3
    assert servidores["total_servidores"] == 3
    assert [s["estado"] for s in servidores["servidores"]] == ["Activo"] * 3

    respuestas = [cliente.get("/solicitar") for _ in range(6)]
    assert all(respuesta.status_code == 200 for respuesta in respuestas)
    datos = [respuesta.json() for respuesta in respuestas]
    assert [dato["servidor"] for dato in datos] == [
        "Servidor 1",
        "Servidor 2",
        "Servidor 3",
        "Servidor 1",
        "Servidor 2",
        "Servidor 3",
    ]
    assert [dato["contador"] for dato in datos] == [1, 1, 1, 2, 2, 2]
    assert all(
        set(dato) == {"servidor", "puerto", "mensaje", "contador", "resultado"}
        for dato in datos
    )
    assert cliente.get("/estadisticas").json() == {
        "total_solicitudes": 6,
        "Solicitudes_por_servidor": {f"Servidor {n}": 2 for n in (1, 2, 3)},
    }
    assert cliente.get("/").json()["Solicitudes_envidadas"] == 6


def test_servidor_caido_se_omite_y_figura_inactivo(red):
    cliente, entorno, _ = red
    detener(entorno, 8002)
    estados = cliente.get("/servidores").json()["servidores"]
    assert [s["estado"] for s in estados] == ["Activo", "Inactivo", "Activo"]
    nombres = [cliente.get("/solicitar").json()["servidor"] for _ in range(4)]
    assert nombres == ["Servidor 1", "Servidor 3", "Servidor 1", "Servidor 3"]
    assert cliente.get("/estadisticas").json()["total_solicitudes"] == 4


def test_todos_caidos_responden_503(red):
    cliente, entorno, _ = red
    for puerto in (8001, 8002, 8003):
        detener(entorno, puerto)
    assert all(
        s["estado"] == "Inactivo"
        for s in cliente.get("/servidores").json()["servidores"]
    )
    respuesta = cliente.get("/solicitar")
    assert respuesta.status_code == 503
    assert respuesta.json() == {"detail": "No hay servidores disponibles"}
    assert cliente.get("/estadisticas").json()["total_solicitudes"] == 0


def test_servidor_recuperado_vuelve_a_atender(red):
    cliente, entorno, hijos = red
    detener(entorno, 8002)
    respuesta = cliente.get("/solicitar")
    assert respuesta.json()["servidor"] == "Servidor 1"
    hijo = subprocess.Popen(
        [
            str(RAIZ / ".venv/bin/python"),
            str(RAIZ / "servidores.py"),
            "8002",
            "Servidor 2",
        ],
        cwd=RAIZ,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    hijos.append(hijo)
    for _ in range(50):
        if cliente.get("/servidores").json()["servidores"][1]["estado"] == "Activo":
            break
        time.sleep(0.1)
    else:
        pytest.fail("Servidor 2 no se recuperó")
    assert [cliente.get("/solicitar").json()["servidor"] for _ in range(2)] == [
        "Servidor 2",
        "Servidor 3",
    ]
    assert (
        cliente.get("/estadisticas").json()["Solicitudes_por_servidor"]["Servidor 2"]
        == 1
    )


@pytest.mark.parametrize("origen", ["http://localhost:5500", "null"])
def test_cors_permite_origenes_de_demo_y_archivo(red, origen):
    cliente, _, _ = red
    respuesta = cliente.get("/servidores", headers={"Origin": origen})
    assert respuesta.status_code == 200
    assert respuesta.headers["access-control-allow-origin"] == "*"
    assert "access-control-allow-credentials" not in respuesta.headers
    preflight = cliente.options(
        "/solicitar",
        headers={"Origin": origen, "Access-Control-Request-Method": "GET"},
    )
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == "*"
    assert "GET" in preflight.headers["access-control-allow-methods"]
