import type { Metadata } from "next";
import Link from "next/link";
import { Portada } from "@/components/Piezas";

export const metadata: Metadata = { title: "Protagonistas" };

export default function Protagonistas() {
  return (
    <>
      <Portada ceja="Nuestros artistas" titulo={<>Los <em>Protagonistas</em></>} texto="Las fichas de los artistas de la escuela, con su trayectoria y las obras en las que han participado." />
      <section className="seccion">
        <div className="contenedor">
          <p className="vacio">Estamos preparando las fichas de nuestros artistas. Mientras tanto, conoce sus funciones en la <Link href="/funciones">cartelera</Link>.</p>
        </div>
      </section>
    </>
  );
}
