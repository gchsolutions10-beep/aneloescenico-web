@AGENTS.md

# A-Nelo Escénico

Sitio, taquilla y gestión de **A-Nelo | Escuela de Teatro** (Acarigua, Venezuela). Interfaz, código y commits en **español**.

- Producción: https://aneloescenico.vercel.app · Vercel + Neon + Vercel Blob. Todo lo construido está en producción.
- Rama de trabajo y de producción: `claude/dazzling-ride-eelsip`. No abrir PR sin que lo pidan.
- La base de Neon se abre en Vercel › Storage › Open in Neon (no está en la organización personal de Neon).

## Dónde está cada cosa

- `lib/taquilla.ts`: butacas, apartado de 15 min, pagos, bonos (`saldoBono` no descuenta), reservas (estado `bloqueada` + `butacas.reserva`), venta en sala. `estadoPlano(f, "publico")` muestra las reservadas como vendidas.
- `lib/puerta.ts`: validación QR, salida temporal y regreso (`movimientos_puerta`). El QR apunta a `/admin/validar?c=CODIGO`.
- `lib/diseno-entrada.ts` + `lib/adornos.ts` + `components/TarjetaEntrada.tsx`: una sola geometría (300 × 500) para la entrada web y el PDF (`app/api/entradas/[codigo]`). QR siempre oscuro sobre claro (contraste ≥ 4.5), ningún adorno encima.
- `components/MisCompras.tsx`: compras guardadas en el teléfono del comprador (localStorage, solo el código) y página `/mis-entradas`; estados por `app/api/mis-compras`. Con sesión del equipo, abrir `/orden/…` no guarda la compra (y la quita si estaba).
- Envío de entradas: botón de WhatsApp al confirmar en `/admin/pagos` (`mensajeEntradas` en `lib/util.ts`). Correo opcional con Resend, configurado en el panel; sin dominio propio no se usa.
- `lib/escuela.ts`, `lib/reportes.ts`, `lib/archivos.ts` (limpieza de Blob), `lib/reinicio.ts` (reiniciar datos, conserva cuentas master).
- Cuenta de soporte del programador: `SOPORTE_USUARIO` / `SOPORTE_CLAVE` en Vercel (lógica en `lib/acciones.ts`).
- Guía del cliente: `docs/instructivo/plantilla.html` + `capturas/` → `python3 docs/instructivo/armar.py https://aneloescenico.vercel.app`. Si cambia una pantalla descrita, actualizar texto y captura.

## Reglas que ya costaron errores

- Next.js 16 con `cacheComponents`: consultar `node_modules/next/dist/docs/`. `proxy.ts` en vez de middleware. `cookies`/`searchParams` dentro de `<Suspense>`; `connection()` antes de usar la hora. `updateTag` en las acciones.
- `"use server"` solo exporta funciones async; una página solo exporta `default`/`metadata`/config.
- Lint `react-hooks`: sin `Date.now()` en el render (helpers como `haceHoras`), sin `setState` síncrono en efectos.
- Arreglos en `sql` de Drizzle: como JSON (`jsonb_array_elements_text(${JSON.stringify(x)}::jsonb)`).
- Butacas y entradas: UPDATE condicionado, nunca leer y luego escribir.
- Acciones redirigen con `?ok=${Date.now()}`.
- Migraciones: `db/schema.ts` → `npx drizzle-kit generate --name <nombre>`; se aplican en cada build. Tabla nueva → sumarla al TRUNCATE de `lib/reinicio.ts`. Imagen nueva guardada en una columna o JSON → sumarla a `enUso` de `lib/archivos.ts`.
- La zona (precio) de una butaca vive en `butacas.zona_id` por función; la entrada vendida guarda su zona y precio propios.

## Verificar antes de subir

```bash
npx tsc --noEmit && npx eslint app components lib pruebas && npm run prueba && npx next build
```

Local: Postgres en el puerto 5433 (`/var/tmp/anelo-pg/data`, arrancar con `pg_ctl` como `postgres`), variables en `.env.local`. `npm run prueba` vacía funciones y compras de la base local. `next build` prerenderiza con los datos del momento: recompilar después de cargar datos de prueba, y matar el `next start` anterior antes de levantar otro.

## Privacidad

Nada de claves ni del correo personal del programador en el repositorio, la guía o servicios externos. La clave del cliente la entrega el programador en persona.
