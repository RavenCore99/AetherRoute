# Fase 2 Implementation Plan

> Para Hermes: implementar de forma secuencial, probar cada sección y no alterar Fases 3–5.

**Goal:** La interfaz web local debe ejecutar las seis pruebas del PDF consumiendo el contrato API existente.

**Architecture:** Tres archivos estáticos en `web/`: HTML semántico, CSS funcional y JavaScript de estado único. Hosting HTTPS queda como vista previa sin llamadas inseguras a la API local.

**Tech Stack:** HTML, CSS y JavaScript nativos, `fetch`, `AbortController`, Python `http.server`, FastAPI existente; sin paquetes nuevos.

---

### Tarea 1: Estructura semántica

**Crear:** `web/index.html`.

1. Incluir un único h1 «Panel de administración de servidores dinámicos», resumen, tabla, botón «Actualizar», botón «Enviar solicitud», resultado, estadísticas y eventos en un `aria-live="polite"`.
2. Enlazar `estilos.css` y `script.js` sin CDN.
3. Verificar: `python -m http.server 5500` desde `web/`; inspeccionar jerarquía y enlaces con navegador. Commit específico del HTML.

### Tarea 2: Presentación funcional

**Crear:** `web/estilos.css`.

1. Definir espaciado, botones, tabla, estados legibles también por texto y vista móvil; sin efectos de Fase 3.
2. Verificar en 360px y escritorio sin recorte de controles; contraste de estados y foco visible. Commit CSS.

### Tarea 3: Conexión y datos

**Crear:** `web/script.js`.

1. Definir `API_BASE` por defecto y `estado` único. `api(ruta)` usa `AbortController` 3s, JSON y errores normalizados.
2. Carga inicial: servidores y estadísticas independientes; cruce de contadores sin inventar datos; renderizar con `textContent`.
3. Acción de solicitar: bloqueo de botones, resultado real, refresco de secciones y hasta 20 eventos con marca de hora. Actualizar reconsulta; 503/API apagada/error estadístico muestran texto esperado.
4. Hosting HTTPS: no intentar HTTP local y enseñar aviso de vista previa sin datos falsos.
5. Verificar con navegador y red real cinco solicitudes, caída, 503 y recuperación; CI Python existente sigue verde. Commit JS.

### Tarea 4: Cierre y PR

**Modificar:** `PLANNING.md` (solo hunks de Fase 2), `CLAUDE.md` local ignorado al cerrar la fase.

1. Ejecutar tests de API y chequeos de JS (`node --check`); verificar manualmente seis pruebas del PDF desde navegador.
2. Contar casillas de Fase 2 programáticamente, marcar solo las verificadas y comprobar que no se incluyan notas ajenas de Firebase.
3. Publicar rama `feat/web`; abrir PR hacia `main`; verificar CI exact-head. No fusionar sin confirmación de Raven según CLAUDE.md §8.
