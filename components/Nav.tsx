"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Opcion = { href: string; texto: string; sub?: { href: string; texto: string }[] };

export default function Nav({ nombre, logo, niveles }: { nombre: string; logo: string; niveles: { slug: string; nombre: string }[] }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);

  const opciones: Opcion[] = [
    { href: "/", texto: "Inicio" },
    { href: "/clases", texto: "Clases Actuación", sub: niveles.map((n) => ({ href: `/clases/${n.slug}`, texto: n.nombre })) },
    { href: "/funciones", texto: "Funciones de Teatro" },
    { href: "/protagonistas", texto: "Protagonistas" },
    { href: "/blog", texto: "Blog" },
    { href: "/nosotros", texto: "Sobre nosotros" },
    { href: "/contacto", texto: "Contáctanos" },
  ];
  const activa = (href: string) => (href === "/" ? ruta === "/" : ruta === href || ruta.startsWith(`${href}/`));

  return (
    <nav className={`nav contenedor${abierto ? " abierto" : ""}`} aria-label="Principal">
      <Link href="/" className="marca">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" width={46} height={46} />
        <span>{nombre}</span>
      </Link>
      <button type="button" className="hamburguesa" aria-expanded={abierto} aria-controls="menu-principal" onClick={() => setAbierto(!abierto)}>
        {abierto ? "Cerrar" : "Menú"}
      </button>
      <ul id="menu-principal" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setAbierto(false); }}>
        {opciones.map((o) => (
          <li key={o.href}>
            <Link href={o.href} aria-current={activa(o.href) ? "page" : undefined}>{o.texto}</Link>
            {o.sub && o.sub.length > 0 && (
              <div className="submenu">
                {o.sub.map((s) => <Link key={s.href} href={s.href}>{s.texto}</Link>)}
              </div>
            )}
          </li>
        ))}
        <li><Link href="/ingresar" className="ingresar">Ingresar</Link></li>
      </ul>
    </nav>
  );
}
