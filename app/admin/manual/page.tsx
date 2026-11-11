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
        <h2>Anunciar una función</h2>
        <ol>
          <li>Entra a Funciones y llena el formulario Nueva función.</li>
          <li>Sube el afiche: se recorta a formato vertical de cartelera.</li>
          <li>Pon el estado en Preventa o A la venta para que aparezca.</li>
          <li>Cuando pase la función, cámbiala a Finalizada: pasa al archivo de funciones pasadas.</li>
        </ol>
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
