import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Resultado } from "@/components/Ayuda";
import { db, schema } from "@/db";
import { accionAprobar, accionRechazarSolicitud } from "@/lib/acciones-escuela";
import { exigirAdmin } from "@/lib/sesion";
import { enlaceWhatsApp, fechaCorta, monto } from "@/lib/util";

export const metadata = { title: "Inscripciones" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Inscripciones({ searchParams }: Props) {
  await exigirAdmin();
  const { estudiantes, niveles } = schema;
  const lista = await db().select({ e: estudiantes, n: niveles }).from(estudiantes).leftJoin(niveles, eq(estudiantes.nivelId, niveles.id)).where(eq(estudiantes.estado, "solicitud")).orderBy(asc(estudiantes.id));
  return (
    <>
      <div className="cab"><h1>Inscripciones</h1><Link className="btn" href="/admin/estudiantes/nuevo">Inscribir en persona</Link></div>
      <Ayuda>
        <ol>
          <li>Aquí llegan las solicitudes que los representantes envían desde el sitio.</li>
          <li><b>Aprobar</b> deja al estudiante activo y le genera el cargo de inscripción y la mensualidad del mes, que el representante ve en su portal.</li>
          <li><b>No admitir</b> cierra la solicitud. El motivo queda como nota interna.</li>
          <li>Si alguien se inscribe en la escuela, usa <b>Inscribir en persona</b>.</li>
        </ol>
      </Ayuda>
      <Resultado searchParams={searchParams} />
      {lista.length === 0 && <p className="tenue">No hay solicitudes pendientes.</p>}
      {lista.map(({ e, n }) => (
        <article key={e.id} className="panel">
          <div className="cab"><h2>{e.nombres} {e.apellidos}</h2><span className="tenue">Solicitud del {fechaCorta(e.creadoEl)}</span></div>
          <p style={{ margin: 0 }}>
            Nivel <b>{n?.nombre ?? "sin elegir"}</b>{e.fechaNacimiento ? <> · Nació el {fechaCorta(new Date(`${e.fechaNacimiento}T12:00:00-04:00`))} de {e.fechaNacimiento.slice(0, 4)}</> : null}
            {n && <span className="tenue"> · Inscripción {monto(n.montoInscripcion) ?? "sin monto"} · Mensualidad {monto(n.montoMensualidad) ?? "sin monto"}</span>}
          </p>
          <p style={{ margin: 0 }}>Representante: <b>{e.repNombre}</b>{e.repCedula ? ` · C.I. ${e.repCedula}` : ""}{e.repCorreo ? ` · ${e.repCorreo}` : ""}</p>
          {e.observaciones && <p className="tenue" style={{ margin: 0 }}>“{e.observaciones}”</p>}
          <div className="acciones">
            <form action={accionAprobar}><input type="hidden" name="id" value={e.id} /><button className="btn">Aprobar</button></form>
            {e.repTelefono && <a className="btn sec" target="_blank" rel="noopener" href={enlaceWhatsApp(e.repTelefono)}>WhatsApp: {e.repTelefono}</a>}
            <Link className="btn sec" href={`/admin/estudiantes/${e.id}`}>Ver o corregir la ficha</Link>
            <form action={accionRechazarSolicitud} className="acciones"><input type="hidden" name="id" value={e.id} /><input name="motivo" placeholder="Motivo (nota interna)" aria-label="Motivo" style={{ width: 200 }} /><button className="btn peligro">No admitir</button></form>
          </div>
        </article>
      ))}
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Inscripciones {...props} /></Suspense>;
}
