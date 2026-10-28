# Fase 2 — interfaz funcional

Decisión aprobada por Raven: demo completa en `http://localhost:5500` con API local; en Firebase Hosting HTTPS solo vista previa estática, sin pretender consultar `http://127.0.0.1:8000`. El backend HTTPS y la publicación de Hosting quedan fuera de esta fase.

## Opciones consideradas

- HTML/CSS/JS sin build (elegida): cumple el PDF, evita dependencias y permite ejecutar la demo sin red.
- React/Tailwind: añade build y no sustituye los tres archivos obligatorios.
- API pública HTTPS ahora: amplía la fase y exige infraestructura ajena al taller local.

## Estructura

`web/index.html` contiene encabezado, resumen, tabla, acción, reparto y eventos; `web/estilos.css` aporta legibilidad, estados y adaptación móvil mínimos; `web/script.js` hace `fetch` con timeout y una sola función de normalización de errores. El servidor HTTP local expone exclusivamente `web/`. No se modifica el contrato FastAPI ni el `public/` y `firebase.json` locales.

## Datos y estados

Al entrar se consultan `/servidores` y `/estadisticas`; no hay valores de relleno. Tabla y barras se construyen con nodos DOM y `textContent`, incluyendo conteo 0 de servidores conocidos sin solicitudes. Los botones Actualizar y Enviar solicitud bloquean peticiones simultáneas; después de solicitar se refrescan tabla y estadísticas. Hasta 20 eventos con hora y `aria-live=polite`; errores diferenciados para API apagada, 503, otros HTTP y estadísticas. En HTTPS sin API HTTPS se muestran secciones vacías y aviso de vista previa, no solicitudes fallidas a localhost.

## Verificación

Mantener las seis pruebas de API existentes; probar por navegador real carga, cinco solicitudes, caída, 503, recuperación, sin API y preview HTTPS; inspeccionar consola y red. No incluir tema, skeleton, shimmer ni animaciones (Fase 3), ni evidencia final (Fase 4).
