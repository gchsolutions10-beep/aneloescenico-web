import Link from "next/link";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import { getConfig, getNiveles } from "@/lib/datos";

export default async function LayoutPublico({ children }: { children: React.ReactNode }) {
  const [{ escuela }, niveles] = await Promise.all([getConfig(), getNiveles()]);
  const logo = escuela.logoUrl || "/logo.png";
  const wa = escuela.whatsapp ? `https://wa.me/${escuela.whatsapp}` : "";
  return (
    <>
      <header className="cabecera">
        <Suspense fallback={<div className="nav contenedor" />}>
          <Nav nombre={escuela.nombre} logo={logo} niveles={niveles.map((n) => ({ slug: n.slug, nombre: n.nombre }))} />
        </Suspense>
      </header>
      <main>{children}</main>
      <footer className="pie">
        <div className="contenedor">
          <div className="columnas">
            <div>
              <h4>{escuela.nombre}</h4>
              <p className="tenue">{escuela.descripcion}</p>
            </div>
            <div>
              <h4>Escuela</h4>
              <ul>
                <li><Link href="/clases">Clases Actuación</Link></li>
                <li><Link href="/funciones">Funciones de Teatro</Link></li>
                <li><Link href="/blog">Blog</Link></li>
                <li><Link href="/nosotros">Sobre nosotros</Link></li>
              </ul>
            </div>
            <div>
              <h4>Contacto</h4>
              <ul>
                {escuela.direccion && <li>{escuela.direccion}</li>}
                {!escuela.direccion && escuela.ciudad && <li>{escuela.ciudad}</li>}
                {escuela.telefono && <li>{escuela.telefono}</li>}
                {wa && <li><a href={wa} target="_blank" rel="noopener">WhatsApp</a></li>}
                {escuela.instagram && <li><a href={`https://instagram.com/${escuela.instagram}`} target="_blank" rel="noopener">@{escuela.instagram}</a></li>}
                <li><Link href="/contacto">Escríbenos</Link></li>
              </ul>
            </div>
          </div>
          <div className="legal">
            <span>{escuela.nombre} · {escuela.lema}</span>
            <Link href="/ingresar">Acceso del equipo</Link>
          </div>
        </div>
      </footer>
      {wa && <a className="whatsapp" href={wa} target="_blank" rel="noopener">WhatsApp</a>}
    </>
  );
}
