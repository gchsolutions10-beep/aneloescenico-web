import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormularioMiClave, FormularioMiUsuario } from "@/components/Claves";
import { leerSesion } from "@/lib/sesion";
import "../admin/admin.css";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

async function Cuenta() {
  const s = await leerSesion();
  if (!s) redirect("/ingresar");
  const equipo = s.rol !== "representante";
  const soporte = equipo && s.correo === process.env.SOPORTE_USUARIO?.trim().toLowerCase();
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1 style={{ textAlign: "center", color: "#fff" }}>Mi cuenta</h1>
      {soporte ? <p className="panel">Esta es la cuenta de soporte técnico. Su usuario y su clave se cambian en Vercel (SOPORTE_USUARIO y SOPORTE_CLAVE).</p> : (
        <>
          {equipo && <FormularioMiUsuario actual={s.correo} />}
          <FormularioMiClave />
        </>
      )}
      <p style={{ textAlign: "center" }}><Link href={s.rol === "representante" ? "/portal" : "/admin"}>← Volver</Link></p>
    </div>
  );
}

export default function Pagina() {
  return <main className="adm adm-ingreso"><div style={{ width: "100%", maxWidth: 440 }}><Suspense><Cuenta /></Suspense></div></main>;
}
