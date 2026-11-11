import type { Metadata } from "next";
import { Suspense } from "react";
import FormularioContacto from "@/components/FormularioContacto";
import { Portada } from "@/components/Piezas";
import { getConfig } from "@/lib/datos";

export const metadata: Metadata = { title: "Contáctanos" };

export default async function Contacto() {
  const { escuela } = await getConfig();
  return (
    <>
      <Portada ceja="Estamos para ayudarte" titulo={<><em>Contáctanos</em></>} texto="Inscripciones, funciones o cualquier duda: escríbenos y te respondemos." />
      <section className="seccion">
        <div className="contenedor dos-columnas">
          <Suspense><FormularioContacto /></Suspense>
          <aside className="ficha-datos">
            <dl>
              {(escuela.direccion || escuela.ciudad) && <div><dt>Dónde estamos</dt><dd>{escuela.direccion || escuela.ciudad}</dd></div>}
              {escuela.telefono && <div><dt>Teléfono</dt><dd>{escuela.telefono}</dd></div>}
              {escuela.whatsapp && <div><dt>WhatsApp</dt><dd><a href={`https://wa.me/${escuela.whatsapp}`} target="_blank" rel="noopener">Escribir por WhatsApp</a></dd></div>}
              {escuela.correo && <div><dt>Correo</dt><dd><a href={`mailto:${escuela.correo}`}>{escuela.correo}</a></dd></div>}
              {escuela.instagram && <div><dt>Instagram</dt><dd><a href={`https://instagram.com/${escuela.instagram}`} target="_blank" rel="noopener">@{escuela.instagram}</a></dd></div>}
            </dl>
          </aside>
        </div>
      </section>
    </>
  );
}
