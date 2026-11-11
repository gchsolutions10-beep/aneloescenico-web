# Propuesta · Sitio web y sistema de gestión para A-Nelo Escénico

**Cliente:** A-Nelo | Escuela de Teatro · Acarigua
**Niveles:** Kids · Teen · Teenagers
**Fecha:** noviembre 2026

La versión visual de esta propuesta, con prototipo interactivo, está en [`propuesta/index.html`](../propuesta/index.html).

---

## 1. Objetivo

Un solo sistema que resuelve tres necesidades de la escuela:

1. **Mostrar** la escuela con un sitio de carácter artístico: clases, funciones, artistas y novedades.
2. **Vender entradas** con plano de butacas, en línea y en taquilla, sin vender dos veces la misma butaca.
3. **Administrar** inscripciones, estudiantes y mensualidades, con recibos y control de pagos.

Todo se usa desde el teléfono y se puede instalar como app con el logo de la escuela.

## 2. Referencias de diseño

| Sitio | Qué tomamos |
|---|---|
| [National Theatre](https://www.nationaltheatre.org.uk) (Londres) | Fondo negro, tipografía grande, fotografía de escena a todo el ancho. Base de la dirección B. |
| [Teatro Real](https://www.teatroreal.es) (Madrid) | Elegancia clásica con serif y dorados, calendario de funciones claro. Base de la dirección A. |
| [Cirque du Soleil](https://www.cirquedusoleil.com) | Cada espectáculo con su afiche y color; sentido de espectáculo. Base de la dirección C. |
| [Stagecoach Performing Arts](https://www.stagecoach.co.uk) | Cómo una escuela para niños presenta niveles por edad y lleva a inscribir. |
| [Cinépolis](https://cinepolis.com) | Cartelera de afiches verticales y selección de butacas con reloj. Modelo de la taquilla. |

Los diseños propuestos son originales; de cada referencia se toma un patrón, no su apariencia.

## 3. Tres direcciones de diseño

| | A · Telón | B · Foco | C · Marquesina |
|---|---|---|---|
| Carácter | Clásico, solemne | Contemporáneo, editorial | Festivo, juvenil |
| Colores | Negro vino, rojo terciopelo, oro | Negro y blanco del logo, una luz ámbar | Azul noche, amarillo bombilla, magenta |
| Títulos | Serif con cursivas (Bodoni Moda) | Condensada en mayúsculas (Big Shoulders) | Letra de cartel (Limelight) |
| Recurso propio | Telón a los lados del escenario | Haz de luz y fotos en blanco y negro | Marco de bombillas |
| Ideal si | Se quiere transmitir tradición | Se quiere que manden las fotos | Se quiere hablarle a los chicos |

**Recomendación:** A · Telón como base (responde al pedido de colores oscuros con telón), tomando de B la fotografía grande. Como el panel permite cambiar colores y tamaño de letra, la elección no es definitiva.

## 4. Sitio público

### Menú
`Inicio · Clases Actuación · Funciones de Teatro · Protagonistas · Blog · Sobre nosotros · Contáctanos`

- Fijo en la parte superior. La opción bajo el cursor o seleccionada crece ligeramente.
- Clases Actuación y Funciones despliegan sus opciones (Kids, Teen, Teenagers, Inscripciones; Cartelera, Funciones pasadas).
- En móvil se convierte en un menú desplegable de pantalla completa.
- A la derecha: botón **Ingresar** (representantes y equipo).

### Inicio
1. **Carrusel** de fotos grandes de clases, a todo el ancho, con título, texto y botón por foto. Se administra desde el panel (orden, texto, enlace).
2. **Novedades:** las entradas del blog marcadas como destacadas (máximo recomendado: 3 a 6).
3. **Cartelera:** próximas funciones con afiche, fecha y entradas disponibles.
4. **Niveles:** Kids, Teen, Teenagers con acceso a inscripción.
5. **Protagonistas** destacados y cierre con contacto, WhatsApp, Instagram y ubicación.

### Clases Actuación
Una página por nivel: a quién va dirigido, horarios, profesor, qué se aprende, monto de inscripción y mensualidad, botón **Inscribir**.

### Funciones de Teatro
- **Cartelera tipo cine:** afiches verticales 2:3. La imagen que se sube se recorta sola al formato, con vista previa para elegir el encuadre.
- Cada afiche muestra fecha, estado (preventa, a la venta, agotada) y **cuántas entradas quedan**.
- **Página de la función:** sinopsis, fecha, hora, lugar, duración, precios por zona y por etapa (preventa y venta regular), plano de butacas, y **carrusel del elenco** con foto, nombre y personaje. Si el actor tiene ficha publicada, enlaza a ella.
- **Funciones pasadas:** archivo con fotos y elenco.

### Compra de entradas
1. El comprador toca las butacas en el plano. Se puede ampliar con dos dedos.
2. Al elegir la primera butaca empieza un **apartado de 15 minutos** con reloj visible.
3. Deja nombre, teléfono y correo. No necesita crear cuenta.
4. Ve los datos de pago, paga por su banco y **reporta el pago**: método, referencia y captura.
5. Las butacas pasan a **por confirmar**. El reloj se detiene.
6. Un administrador o vendedor **confirma** el pago. El comprador recibe sus entradas con **código QR**.
7. Si el pago se rechaza, se le avisa con el motivo y las butacas se liberan.

Si pasan los 15 minutos sin reportar pago, las butacas quedan libres automáticamente.

### Reglas ante conflictos
- Una butaca apartada o por confirmar está bloqueada para todos, incluida la taquilla presencial. Así no se vende dos veces.
- **Caso límite:** el comprador paga pero reporta después de vencido su apartado, y la butaca ya fue vendida a otra persona. El sistema lo detecta al reportar o al confirmar, y le avisa por pantalla y por correo con dos opciones:
  - **elegir otras butacas** disponibles de igual o menor valor (o pagar la diferencia), o
  - **solicitar reembolso**, que el administrador marca como devuelto con su referencia.
- El administrador puede liberar manualmente un apartado o extenderlo. Queda registrado quién lo hizo.

### Protagonistas
Sección de artistas de la escuela. Se recomienda mantener el nombre **Protagonistas**; alternativas: *Elenco*, *Nuestros Artistas*.

Cada ficha tiene: foto principal y galería, nivel, desde cuándo está en la escuela, qué le gusta, una frase propia y **trayectoria**: obras en las que participó, con personaje, descripción y año. La trayectoria se arma sola a partir del elenco de cada función.

Como son menores de edad:
- La ficha se publica solo si el administrador lo activa en la ficha del estudiante.
- Se registra la **autorización del representante** con fecha.
- Se puede mostrar solo el nombre de pila o un nombre artístico.
- Nunca se muestran datos de contacto, cédula, fecha de nacimiento ni dirección.

### Blog
Entradas con portada, categoría y fecha. Se publican desde el panel y se guardan en Neon. Cada entrada puede marcarse como **destacada en Inicio**. Se puede guardar como borrador y programar.

### Sobre nosotros y Contáctanos
Historia, director general, cátedra. Formulario de contacto, WhatsApp, Instagram (@aneloescenico), mapa de ubicación.

## 5. Portal de representantes

Acceso con correo y clave.

- **Inscripción en línea:** datos del estudiante y del representante, nivel, autorizaciones. El administrador la aprueba.
- **Mis estudiantes:** un representante puede tener varios.
- **Estado de cuenta:** inscripción y mensualidades, cada una como pagada, pendiente, por confirmar o en mora.
- **Reportar pago:** método, referencia y captura.
- **Recibos:** al confirmarse el pago se genera un recibo numerado en PDF, descargable y enviado por correo.
- **Recordatorios** antes del vencimiento y aviso de mora.
- **Mis entradas** compradas con ese correo.

## 6. Panel de administración

### Roles

| Acción | Master | Administrador | Vendedor | Representante |
|---|:-:|:-:|:-:|:-:|
| Vender entradas en taquilla | Sí | Sí | Sí | — |
| Confirmar o rechazar pagos | Sí | Sí | Sí | — |
| Validar entradas en la puerta (QR) | Sí | Sí | Sí | — |
| Crear funciones, planos y precios | Sí | Sí | — | — |
| Estudiantes, inscripciones, mensualidades | Sí | Sí | — | Solo los suyos |
| Blog y Protagonistas | Sí | Sí | — | — |
| Apariencia (colores, letra, logo) | Sí | Sí | — | — |
| Reportes | Sí | Sí | Su propia caja | — |
| Usuarios e historial de acciones | Sí | — | — | — |

El usuario **Master** se crea en la instalación y no se puede eliminar.

### Módulos

1. **Inicio:** pagos por confirmar, ventas del día, próximas funciones, mensualidades por vencer, guía de primeros pasos.
2. **Taquilla:** pantalla de venta presencial pensada para tableta o teléfono. Elegir función, tocar butacas, cobrar (efectivo, Pago Móvil, punto, Zelle), entregar entrada impresa o por WhatsApp/correo. También entradas de cortesía.
3. **Funciones:** crear y editar función, afiche con recorte automático, fechas, precios por zona y por etapa, elenco, y **editor del plano de butacas** (bloques, filas, numeración, zonas). El plano de la sala actual de 184 butacas viene precargado y se puede reutilizar.
4. **Pagos:** bandeja única de pagos reportados (entradas, inscripciones, mensualidades) con la captura a la vista. Confirmar, rechazar con motivo, o marcar reembolso.
5. **Estudiantes:** ficha con datos, representante, nivel, estado, historial de pagos, obras y el interruptor **Publicar en Protagonistas**.
6. **Inscripciones:** solicitudes recibidas, aprobar o rechazar, períodos de inscripción.
7. **Mensualidades:** generación mensual automática por nivel, montos, becas o descuentos, mora.
8. **Blog:** editor, borradores, destacados para Inicio.
9. **Protagonistas:** contenido de cada ficha y orden de aparición.
10. **Apariencia:** logo, colores (con las tres direcciones como punto de partida), tamaño de letra, tipografía de títulos, fotos del carrusel. Vista previa antes de guardar. El sistema avisa si un color deja el texto ilegible.
11. **Configuración:** datos de la escuela, métodos y datos de pago, tasa de cambio, textos de correos, minutos de apartado.
12. **Usuarios:** crear administradores y vendedores, desactivar, restablecer clave.
13. **Reportes:** ventas por función y por vendedor, ocupación, cobranza y mora. Exportables a Excel.
14. **Historial:** quién hizo qué y cuándo.
15. **Manual:** ayuda por módulo, siempre accesible.

### Guía de primeros pasos y manual
- Al primer ingreso, una lista de pasos con avance (logo y colores → niveles y montos → datos de pago → primera función → primera novedad → invitar vendedor → instalar la app).
- Cada pantalla tiene un botón **¿Cómo se usa?** con un recorrido señalando cada parte.
- El vendedor tiene su propia guía corta: vender una entrada y confirmar un pago.
- El manual completo queda también en el repositorio.

## 7. Funciones adicionales recomendadas

- **Validación en puerta:** leer el QR con la cámara del teléfono; marca la entrada como usada y evita duplicados.
- **Entradas de cortesía** y butacas bloqueadas para invitados o equipo técnico.
- **Códigos de descuento** y etapas de precio automáticas por fecha.
- **Varias fechas** para una misma obra.
- **Lista de asistencia** por clase (opcional, fase posterior).
- **Becas y descuentos por hermanos.**
- **Cierre de caja** del vendedor al final de la jornada.
- **SEO y vista previa** al compartir funciones por WhatsApp e Instagram.
- **Respaldo** de la base de datos (Neon conserva historial para restaurar).

## 8. Pagos

La propuesta parte de **pagos reportados y confirmados por el equipo**, que es como trabaja hoy la escuela y no genera comisiones: Pago Móvil, transferencia, Zelle y efectivo en taquilla. Los precios se manejan en dólares con opción de mostrar el equivalente en bolívares según la tasa que configure el administrador.

Si más adelante se quiere cobro automático con pasarela, el sistema queda preparado para añadirla.

## 9. App instalable

El sitio es una PWA: desde el navegador se elige *Agregar a pantalla de inicio* y queda como app con el logo y nombre de la escuela. No requiere tiendas de aplicaciones. El logo de la app se cambia desde Apariencia.

## 10. Accesibilidad y móvil

- Diseño pensado primero para el teléfono; botones y butacas con tamaño cómodo para el dedo.
- Contraste suficiente sobre fondos oscuros; tamaño de letra ajustable.
- Navegable con teclado y lector de pantalla; el plano de butacas tiene también modo lista ("mejor butaca disponible").
- Respeta la preferencia de reducir animaciones.

## 11. Costos de operación

Vercel, Neon, Vercel Blob y Resend tienen planes gratuitos suficientes para desarrollar y probar. Para operar un sitio comercial, Vercel requiere su plan de pago. Los precios cambian; se confirman con el cliente antes de publicar. El dominio se paga aparte, una vez al año.

## 12. Qué no incluye esta propuesta

- Pasarela de cobro automático con tarjeta (queda preparada, no incluida).
- Facturación fiscal. Los recibos son comprobantes internos de la escuela.
- Producción de fotos, videos o textos.
