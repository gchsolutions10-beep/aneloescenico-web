# A-Nelo Escénico · Sitio web y sistema de gestión

Sitio web, taquilla en línea y sistema de gestión para **A-Nelo | Escuela de Teatro** (Acarigua). Niveles Kids, Teen y Teenagers.

**Estado: Fases 1, 2 y 3 construidas** (sitio público, panel, taquilla con plano de butacas y escuela con portal de representantes). Las fichas de Protagonistas y los reportes llegan en la Fase 4; ver [`docs/PLAN-DE-TRABAJO.md`](docs/PLAN-DE-TRABAJO.md).

## Qué funciona hoy

- **Sitio público** con diseño Telón: menú que crece al seleccionar, carrusel de fotos grandes, novedades destacadas, cartelera de afiches, niveles, blog, Sobre nosotros y Contáctanos.
- **Panel** en `/admin` con ingreso master: Carrusel, Blog, Funciones, Niveles, Mensajes, Apariencia (logo, colores, letra), Datos de la escuela, guía de primeros pasos y manual.
- **Fotos** que se recortan solas al formato correcto al subirlas (carrusel 16:9, afiche 2:3, logo cuadrado).
- **Taquilla:** plano de 184 butacas, apartado de 15 minutos, precios en dólares con preventa, cobro en bolívares a tasa BCV, Pago Móvil, transferencia y bonos de regalo, entradas con QR, venta presencial y validación en puerta.
- **Salas:** editor para crear el plano de cualquier lugar (zonas, bloques y filas).
- **Escuela:** inscripción en línea, fichas de estudiantes, mensualidades automáticas con becas, portal del representante, cobranza, mora y recibos numerados.
- **Roles:** Master, Administrador, Vendedor y Representante.
- **App instalable** (PWA) con el logo y los colores configurados.

Para publicarlo: [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).

## Qué hay aquí

| Ruta | Contenido |
|---|---|
| [`propuesta/index.html`](propuesta/index.html) | Propuesta visual para el cliente: tres direcciones de diseño con prototipo interactivo (menú, carrusel, cartelera, plano de butacas con apartado de 15 minutos, ficha de artista, panel de administración). Se abre con doble clic en cualquier navegador. |
| [`docs/PROPUESTA.md`](docs/PROPUESTA.md) | Propuesta funcional completa: secciones del sitio, módulos, roles, reglas de negocio. |
| [`docs/ESPECIFICACION-TECNICA.md`](docs/ESPECIFICACION-TECNICA.md) | Arquitectura, modelo de datos en Neon, lógica del apartado de butacas, seguridad, PWA. |
| [`docs/PLAN-DE-TRABAJO.md`](docs/PLAN-DE-TRABAJO.md) | Fases de entrega, qué se necesita del cliente y decisiones pendientes. |
| [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) | Cómo publicar en Vercel con Neon y cómo trabajar en local. |

`propuesta/propuesta.html` es la fuente de la propuesta visual; `propuesta/build.sh` genera `index.html` a partir de ella.

## Código

| Ruta | Contenido |
|---|---|
| `app/(publico)/` | Páginas del sitio público |
| `app/admin/` | Panel de administración |
| `app/api/subir/` | Recepción de imágenes |
| `components/` | Menú, carrusel, subida de imágenes, editor de tema |
| `db/` | Esquema Drizzle y migraciones |
| `lib/` | Datos en caché, acciones del panel, sesión, tema |
| `scripts/migrar.mjs` | Migraciones y datos iniciales (corre en cada build) |

## Tecnología

Next.js 16 (App Router, TypeScript, Cache Components) en **Vercel** · Postgres en **Neon** con Drizzle ORM · imágenes en **Vercel Blob** · instalable como app (PWA). Correo con Resend a partir de la Fase 2.

## Próximo paso

Publicar en Vercel siguiendo [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md), cargar el contenido real y los datos de pago desde el panel, y seguir con la Fase 4 (Protagonistas y reportes).
