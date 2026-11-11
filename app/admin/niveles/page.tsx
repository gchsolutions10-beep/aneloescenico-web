import { exigirAdmin } from "@/lib/sesion";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { asc } from "drizzle-orm";
import { Ayuda, Resultado } from "@/components/Ayuda";
import SubirImagen from "@/components/SubirImagen";
import { db, schema } from "@/db";
import { guardarNivel } from "@/lib/acciones";

export const metadata = { title: "Niveles" };

type Nivel = typeof schema.niveles.$inferSelect;

function Formulario({ n, orden }: { n?: Nivel; orden: number }) {
  const p = n ? `n${n.id}` : "nuevo";
  return (
    <form action={guardarNivel} className="panel">
      <h2>{n ? n.nombre : "Agregar nivel"}</h2>
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
      <div><button className="btn">{n ? "Guardar" : "Agregar nivel"}</button></div>
    </form>
  );
}

async function Niveles({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await exigirAdmin();
  const niveles = await db().select().from(schema.niveles).orderBy(asc(schema.niveles.orden), asc(schema.niveles.id));
  return (
    <>
      <h1>Niveles</h1>
      <Ayuda>
        <ul>
          <li>Cada nivel tiene su propia página en Clases Actuación.</li>
          <li>Si dejas un monto vacío, no se muestra en el sitio.</li>
          <li>Estos montos se usarán después para generar las mensualidades (Fase 3).</li>
        </ul>
      </Ayuda>
      <Resultado searchParams={searchParams} errores={{ faltan: "Falta el nombre del nivel." }} />
      {niveles.map((n) => <Formulario key={n.id} n={n} orden={n.orden} />)}
      <Formulario orden={niveles.length + 1} />
    </>
  );
}

export default function Pagina(props: { searchParams: Promise<Record<string, string>> }) {
  return <Suspense fallback={<Cargando />}><Niveles {...props} /></Suspense>;
}
