"use client";
import Link from "next/link";
import { useActionState } from "react";
import { ingresar } from "@/lib/acciones";
import { BotonBorrar as BotonBorrarModal } from "./panel/Confirmar";

/** Botón de borrar con ventana de confirmación (ver components/panel/Confirmar). `aviso`: una consecuencia por línea. */
export function BotonBorrar({ que, aviso, texto = "Borrar", fuerte }: { que: string; aviso?: string; texto?: string; fuerte?: boolean }) {
  return <BotonBorrarModal que={que} texto={texto} fuerte={fuerte} consecuencias={aviso ? aviso.split("\n").filter(Boolean) : []} />;
}

export function FormularioIngreso() {
  const [estado, accion, enviando] = useActionState(ingresar, null);
  return (
    <form action={accion} className="panel">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" />
      <h1 style={{ textAlign: "center" }}>Ingresar</h1>
      {estado?.error && <p className="nota mal" role="alert">{estado.error}</p>}
      <div className="campo"><label htmlFor="i-correo">Correo</label><input id="i-correo" name="correo" type="email" required autoComplete="username" defaultValue={estado?.valores?.correo} /></div>
      <div className="campo"><label htmlFor="i-clave">Clave</label><input id="i-clave" name="clave" type="password" required autoComplete="current-password" /></div>
      <button className="btn" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
      <Link href="/ingresar/olvide" style={{ textAlign: "center", fontSize: ".9rem" }}>Olvidé mi clave</Link>
      <Link href="/portal/registro" style={{ textAlign: "center", fontSize: ".9rem" }}>¿Eres representante y no tienes cuenta? Créala aquí</Link>
      <Link href="/" style={{ textAlign: "center", fontSize: ".9rem" }}>← Volver al sitio</Link>
    </form>
  );
}
