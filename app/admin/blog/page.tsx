import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { BotonBorrar } from "@/components/AdminPiezas";
import { Ayuda, Resultado } from "@/components/Ayuda";
import { db, schema } from "@/db";
import { borrarEntrada } from "@/lib/acciones";
import { fechaCorta } from "@/lib/util";

export const metadata = { title: "Blog" };

async function Blog({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const entradas = await db().select().from(schema.entradasBlog).orderBy(desc(schema.entradasBlog.creadoEl));
  return (
    <>
      <div className="cab"><h1>Blog</h1><Link className="btn" href="/admin/blog/nueva">Nueva entrada</Link></div>
      <Ayuda>
        <ul>
          <li><b>Borrador:</b> solo se ve en el panel. <b>Publicada:</b> aparece en el Blog del sitio.</li>
          <li><b>Destacada:</b> además aparece en Novedades, en la página de Inicio. Recomendamos entre 3 y 6.</li>
          <li>Si no destacas ninguna, Inicio muestra las tres más recientes.</li>
        </ul>
      </Ayuda>
      <Resultado searchParams={searchParams} />
      <section className="panel">
        {entradas.length === 0 ? <p className="tenue">Aún no hay entradas. Crea la primera con el botón Nueva entrada.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Título</th><th>Categoría</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
            <tbody>
              {entradas.map((e) => (
                <tr key={e.id}>
                  <td><Link href={`/admin/blog/${e.id}`}>{e.titulo}</Link></td>
                  <td>{e.categoria}</td>
                  <td><div className="acciones">
                    <span className={`pastilla${e.publicada ? " si" : ""}`}>{e.publicada ? "Publicada" : "Borrador"}</span>
                    {e.destacada && <span className="pastilla oro">Destacada</span>}
                  </div></td>
                  <td>{fechaCorta(e.publicadaEl ?? e.creadoEl)}</td>
                  <td><div className="acciones">
                    <Link className="btn sec chico" href={`/admin/blog/${e.id}`}>Editar</Link>
                    <form action={borrarEntrada}><input type="hidden" name="id" value={e.id} /><BotonBorrar que={`“${e.titulo}”`} /></form>
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
  return <Suspense fallback={<Cargando />}><Blog {...props} /></Suspense>;
}
