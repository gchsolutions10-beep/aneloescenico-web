import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Portada, Prosa } from "@/components/Piezas";
import { getConfig } from "@/lib/datos";

export const metadata: Metadata = { title: "Sobre nosotros" };

export default async function Nosotros() {
  const { escuela } = await getConfig();
  return (
    <>
      <Portada ceja={escuela.lema} titulo={<>Sobre <em>nosotros</em></>} texto={escuela.descripcion} />
      {escuela.sobreNosotros && (
        <section className="seccion"><div className="contenedor"><Prosa texto={escuela.sobreNosotros} /></div></section>
      )}
      {escuela.directorNombre && (
        <section className="seccion">
          <div className="contenedor director">
            {escuela.directorFotoUrl && (
              <div className="retrato"><Image src={escuela.directorFotoUrl} alt={`Retrato de ${escuela.directorNombre}`} fill sizes="300px" /></div>
            )}
            <div>
              <span className="ceja">Dirección general</span>
              <h2>{escuela.directorNombre}</h2>
              <div style={{ marginTop: 16 }}><Prosa texto={escuela.directorBio} /></div>
            </div>
          </div>
        </section>
      )}
      <section className="seccion">
        <div className="contenedor">
          <h2>¿Quieres ser parte?</h2>
          <p className="tenue" style={{ margin: "12px 0 22px" }}>Conoce los niveles o escríbenos para resolver tus dudas.</p>
          <Link className="boton" href="/clases">Ver las clases</Link>{" "}
          <Link className="boton sec" href="/contacto">Contáctanos</Link>
        </div>
      </section>
    </>
  );
}
