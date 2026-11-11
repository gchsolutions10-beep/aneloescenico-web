import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Portada } from "@/components/Piezas";
import { FormularioInscripcion } from "@/components/Portal";
import { getNiveles } from "@/lib/datos";
import { exigirRepresentante } from "@/lib/sesion";

export const metadata: Metadata = { title: "Inscribir estudiante", robots: { index: false } };
type Props = { searchParams: Promise<Record<string, string>> };

async function Formulario({ searchParams }: Props) {
  await exigirRepresentante();
  const [niveles, q] = await Promise.all([getNiveles(), searchParams]);
  return <FormularioInscripcion niveles={niveles.map((n) => ({ id: n.id, nombre: n.nombre, edades: n.edades }))} nivelInicial={q.nivel} />;
}

export default function Inscribir(props: Props) {
  return (
    <>
      <Portada ceja="Portal de representantes" titulo={<>Inscribir <em>estudiante</em></>} texto="Llena los datos. La escuela revisa la solicitud y, al aprobarla, verás aquí la inscripción y la mensualidad para pagar." />
      <section className="seccion">
        <div className="contenedor" style={{ maxWidth: 560 }}>
          <Suspense fallback={<p className="tenue">Cargando…</p>}><Formulario {...props} /></Suspense>
          <p style={{ marginTop: 24 }}><Link href="/portal">← Volver al portal</Link></p>
        </div>
      </section>
    </>
  );
}
