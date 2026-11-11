# A-Nelo Escénico · Sitio web y sistema de gestión

Sitio web, taquilla en línea y sistema de gestión para **A-Nelo | Escuela de Teatro** (Acarigua). Niveles Kids, Teen y Teenagers.

**Estado: propuesta.** Todavía no hay código de la aplicación. Este repositorio contiene la propuesta visual y la especificación completa para aprobarla antes de construir.

## Qué hay aquí

| Ruta | Contenido |
|---|---|
| [`propuesta/index.html`](propuesta/index.html) | Propuesta visual para el cliente: tres direcciones de diseño con prototipo interactivo (menú, carrusel, cartelera, plano de butacas con apartado de 15 minutos, ficha de artista, panel de administración). Se abre con doble clic en cualquier navegador. |
| [`docs/PROPUESTA.md`](docs/PROPUESTA.md) | Propuesta funcional completa: secciones del sitio, módulos, roles, reglas de negocio. |
| [`docs/ESPECIFICACION-TECNICA.md`](docs/ESPECIFICACION-TECNICA.md) | Arquitectura, modelo de datos en Neon, lógica del apartado de butacas, seguridad, PWA. |
| [`docs/PLAN-DE-TRABAJO.md`](docs/PLAN-DE-TRABAJO.md) | Fases de entrega, qué se necesita del cliente y decisiones pendientes. |

`propuesta/propuesta.html` es la fuente de la propuesta visual; `propuesta/build.sh` genera `index.html` a partir de ella.

## Tecnología prevista

Next.js (App Router, TypeScript) en **Vercel** · Postgres en **Neon** con Drizzle ORM · imágenes en **Vercel Blob** · correo con Resend · instalable como app (PWA).

## Próximo paso

Elegir la dirección de diseño (A Telón, B Foco o C Marquesina) y responder las decisiones de [`docs/PLAN-DE-TRABAJO.md`](docs/PLAN-DE-TRABAJO.md). Con eso empieza la Fase 1.
