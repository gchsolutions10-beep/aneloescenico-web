# A-Nelo Escénico · Sitio web y sistema de gestión

Sitio web, taquilla en línea y sistema de gestión para **A-Nelo | Escuela de Teatro** (Acarigua). Niveles Kids, Teen y Teenagers.

**Estado: en producción** en https://aneloescenico.vercel.app. Las cuatro fases están construidas (sitio público, panel, taquilla, escuela con portal de representantes, Protagonistas y reportes). El contexto para trabajar en el código está en [`CLAUDE.md`](CLAUDE.md).

## Qué funciona hoy

- **Sitio público** con diseño Telón: menú que crece al seleccionar, carrusel de fotos grandes, novedades destacadas, cartelera de afiches, niveles, blog, Sobre nosotros y Contáctanos.
- **Panel** en `/admin` con ingreso master: Carrusel, Blog, Funciones, Niveles, Mensajes, Apariencia (logo, colores, letra), Datos de la escuela, guía de primeros pasos y manual.
- **Fotos** que se recortan solas al formato correcto al subirlas (carrusel 16:9, afiche 2:3, logo cuadrado).
- **Taquilla:** plano de 184 butacas, apartado de 15 minutos, precios en dólares con preventa, cobro en bolívares a tasa BCV, Pago Móvil, transferencia y bonos de regalo, entradas con QR y PDF.
- **Venta en sala:** caja registradora con ticket, cálculo de vuelto y la caja del día de cada vendedor, unida al cierre de caja.
- **Puerta:** escáner QR con la cámara, entrada rápida, salidas temporales y regresos, entrada en grupo e historial.
- **Salas:** editor para crear el plano de cualquier lugar (zonas, bloques y filas).
- **Escuela:** inscripción en línea, fichas de estudiantes, mensualidades automáticas con becas, portal del representante, cobranza, mora y recibos numerados.
- **Protagonistas:** fichas de artistas con trayectoria, publicadas solo con autorización del representante.
- **Reportes:** cierre de caja, ventas por función, cobranza y descargas para Excel.
- **Roles:** Master, Administrador, Vendedor y Representante, más la cuenta de soporte técnico del programador.
- **App instalable** (PWA) con el logo y los colores configurados.

Para publicarlo: [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).

## Qué hay aquí

| Ruta | Contenido |
|---|---|
| [`propuesta/index.html`](propuesta/index.html) | Propuesta visual para el cliente: tres direcciones de diseño con prototipo interactivo (menú, carrusel, cartelera, plano de butacas con apartado de 15 minutos, ficha de artista, panel de administración). Se abre con doble clic en cualquier navegador. |
| [`docs/PROPUESTA.md`](docs/PROPUESTA.md) | Propuesta funcional completa: secciones del sitio, módulos, roles, reglas de negocio. |
| [`docs/ESPECIFICACION-TECNICA.md`](docs/ESPECIFICACION-TECNICA.md) | Arquitectura, modelo de datos en Neon, lógica del apartado de butacas, seguridad, PWA. |
| [`docs/PLAN-DE-TRABAJO.md`](docs/PLAN-DE-TRABAJO.md) | Fases de entrega, qué se necesita del cliente y decisiones pendientes. |
| [`docs/instructivo/Guia-del-panel-A-Nelo-Escenico.html`](docs/instructivo/Guia-del-panel-A-Nelo-Escenico.html) | Guía para el cliente: cómo entrar, configurar la escuela, crear funciones, vender, manejar estudiantes y crear Protagonistas. Un solo archivo con capturas; se regenera con `python3 docs/instructivo/armar.py https://tu-dominio`. |
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

Next.js 16 (App Router, TypeScript, Cache Components) en **Vercel** · Postgres en **Neon** con Drizzle ORM · imágenes en **Vercel Blob** · instalable como app (PWA). Correo con Resend (configurable desde el panel).

## Próximo paso

Cargar el contenido real y los datos de pago desde el panel, configurar el correo y probar la puerta con el público.
