"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState } from "react";
import { ingresar } from "@/lib/acciones";

const MENU = [
  ["/admin", "Inicio"], ["/admin/carrusel", "Carrusel"], ["/admin/blog", "Blog"], ["/admin/funciones", "Funciones"],
  ["/admin/niveles", "Niveles"], ["/admin/mensajes", "Mensajes"], ["/admin/apariencia", "Apariencia"],
  ["/admin/configuracion", "Datos de la escuela"], ["/admin/manual", "Manual"],
];

export function MenuAdmin() {
  const ruta = usePathname();
  return (
    <>
      {MENU.map(([href, texto]) => (
        <Link key={href} href={href} aria-current={(href === "/admin" ? ruta === href : ruta.startsWith(href)) ? "page" : undefined}>{texto}</Link>
      ))}
    </>
  );
}

/** Botón de borrar que pide confirmación antes de enviar el formulario. */
export function BotonBorrar({ que }: { que: string }) {
  return (
    <button className="btn peligro chico" onClick={(e) => { if (!window.confirm(`¿Borrar ${que}? Esta acción no se puede deshacer.`)) e.preventDefault(); }}>
      Borrar
    </button>
  );
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
      <Link href="/" style={{ textAlign: "center", fontSize: ".9rem" }}>← Volver al sitio</Link>
    </form>
  );
}
