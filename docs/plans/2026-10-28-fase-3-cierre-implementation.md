# Fase 3 — cierre visual y verificación

**Alcance autorizado:** tras fusionar #9, completar contadores, barras y estados vacío/error; comprobar movimiento reducido, funcionamiento real de la API y accesibilidad antes de dar por cerrada la fase. No iniciar Fase 4 hasta que el cierre sea verificable.

**TDD por cortes:**
1. Conteo de solicitudes: primera respuesta muestra el valor real inmediatamente; actualizaciones numéricas animan durante ≤500 ms sin bloquear controles y terminan en el valor real. Movimiento reducido o pestaña oculta lo muestra al instante. Cancelar animación anterior ante otra respuesta.
2. Barras: conservar `<progress>` semántico con el valor final y añadir una pista visual cuya escala transiciona con CSS desde el reparto anterior; si no hay dato previo, mostrar el valor final sin transición. Reduced-motion elimina la transición.
3. Estados: misma clase/componente visual para vacíos y mensajes de error; el texto y la acción continúan disponibles y no dependen del color.
4. Navegador: red real, solicitud, caída parcial, 503, recuperación, API desconectada, temas, 360 px, movimiento reducido, teclado. Ejecutar todos los tests Node/Python/Ruff y verificar CI del PR y del merge.
5. Accesibilidad: inspección de árbol AX, contrastes y Lighthouse ≥90 exigido por `PLANNING.md`; si Lighthouse no está disponible sin una instalación no autorizada, no afirmar cierre pleno ni marcar como verificado.

**Entrega:** commits pequeños en `feat/web`, PR a `main` con pruebas y pendientes explícitos; conservar notas locales de Raven fuera del staging. `CLAUDE.md` se actualiza al cerrar la fase, sin alterar sus decisiones de arquitectura.
