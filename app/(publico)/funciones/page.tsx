import type { Metadata } from "next";
import { Afiche, Portada } from "@/components/Piezas";
import { getFunciones } from "@/lib/datos";

export const metadata: Metadata = { title: "Funciones de Teatro", description: "Cartelera de funciones de la escuela." };

export default async function Funciones() {
  const { proximas, pasadas } = await getFunciones();
  return (
    <>
      <Portada ceja="Cartelera" titulo={<>Funciones de <em>Teatro</em></>} texto="Las obras que nuestros alumnos llevan a escena." />
      <section className="seccion">
        <div className="contenedor">
          {proximas.length === 0 ? (
            <p className="vacio">No hay funciones anunciadas por ahora. Vuelve pronto: el telón se abre de nuevo en cualquier momento.</p>
          ) : (
            <div className="cartelera">{proximas.map((f) => <Afiche key={f.id} f={f} />)}</div>
          )}
        </div>
      </section>
      {pasadas.length > 0 && (
        <section className="seccion">
          <div className="contenedor">
            <div className="cabecera-seccion"><div><span className="ceja">Archivo</span><h2>Funciones pasadas</h2></div></div>
            <div className="cartelera">{pasadas.map((f) => <Afiche key={f.id} f={f} />)}</div>
          </div>
        </section>
      )}
    </>
  );
}
