"""Añade el código fuente del taller al paquete ejecutable portable."""

import argparse
import shutil
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
ARCHIVOS = (
    "balanceador.py",
    "servidores.py",
    "scripts/demo.py",
    "scripts/control_local.py",
    "web/index.html",
    "web/estilos.css",
    "web/script.js",
    "README.md",
    "requirements.txt",
    "S11- TALLER REDES DE SERVIDORES.pdf",
)


def preparar(destino: Path) -> None:
    if not destino.is_dir():
        raise FileNotFoundError(destino)
    fuentes = destino / "fuentes"
    for nombre in ARCHIVOS:
        origen = RAIZ / nombre
        salida = fuentes / nombre
        salida.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(origen, salida)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("destino", type=Path)
    preparar(parser.parse_args().destino)
