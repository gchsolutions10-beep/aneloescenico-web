import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Portada } from "@/components/Piezas";
import { getProtagonistas } from "@/lib/datos";

export const metadata: Metadata = { title: "Protagonistas", description: "Los artistas de la escuela y su trayectoria." };

export default async function Protagonistas() {
  const lista = await getProtagonistas();
  return (
    <>
      <Portada ceja="Nuestros artistas" titulo={<>Los <em>Protagonistas</em></>} texto="Los artistas de la escuela, lo que les gusta y las obras en las que han subido al escenario." />
      <section className="seccion">
        <div className="contenedor">
          {lista.length === 0 ? (
            <p className="vacio">Estamos preparando las fichas de nuestros artistas. Mientras tanto, conoce sus funciones en la <Link href="/funciones">cartelera</Link>.</p>
          ) : (
            <div className="artistas">
              {lista.map((a) => (
                <Link key={a.slug} href={`/protagonistas/${a.slug}`} className="artista">
                  <div className="retrato">{a.fotoUrl ? <Image src={a.fotoUrl} alt="" fill sizes="(max-width: 700px) 50vw, 260px" /> : <span>{a.nombre.slice(0, 1)}</span>}</div>
                  <b>{a.nombre}</b>
                  <small>{a.egresado ? "Egresado" : a.nivel ? `Nivel ${a.nivel}` : ""}</small>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
