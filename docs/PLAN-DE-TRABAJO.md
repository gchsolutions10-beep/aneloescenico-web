# Plan de trabajo

Cada fase termina con algo publicado en Vercel que el cliente puede probar.

## Fase 0 · Aprobación (completa)
- [x] Propuesta visual con tres direcciones de diseño
- [x] Propuesta funcional y especificación técnica
- [x] Cliente elige dirección de diseño: **A · Telón**
- [ ] Cliente responde el resto de decisiones pendientes y entrega el material

## Fase 1 · Sitio público y apariencia (construida)
- [x] Proyecto Next.js, conexión a Neon, migraciones automáticas
- [x] Diseño Telón, menú, pie, versión móvil
- [x] Inicio: carrusel, novedades, cartelera (solo vista), niveles
- [x] Clases Actuación, Sobre nosotros, Contáctanos (con bandeja de mensajes)
- [x] Blog con destacados
- [x] Ingreso master, Apariencia (logo, colores, letra), Carrusel, Niveles, Funciones, Datos de la escuela
- [x] Guía de primeros pasos y manual
- [x] App instalable (PWA)
- [ ] Publicar en Vercel con Neon y Blob (lo hace el dueño de las cuentas; ver [`DESPLIEGUE.md`](DESPLIEGUE.md))
- [ ] Cargar contenido real: logo en alta, fotos del carrusel, textos, montos

**Queda para fases siguientes:** la página de Protagonistas muestra un aviso de "en preparación"; la cartelera es informativa (sin venta); el botón Inscribir lleva a Contáctanos; solo existe el usuario master (administradores y vendedores se crean en la Fase 2).

## Fase 2 · Funciones y taquilla (construida)
- [x] Plano de la sala de 184 butacas (VIP y General) por función
- [x] Precios en dólares por zona, con precio de preventa hasta una fecha y hora
- [x] Cobro en bolívares a la tasa oficial del BCV del día, con tasa manual de respaldo
- [x] Compra en línea: plano táctil en vivo, apartado de 15 minutos con reloj
- [x] Pago Móvil y transferencia con referencia y captura; bonos de regalo
- [x] Bandeja de Pagos: confirmar, rechazar, reembolsar
- [x] Conflictos: quien paga tarde y pierde la butaca elige otras o pide reembolso
- [x] Entradas con código QR y validación en puerta (una sola vez)
- [x] Taquilla presencial, cortesías, butacas bloqueadas
- [x] Elenco en carrusel en la página de la función; entradas disponibles en cada afiche
- [x] Usuarios Administrador y Vendedor
- [x] Pruebas automáticas de las reglas (`npm run prueba`)

**Añadido después:**
- [x] Editor de salas: el administrador crea salas nuevas (zonas, bloques y filas) desde el panel.
- [x] Correo configurable desde el panel (clave de Resend y remitente, con botón de prueba).

**Pendiente de esta fase:**
- Probar el envío real de correos: requiere una cuenta de Resend con un dominio verificado.
- Lector de QR dentro del panel: por decisión del cliente se mantiene el escaneo con la cámara del teléfono.
- Cierre de caja y reportes exportables a Excel (pasan a la Fase 4).
- Restablecer clave por correo.

## Fase 3 · Escuela (construida)
- [x] Cuenta de representante y solicitud de inscripción en línea
- [x] Bandeja de Inscripciones: aprobar, no admitir, inscribir en persona
- [x] Ficha del estudiante: datos, representante, nivel, beca, estado, notas internas
- [x] Mensualidades automáticas por nivel, con beca aplicada y sin duplicados
- [x] Portal del representante: estudiantes, estado de cuenta, reporte de pago en bolívares a tasa BCV
- [x] Cobranza: confirmar o rechazar pagos, lista de mora con recordatorio por WhatsApp
- [x] Cobro en la escuela (efectivo, punto) con recibo en el acto
- [x] Recibos numerados de corrido, imprimibles o guardables como PDF desde el navegador
- [x] Cargos adicionales (vestuario, talleres) y anulación de cargos
- [x] Tarea diaria en Vercel: genera mensualidades y envía recordatorios por correo
- [x] Pruebas automáticas de las reglas (`npm run prueba`)

**Notas:**
- El recibo es una página imprimible; el PDF se obtiene con "Guardar como PDF" del navegador.
- Los recordatorios por correo solo salen si el correo está configurado, y la tarea diaria solo corre una vez desplegado en Vercel con `CRON_SECRET`. Ninguno de los dos se pudo probar aquí.
- Sin correo, el recordatorio se hace con el botón de WhatsApp de la lista de mora.
- No hay verificación del correo al crear una cuenta de representante ni restablecimiento de clave por correo; un administrador puede dar acceso desde la ficha.

## Fase 4 · Protagonistas y cierre (construida)
- [x] Fichas de Protagonistas: foto, frase, gustos, galería y trayectoria armada desde el elenco de cada función
- [x] Doble condición para publicar: marcada como publicada y autorizada por el representante (desde su portal o registrada en la escuela); retirar la autorización la oculta de inmediato
- [x] El elenco de cada función enlaza a la ficha del artista
- [x] Cierre de caja por día, por persona y por método (el vendedor ve solo el suyo)
- [x] Reportes por rango de fechas: totales, entradas por función, por persona, estudiantes y mora
- [x] Descargas para Excel (CSV): movimientos, ventas por función y estudiantes con deudas
- [x] Claves: cambiar la propia, que el administrador se la cambie a un representante, y "olvidé mi clave" con enlace por correo de un solo uso
- [x] Manual del panel actualizado con todas las pantallas

**Notas:**
- Las descargas son archivos CSV que Excel abre directamente; no son libros .xlsx con formato.
- "Olvidé mi clave" necesita el correo configurado. Sin él, la pantalla lo dice y el administrador cambia la clave desde la ficha del estudiante. El envío real del enlace no se pudo probar; el resto del flujo sí.
- La capacitación al equipo y la carga de contenido real quedan para después del despliegue.

## Pendiente general
- Desplegar en Vercel con Neon y Blob y repetir las pruebas allí.
- Configurar Resend y probar los correos (entradas, recibos, recordatorios, recuperación de clave).
- Cargar contenido real: logo en alta, fotos, niveles con horarios y montos, datos de pago.
- Lector de QR dentro del panel (hoy se usa la cámara del teléfono, por decisión del cliente).
- Bonos de regalo aplicables a mensualidades (hoy solo a entradas).

---

## Decisiones pendientes del cliente

1. ~~Dirección de diseño~~ → elegida A · Telón.
2. ~~Nombre de la sección de artistas~~ → Protagonistas.
3. ~~Métodos de pago~~ → Pago Móvil, transferencia y bonos de regalo en línea; en taquilla además efectivo y punto. Falta cargar los datos bancarios en Cobros y tasa.
4. ~~Moneda~~ → precios en dólares, cobro en bolívares a tasa BCV del día.
5. **Política de reembolso** cuando hay conflicto de butacas o se cancela una función.
6. **Máximo de entradas** por compra (la propuesta asume 8).
7. **Fecha de vencimiento** de la mensualidad y si se cobra recargo por mora.
8. **Dominio:** si ya existe o hay que registrarlo.

## Material que se necesita

- Logo en alta resolución (idealmente vectorial)
- Fotos grandes y horizontales de clases para el carrusel (mínimo 1920 px de ancho)
- Foto y reseña del director y de la cátedra
- Niveles: edades, horarios, montos de inscripción y mensualidad
- Texto de Sobre nosotros
- Dirección, teléfono, WhatsApp, redes
- Afiche y datos de la próxima función
- Lista inicial de estudiantes, si se quiere cargar de una vez (Excel)

## Cuentas necesarias

A nombre del cliente, para que sea dueño de todo: GitHub, Vercel, Neon, Resend y el registrador del dominio.
