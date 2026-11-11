import Image from "next/image";
import Link from "next/link";
import type { schema } from "@/db";
import { ESTADOS_FUNCION, fechaCorta, fechaLarga, hora } from "@/lib/util";

type Entrada = typeof schema.entradasBlog.$inferSelect;
type Funcion = typeof schema.funciones.$inferSelect & { enPreventa?: boolean };

export function TarjetaEntrada({ e }: { e: Entrada }) {
  return (
    <Link href={`/blog/${e.slug}`} className="tarjeta">
      <div className="foto">{e.portadaUrl && <Image src={e.portadaUrl} alt="" fill sizes="(max-width: 700px) 100vw, 380px" />}</div>
      <div className="cuerpo">
        <span className="categoria">{e.categoria}</span>
        <h3>{e.titulo}</h3>
        {e.extracto && <p>{e.extracto}</p>}
        <time dateTime={e.publicadaEl?.toISOString()}>{fechaLarga(e.publicadaEl)}</time>
      </div>
    </Link>
  );
}

export function Afiche({ f, cupo }: { f: Funcion; cupo?: { libres: number; total: number } }) {
  const enVenta = f.estado === "a_la_venta";
  const agotada = enVenta && cupo && cupo.libres === 0;
  const preventa = enVenta && f.enPreventa;
  const chip = agotada ? "Agotada" : preventa ? "Preventa" : (ESTADOS_FUNCION[f.estado] ?? f.estado);
  return (
    <article className="afiche">
      <Link href={`/funciones/${f.slug}`} className="img" aria-label={`${f.titulo}: ver función`}>
        <span className={`chip${enVenta && !agotada ? "" : " apagado"}`}>{chip}</span>
        {f.aficheUrl ? (
          <Image src={f.aficheUrl} alt={`Afiche de ${f.titulo}`} fill sizes="(max-width: 700px) 50vw, 260px" />
        ) : (
          <>
            <b>{f.titulo}</b>
            {f.subtitulo && <small>{f.subtitulo}</small>}
          </>
        )}
      </Link>
      <div className="datos">
        <strong>{fechaCorta(f.fechaHora)}{f.fechaHora ? ` · ${hora(f.fechaHora)}` : ""}</strong>
        <span className="titulo">{f.titulo}</span>
        {enVenta && cupo && cupo.total > 0 && (
          <>
            <span>{agotada ? "Entradas agotadas" : `Quedan ${cupo.libres} de ${cupo.total} entradas`}</span>
            <span className="aforo"><i style={{ width: `${Math.round(((cupo.total - cupo.libres) / cupo.total) * 100)}%` }} /></span>
          </>
        )}
      </div>
    </article>
  );
}

/** Texto del administrador: párrafos separados por línea en blanco; "## " abre un subtítulo. */
export function Prosa({ texto }: { texto: string }) {
  const bloques = texto.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="prosa">
      {bloques.map((b, i) => (b.startsWith("## ") ? <h2 key={i}>{b.slice(3)}</h2> : <p key={i}>{b}</p>))}
    </div>
  );
}

export function Portada({ ceja, titulo, texto }: { ceja: string; titulo: React.ReactNode; texto?: string }) {
  return (
    <header className="portada-pagina">
      <div className="contenedor">
        <span className="ceja">{ceja}</span>
        <h1>{titulo}</h1>
        {texto && <p>{texto}</p>}
      </div>
    </header>
  );
}
