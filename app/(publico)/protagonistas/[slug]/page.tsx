import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Prosa } from "@/components/Piezas";
import { getProtagonista } from "@/lib/datos";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const a = await getProtagonista((await params).slug);
  return a ? { title: a.nombre, description: a.frase || `Ficha de ${a.nombre}, artista de la escuela.` } : {};
}

export default function Pagina({ params }: Props) {
  return <Suspense><Ficha params={params} /></Suspense>;
}

async function Ficha({ params }: Props) {
  const a = await getProtagonista((await params).slug);
  if (!a) notFound();
  return (
    <>
      <section className="portada-pagina">
        <div className="contenedor ficha-artista">
          <div className="retrato">{a.fotoUrl ? <Image src={a.fotoUrl} alt={`Retrato de ${a.nombre}`} fill sizes="320px" priority /> : <span>{a.nombre.slice(0, 1)}</span>}</div>
          <div>
            <span className="ceja">{a.egresado ? "Egresado de la escuela" : a.nivel ? `Nivel ${a.nivel}` : "Protagonista"}{a.desde ? ` · en la escuela desde ${a.desde}` : ""}</span>
            <h1>{a.nombre}</h1>
            {a.frase && <p style={{ fontStyle: "italic", fontSize: "1.25rem", color: "var(--texto)" }}>“{a.frase}”</p>}
            {a.gustos.length > 0 && <div className="gustos">{a.gustos.map((g) => <span key={g}>{g}</span>)}</div>}
          </div>
        </div>
      </section>

      {a.bio && <section className="seccion"><div className="contenedor"><Prosa texto={a.bio} /></div></section>}

      <section className="seccion">
        <div className="contenedor">
          <div className="cabecera-seccion"><div><span className="ceja">En escena</span><h2>Trayectoria</h2></div></div>
          {a.trayectoria.length === 0 ? <p className="tenue">Pronto, su primera obra.</p> : (
            <ol className="trayectoria">
              {a.trayectoria.map((t, i) => (
                <li key={i}>
                  <span className="anio">{t.anio}</span>
                  <div>
                    <Link href={`/funciones/${t.slug}`}><b>{t.titulo}</b></Link>
                    {t.personaje && <span className="papel">{t.personaje}</span>}
                    {t.descripcion && <p>{t.descripcion}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {a.galeria.length > 0 && (
        <section className="seccion">
          <div className="contenedor">
            <div className="cabecera-seccion"><div><span className="ceja">Momentos</span><h2>Galería</h2></div></div>
            <div className="galeria">{a.galeria.map((g) => <div key={g}><Image src={g} alt={`${a.nombre} en la escuela`} fill sizes="(max-width: 700px) 50vw, 280px" /></div>)}</div>
          </div>
        </section>
      )}
      <section className="seccion"><div className="contenedor"><Link href="/protagonistas">← Todos los Protagonistas</Link></div></section>
    </>
  );
}
