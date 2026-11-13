import { exigirAdmin } from "@/lib/sesion";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { BotonBorrar } from "@/components/panel/Confirmar";
import { Ayuda, Encabezado, Resultado } from "@/components/Ayuda";
import Cajon from "@/components/panel/Cajon";
import SubirImagen from "@/components/SubirImagen";
import { db, schema } from "@/db";
import { borrarSlide, guardarSlide } from "@/lib/acciones";

export const metadata = { title: "Carrusel" };

type Slide = typeof schema.carrusel.$inferSelect;

function FormSlide({ s, orden }: { s?: Slide; orden: number }) {
  return (
      <form action={guardarSlide} className="formulario-cajon">
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
          <div className="campo"><label htmlFor="s-orden">Orden</label><input id="s-orden" name="orden" type="number" defaultValue={s?.orden ?? orden} /></div>
        </div>
        <label className="casilla"><input type="checkbox" name="activo" defaultChecked={s?.activo ?? true} /> Mostrar en el sitio</label>
        <div className="cajon-pie"><button className="btn">{s ? "Guardar cambios" : "Agregar al carrusel"}</button></div>
      </form>
  );
}

async function Carrusel({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await exigirAdmin();
  const q = await searchParams;
  const slides = await db().select().from(schema.carrusel).orderBy(asc(schema.carrusel.orden), asc(schema.carrusel.id));
  const id = Number(q.editar) || 0;
  const s = id ? (await db().select().from(schema.carrusel).where(eq(schema.carrusel.id, id)))[0] : undefined;

  return (
    <>
      <Encabezado titulo="Carrusel de Inicio" descripcion="Las fotos grandes de la portada del sitio.">
        <Cajon key={q.ok ?? "nueva"} titulo="Agregar foto" boton="Agregar foto">
          <FormSlide orden={slides.length + 1} />
        </Cajon>
      </Encabezado>
      <Ayuda>
        <ol>
          <li>Elige una foto grande y horizontal (idealmente de 1920 píxeles de ancho o más).</li>
          <li>La foto se recorta sola a formato panorámico. Con Encuadre eliges qué parte se conserva.</li>
          <li>Escribe el título. El texto y el botón son opcionales.</li>
          <li>El número de Orden decide cuál sale primero (el menor va primero).</li>
        </ol>
      </Ayuda>
      <Resultado searchParams={searchParams} errores={{ faltan: "Falta la foto o el título." }} />
      {s && (
        <Cajon key={`editar-${s.id}`} titulo="Editar foto" abierto alCerrar="/admin/carrusel">
          <FormSlide s={s} orden={s.orden} />
        </Cajon>
      )}

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
                    <form action={borrarSlide}><input type="hidden" name="id" value={x.id} /><BotonBorrar que="esta foto del carrusel" consecuencias={["Deja de verse en la portada y su imagen se borra."]} /></form>
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
