import type { Metadata } from "next";
import { Suspense } from "react";
import { Portada } from "@/components/Piezas";
import { FormularioRegistro } from "@/components/Portal";

export const metadata: Metadata = { title: "Crear cuenta de representante" };

async function Formulario({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return <FormularioRegistro nivel={(await searchParams).nivel} />;
}

export default function Registro({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  return (
    <>
      <Portada ceja="Portal de representantes" titulo={<>Crea tu <em>cuenta</em></>} texto="Con tu cuenta inscribes a tus hijos, ves el estado de cuenta, reportas los pagos y descargas los recibos." />
      <section className="seccion"><div className="contenedor" style={{ maxWidth: 560 }}><Suspense><Formulario searchParams={searchParams} /></Suspense></div></section>
    </>
  );
}
