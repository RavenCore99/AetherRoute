# Fase 3 / sección 1 — tokens y composición CSS — Implementation Plan

> **For Hermes:** Implementar por secciones, con PR y checkpoint antes de la siguiente.

**Goal:** Convertir la interfaz funcional en un panel editorial visible y responsive con tema automático claro/oscuro sin alterar su comportamiento.

**Architecture:** Un único archivo `web/estilos.css` define tokens semánticos y reordena visualmente el DOM existente mediante CSS Grid. `web/index.html` y `web/script.js` no cambian en esta sección. CSS automático `prefers-color-scheme`; preferencia manual y animación llegan en PRs posteriores.

**Tech Stack:** HTML/CSS nativo, Python 3.14, navegador Chromium. Sin paquetes, fuentes ni CDN nuevos.

---

### Task 1: Capturar línea base y fijar invariantes

**Files:** Leer `web/index.html`, `web/estilos.css`, `web/script.js`; crear solo plan en `docs/plans/`.

1. Comprobar que la API y frontend responden por HTTP real; capturar pantalla escritorio y 360 px.
2. Verificar en CSS existente `.boton`, `.estado--activo`, `.estado--inactivo`, `.estadistica`, `#aviso`, `[hidden]` para no romper estados.
3. Guardar el diseño y este plan; `git add docs/plans/2026-10-28-fase-3-* && git commit -m 'docs: definir dirección visual de fase 3'`.

### Task 2: Definir tokens y modo automático

**Files:** Modificar `web/estilos.css` únicamente.

1. Fijar pares de contraste con una comprobación WCAG propia (ratio ≥4.5 para texto normal); comprobar, entre otros, `#172a29/#f3f1e8`, `#4c625d/#f3f1e8`, `#e8eee7/#111d1e`.
2. Añadir `:root` con `--ui-text-primary`, `--ui-text-secondary`, `--ui-text-tertiary`, `--ui-stroke-tertiary`, `--ui-bg-quaternary`, `--ui-accent`, `--shadow-nous` y `--stroke-nous` y valores para fondo, control, espacio, radio y duración.
3. Añadir `@media (prefers-color-scheme: dark)` que redefina tokens y `color-scheme: dark`; sin selector manual hasta sección 2.
4. Comprobar con navegador que CSSOM muestra tokens correctos en ambos esquemas y que el contraste cumple AA; no tocar JS.

### Task 3: Composición y regresión

**Files:** Modificar `web/estilos.css` únicamente.

1. Header tipográfico amplio; métricas en banda horizontal; estado/reparto en columna principal y gestión/eventos en columna secundaria; sin tarjetas anidadas, un solo hairline por bloque.
2. Adaptar a 360 px sin scroll; conservar tabla con overflow horizontal limitado y barras que se apilan; foco visible, botones existentes y texto de estados.
3. `node --check web/script.js && .venv/bin/python -m pytest tests -q` y prueba real en navegador (desktop, 360 px, claro, oscuro, API disponible y apagada). Inspeccionar captura y contraste; corregir si falla.
4. `git add web/estilos.css && git diff --cached --check && git commit -m 'feat: diseñar base editorial y tema automático'`; subir `feat/web` y abrir PR a `main`. No marcar Fase 3 completa.

**Checkpoint:** esperar confirmación de Raven y merge verificado con CI de `main` antes de la sección 2.
