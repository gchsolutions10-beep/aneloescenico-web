import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Resultado } from "@/components/Ayuda";
import SubirImagen from "@/components/SubirImagen";
import { db, schema } from "@/db";
import { guardarFicha } from "@/lib/acciones-protagonistas";
import { exigirAdmin } from "@/lib/sesion";
import { fechaLarga } from "@/lib/util";

export const metadata = { title: "Ficha de Protagonista" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

async function Ficha({ params, searchParams }: Props) {
  await exigirAdmin();
  const id = Number((await params).id) || 0;
  const [e] = await db().select().from(schema.estudiantes).where(eq(schema.estudiantes.id, id));
  if (!e) notFound();
  const [[f], obras] = await Promise.all([
    db().select().from(schema.fichasArtista).where(eq(schema.fichasArtista.estudianteId, id)),
    db().select({ titulo: schema.funciones.titulo, personaje: schema.elenco.personaje, funcionId: schema.funciones.id }).from(schema.elenco)
      .innerJoin(schema.funciones, eq(schema.elenco.funcionId, schema.funciones.id)).where(eq(schema.elenco.estudianteId, id)).orderBy(desc(schema.funciones.fechaHora)),
  ]);
  const porPortal = f?.autorizadaVia === "portal";
  const visible = f?.publicada && f.autorizadaEl;

  return (
    <>
      <div className="cab">
        <h1>Ficha de {e.nombres} {e.apellidos}</h1>
        <div className="acciones">
          {visible && <Link className="btn sec" href={`/protagonistas/${f!.slug}`} target="_blank">Ver en el sitio ↗</Link>}
          <Link className="btn sec" href="/admin/protagonistas">← Volver</Link>
        </div>
      </div>
      <Resultado searchParams={searchParams} />
      {f?.publicada && !f.autorizadaEl && <p className="nota mal">La ficha está marcada como publicada pero <b>no se muestra</b>: falta la autorización del representante.</p>}

      <form action={guardarFicha} className="panel">
        <input type="hidden" name="estudianteId" value={e.id} />
        <h2>Publicación</h2>
        <label className="casilla"><input type="checkbox" name="publicada" defaultChecked={f?.publicada ?? false} /> Publicar esta ficha en Protagonistas</label>
        {porPortal ? (
          <p style={{ margin: 0 }}><span className="pastilla si">Autorizada</span> El representante la autorizó desde su portal el {fechaLarga(f!.autorizadaEl)}. Solo él puede retirarla.</p>
        ) : (
          <label className="casilla"><input type="checkbox" name="autorizacionFisica" defaultChecked={Boolean(f?.autorizadaEl)} /> El representante autorizó la publicación por escrito{f?.autorizadaEl ? ` (${f.autorizadaVia}, ${fechaLarga(f.autorizadaEl)})` : ""}</label>
        )}
        <p className="tenue" style={{ margin: 0 }}>Como son menores, la ficha solo se ve en el sitio con ambas cosas: publicada y autorizada. El representante también puede autorizarla desde su portal.</p>

        <h2>Contenido</h2>
        <div className="fila">
          <div className="campo"><label htmlFor="fa-nombre">Nombre a mostrar</label><input id="fa-nombre" name="nombreArtistico" defaultValue={f?.nombreArtistico} placeholder={e.nombres} /><small>Vacío = solo sus nombres ({e.nombres}), sin apellidos.</small></div>
          <div className="campo"><label htmlFor="fa-orden">Orden en la lista</label><input id="fa-orden" name="orden" type="number" defaultValue={f?.orden ?? 0} /></div>
        </div>
        <div className="campo"><label htmlFor="fa-frase">Una frase suya</label><input id="fa-frase" name="frase" maxLength={160} defaultValue={f?.frase} /></div>
        <div className="campo"><label htmlFor="fa-gustos">Lo que le gusta</label><input id="fa-gustos" name="gustos" defaultValue={f?.gustos} placeholder="Improvisación, comedia, canto, danza" /><small>Separa con comas.</small></div>
        <div className="campo"><label htmlFor="fa-bio">Sobre el artista</label><textarea id="fa-bio" name="bio" defaultValue={f?.bio} /></div>
        <SubirImagen nombre="fotoUrl" inicial={f?.fotoUrl} aspecto={3 / 4} ancho={900} etiqueta="Foto principal" />
        <h3>Galería (hasta 4 fotos)</h3>
        <div className="fila">
          {[0, 1, 2, 3].map((i) => <SubirImagen key={i} nombre={`galeria${i + 1}`} inicial={f?.galeria[i]} aspecto={4 / 3} ancho={1200} etiqueta={`Foto ${i + 1}`} />)}
        </div>
        <div><button className="btn">Guardar ficha</button></div>
      </form>

      <section className="panel">
        <h2>Trayectoria</h2>
        {obras.length === 0 ? <p className="tenue">Aún no figura en el elenco de ninguna función. Agrégalo desde Funciones → Venta y butacas → Elenco, eligiéndolo como estudiante.</p> : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>{obras.map((o, i) => <li key={i}><Link href={`/admin/funciones/${o.funcionId}#elenco`}>{o.titulo}</Link>{o.personaje ? ` · ${o.personaje}` : ""}</li>)}</ul>
        )}
      </section>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Ficha {...props} /></Suspense>;
}
