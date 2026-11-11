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
