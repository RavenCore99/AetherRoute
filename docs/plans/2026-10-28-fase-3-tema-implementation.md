# Fase 3 / sección 2 — conmutador de tema — Implementation Plan

> **For Hermes:** aplicar TDD y un PR separado antes de iniciar skeleton/shimmer.

**Goal:** Permitir alternar claro/oscuro desde el panel, respetando tema del sistema cuando no hay elección guardada y persistiendo la elección local.

**Architecture:** `web/estilos.css` conserva tokens claro/oscuro y aplica el override con `data-tema`. `web/index.html` añade un botón accesible dentro del encabezado; `web/script.js` guarda el valor validado en `estado.tema`, actualiza la etiqueta e icono, escucha el cambio de sistema si no hay override y tolera errores de `localStorage`. No modifica la API, el documento exige un solo h1 y los datos remotos siguen por `textContent`.

**Tech Stack:** HTML/CSS/JavaScript nativos, Node `node:test` y `node:vm` para tests sin nuevos paquetes; navegador Chromium para validación final.

---

### Task 1 — Primer render sin preferencia

**Files:** Crear `tests/theme.test.cjs`; modificar `web/index.html`, `web/script.js`, `web/estilos.css`.

1. Escribir un test que cargue el JS real en VM con DOM mínimo y `location.protocol='https:'`, evitando llamadas de API; comprobar `#tema-etiqueta` con acción opuesta al sistema y ausencia de atributo `data-tema`. Correr `node --test tests/theme.test.cjs`; debe fallar porque el control aún no existe.
2. Agregar botón y etiqueta, mapa de elementos, inicialización de tema/sistema y CSS para encabezado. Correr el test; debe pasar.
3. Verificar que solo hay un h1 y que tema no bloquea acciones ni la vista previa HTTPS.

### Task 2 — Alternancia y persistencia

**Files:** Modificar `tests/theme.test.cjs`, `web/script.js`, `web/estilos.css`.

1. Añadir test rojo: clic cambia `data-tema` y etiqueta, escribe la preferencia explícita; segundo clic revierte.
2. Implementar handler `addEventListener('click', ...)` y selectores CSS con override claro/oscuro. Correr test verde.
3. Añadir test rojo para recarga con preferencia guardada válida, cambios del sistema sin override y storage bloqueado; implementar lo mínimo para que pase.
4. Probar en navegador tema claro y oscuro forzados contra preferencias opuestas, recarga, 360 px, foco visible y API. Verificar `node --check web/script.js`, `node --test tests/theme.test.cjs`, `pytest tests -q`.

### Task 3 — Publicación acotada

**Files:** Modificar `.github/workflows/api-tests.yml` para `node --test tests/theme.test.cjs`; marcar solo la casilla Tema en `PLANNING.md` sin incorporar notas locales ajenas.

1. Ejecutar CI local (Ruff/Pytest/Node), `git diff --check`, inspeccionar diff e índice selectivo.
2. Commits atómicos en español; subir `feat/web`, abrir PR a `main`, verificar CI Linux y Windows sobre el head exacto.
3. Esperar el checkpoint de Raven antes de fusionar y empezar sección 3.
