"""Sirve la demo y sus controles locales sin modificar la API de clase."""

import hmac
import json
import logging
import secrets
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

LOGGER = logging.getLogger(__name__)


def crear_servidor(web: Path, estado, alternar) -> ThreadingHTTPServer:
    token = secrets.token_urlsafe(32)

    class Manejador(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(web), **kwargs)

        def log_message(self, format, *args):
            LOGGER.info("Web local: " + format, *args)

        def responder(self, codigo: int, datos: dict) -> None:
            contenido = json.dumps(datos).encode("utf-8")
            self.send_response(codigo)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(contenido)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(contenido)

        def anfitrion_valido(self) -> bool:
            return self.headers.get("Host") in {"127.0.0.1:5500", "localhost:5500"}

        def do_GET(self) -> None:
            anfitrion = self.headers.get("Host")
            if not self.anfitrion_valido() or self.headers.get("Origin") not in (
                None,
                f"http://{anfitrion}",
            ):
                self.responder(403, {"error": "Origen local inválido"})
            elif urlsplit(self.path).path == "/__demo/estado":
                self.responder(200, {"servidores": estado(), "token": token})
            elif urlsplit(self.path).path.startswith("/__demo/"):
                self.responder(404, {"error": "Ruta desconocida"})
            else:
                super().do_GET()

        def do_POST(self) -> None:
            anfitrion = self.headers.get("Host")
            candidato = self.headers.get("X-Aether-Token", "")
            if (
                not self.anfitrion_valido()
                or self.headers.get("Origin") != f"http://{anfitrion}"
                or not candidato.isascii()
                or not hmac.compare_digest(candidato, token)
            ):
                self.responder(403, {"error": "Control no autorizado"})
                return
            if (
                self.path != "/__demo/servidor"
                or self.headers.get("Content-Type") != "application/json"
            ):
                self.responder(404, {"error": "Ruta desconocida"})
                return
            longitud = self.headers.get("Content-Length", "")
            if not longitud.isdecimal() or not 0 < int(longitud) <= 64:
                self.responder(400, {"error": "Solicitud inválida"})
                return
            try:
                datos = json.loads(self.rfile.read(int(longitud)))
            except (ValueError, UnicodeDecodeError):
                self.responder(400, {"error": "Solicitud inválida"})
                return
            numero = datos.get("numero") if isinstance(datos, dict) else None
            if type(numero) is not int or numero not in (1, 2, 3):
                self.responder(400, {"error": "Servidor inválido"})
                return
            try:
                resultado = alternar(numero)
            except (OSError, RuntimeError):
                LOGGER.exception("No se pudo alternar el servidor %s", numero)
                self.responder(503, {"error": "No se pudo alternar el servidor"})
                return
            self.responder(200, resultado)

    return ThreadingHTTPServer(("127.0.0.1", 5500), Manejador)
