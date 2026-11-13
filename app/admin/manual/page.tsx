export const metadata = { title: "Manual" };

export default function Manual() {
  return (
    <div className="manual" style={{ display: "grid", gap: 22 }}>
      <h1>Manual del panel</h1>
      <p className="tenue" style={{ margin: 0 }}>Cada pantalla tiene además su propia ayuda en “¿Cómo se usa esta pantalla?”.</p>

      <section className="panel">
        <h2>Lo básico</h2>
        <ul>
          <li>Todo lo que guardas aparece en el sitio de inmediato.</li>
          <li>Las fotos se ajustan solas al tamaño correcto al subirlas. No hace falta editarlas antes.</li>
          <li>El panel funciona igual en el teléfono: el menú queda arriba y se desliza hacia los lados.</li>
          <li>Al terminar en un equipo compartido, pulsa Salir.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Inicio del sitio</h2>
        <ol>
          <li><b>Carrusel:</b> las fotos grandes de portada. Sube, ordena y oculta fotos desde Carrusel.</li>
          <li><b>Novedades:</b> salen las entradas del Blog marcadas como Destacada.</li>
          <li><b>Cartelera:</b> salen las funciones en Preventa o A la venta.</li>
          <li><b>Niveles:</b> salen los niveles marcados como visibles.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Publicar una novedad</h2>
        <ol>
          <li>Entra a Blog y pulsa Nueva entrada.</li>
          <li>Escribe título, resumen y contenido. Sube una portada.</li>
          <li>Marca Publicada. Si quieres que salga en Inicio, marca también Destacada.</li>
          <li>Pulsa Guardar. Para retirarla, desmarca Publicada.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Poner una función a la venta</h2>
        <ol>
          <li>En Funciones, crea la función con su afiche, fecha, hora y lugar.</li>
          <li>En Venta y butacas, crea el plano de la sala y revisa los precios de preventa y regular de cada zona.</li>
          <li>Indica hasta qué fecha y hora rige la preventa. Pasado ese momento se cobra el precio regular automáticamente.</li>
          <li>Bloquea las butacas que no se venden y agrega el elenco.</li>
          <li>Cambia el estado a A la venta. Cuando pase la función, cámbiala a Finalizada.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Cómo compra una persona en línea</h2>
        <ol>
          <li>Toca sus butacas en el plano y pulsa Apartar. Quedan reservadas 15 minutos, con un reloj a la vista.</li>
          <li>Ve el total en dólares y en bolívares a la tasa BCV del día, y los datos de Pago Móvil o transferencia.</li>
          <li>Paga desde su banco y reporta la referencia (y la captura, si quiere). Puede usar un bono de regalo.</li>
          <li>Sus butacas quedan “por confirmar” hasta que el equipo verifique el pago en Pagos.</li>
          <li>Al confirmarse, en el mismo enlace aparecen sus entradas con código QR.</li>
          <li>Si no reporta el pago en 15 minutos, las butacas se liberan solas.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Confirmar pagos</h2>
        <ol>
          <li>Entra a Pagos. Arriba están los que esperan atención.</li>
          <li>Busca en el banco la referencia y el monto en bolívares.</li>
          <li>Confirmar pago emite las entradas. Rechazar libera las butacas y le avisa al comprador el motivo.</li>
          <li>Si alguien pagó tarde y su butaca ya se vendió, el sistema se lo dice y le deja elegir otras butacas o pedir reembolso. El reembolso lo marca un administrador después de devolver el dinero.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Vender en la sala y dar entrada</h2>
        <ol>
          <li>En Taquilla, toca las butacas, elige la forma de pago y pulsa Vender. Abre las entradas para imprimirlas o envíalas por WhatsApp.</li>
          <li>El comprador puede descargar sus entradas en PDF (una página por entrada) para mostrarlas sin internet o imprimirlas. Desde la taquilla también hay un botón Descargar PDF.</li>
          <li>En la puerta, escanea el QR con la cámara del teléfono (con la sesión iniciada) y pulsa Dar entrada. Cada entrada sirve una sola vez.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Bonos de regalo</h2>
        <ul>
          <li>En Bonos de regalo generas un código con un monto en dólares y se lo entregas a la persona.</li>
          <li>Ella lo escribe al pagar. Si cubre todo, recibe sus entradas al instante; si no, paga la diferencia.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Salas</h2>
        <ul>
          <li>En Salas creas el plano de cada lugar donde se presenten: zonas de precio, bloques y filas. Los números de butaca se asignan solos.</li>
          <li>Al poner una función a la venta eliges su sala. Cada función guarda su propia copia.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Inscripciones y estudiantes</h2>
        <ol>
          <li>El representante crea su cuenta en el sitio y envía la solicitud. Llega a Inscripciones.</li>
          <li>Al aprobarla, el estudiante queda activo y se generan su inscripción y la mensualidad del mes.</li>
          <li>Si se inscribe en la escuela, usa Inscribir en persona y luego dale acceso al portal desde su ficha.</li>
          <li>En la ficha cambias nivel, beca y estado, agregas cargos (vestuario, talleres) y cobras en persona.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Mensualidades y cobranza</h2>
        <ol>
          <li>Cada mes se genera sola la mensualidad de cada estudiante activo, con su beca aplicada. El día de vencimiento se fija en Cobros y tasa.</li>
          <li>El representante la paga desde su portal y reporta la referencia. Tú la confirmas en Cobranza y se emite el recibo numerado.</li>
          <li>Pasado el vencimiento, lo no pagado aparece En mora, con un botón para recordarle por WhatsApp.</li>
          <li>Con el correo configurado, el sitio envía recordatorios tres días antes del vencimiento y al entrar en mora.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Protagonistas</h2>
        <ol>
          <li>En Protagonistas, abre la ficha del estudiante: foto, frase, lo que le gusta, galería.</li>
          <li>Para que se vea en el sitio hacen falta dos cosas: marcarla como publicada y la autorización del representante (la da él en su portal, o la registras tú si firmó una planilla).</li>
          <li>La trayectoria se llena sola al agregarlo como estudiante en el elenco de una función.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Cierre de caja y reportes</h2>
        <ul>
          <li><b>Cierre de caja:</b> el dinero confirmado en un día, por persona y por método. El vendedor ve solo el suyo.</li>
          <li><b>Reportes:</b> totales por rango de fechas, entradas por función y estudiantes con sus deudas. Cada reporte se descarga para abrirlo en Excel.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Borrar datos de prueba</h2>
        <ul>
          <li>Borrar una función elimina también sus compras, pagos, entradas, butacas, elenco y fotos. Los bonos usados recuperan su saldo. Antes de borrar, el aviso dice cuántas entradas y cuánto dinero tiene.</li>
          <li>Para una función real que ya pasó, no la borres: cámbiala a Finalizada para conservarla en los reportes.</li>
          <li>Al borrar una foto del carrusel, una entrada del blog, un actor o una ficha, sus imágenes se borran del almacenamiento si nada más las usa.</li>
          <li>En Datos de la escuela → Archivos guardados puedes borrar las fotos que quedaron sin uso.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Claves</h2>
        <ul>
          <li>Cada quien cambia su clave en Mi clave.</li>
          <li>Si un representante olvida la suya, puede pedir un enlace por correo desde la pantalla de ingreso (requiere el correo configurado), o se la cambias tú desde la ficha de su estudiante.</li>
          <li>Las claves del equipo las cambia el master en Usuarios.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Cambiar colores y letra</h2>
        <ol>
          <li>Entra a Apariencia.</li>
          <li>Parte de una plantilla (Telón, Foco o Marquesina) o cambia color por color.</li>
          <li>Si aparece un aviso de legibilidad, corrige ese color antes de guardar.</li>
          <li>Para volver al diseño original, pulsa la plantilla Telón y guarda.</li>
        </ol>
      </section>

      <section className="panel" id="app">
        <h2>Instalar la app en el teléfono</h2>
        <ul>
          <li><b>Android (Chrome):</b> abre el sitio, toca los tres puntos y elige “Agregar a pantalla principal” o “Instalar app”.</li>
          <li><b>iPhone (Safari):</b> abre el sitio, toca Compartir y elige “Agregar a inicio”.</li>
          <li><b>Computadora (Chrome o Edge):</b> pulsa el ícono de instalar en la barra de direcciones.</li>
          <li>El ícono de la app es el logo que subiste en Apariencia.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Mensajes</h2>
        <ul>
          <li>Lo que escriben en Contáctanos llega a Mensajes.</li>
          <li>Desde cada mensaje puedes responder por WhatsApp o correo con un toque.</li>
        </ul>
      </section>
    </div>
  );
}
