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

**Pendiente de esta fase:**
- Editor de planos para salas distintas (hoy existe una plantilla: la sala de 184 butacas).
- Correos al comprador: están programados pero sin probar; requieren una cuenta de Resend (`RESEND_API_KEY` y `CORREO_REMITENTE`). Sin ellas el comprador consulta todo en el enlace de su orden.
- Lector de QR dentro del panel: hoy se escanea con la cámara del teléfono, que abre el enlace de validación.
- Cierre de caja y reportes exportables a Excel.
- Restablecer clave por correo.

## Fase 3 · Escuela
- Niveles, inscripciones en línea
- Fichas de estudiantes y representantes
- Mensualidades automáticas, mora, descuentos
- Portal de representantes, recibos en PDF, recordatorios

**Se entrega:** cobro de inscripciones y mensualidades desde el portal.

## Fase 4 · Protagonistas y cierre
- Fichas de artistas con trayectoria y autorización
- Elenco enlazado en cada función
- Reportes y exportación a Excel
- Guía de primeros pasos, recorridos por pantalla, manual
- Pruebas de punta a punta, capacitación al equipo

**Se entrega:** sistema completo y equipo capacitado.

---

## Decisiones pendientes del cliente

1. ~~Dirección de diseño~~ → elegida A · Telón.
2. **Nombre de la sección de artistas:** Protagonistas (recomendado), Elenco o Nuestros Artistas.
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
