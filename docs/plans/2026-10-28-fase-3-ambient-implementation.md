# Fase 3 / sección 4 — luz ambiental ligada a la red

**Objetivo:** Añadir tres halos radiales fluidos detrás de la interfaz editorial, modulados exclusivamente por el estado real de `/servidores` y por las solicitudes/errores. Es decorativo y no modifica endpoints ni valores del panel.

**Referencias:** `CLAUDE.md` §6 y https://webdev.teknium.io/ (Paper Shaders, WebGL Fluid y OGL Flowmap); `hermes_desktop_desing/fluids.md`. Por alcance y permiso de dependencias, usar gradientes CSS nativos en esta sección, sin copiar ni instalar librerías. Un shader GPU real queda separado y requeriría presentar tamaño, licencia, versión y demo y obtener aprobación.

**Estados:** desconocido al iniciar o fallar la consulta, estable con tres activos, parcial con uno o dos, caída con ninguno. Los estados siguen indicándose por texto en la tabla y en los mensajes; el color es una pista adicional. Un pulso breve acompaña solicitudes correctas o errores. La animación comienza después de la primera pintura, se pausa si la pestaña se oculta y se elimina con `prefers-reduced-motion`.

**Cortes:**
1. Test RED de clasificación al consultar una lista real y de retorno a desconocido si falla la API; GREEN en `web/script.js` sin tocar la API.
2. Test RED de pulso al solicitar y de pausa por visibilidad; GREEN con nodo decorativo `aria-hidden` en `web/index.html`.
3. CSS de tres halos suaves, tokens claro/oscuro/ámbar/rojo, deriva con `transform`; verificar fondo e interacción en navegador real con fallos y recuperación, también con 360 px, pestaña oculta y movimiento reducido.
4. Incorporar test al CI, ejecutar Node/Python/Ruff, marcar solo ambient en `PLANNING.md`, abrir PR a `main` y esperar el checkpoint de Raven antes de la siguiente sección.
