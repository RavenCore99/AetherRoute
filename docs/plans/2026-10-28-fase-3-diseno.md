# Fase 3 — dirección visual «cartografía editorial»

Aprobada por Raven para AetherRoute: un panel de red local claro, preciso y expresivo, no una consola genérica de tarjetas. El alumnado lo usa para mostrar la distribución round-robin, servidores caídos y recuperación durante la demo del PDF.

## Dirección

- Plano editorial: fondo caliza, tinta verde petróleo, acento mineral; oscuro con base petróleo profunda y texto marfil. Tipografía de sistema para que el clon no dependa de fuentes remotas. Título exigido una sola vez; descripción de una línea.
- Header tipográfico amplio y asimétrico; franja de métricas sin tarjetas anidadas; estado y reparto con mayor peso visual, gestión y eventos como columna secundaria. En 360 px todo vuelve al flujo vertical sin scroll horizontal.
- Tokens propios en `web/estilos.css`, incluyendo los nombres `--ui-*` que pide `PLANNING.md`. Estados textuales y contraste AA; el color refuerza pero no sustituye «Activo», «Inactivo» ni errores.

## Entrega por secciones y checkpoints

1. Solo CSS: tokens claro/oscuro automáticos, composición responsive, botones/tabla/barras, foco; sin nuevas dependencias ni cambio del contrato/DOM/JS. Validar navegador y pruebas existentes; PR a `main`, checkpoint de Raven.
2. Conmutador sol/luna en HTML y JS: sistema por defecto y preferencia explícita en `localStorage`; verificar persistencia, sistema y accesibilidad. PR y checkpoint.
3. Skeleton y shimmer durante la primera respuesta; se retiran en éxito y error, jamás «Cargando…»; reducido sin animación. PR y checkpoint.
4. Ambient lighting decorativo: 2–3 resplandores dirigidos por estados todos/parcial/ninguno y eventos; pausa en pestaña oculta; después de la primera pintura. Contrastar con catálogo webdev.teknium.io, especialmente Paper Shaders y WebGL Fluid, pero no instalar nada sin aprobación de versión, licencia, tamaño y demo. Fallback CSS sin red ni dependencia. Medir coste y accesibilidad antes de adoptarlo.

## Verificación

Probar sin API, con API, 503 y recuperación; modo claro/oscuro, 360 px y escritorio, `prefers-reduced-motion`, foco y texto. Ejecutar CI Python/JS y prueba real en navegador. Para el criterio final de Lighthouse accesibilidad ≥90 falta auditoría con herramienta disponible; no marcar Fase 3 como cerrada hasta medirlo.
