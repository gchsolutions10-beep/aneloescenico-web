import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioRestablecer } from "@/components/Claves";
import "../../admin/admin.css";

export const metadata: Metadata = { title: "Clave nueva", robots: { index: false } };

async function Formulario({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <FormularioRestablecer token={(await searchParams).t ?? ""} />;
}

export default function Restablecer({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <main className="adm adm-ingreso"><Suspense><Formulario searchParams={searchParams} /></Suspense></main>;
}
