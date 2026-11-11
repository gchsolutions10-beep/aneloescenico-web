import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ayuda, Resultado } from "@/components/Ayuda";
import SubirImagen from "@/components/SubirImagen";
import { db, schema } from "@/db";
import { guardarEntrada } from "@/lib/acciones";

export const metadata = { title: "Entrada del blog" };

const CATEGORIAS = ["Escuela", "Inscripciones", "Funciones", "Protagonistas", "Eventos"];

async function Entrada({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const e = id === "nueva" ? undefined : (await db().select().from(schema.entradasBlog).where(eq(schema.entradasBlog.id, Number(id) || 0)))[0];
  if (id !== "nueva" && !e) notFound();

  return (
    <>
      <div className="cab"><h1>{e ? "Editar entrada" : "Nueva entrada"}</h1><Link className="btn sec" href="/admin/blog">← Volver</Link></div>
      <Ayuda>
        <ol>
          <li>Escribe el título y un resumen corto (es lo que se ve en las tarjetas).</li>
          <li>En Contenido, deja una línea en blanco entre párrafos. Para un subtítulo, empieza la línea con ## y un espacio.</li>
          <li>La portada se recorta sola a formato panorámico.</li>
          <li>Marca Publicada para que salga en el sitio, y Destacada para que salga en Inicio.</li>
        </ol>
      </Ayuda>
      <Resultado searchParams={searchParams} errores={{ faltan: "Falta el título." }} />
      <form action={guardarEntrada} className="panel">
        <input type="hidden" name="id" value={e?.id ?? ""} />
        <div className="fila">
          <div className="campo"><label htmlFor="b-titulo">Título</label><input id="b-titulo" name="titulo" required defaultValue={e?.titulo} /></div>
          <div className="campo">
            <label htmlFor="b-cat">Categoría</label>
            <select id="b-cat" name="categoria" defaultValue={e?.categoria ?? "Escuela"}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
        </div>
        <div className="campo"><label htmlFor="b-ext">Resumen</label><input id="b-ext" name="extracto" maxLength={220} defaultValue={e?.extracto} /><small>Una o dos frases.</small></div>
        <SubirImagen nombre="portadaUrl" inicial={e?.portadaUrl} aspecto={16 / 9} ancho={1600} etiqueta="Portada" />
        <div className="campo"><label htmlFor="b-cont">Contenido</label><textarea id="b-cont" name="contenido" className="alto" defaultValue={e?.contenido} /></div>
        <label className="casilla"><input type="checkbox" name="publicada" defaultChecked={e?.publicada ?? false} /> Publicada (visible en el sitio)</label>
        <label className="casilla"><input type="checkbox" name="destacada" defaultChecked={e?.destacada ?? false} /> Destacada en Inicio</label>
        <div className="acciones">
          <button className="btn">Guardar</button>
          {e?.publicada && <Link className="btn sec" href={`/blog/${e.slug}`} target="_blank">Ver en el sitio ↗</Link>}
        </div>
      </form>
    </>
  );
}

export default function Pagina(props: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  return <Suspense fallback={<Cargando />}><Entrada {...props} /></Suspense>;
}
