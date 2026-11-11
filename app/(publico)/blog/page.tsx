import type { Metadata } from "next";
import { Portada, TarjetaEntrada } from "@/components/Piezas";
import { getBlog } from "@/lib/datos";

export const metadata: Metadata = { title: "Blog", description: "Novedades de la escuela." };

export default async function Blog() {
  const entradas = await getBlog();
  return (
    <>
      <Portada ceja="Novedades" titulo={<>El <em>Blog</em> de la escuela</>} texto="Noticias, funciones, inscripciones y lo que pasa detrás del telón." />
      <section className="seccion">
        <div className="contenedor">
          {entradas.length === 0 ? <p className="vacio">Todavía no hay publicaciones.</p> : <div className="rejilla">{entradas.map((e) => <TarjetaEntrada key={e.id} e={e} />)}</div>}
        </div>
      </section>
    </>
  );
}
