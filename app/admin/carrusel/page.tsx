import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { BotonBorrar } from "@/components/AdminPiezas";
import { Ayuda, Resultado } from "@/components/Ayuda";
import SubirImagen from "@/components/SubirImagen";
import { db, schema } from "@/db";
import { borrarSlide, guardarSlide } from "@/lib/acciones";

export const metadata = { title: "Carrusel" };

async function Carrusel({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const q = await searchParams;
  const slides = await db().select().from(schema.carrusel).orderBy(asc(schema.carrusel.orden), asc(schema.carrusel.id));
  const id = Number(q.editar) || 0;
  const s = id ? (await db().select().from(schema.carrusel).where(eq(schema.carrusel.id, id)))[0] : undefined;

  return (
    <>
      <h1>Carrusel de Inicio</h1>
      <Ayuda>
        <ol>
          <li>Elige una foto grande y horizontal (idealmente de 1920 píxeles de ancho o más).</li>
          <li>La foto se recorta sola a formato panorámico. Con Encuadre eliges qué parte se conserva.</li>
          <li>Escribe el título. El texto y el botón son opcionales.</li>
          <li>El número de Orden decide cuál sale primero (el menor va primero).</li>
        </ol>
      </Ayuda>
      <Resultado searchParams={searchParams} errores={{ faltan: "Falta la foto o el título." }} />

      <form action={guardarSlide} className="panel" key={s?.id ?? "nueva"}>
        <h2>{s ? "Editar foto" : "Agregar foto"}</h2>
        <input type="hidden" name="id" value={s?.id ?? ""} />
        <SubirImagen nombre="imagenUrl" inicial={s?.imagenUrl} aspecto={16 / 9} ancho={1920} etiqueta="Foto" />
        <div className="fila">
          <div className="campo"><label htmlFor="s-eyebrow">Línea pequeña sobre el título</label><input id="s-eyebrow" name="eyebrow" defaultValue={s?.eyebrow} placeholder="Formación teatral · Acarigua" /></div>
          <div className="campo"><label htmlFor="s-titulo">Título</label><input id="s-titulo" name="titulo" required defaultValue={s?.titulo} /></div>
        </div>
        <div className="campo"><label htmlFor="s-texto">Texto</label><input id="s-texto" name="texto" defaultValue={s?.texto} /></div>
        <div className="fila">
          <div className="campo"><label htmlFor="s-bt">Texto del botón</label><input id="s-bt" name="botonTexto" defaultValue={s?.botonTexto} placeholder="Inscripciones abiertas" /></div>
          <div className="campo"><label htmlFor="s-be">Enlace del botón</label><input id="s-be" name="botonEnlace" defaultValue={s?.botonEnlace} placeholder="/clases" /><small>Una página del sitio (/clases, /funciones, /contacto) o un enlace https.</small></div>
          <div className="campo"><label htmlFor="s-orden">Orden</label><input id="s-orden" name="orden" type="number" defaultValue={s?.orden ?? slides.length + 1} /></div>
        </div>
        <label className="casilla"><input type="checkbox" name="activo" defaultChecked={s?.activo ?? true} /> Mostrar en el sitio</label>
        <div className="acciones">
          <button className="btn">{s ? "Guardar cambios" : "Agregar al carrusel"}</button>
          {s && <Link className="btn sec" href="/admin/carrusel">Cancelar</Link>}
        </div>
      </form>

      <section className="panel">
        <h2>Fotos del carrusel</h2>
        {slides.length === 0 ? <p className="tenue">Aún no hay fotos. Mientras tanto, Inicio muestra una portada sin imagen.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Foto</th><th>Título</th><th>Orden</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {slides.map((x) => (
                <tr key={x.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <td><img className="mini" src={x.imagenUrl} alt="" /></td>
                  <td>{x.titulo}</td>
                  <td>{x.orden}</td>
                  <td><span className={`pastilla${x.activo ? " si" : ""}`}>{x.activo ? "Visible" : "Oculta"}</span></td>
                  <td><div className="acciones">
                    <Link className="btn sec chico" href={`/admin/carrusel?editar=${x.id}`}>Editar</Link>
                    <form action={borrarSlide}><input type="hidden" name="id" value={x.id} /><BotonBorrar que="esta foto" /></form>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
    </>
  );
}

export default function Pagina(props: { searchParams: Promise<Record<string, string>> }) {
  return <Suspense fallback={<Cargando />}><Carrusel {...props} /></Suspense>;
}
