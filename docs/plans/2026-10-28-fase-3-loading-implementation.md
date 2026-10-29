# Fase 3 / sección 3 — skeleton y shimmer — Implementation Plan

> **For Hermes:** ejecutar TDD RED→GREEN y publicar este incremento en un PR independiente; no comenzar iluminación ambiental antes del checkpoint.

**Goal:** Mostrar una estructura de carga en métricas, tabla y barras durante la primera consulta de la API sin mostrar datos ficticios ni «Cargando…».

**Architecture:** `web/script.js` crea un skeleton decorativo al iniciar en HTTP, lo elimina por área al recibir éxito o error, y nunca lo reinstala en actualizaciones posteriores. `web/estilos.css` pinta las formas con tokens y un pseudo-elemento cuyo `transform` anima shimmer; `prefers-reduced-motion` lo apaga. `aria-busy` comunica el estado de las zonas sin anunciar los placeholders. La vista previa HTTPS sigue sin solicitudes ni skeleton interminable.

**Tech Stack:** CSS/JS nativos, Node `node:test`/`node:vm` y API FastAPI existente. Sin paquetes nuevos.

---

### Task 1 — Skeleton en la primera petición

**Files:** Crear `tests/loading.test.cjs`; modificar `web/script.js` y `web/estilos.css`.

1. Test rojo que ejecute `script.js` real con `fetch` diferido: comprobar dos métricas, tres filas de tabla y tres barras decorativas mientras la petición está pendiente; los vacíos quedan ocultos y las regiones `aria-busy=true`.
2. Implementar una función pequeña para construir placeholders DOM con `aria-hidden=true`, sin cifras o nombres inventados; activarla antes de `actualizar()` solo en HTTP.
3. Comprobar test verde. Extender test con éxito y error: los skeletons se retiran, `aria-busy=false`, los datos reales aparecen o los vacíos se muestran; una segunda actualización no reintroduce skeletons. Usar ciclos TDD por caso.

### Task 2 — Shimmer y movimiento reducido

**Files:** Modificar `web/estilos.css`; ampliar el test de estructura si corresponde.

1. Tokens de fondo y reflejo para ambos esquemas. `.esqueleto` con dimensiones estables y `::after` que se desplaza con `transform` (sin alterar layout ni solicitar imágenes); `@media (prefers-reduced-motion: reduce)` elimina la animación. No añadir dependencias.
2. Navegador real con red artificialmente lenta: capturar skeletons antes de respuesta, comprobar desaparición en éxito/error, modo claro/oscuro y 360 px; verificar computed `animation-name: none` con movimiento reducido.

### Task 3 — CI y PR

**Files:** Modificar `.github/workflows/api-tests.yml` para `node --test tests/loading.test.cjs`; seleccionar solo casillas Skeleton y Shimmer de `PLANNING.md`.

1. Ejecutar `node --check web/script.js`, ambos tests Node, siete tests Python, Ruff y `git diff --check` con puertos libres.
2. Commits atómicos en `feat/web`; PR a `main`, CI Linux/Windows del head exacto; sin deploy ni merge hasta checkpoint de Raven.
