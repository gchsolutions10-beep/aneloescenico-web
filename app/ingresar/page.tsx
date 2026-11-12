import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioIngreso } from "@/components/AdminPiezas";
import "../admin/admin.css";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

async function Aviso({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return (await searchParams).clave ? <p className="nota" role="status" style={{ marginBottom: 14 }}>Clave cambiada. Ya puedes ingresar con la nueva.</p> : null;
}

export default function Ingresar({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return (
    <main className="adm adm-ingreso">
      <div style={{ width: "100%", maxWidth: 380 }}>
        <Suspense><Aviso searchParams={searchParams} /></Suspense>
        <FormularioIngreso />
      </div>
    </main>
  );
}
