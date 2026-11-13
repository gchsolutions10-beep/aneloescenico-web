import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda } from "@/components/Ayuda";
import { db, schema } from "@/db";
import { ESTADOS_ESTUDIANTE, hoy } from "@/lib/escuela";
import { exigirAdmin } from "@/lib/sesion";
import { usd } from "@/lib/util";

export const metadata = { title: "Estudiantes" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Estudiantes({ searchParams }: Props) {
  await exigirAdmin();
  const q = await searchParams;
  const estado = q.estado && q.estado in ESTADOS_ESTUDIANTE ? q.estado : "activo";
  const busca = (q.q ?? "").trim().toLowerCase();
  const { estudiantes, niveles } = schema;
  const filas = await db().select({
    e: estudiantes, nivel: niveles.nombre,
    debe: sql<string>`(SELECT coalesce(sum(monto_usd), 0) FROM cargos c WHERE c.estudiante_id = ${estudiantes.id} AND c.estado = 'pendiente')`,
    mora: sql<number>`(SELECT count(*)::int FROM cargos c WHERE c.estudiante_id = ${estudiantes.id} AND c.estado = 'pendiente' AND c.vence_el < ${hoy()}::date)`,
  }).from(estudiantes).leftJoin(niveles, eq(estudiantes.nivelId, niveles.id)).where(eq(estudiantes.estado, estado)).orderBy(asc(estudiantes.apellidos), asc(estudiantes.nombres));
  const lista = busca ? filas.filter(({ e }) => `${e.nombres} ${e.apellidos} ${e.repNombre}`.toLowerCase().includes(busca)) : filas;

  return (
    <>
      <div className="cab"><h1>Estudiantes</h1><Link className="btn" href="/admin/estudiantes/nuevo">Nuevo estudiante</Link></div>
      <Ayuda>
        <ul>
          <li>Toca un nombre para abrir su ficha: datos, representante, beca, estado de cuenta y cobros.</li>
          <li>La columna Debe suma lo pendiente. “En mora” indica que tiene cargos vencidos.</li>
          <li>Usa las pestañas para ver retirados o egresados.</li>
        </ul>
      </Ayuda>
      {q.borrado && <p className="nota" role="status">Estudiante borrado.</p>}
      <div className="acciones">
        {["activo", "retirado", "egresado", "rechazado"].map((x) => <Link key={x} className={`btn chico${estado === x ? "" : " sec"}`} href={`/admin/estudiantes?estado=${x}`}>{ESTADOS_ESTUDIANTE[x]}s</Link>)}
        <form className="acciones" style={{ marginLeft: "auto" }}><input type="hidden" name="estado" value={estado} /><input name="q" defaultValue={q.q} placeholder="Buscar por nombre" aria-label="Buscar" style={{ width: 200 }} /><button className="btn sec chico">Buscar</button></form>
      </div>
      <section className="panel">
        {lista.length === 0 ? <p className="tenue">No hay estudiantes en esta lista.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Estudiante</th><th>Nivel</th><th>Representante</th><th>Debe</th><th></th></tr></thead>
            <tbody>
              {lista.map(({ e, nivel, debe, mora }) => (
                <tr key={e.id}>
                  <td><Link href={`/admin/estudiantes/${e.id}`}><b>{e.apellidos}, {e.nombres}</b></Link>{e.becaPct > 0 && <> <span className="pastilla oro">Beca {e.becaPct}%</span></>}</td>
                  <td>{nivel ?? "—"}</td>
                  <td>{e.repNombre || "—"}<br /><span className="tenue">{e.repTelefono}</span></td>
                  <td>{Number(debe) > 0 ? <b>{usd(debe)}</b> : <span className="tenue">Al día</span>}</td>
                  <td>{mora > 0 && <span className="pastilla" style={{ color: "var(--a-mal)" }}>En mora</span>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        <p className="tenue" style={{ margin: 0 }}>{lista.length} {lista.length === 1 ? "estudiante" : "estudiantes"}</p>
      </section>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Estudiantes {...props} /></Suspense>;
}
