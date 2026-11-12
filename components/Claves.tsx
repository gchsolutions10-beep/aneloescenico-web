"use client";
import Link from "next/link";
import { useActionState } from "react";
import { cambiarMiClave, pedirEnlaceClave, restablecerConEnlace } from "@/lib/acciones-clave";

export function FormularioOlvide() {
  const [estado, accion, enviando] = useActionState(pedirEnlaceClave, null);
  return (
    <form action={accion} className="panel">
      <h1 style={{ textAlign: "center" }}>Olvidé mi clave</h1>
      {estado?.error && <p className="nota mal" role="alert">{estado.error}</p>}
      {estado?.ok ? <p className="nota" role="status">{estado.ok}</p> : (
        <>
          <div className="campo"><label htmlFor="o-correo">Tu correo</label><input id="o-correo" name="correo" type="email" required autoComplete="username" /></div>
          <button className="btn" disabled={enviando}>{enviando ? "Enviando…" : "Enviarme el enlace"}</button>
        </>
      )}
      <Link href="/ingresar" style={{ textAlign: "center", fontSize: ".9rem" }}>← Volver a ingresar</Link>
    </form>
  );
}

export function FormularioRestablecer({ token }: { token: string }) {
  const [estado, accion, enviando] = useActionState(restablecerConEnlace, null);
  return (
    <form action={accion} className="panel">
      <h1 style={{ textAlign: "center" }}>Elige una clave nueva</h1>
      <input type="hidden" name="t" value={token} />
      {estado?.error && <p className="nota mal" role="alert">{estado.error} <Link href="/ingresar/olvide">Pedir otro enlace</Link></p>}
      <div className="campo"><label htmlFor="n-nueva">Clave nueva (mínimo 8 caracteres)</label><input id="n-nueva" name="nueva" type="password" required minLength={8} autoComplete="new-password" /></div>
      <div className="campo"><label htmlFor="n-rep">Repítela</label><input id="n-rep" name="repetir" type="password" required minLength={8} autoComplete="new-password" /></div>
      <button className="btn" disabled={enviando}>{enviando ? "Guardando…" : "Guardar clave"}</button>
    </form>
  );
}

export function FormularioMiClave() {
  const [estado, accion, enviando] = useActionState(cambiarMiClave, null);
  return (
    <form action={accion} className="panel">
      <h1>Cambiar mi clave</h1>
      {estado?.error && <p className="nota mal" role="alert">{estado.error}</p>}
      {estado?.ok && <p className="nota" role="status">{estado.ok}</p>}
      <div className="campo"><label htmlFor="m-actual">Clave actual</label><input id="m-actual" name="actual" type="password" required autoComplete="current-password" /></div>
      <div className="campo"><label htmlFor="m-nueva">Clave nueva (mínimo 8 caracteres)</label><input id="m-nueva" name="nueva" type="password" required minLength={8} autoComplete="new-password" /></div>
      <div className="campo"><label htmlFor="m-rep">Repite la clave nueva</label><input id="m-rep" name="repetir" type="password" required minLength={8} autoComplete="new-password" /></div>
      <button className="btn" disabled={enviando}>{enviando ? "Guardando…" : "Cambiar clave"}</button>
    </form>
  );
}
