import { exigirAdmin } from "@/lib/sesion";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { BotonBorrar } from "@/components/AdminPiezas";
import { Ayuda, Resultado } from "@/components/Ayuda";
import SubirImagen from "@/components/SubirImagen";
import { db, schema } from "@/db";
import { borrarFuncion, guardarFuncion } from "@/lib/acciones";
import { aInputLocal, ESTADOS_FUNCION, fechaCorta, hora } from "@/lib/util";

export const metadata = { title: "Funciones" };

async function Funciones({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await exigirAdmin();
  const q = await searchParams;
  const lista = await db().select().from(schema.funciones).orderBy(desc(schema.funciones.fechaHora));
  const id = Number(q.editar) || 0;
  const f = id ? (await db().select().from(schema.funciones).where(eq(schema.funciones.id, id)))[0] : undefined;

  return (
    <>
      <h1>Funciones de Teatro</h1>
      <Ayuda>
        <ol>
          <li>Crea la función con su afiche (se ajusta solo al formato vertical 2:3), fecha, hora y lugar.</li>
          <li>Al crearla pasas a <b>Venta y butacas</b>: ahí eliges el plano de la sala, los precios y la fecha límite de preventa.</li>
          <li>Pon el estado en <b>A la venta</b> para que aparezca en cartelera y se puedan comprar entradas. <b>Finalizada</b> la pasa al archivo.</li>
        </ol>
      </Ayuda>
      <Resultado searchParams={searchParams} errores={{ faltan: "Falta el título de la obra." }} />

      <form action={guardarFuncion} className="panel" key={f?.id ?? "nueva"}>
        <h2>{f ? "Editar función" : "Nueva función"}</h2>
        <input type="hidden" name="id" value={f?.id ?? ""} />
        <SubirImagen nombre="aficheUrl" inicial={f?.aficheUrl} aspecto={2 / 3} ancho={1000} etiqueta="Afiche" ayuda="Si no subes afiche, la cartelera muestra el título sobre un fondo de telón." />
        <div className="fila">
          <div className="campo"><label htmlFor="f-titulo">Título de la obra</label><input id="f-titulo" name="titulo" required defaultValue={f?.titulo} /></div>
          <div className="campo"><label htmlFor="f-sub">Subtítulo</label><input id="f-sub" name="subtitulo" defaultValue={f?.subtitulo} /></div>
        </div>
        <div className="campo"><label htmlFor="f-sin">Sinopsis</label><textarea id="f-sin" name="sinopsis" defaultValue={f?.sinopsis} /></div>
        <div className="fila">
          <div className="campo"><label htmlFor="f-fecha">Fecha y hora</label><input id="f-fecha" name="fechaHora" type="datetime-local" defaultValue={aInputLocal(f?.fechaHora ?? null)} /></div>
          <div className="campo"><label htmlFor="f-lugar">Lugar</label><input id="f-lugar" name="lugar" defaultValue={f?.lugar} /></div>
          <div className="campo">
            <label htmlFor="f-estado">Estado</label>
            <select id="f-estado" name="estado" defaultValue={f?.estado ?? "borrador"}>{Object.entries(ESTADOS_FUNCION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
        </div>
        <div className="acciones">
          <button className="btn">{f ? "Guardar cambios" : "Crear y configurar la venta"}</button>
          {f && <Link className="btn sec" href="/admin/funciones">Cancelar</Link>}
        </div>
      </form>

      <section className="panel">
        <h2>Todas las funciones</h2>
        {lista.length === 0 ? <p className="tenue">Aún no hay funciones.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Afiche</th><th>Obra</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {lista.map((x) => (
                <tr key={x.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <td>{x.aficheUrl ? <img className="mini afiche" src={x.aficheUrl} alt="" /> : <span className="tenue">—</span>}</td>
                  <td>{x.titulo}</td>
                  <td>{fechaCorta(x.fechaHora)} {hora(x.fechaHora)}</td>
                  <td><span className={`pastilla${x.estado === "a_la_venta" ? " si" : ""}`}>{ESTADOS_FUNCION[x.estado]}</span></td>
                  <td><div className="acciones">
                    <Link className="btn chico" href={`/admin/funciones/${x.id}`}>Venta y butacas</Link>
                    <Link className="btn sec chico" href={`/admin/funciones?editar=${x.id}`}>Editar</Link>
                    <form action={borrarFuncion}><input type="hidden" name="id" value={x.id} /><BotonBorrar que={`“${x.titulo}”`} /></form>
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
  return <Suspense fallback={<Cargando />}><Funciones {...props} /></Suspense>;
}
