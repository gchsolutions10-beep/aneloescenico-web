import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { desc } from "drizzle-orm";
import { BotonBorrar } from "@/components/AdminPiezas";
import { db, schema } from "@/db";
import { borrarMensaje, marcarLeido } from "@/lib/acciones";
import { fechaCorta, hora } from "@/lib/util";

export const metadata = { title: "Mensajes" };

async function Mensajes() {
  const lista = await db().select().from(schema.mensajes).orderBy(desc(schema.mensajes.creadoEl)).limit(200);
  return (
    <>
      <h1>Mensajes de contacto</h1>
      {lista.length === 0 && <p className="tenue">Aún no han escrito desde el formulario de Contáctanos.</p>}
      {lista.map((m) => (
        <article key={m.id} className="panel">
          <div className="cab">
            <h2>{m.nombre} {!m.leido && <span className="pastilla oro">Nuevo</span>}</h2>
            <span className="tenue">{fechaCorta(m.creadoEl)} · {hora(m.creadoEl)}</span>
          </div>
          <p style={{ margin: 0, whiteSpace: "pre-line" }}>{m.mensaje}</p>
          <div className="acciones">
            {m.telefono && <a className="btn sec chico" href={`https://wa.me/${m.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener">WhatsApp: {m.telefono}</a>}
            {m.correo && <a className="btn sec chico" href={`mailto:${m.correo}`}>{m.correo}</a>}
            {!m.leido && <form action={marcarLeido}><input type="hidden" name="id" value={m.id} /><button className="btn chico">Marcar como leído</button></form>}
            <form action={borrarMensaje}><input type="hidden" name="id" value={m.id} /><BotonBorrar que="este mensaje" /></form>
          </div>
        </article>
      ))}
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Cargando />}><Mensajes /></Suspense>;
}
