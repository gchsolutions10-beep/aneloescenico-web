@AGENTS.md

# A-Nelo Escénico · contexto del proyecto

Sitio público, taquilla en línea y sistema de gestión de **A-Nelo | Escuela de Teatro** (Acarigua, Venezuela). Todo el texto de la interfaz, del código y de los commits va en **español**.

- Producción: https://aneloescenico.vercel.app (Vercel + Neon + Vercel Blob).
- Rama de trabajo y de producción en Vercel: `claude/dazzling-ride-eelsip`. No abrir PR sin que lo pidan.

## Qué está hecho (todo en producción)

- **Sitio público** (diseño "Telón", oscuro): carrusel, novedades, cartelera con afiches, Clases, Protagonistas, Blog, Sobre nosotros, Contáctanos. PWA instalable con el logo.
- **Taquilla en línea:** plano de butacas en vivo, apartado de 15 minutos, precios en USD con preventa hasta una fecha, cobro en Bs a tasa BCV del día (bcv.org.ve → DolarApi → tasa manual), Pago Móvil, transferencia y bonos de regalo. Conflictos de butaca: cambiar de butacas o pedir reembolso. Entradas con QR y PDF.
- **Taquilla en sala** (`/admin/taquilla`): caja registradora. Selector de funciones (los borradores se ven apagados y un admin puede ponerlos a la venta ahí mismo), plano + ticket con líneas, métodos de pago en botones, cálculo de vuelto en $ o Bs, "Tu caja de hoy" y pestañas Vender | Cierre de caja.
- **Puerta** (`/admin/validar`): escáner QR con la cámara (BarcodeDetector o `jsqr` en iPhone), modos Preguntar / Entrada rápida / Salida, salida temporal y regreso, entrada en grupo por compra, deshacer ingreso (solo admin), historial en `movimientos_puerta`. El QR impreso apunta a `/admin/validar?c=CODIGO`.
- **Cierre de caja y reportes:** dinero confirmado por día, persona y método; CSV para Excel; imprimir.
- **Escuela:** inscripción en línea, estudiantes, mensualidades con becas, portal del representante, cobranza, recibos numerados (`recibos_seq`).
- **Protagonistas:** fichas de artistas con trayectoria, publicadas solo con autorización del representante.
- **Panel** (rediseñado): menú lateral agrupado, formularios en cajones que se abren al usarlos, confirmaciones con consecuencias al borrar, avisos. En el teléfono, Funciones se ve en tarjetas.
- **Borrado completo:** borrar función, estudiante o ficha elimina sus datos en Neon y sus archivos en Blob. "Reiniciar datos" (frase `BORRAR TODO`) deja la base en cero y conserva las cuentas master.
- **Cuentas:** roles master, admin, vendedor, representante. El equipo entra con nombre de usuario (`hgonzalez`) o correo; representantes con correo. Cuenta de **soporte técnico** del programador: su clave vive solo en las variables `SOPORTE_USUARIO` / `SOPORTE_CLAVE` de Vercel (≥12 caracteres), puede rescatar la clave de la cuenta principal y el cliente no puede tocarla.
- **Guía del cliente:** `docs/instructivo/plantilla.html` + capturas → `python3 docs/instructivo/armar.py https://aneloescenico.vercel.app` genera `Guia-del-panel-A-Nelo-Escenico.html`. Si cambia una pantalla descrita ahí, actualizar texto y captura.

## Reglas técnicas que ya costaron errores

- Next.js 16 con `cacheComponents`: leer `node_modules/next/dist/docs/` antes de usar una API. `proxy.ts` reemplaza a middleware. `cookies`/`searchParams` dentro de `<Suspense>`; llamar `connection()` antes de usar la hora actual. Invalidar con `updateTag` en las acciones.
- Un archivo `"use server"` solo puede exportar funciones async: las constantes van en otro módulo (`lib/util.ts`, `lib/reinicio.ts`).
- Una página solo exporta `default`, `metadata` y config: los componentes compartidos van en `components/`.
- Lint `react-hooks`: nada de `Date.now()` en el render (usar helpers de `lib/`, p. ej. `haceHoras`), nada de `setState` dentro de efectos.
- Arreglos en `sql` de Drizzle: pasarlos como JSON (`jsonb_array_elements_text(${JSON.stringify(x)}::jsonb)`), no como arreglo JS.
- Cambios de estado de butacas y entradas: UPDATE condicionado (dentro de transacción cuando aplica), nunca leer-y-luego-escribir.
- Las acciones redirigen con `?ok=${Date.now()}` para que cajones y avisos se reinicien.
- Migraciones: editar `db/schema.ts` y correr `npx drizzle-kit generate --name <nombre>`; `scripts/migrar.mjs` las aplica en cada build. Si se agrega una tabla de datos, sumarla al TRUNCATE de `lib/reinicio.ts`.

## Verificar antes de subir

```bash
npx tsc --noEmit && npx eslint app components lib && npm run prueba && npx next build
```

Base local: Postgres en el puerto 5433 (`/var/tmp/anelo-pg/data`), variables en `.env.local`. Pruebas de navegador con Playwright desde el scratchpad.

## Privacidad

No escribir claves ni el correo personal del programador en el repositorio, la guía ni servicios externos. La clave del cliente la entrega el programador en persona.
