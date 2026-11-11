import type { Metadata } from "next";
import Link from "next/link";
import { Portada } from "@/components/Piezas";
import { getNiveles } from "@/lib/datos";

export const metadata: Metadata = { title: "Clases Actuación", description: "Niveles de formación teatral para niños y jóvenes." };

export default async function Clases() {
  const niveles = await getNiveles();
  return (
    <>
      <Portada ceja="Formación teatral" titulo={<>Clases <em>Actuación</em></>} texto="Cada grupo trabaja a su ritmo y cierra el ciclo con una muestra en teatro frente al público." />
      <section className="seccion">
        <div className="contenedor">
          {niveles.length === 0 ? (
            <p className="vacio">Pronto publicaremos los niveles y horarios.</p>
          ) : (
            <div className="niveles">
              {niveles.map((n) => (
                <Link key={n.id} href={`/clases/${n.slug}`} className="nivel">
                  {n.edades && <span className="edades">{n.edades}</span>}
                  <h3>{n.nombre}</h3>
                  <p>{n.descripcion}</p>
                  {n.horario && <p><strong>Horario:</strong> {n.horario}</p>}
                  <span className="ir">Ver nivel →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
