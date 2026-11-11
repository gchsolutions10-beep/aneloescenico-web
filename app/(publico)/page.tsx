import Link from "next/link";
import Carrusel from "@/components/Carrusel";
import { Afiche, TarjetaEntrada } from "@/components/Piezas";
import { getCarrusel, getConfig, getCupos, getFunciones, getNiveles, getNovedades } from "@/lib/datos";

export default async function Inicio() {
  const [{ tema, escuela }, slides, novedades, { proximas }, niveles, cupos] = await Promise.all([
    getConfig(), getCarrusel(), getNovedades(), getFunciones(), getNiveles(), getCupos(),
  ]);

  return (
    <>
      {slides.length > 0 ? (
        <Carrusel slides={slides} conTelon={tema.mostrarTelon} />
      ) : (
        <section className={`escena sin-fotos${tema.mostrarTelon ? " con-telon" : ""}`}>
          <div className="diapositiva activa">
            <div className="contenedor">
              <div className="texto">
                <span className="ceja">Formación teatral · {escuela.ciudad}</span>
                <h1>Un escenario para <em>pequeños y grandes</em> artistas</h1>
                <p>{escuela.descripcion}</p>
                <Link className="boton" href="/clases">Conoce las clases</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {novedades.length > 0 && (
        <section className="seccion">
          <div className="contenedor">
            <div className="cabecera-seccion">
              <div><span className="ceja">Lo último de la escuela</span><h2>Novedades</h2></div>
              <Link href="/blog">Ir al blog →</Link>
            </div>
            <div className="rejilla">{novedades.map((e) => <TarjetaEntrada key={e.id} e={e} />)}</div>
          </div>
        </section>
      )}

      {proximas.length > 0 && (
        <section className="seccion">
          <div className="contenedor">
            <div className="cabecera-seccion">
              <div><span className="ceja">En cartelera</span><h2>Funciones de Teatro</h2></div>
              <Link href="/funciones">Todas las funciones →</Link>
            </div>
            <div className="cartelera">{proximas.slice(0, 5).map((f) => <Afiche key={f.id} f={f} cupo={cupos[f.id]} />)}</div>
          </div>
        </section>
      )}

      {niveles.length > 0 && (
        <section className="seccion">
          <div className="contenedor">
            <div className="cabecera-seccion">
              <div><span className="ceja">Clases Actuación</span><h2>Un nivel para cada edad</h2></div>
              <Link href="/clases">Ver las clases →</Link>
            </div>
            <div className="niveles">
              {niveles.map((n) => (
                <Link key={n.id} href={`/clases/${n.slug}`} className="nivel">
                  {n.edades && <span className="edades">{n.edades}</span>}
                  <h3>{n.nombre}</h3>
                  <p>{n.descripcion}</p>
                  <span className="ir">Ver nivel →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
