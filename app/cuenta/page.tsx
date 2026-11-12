import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormularioMiClave } from "@/components/Claves";
import { leerSesion } from "@/lib/sesion";
import "../admin/admin.css";

export const metadata: Metadata = { title: "Mi clave", robots: { index: false } };

async function Cuenta() {
  const s = await leerSesion();
  if (!s) redirect("/ingresar");
  return (
    <>
      <FormularioMiClave />
      <p style={{ textAlign: "center", marginTop: 16 }}><Link href={s.rol === "representante" ? "/portal" : "/admin"}>← Volver</Link></p>
    </>
  );
}

export default function Pagina() {
  return <main className="adm adm-ingreso"><div style={{ width: "100%", maxWidth: 400 }}><Suspense><Cuenta /></Suspense></div></main>;
}
