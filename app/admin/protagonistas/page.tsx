import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda } from "@/components/Ayuda";
import { db, schema } from "@/db";
import { exigirAdmin } from "@/lib/sesion";

export const metadata = { title: "Protagonistas" };

async function Protagonistas() {
  await exigirAdmin();
  const { estudiantes: e, fichasArtista: f, niveles: n } = schema;
  const lista = await db().select({ e, f, nivel: n.nombre, obras: sql<number>`(SELECT count(*)::int FROM elenco WHERE elenco.estudiante_id = ${e.id})` })
    .from(e).leftJoin(f, eq(f.estudianteId, e.id)).leftJoin(n, eq(e.nivelId, n.id)).where(sql`${e.estado} IN ('activo', 'egresado')`).orderBy(asc(e.nombres));
  return (
    <>
      <h1>Protagonistas</h1>
      <Ayuda>
        <ul>
          <li>Cada estudiante puede tener una ficha pública: foto, lo que le gusta, galería y su trayectoria en las obras.</li>
          <li>La ficha solo se ve en el sitio cuando se cumplen <b>dos</b> condiciones: tú la marcas como publicada <b>y</b> el representante la autorizó (desde su portal o con una planilla firmada que registras aquí).</li>
          <li>Si el representante retira la autorización, la ficha deja de verse de inmediato.</li>
          <li>La trayectoria se arma sola: al agregar a un estudiante al elenco de una función, esa obra aparece en su ficha.</li>
          <li>En el sitio nunca se muestran apellidos (salvo que los pongas en el nombre artístico), fecha de nacimiento ni datos de contacto.</li>
        </ul>
      </Ayuda>
      <section className="panel">
        {lista.length === 0 ? <p className="tenue">Aún no hay estudiantes activos.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Estudiante</th><th>Nivel</th><th>Obras</th><th>Autorización</th><th>Ficha</th><th></th></tr></thead>
            <tbody>
              {lista.map(({ e: est, f: ficha, nivel, obras }) => {
                const visible = ficha?.publicada && ficha.autorizadaEl;
                return (
                  <tr key={est.id}>
                    <td><b>{est.nombres} {est.apellidos}</b>{ficha?.nombreArtistico && <><br /><span className="tenue">“{ficha.nombreArtistico}”</span></>}</td>
                    <td>{nivel ?? "—"}</td><td>{obras}</td>
                    <td><span className={`pastilla${ficha?.autorizadaEl ? " si" : ""}`}>{ficha?.autorizadaEl ? "Autorizada" : "Sin autorizar"}</span></td>
                    <td><span className={`pastilla${visible ? " si" : ficha?.publicada ? " oro" : ""}`}>{visible ? "Visible en el sitio" : ficha?.publicada ? "Espera autorización" : "No publicada"}</span></td>
                    <td><div className="acciones">
                      <Link className="btn sec chico" href={`/admin/protagonistas/${est.id}`}>Editar ficha</Link>
                      {visible && <Link className="btn sec chico" href={`/protagonistas/${ficha!.slug}`} target="_blank">Ver ↗</Link>}
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </section>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Cargando />}><Protagonistas /></Suspense>;
}
