"use client";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { enviarMensaje } from "@/lib/acciones";

export default function FormularioContacto() {
  const [estado, accion, enviando] = useActionState(enviarMensaje, null);
  const nivel = useSearchParams().get("nivel");

  const v = estado?.valores;
  if (estado?.ok) return <p className="aviso" role="status">{estado.ok}</p>;
  return (
    <form action={accion} className="formulario">
      {estado?.error && <p className="aviso error" role="alert">{estado.error}</p>}
      <div className="campo"><label htmlFor="c-nombre">Nombre</label><input id="c-nombre" name="nombre" required autoComplete="name" defaultValue={v?.nombre} /></div>
      <div className="campo"><label htmlFor="c-telefono">Teléfono o WhatsApp</label><input id="c-telefono" name="telefono" type="tel" autoComplete="tel" defaultValue={v?.telefono} /></div>
      <div className="campo"><label htmlFor="c-correo">Correo</label><input id="c-correo" name="correo" type="email" autoComplete="email" defaultValue={v?.correo} /></div>
      <div className="campo">
        <label htmlFor="c-mensaje">Mensaje</label>
        <textarea id="c-mensaje" name="mensaje" required defaultValue={v?.mensaje ?? (nivel ? `Hola, quiero información para inscribir en el nivel ${nivel}.` : "")} />
      </div>
      <div className="trampa" aria-hidden="true"><label>No llenar<input name="sitio" tabIndex={-1} autoComplete="off" /></label></div>
      <div><button className="boton" disabled={enviando}>{enviando ? "Enviando…" : "Enviar mensaje"}</button></div>
    </form>
  );
}
