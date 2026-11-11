# Especificación técnica

Complementa a [`PROPUESTA.md`](PROPUESTA.md). Describe cómo se construye.

## 1. Arquitectura

| Capa | Elección | Motivo |
|---|---|---|
| Aplicación | Next.js 16 (App Router, Cache Components), TypeScript, React Server Components | Sitio público rápido y panel en un solo proyecto; despliegue nativo en Vercel |
| Estilos | CSS propio con variables CSS | Los colores y tamaños del panel de Apariencia son variables CSS leídas de la base de datos |
| Base de datos | Neon (Postgres) con Drizzle ORM, driver `pg` y migraciones versionadas | Transacciones reales para las butacas; ramas de Neon para probar sin tocar producción |
| Autenticación | Correo y clave (hash bcrypt), sesión firmada (JWT con `jose`) en cookie httpOnly; bloqueo de 15 minutos tras 5 intentos fallidos | Roles: `master`, `admin`, `vendedor`, `representante` |
| Imágenes | Vercel Blob + `next/image` | Un solo proveedor. Recorte en el navegador al subir (afiche 2:3, carrusel 16:9, retrato 1:1) y tamaños optimizados al servir |
| Correo | Resend | Recibos, entradas, avisos |
| PDF y QR | `@react-pdf/renderer`, `qrcode` | Recibos y entradas |
| PWA | Manifest dinámico + service worker | Instalable; el ícono sale del logo subido en Apariencia |
| Validación | Zod en formularios y acciones del servidor | |
| Pruebas | Vitest (reglas de butacas y pagos), Playwright (compra de punta a punta) | |

**Alternativa para imágenes:** Cloudinary, si la galería crece mucho o se quiere recorte inteligente con detección de rostros. Se puede cambiar sin tocar el resto.

### Estructura del proyecto

```
app/
  (publico)/            inicio, clases, funciones, protagonistas, blog, nosotros, contacto
  (publico)/funciones/[slug]/comprar
  portal/               representantes
  admin/                panel (taquilla, funciones, pagos, estudiantes, ...)
  api/                  subida de imágenes, webhooks, cron
  manifest.ts           manifest PWA generado desde la configuración
components/             interfaz, plano de butacas, recorrido guiado
db/                     esquema Drizzle, migraciones, datos iniciales
lib/                    reglas de negocio (butacas, pagos, mensualidades, permisos)
docs/                   esta documentación y el manual
```

## 2. Modelo de datos (Neon)

Tablas principales. Todas llevan `id`, `created_at`, `updated_at`.

**Acceso**
- `usuarios` — nombre, correo (único), clave_hash, rol, activo, ultimo_ingreso
- `auditoria` — usuario_id, accion, entidad, entidad_id, detalle (jsonb), fecha

**Escuela**
- `niveles` — nombre (Kids, Teen, Teenagers), descripción, horario, monto_inscripcion, monto_mensualidad, activo
- `representantes` — usuario_id, cédula, teléfono, dirección
- `estudiantes` — representante_id, nivel_id, nombres, apellidos, fecha_nacimiento, estado (activo, retirado, egresado), fecha_ingreso, notas
- `inscripciones` — estudiante_id, nivel_id, período, estado (solicitada, aprobada, rechazada), cargo_id
- `cargos` — estudiante_id, tipo (inscripción, mensualidad), período (AAAA-MM), monto, descuento, vence_el, estado (pendiente, por_confirmar, pagado, en_mora, anulado)

**Funciones y taquilla**
- `salas` — nombre, dirección
- `planos` — sala_id, nombre, definición (jsonb: bloques, filas, posiciones)
- `obras` — título, subtítulo, sinopsis, afiche_url, duración, slug
- `funciones` — obra_id, plano_id, fecha_hora, estado (borrador, preventa, a_la_venta, agotada, finalizada, cancelada)
- `zonas` — función_id, nombre (VIP, General), color
- `precios` — zona_id, etapa (preventa, regular), monto, desde, hasta
- `butacas` — función_id, zona_id, número, bloque, fila, posición, estado (libre, apartada, por_confirmar, vendida, bloqueada), orden_id, apartada_hasta
  - **Único:** (función_id, número)
- `ordenes` — función_id, canal (web, taquilla), comprador_nombre, teléfono, correo, vendedor_id, total, estado (apartada, por_confirmar, pagada, vencida, rechazada, en_conflicto, reembolsada), vence_el
- `entradas` — orden_id, butaca_id, código_qr (único), usada_el, validada_por
- `elenco` — obra_id, estudiante_id (o nombre libre para invitados), personaje, descripción, orden

**Pagos**
- `pagos` — origen (orden o cargo), método (pago_movil, transferencia, zelle, efectivo, punto), referencia, monto, moneda, tasa, captura_url, estado (reportado, confirmado, rechazado, reembolsado), revisado_por, motivo
- `recibos` — pago_id, número correlativo, pdf_url

**Contenido**
- `entradas_blog` — título, slug, extracto, contenido, portada_url, categoría, estado (borrador, publicada), destacada, orden_destacada, publicada_el, autor_id
- `fichas_artista` — estudiante_id (único), publicada, autorización_representante_el, nombre_artístico, bio, gustos (text[]), foto_url, galería (jsonb)
- `carrusel` — imagen_url, título, texto, enlace, orden, activo
- `configuracion` — clave, valor (jsonb): tema (colores, tipografía, tamaño), logo, datos de pago, tasa, minutos de apartado, textos
- `progreso_guia` — usuario_id, pasos completados

La trayectoria de un artista no se guarda aparte: se consulta desde `elenco` unido a `obras` y `funciones`.

## 3. Apartado de butacas

Es la parte más delicada del sistema. La regla: **la base de datos decide, no el navegador.**

**Apartar**
```sql
UPDATE butacas
SET estado = 'apartada', orden_id = $orden, apartada_hasta = now() + interval '15 minutes'
WHERE funcion_id = $funcion AND numero = ANY($numeros)
  AND (estado = 'libre' OR (estado = 'apartada' AND apartada_hasta < now()))
RETURNING numero;
```
Dentro de una transacción. Si devuelve menos filas que las pedidas, se revierte y se le dice al comprador cuáles ya no están. Dos personas tocando la misma butaca a la vez: solo una gana.

**Vencimiento**
- No depende de un proceso en segundo plano: toda consulta trata una butaca `apartada` con `apartada_hasta < now()` como libre. Así funciona aunque nada se ejecute.
- Una tarea programada limpia los estados vencidos y marca las órdenes como `vencida` para mantener los reportes ordenados.
- El reloj en pantalla usa la hora del servidor.

**Reportar pago**
- Si el apartado sigue vigente: butacas → `por_confirmar` (sin vencimiento), orden → `por_confirmar`.
- Si venció y las butacas siguen libres: se vuelven a apartar para esa orden y continúa.
- Si venció y alguna ya no está: orden → `en_conflicto`. Se avisa al comprador (pantalla y correo) con las opciones **elegir otras butacas** o **pedir reembolso**, y aparece resaltada en la bandeja de Pagos.

**Confirmar pago**
- Transacción: pago → `confirmado`, butacas → `vendida`, se generan entradas con QR, se envía correo.

**Taquilla presencial**
- Usa la misma operación de apartar, de modo que no puede vender una butaca apartada o por confirmar. La venta en efectivo confirma en el mismo paso.

**Plano en vivo**
- El plano se refresca cada pocos segundos mientras está abierto, para ver butacas que otros apartan o liberan.

**Entradas disponibles**
- `libres = total − vendidas − por_confirmar − apartadas vigentes − bloqueadas`. Es el número que muestra cada afiche.

## 4. Mensualidades

- Una tarea mensual crea el cargo de cada estudiante activo según su nivel, con descuentos aplicados.
- Pasada la fecha de vencimiento, el cargo pasa a `en_mora`.
- Recordatorio por correo antes del vencimiento y al entrar en mora.
- Al confirmarse un pago se emite el recibo con número correlativo, sin saltos.

## 5. Apariencia configurable

- El tema se guarda en `configuracion` como tokens: fondo, superficie, texto, acento, acento secundario, tipografía de títulos, tamaño base, radio de esquinas.
- El layout los inyecta como variables CSS; no hace falta volver a desplegar para cambiar colores.
- Las tres direcciones (Telón, Foco, Marquesina) vienen como plantillas.
- El editor calcula el contraste y avisa si el texto queda por debajo de 4.5:1.

## 6. Seguridad y privacidad

- Permisos verificados en el servidor en cada acción, no solo ocultando botones.
- Claves con bcrypt; límite de intentos de ingreso; restablecimiento por correo (Fase 2).
- Subida de archivos: solo imágenes, tamaño máximo, nombre aleatorio.
- Capturas de pago y datos de estudiantes no son públicos: se sirven solo a usuarios con permiso.
- Datos de menores: la ficha pública exige autorización registrada; nunca expone contacto, documento, fecha de nacimiento ni dirección.
- Historial de acciones sensibles: confirmaciones, rechazos, reembolsos, liberaciones manuales, cambios de precio.
- Secretos solo en variables de entorno de Vercel; nunca en el repositorio.

## 7. Variables de entorno

```
DATABASE_URL            conexión a Neon
AUTH_SECRET             firma de sesiones
BLOB_READ_WRITE_TOKEN   Vercel Blob
RESEND_API_KEY          correo
CRON_SECRET             protege las tareas programadas (Fase 2)
MASTER_EMAIL            correo del usuario master inicial
MASTER_PASSWORD         clave del usuario master inicial (solo se usa en el primer ingreso)
```

## 8. Entornos y despliegue

- `main` → producción en Vercel con la rama principal de Neon.
- Cada pull request → vista previa en Vercel con una rama propia de Neon.
- Migraciones aplicadas en el despliegue.

## 9. Rendimiento

- Páginas públicas generadas de forma estática. Cada lectura lleva una etiqueta de caché (`config`, `carrusel`, `blog`, `funciones`, `niveles`) que el panel invalida al guardar, así el cambio se ve de inmediato.
- Imágenes en formatos modernos y tamaños por dispositivo; carga diferida fuera de la primera pantalla.
- Objetivo: primera pantalla útil en menos de 2,5 s en un teléfono de gama media con datos móviles.

## 10. Tasa del BCV

`lib/tasa.ts` obtiene la tasa oficial (bolívares por dólar) una vez al día y la guarda en la tabla `tasas`. Orden de búsqueda:

1. Tasa manual, si el administrador fijó una en Cobros y tasa.
2. La tasa ya guardada hoy (fecha de Venezuela).
3. La portada de `bcv.org.ve`.
4. DolarApi (`ve.dolarapi.com/v1/dolares/oficial`), que publica la tasa oficial del BCV.
5. La última tasa guardada, marcada como desactualizada.

El sitio del BCV suele servir su certificado sin la cadena completa, y entonces la conexión segura falla. No se desactiva la verificación de certificados (una tasa alterada es dinero): en ese caso se usa DolarApi. La tasa queda fijada en cada orden al momento de apartar.

## 11. Bonos de regalo

Un bono tiene un código y un saldo en dólares. Al reportar el pago se descuenta del bono lo que cubra; si cubre todo, la orden queda pagada sin revisión. Si la orden se rechaza, se reembolsa o se anula, el saldo vuelve al bono. Todo ocurre en la misma transacción que el cambio de estado de las butacas.

## 12. Pruebas

`npm run prueba` ejecuta `pruebas/taquilla.prueba.ts` contra la base indicada en `DATABASE_URL` (**borra los datos de taquilla; usar solo una base de pruebas**). Cubre: carrera por la misma butaca, vencimiento, reporte tardío, conflicto, cambio de butacas, reembolso, bonos, cortesías, bloqueos y validación en puerta.
