import { exigirAdmin } from "@/lib/sesion";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { asc, sql } from "drizzle-orm";
import Link from "next/link";
import Cajon from "@/components/panel/Cajon";
import { monto } from "@/lib/util";
import { Ayuda, Encabezado, Resultado } from "@/components/Ayuda";
import SubirImagen from "@/components/SubirImagen";
import { db, schema } from "@/db";
import { guardarNivel } from "@/lib/acciones";

export const metadata = { title: "Niveles" };

type Nivel = typeof schema.niveles.$inferSelect;

function Formulario({ n, orden }: { n?: Nivel; orden: number }) {
  const p = n ? `n${n.id}` : "nuevo";
  return (
    <form action={guardarNivel} className="formulario-cajon">
      <input type="hidden" name="id" value={n?.id ?? ""} />
      <div className="fila">
        <div className="campo"><label htmlFor={`${p}-nombre`}>Nombre</label><input id={`${p}-nombre`} name="nombre" required defaultValue={n?.nombre} /></div>
        <div className="campo"><label htmlFor={`${p}-edades`}>Edades</label><input id={`${p}-edades`} name="edades" defaultValue={n?.edades} placeholder="De 6 a 9 años" /></div>
        <div className="campo"><label htmlFor={`${p}-horario`}>Horario</label><input id={`${p}-horario`} name="horario" defaultValue={n?.horario} placeholder="Sábados, 9:00 a 11:00 am" /></div>
      </div>
      <div className="campo"><label htmlFor={`${p}-desc`}>Descripción</label><textarea id={`${p}-desc`} name="descripcion" defaultValue={n?.descripcion} /></div>
      <div className="fila">
        <div className="campo"><label htmlFor={`${p}-ins`}>Inscripción (USD)</label><input id={`${p}-ins`} name="montoInscripcion" inputMode="decimal" defaultValue={n?.montoInscripcion ?? ""} /></div>
        <div className="campo"><label htmlFor={`${p}-men`}>Mensualidad (USD)</label><input id={`${p}-men`} name="montoMensualidad" inputMode="decimal" defaultValue={n?.montoMensualidad ?? ""} /></div>
        <div className="campo"><label htmlFor={`${p}-orden`}>Orden</label><input id={`${p}-orden`} name="orden" type="number" defaultValue={n?.orden ?? orden} /></div>
      </div>
      <SubirImagen nombre="imagenUrl" inicial={n?.imagenUrl} aspecto={16 / 9} ancho={1600} etiqueta="Foto del nivel (opcional)" />
      <label className="casilla"><input type="checkbox" name="activo" defaultChecked={n?.activo ?? true} /> Mostrar en el sitio</label>
      <div className="cajon-pie"><button className="btn">{n ? "Guardar cambios" : "Agregar nivel"}</button></div>
    </form>
  );
}

async function Niveles({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await exigirAdmin();
  const q = await searchParams;
  const [niveles, conteo] = await Promise.all([
    db().select().from(schema.niveles).orderBy(asc(schema.niveles.orden), asc(schema.niveles.id)),
    db().execute<{ nivel_id: number; n: number }>(sql`SELECT nivel_id, count(*)::int AS n FROM estudiantes WHERE estado = 'activo' GROUP BY nivel_id`),
  ]);
  const activos = Object.fromEntries(conteo.rows.map((r) => [r.nivel_id, r.n]));
  const editar = q.editar ? niveles.find((n) => n.id === Number(q.editar)) : undefined;
  return (
    <>
      <Encabezado titulo="Niveles" descripcion="Los grupos de la escuela, con sus horarios y montos. Cada uno tiene su página en Clases Actuación.">
        <Cajon key={q.ok ?? "nuevo"} titulo="Agregar nivel" boton="Agregar nivel"><Formulario orden={niveles.length + 1} /></Cajon>
      </Encabezado>
      <Resultado searchParams={searchParams} errores={{ faltan: "Falta el nombre del nivel." }} />
      <Ayuda>
        <ul>
          <li>Si dejas un monto vacío, no se muestra en el sitio.</li>
          <li>Los montos se usan para generar las mensualidades de cada mes. Cambiar un monto afecta a las mensualidades que se generen desde ahora.</li>
        </ul>
      </Ayuda>
      <section className="panel" style={{ paddingTop: 6 }}>
        {niveles.length === 0 ? <div className="vacio"><p>Todavía no hay niveles.</p></div> : (
          <div className="tabla"><table>
            <thead><tr><th>Nivel</th><th>Horario</th><th>Inscripción</th><th>Mensualidad</th><th>Estudiantes</th><th>Estado</th><th><span className="sr">Acciones</span></th></tr></thead>
            <tbody>
              {niveles.map((n) => (
                <tr key={n.id}>
                  <td><b>{n.nombre}</b>{n.edades && <><br /><span className="tenue" style={{ fontSize: 13 }}>{n.edades}</span></>}</td>
                  <td>{n.horario || <span className="tenue">—</span>}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{monto(n.montoInscripcion) ?? <span className="tenue">—</span>}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{monto(n.montoMensualidad) ?? <span className="tenue">—</span>}</td>
                  <td>{activos[n.id] ?? 0}</td>
                  <td><span className={`pastilla${n.activo ? " si" : ""}`}>{n.activo ? "Visible" : "Oculto"}</span></td>
                  <td style={{ textAlign: "right" }}><Link className="btn sec chico" href={`/admin/niveles?editar=${n.id}`}>Editar</Link></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
      {editar && <Cajon key={`editar-${editar.id}`} titulo={`Editar ${editar.nombre}`} abierto alCerrar="/admin/niveles"><Formulario n={editar} orden={editar.orden} /></Cajon>}
    </>
  );
}

export default function Pagina(props: { searchParams: Promise<Record<string, string>> }) {
  return <Suspense fallback={<Cargando />}><Niveles {...props} /></Suspense>;
}
