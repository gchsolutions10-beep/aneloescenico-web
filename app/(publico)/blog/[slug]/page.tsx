import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Prosa } from "@/components/Piezas";
import { getEntrada } from "@/lib/datos";
import { fechaLarga } from "@/lib/util";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const e = await getEntrada((await params).slug);
  if (!e) return {};
  return { title: e.titulo, description: e.extracto, openGraph: { title: e.titulo, description: e.extracto, images: e.portadaUrl ? [e.portadaUrl] : undefined } };
}

export default function Pagina({ params }: Props) {
  return <Suspense><Entrada params={params} /></Suspense>;
}

async function Entrada({ params }: Props) {
  const e = await getEntrada((await params).slug);
  if (!e) notFound();
  return (
    <article>
      <header className="portada-pagina">
        <div className="contenedor">
          <span className="ceja">{e.categoria} · {fechaLarga(e.publicadaEl)}</span>
          <h1>{e.titulo}</h1>
          {e.extracto && <p>{e.extracto}</p>}
        </div>
      </header>
      <section className="seccion">
        <div className="contenedor">
          {e.portadaUrl && <div className="portada-entrada"><Image src={e.portadaUrl} alt="" fill sizes="(max-width: 900px) 100vw, 900px" priority /></div>}
          <Prosa texto={e.contenido} />
          <p style={{ marginTop: 40 }}><Link href="/blog">← Volver al blog</Link></p>
        </div>
      </section>
    </article>
  );
}
