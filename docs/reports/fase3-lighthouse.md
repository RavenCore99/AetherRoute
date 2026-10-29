# Fase 3 — auditoría local de interfaz

Fecha: 2026-10-29. Demo servida desde `scripts/demo.py` en `http://127.0.0.1:5500/`, con tres backends y el balanceador FastAPI reales. Chrome 154; Lighthouse 13.6.0 ejecutado de forma temporal mediante `npm exec --yes --package=lighthouse@13.6.0` (Apache-2.0), sin añadir dependencias al repositorio.

| Perfil | Accesibilidad | Rendimiento | CLS |
| --- | ---: | ---: | ---: |
| Móvil (predeterminado) | 100 | 100 | 0.001 |
| Escritorio (`--preset=desktop`) | 100 | 100 | 0.001 |

No hubo auditorías de accesibilidad fallidas ni errores de ejecución en los informes finales. Las puntuaciones son sintéticas y locales, no métricas de usuarios reales ni una validación del Hosting público.

El primer análisis detectó un nombre accesible que no contenía el texto visible del botón de tema y un CLS móvil de 0.164 causado por alturas sin reservar antes de cargar JavaScript. Se corrigió el nombre accesible, se reservó el espacio de la cabecera, tabla y estadísticas, y se colocaron los mensajes vacíos dentro de esas zonas para evitar grandes espacios en blanco. Después de los cambios, los dos perfiles obtuvieron los resultados de la tabla.

Reproducción, con la demo en ejecución:

    CHROME_PATH=/usr/bin/google-chrome-stable npm exec --yes --package=lighthouse@13.6.0 -- lighthouse http://127.0.0.1:5500/ --only-categories=accessibility,performance --output=json --output-path=mobile.json --chrome-flags='--headless --no-sandbox --disable-dev-shm-usage' --quiet

Para escritorio, añadir `--preset=desktop` y cambiar la salida a `desktop.json`. El comando requiere Node ≥22.19 y Chrome local. Los archivos JSON completos de esta ejecución quedaron fuera del repositorio, en el directorio temporal del agente; no son necesarios para ejecutar la demo.
