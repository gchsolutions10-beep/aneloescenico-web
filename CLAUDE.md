@AGENTS.md

# A-Nelo Escénico

Sitio, taquilla y gestión de **A-Nelo | Escuela de Teatro** (Acarigua, Venezuela). Interfaz, código y commits en **español**.

- Producción: https://aneloescenico.vercel.app · Vercel + Neon + Vercel Blob.
- Rama de trabajo y de producción: `claude/dazzling-ride-eelsip`. No abrir PR sin que lo pidan.
- La base de Neon se creó desde Vercel: se abre en Vercel › Storage › Open in Neon (no está en la organización personal de Neon).

## Listo y en producción

- **Sitio público** "Telón": carrusel, novedades, cartelera, Clases, Protagonistas, Blog, Sobre nosotros, Contáctanos. PWA.
- **Venta en línea:** plano en vivo, apartado de 15 min, USD con preventa, cobro en Bs a tasa BCV (bcv.org.ve → DolarApi → manual), Pago Móvil, transferencia, bonos. Conflictos: cambio de butacas o reembolso. Entradas con QR y PDF.
- **Taquilla** (`/admin/taquilla`): caja registradora (ticket, métodos en botones, vuelto $/Bs, bono con saldo descontado, "Tu caja de hoy"), unida al **Cierre de caja** por pestañas.
- **Bonos:** el cliente pulsa Aplicar y ve cuánto cubre y cuánto le falta; solo reporta el resto por banco. `saldoBono` no descuenta; el descuento ocurre al pagar.
- **Reservadas** (pestaña Butacas): estado `bloqueada` + `butacas.reserva` (grupo: Prensa, Invitados…). `estadoPlano(f, "publico")` las muestra vendidas y sin grupo; la API de butacas elige la vista según la sesión. Solo un admin las vende o regala desde la taquilla.
- **Diseño de la entrada** (pestaña de cada función): estilo banda o completa, QR en 4 posiciones, fondo color/afiche/imagen, paletas, logo en el QR, adornos combinables (telón, escenario, máscaras, marquesina, estrellas; `lib/adornos.ts`, nunca encima del QR). Una sola geometría en `lib/diseno-entrada.ts` para web (`components/TarjetaEntrada.tsx`) y PDF; se rechaza un QR claro sobre oscuro o con contraste < 4.5.
- **Puerta** (`/admin/validar`): escáner QR (BarcodeDetector o `jsqr`), modos Preguntar / Entrada rápida / Salida, salida temporal y regreso, grupo por compra, deshacer (admin), historial en `movimientos_puerta`. El QR apunta a `/admin/validar?c=CODIGO`.
- **Escuela:** inscripciones, mensualidades con becas, portal del representante, cobranza, recibos (`recibos_seq`). **Protagonistas** con autorización del representante.
- **Panel:** menú agrupado, cajones, confirmaciones con consecuencias, reportes con CSV. Borrar elimina datos en Neon y archivos en Blob; "Reiniciar datos" (`BORRAR TODO`) conserva las cuentas master.
- **Cuentas:** master, admin, vendedor, representante. El equipo entra con usuario o correo. **Soporte técnico** del programador: clave solo en `SOPORTE_USUARIO`/`SOPORTE_CLAVE` de Vercel; puede rescatar la clave principal.
- **Guía del cliente:** `docs/instructivo/plantilla.html` + `capturas/` → `python3 docs/instructivo/armar.py https://aneloescenico.vercel.app`. Si cambia una pantalla descrita, actualizar texto y captura.

## Reglas que ya costaron errores

- Next.js 16 con `cacheComponents`: consultar `node_modules/next/dist/docs/`. `proxy.ts` en vez de middleware. `cookies`/`searchParams` dentro de `<Suspense>`; `connection()` antes de usar la hora. `updateTag` en las acciones.
- `"use server"` solo exporta funciones async; una página solo exporta `default`/`metadata`/config.
- Lint `react-hooks`: sin `Date.now()` en el render (helpers como `haceHoras`), sin `setState` en efectos.
- Arreglos en `sql` de Drizzle: como JSON (`jsonb_array_elements_text(${JSON.stringify(x)}::jsonb)`).
- Butacas y entradas: UPDATE condicionado, nunca leer y luego escribir.
- Acciones redirigen con `?ok=${Date.now()}`.
- Migraciones: `db/schema.ts` → `npx drizzle-kit generate --name <nombre>`; se aplican en cada build. Tabla nueva de datos → sumarla al TRUNCATE de `lib/reinicio.ts`.
- Imágenes nuevas guardadas en una columna o JSON: sumarlas a `enUso` de `lib/archivos.ts`, o la limpieza las borra.
- La zona (precio) de una butaca vive en `butacas.zona_id` por función; la entrada vendida guarda su zona y precio propios.

## Verificar antes de subir

```bash
npx tsc --noEmit && npx eslint app components lib pruebas && npm run prueba && npx next build
```

Local: Postgres en el puerto 5433 (`/var/tmp/anelo-pg/data`, arrancar con `pg_ctl` como `postgres`), variables en `.env.local`. Tras `next build`, matar el `next start` anterior antes de levantar otro.

## Privacidad

Nada de claves ni del correo personal del programador en el repositorio, la guía o servicios externos. La clave del cliente la entrega el programador en persona.
