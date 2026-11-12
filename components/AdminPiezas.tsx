"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState } from "react";
import { ingresar } from "@/lib/acciones";

// [ruta, texto, quién lo ve]  e = todo el equipo, a = administradores, m = solo master
const MENU: [string, string, "e" | "a" | "m"][] = [
  ["/admin", "Inicio", "a"], ["/admin/taquilla", "Taquilla", "e"], ["/admin/pagos", "Pagos", "e"], ["/admin/validar", "Validar entradas", "e"], ["/admin/caja", "Cierre de caja", "e"],
  ["/admin/inscripciones", "Inscripciones", "a"], ["/admin/estudiantes", "Estudiantes", "a"], ["/admin/cobranza", "Cobranza", "a"],
  ["/admin/protagonistas", "Protagonistas", "a"], ["/admin/funciones", "Funciones", "a"], ["/admin/salas", "Salas", "a"], ["/admin/reportes", "Reportes", "a"], ["/admin/bonos", "Bonos de regalo", "a"], ["/admin/cobros", "Cobros y tasa", "a"],
  ["/admin/carrusel", "Carrusel", "a"], ["/admin/blog", "Blog", "a"], ["/admin/niveles", "Niveles", "a"], ["/admin/mensajes", "Mensajes", "a"],
  ["/admin/apariencia", "Apariencia", "a"], ["/admin/correo", "Correo", "a"], ["/admin/configuracion", "Datos de la escuela", "a"], ["/admin/usuarios", "Usuarios", "m"], ["/admin/manual", "Manual", "e"],
];

export function MenuAdmin({ rol }: { rol: string }) {
  const ruta = usePathname();
  const visible = (quien: string) => quien === "e" || (quien === "a" && rol !== "vendedor") || (quien === "m" && rol === "master");
  return (
    <>
      {MENU.filter(([, , q]) => visible(q)).map(([href, texto]) => (
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
      <Link href="/ingresar/olvide" style={{ textAlign: "center", fontSize: ".9rem" }}>Olvidé mi clave</Link>
      <Link href="/portal/registro" style={{ textAlign: "center", fontSize: ".9rem" }}>¿Eres representante y no tienes cuenta? Créala aquí</Link>
      <Link href="/" style={{ textAlign: "center", fontSize: ".9rem" }}>← Volver al sitio</Link>
    </form>
  );
}
