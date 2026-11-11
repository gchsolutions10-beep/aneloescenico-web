import { asc } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { BotonBorrar } from "@/components/AdminPiezas";
import { Ayuda, Resultado } from "@/components/Ayuda";
import { db, schema } from "@/db";
import { borrarSala } from "@/lib/acciones-salas";
import { totalButacas } from "@/lib/planos";
import { exigirAdmin } from "@/lib/sesion";

export const metadata = { title: "Salas" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Salas({ searchParams }: Props) {
  await exigirAdmin();
  const salas = await db().select().from(schema.salas).orderBy(asc(schema.salas.id));
  return (
    <>
      <div className="cab"><h1>Salas</h1><Link className="btn" href="/admin/salas/nueva">Nueva sala</Link></div>
      <Ayuda>
        <ul>
          <li>Una sala es el plano de butacas de un lugar. Crea una por cada teatro o auditorio donde se presenten.</li>
          <li>Al crear una función eliges su sala y se copian sus butacas y precios sugeridos.</li>
          <li>Editar o borrar una sala no cambia las funciones que ya la usaron: cada función guarda su propia copia.</li>
        </ul>
      </Ayuda>
      <Resultado searchParams={searchParams} />
      <section className="panel">
        <div className="tabla"><table>
          <thead><tr><th>Sala</th><th>Butacas</th><th>Zonas</th><th></th></tr></thead>
          <tbody>
            {salas.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/admin/salas/${s.id}`}>{s.nombre}</Link></td>
                <td>{totalButacas(s.definicion)}</td>
                <td>{s.definicion.zonas.map((z) => z.nombre).join(", ")}</td>
                <td><div className="acciones">
                  <Link className="btn sec chico" href={`/admin/salas/${s.id}`}>Editar</Link>
                  <Link className="btn sec chico" href={`/admin/salas/nueva?copiar=${s.id}`}>Duplicar</Link>
                  <form action={borrarSala}><input type="hidden" name="id" value={s.id} /><BotonBorrar que={`la sala “${s.nombre}”`} /></form>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {salas.length === 0 && <p className="tenue">No hay salas. Crea la primera.</p>}
      </section>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Salas {...props} /></Suspense>;
}
