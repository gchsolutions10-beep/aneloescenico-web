import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Portada, Prosa } from "@/components/Piezas";
import { getNivel } from "@/lib/datos";
import { monto } from "@/lib/util";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const n = await getNivel((await params).slug);
  return n ? { title: `Nivel ${n.nombre}`, description: n.descripcion } : {};
}

export default function Pagina({ params }: Props) {
  return <Suspense><Nivel params={params} /></Suspense>;
}

async function Nivel({ params }: Props) {
  const n = await getNivel((await params).slug);
  if (!n) notFound();
  const inscripcion = monto(n.montoInscripcion);
  const mensualidad = monto(n.montoMensualidad);
  return (
    <>
      <Portada ceja={n.edades || "Clases Actuación"} titulo={<>Nivel <em>{n.nombre}</em></>} />
      <section className="seccion">
        <div className="contenedor dos-columnas">
          <div>
            {n.imagenUrl && (
              <div className="portada-entrada"><Image src={n.imagenUrl} alt={`Clase del nivel ${n.nombre}`} fill sizes="(max-width: 820px) 100vw, 700px" /></div>
            )}
            <Prosa texto={n.descripcion} />
          </div>
          <aside className="ficha-datos">
            <dl>
              {n.edades && <div><dt>Edades</dt><dd>{n.edades}</dd></div>}
              {n.horario && <div><dt>Horario</dt><dd>{n.horario}</dd></div>}
              {inscripcion && <div><dt>Inscripción</dt><dd>{inscripcion}</dd></div>}
              {mensualidad && <div><dt>Mensualidad</dt><dd>{mensualidad}</dd></div>}
            </dl>
            <Link className="boton" href={`/contacto?nivel=${encodeURIComponent(n.nombre)}`}>Quiero inscribir</Link>
            <p className="tenue" style={{ margin: 0, fontSize: ".85rem" }}>Escríbenos y te contamos los pasos para inscribir.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
