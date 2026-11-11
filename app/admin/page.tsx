import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { count, eq, isNotNull, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import Link from "next/link";
import { db, schema } from "@/db";
import { marcarAppInstalada } from "@/lib/acciones";
import { getConfig } from "@/lib/datos";

async function InicioAdmin() {
  const contar = (tabla: PgTable, donde?: SQL) => db().select({ n: count() }).from(tabla).where(donde).then((r) => r[0].n);
  const [{ escuela }, slides, publicadas, funciones, nivelesConMonto, sinLeer] = await Promise.all([
    getConfig(),
    contar(schema.carrusel),
    contar(schema.entradasBlog, eq(schema.entradasBlog.publicada, true)),
    contar(schema.funciones),
    contar(schema.niveles, isNotNull(schema.niveles.montoMensualidad)),
    contar(schema.mensajes, eq(schema.mensajes.leido, false)),
  ]);

  const pasos = [
    { hecho: Boolean(escuela.logoUrl), href: "/admin/apariencia", titulo: "Sube el logo y elige los colores", nota: "El logo también será el ícono de la app." },
    { hecho: Boolean(escuela.whatsapp || escuela.telefono), href: "/admin/configuracion", titulo: "Completa los datos de la escuela", nota: "Teléfono, WhatsApp, dirección y Sobre nosotros." },
    { hecho: slides > 0, href: "/admin/carrusel", titulo: "Sube las fotos del carrusel", nota: "Fotos grandes de las clases para la portada." },
    { hecho: nivelesConMonto > 0, href: "/admin/niveles", titulo: "Revisa los niveles, horarios y montos", nota: "Kids, Teen y Teenagers ya están creados." },
    { hecho: publicadas > 0, href: "/admin/blog/nueva", titulo: "Publica la primera novedad", nota: "Márcala como destacada para que salga en Inicio." },
    { hecho: funciones > 0, href: "/admin/funciones", titulo: "Anuncia tu primera función", nota: "Sube el afiche; se ajusta solo al formato de cartelera." },
  ];
  const hechos = pasos.filter((p) => p.hecho).length + (escuela.appInstalada ? 1 : 0);
  const total = pasos.length + 1;

  return (
    <>
      <h1>Hola, bienvenido al panel</h1>

      {hechos < total && (
        <section className="panel">
          <div className="cab"><h2>Primeros pasos</h2><span className="tenue">{hechos} de {total}</span></div>
          <div className="progreso"><i style={{ width: `${(hechos / total) * 100}%` }} /></div>
          <ol className="pasos">
            {pasos.map((p) => (
              <li key={p.href} className={p.hecho ? "hecho" : ""}>
                <Link href={p.href}><span className="tilde">{p.hecho ? "✓" : ""}</span><span>{p.titulo}<small>{p.nota}</small></span></Link>
              </li>
            ))}
            <li className={escuela.appInstalada ? "hecho" : ""}>
              <span>
                <span className="tilde">{escuela.appInstalada ? "✓" : ""}</span>
                <span>Instala la app en tu teléfono<small>En el navegador del teléfono: menú → “Agregar a pantalla de inicio”. <Link href="/admin/manual#app">Ver cómo</Link></small></span>
                {!escuela.appInstalada && <form action={marcarAppInstalada} style={{ marginLeft: "auto" }}><button className="btn sec chico">Ya la instalé</button></form>}
              </span>
            </li>
          </ol>
        </section>
      )}

      <section className="cifras">
        <Link className="cifra" href="/admin/mensajes"><b>{sinLeer}</b><span>Mensajes sin leer</span></Link>
        <Link className="cifra" href="/admin/blog"><b>{publicadas}</b><span>Entradas publicadas</span></Link>
        <Link className="cifra" href="/admin/funciones"><b>{funciones}</b><span>Funciones</span></Link>
        <Link className="cifra" href="/admin/carrusel"><b>{slides}</b><span>Fotos en el carrusel</span></Link>
      </section>

      <section className="panel">
        <h2>Lo que viene</h2>
        <p className="tenue" style={{ margin: 0 }}>Taquilla con plano de butacas, pagos, estudiantes, mensualidades y fichas de Protagonistas llegan en las siguientes fases. Aparecerán aquí en el menú cuando estén listas.</p>
      </section>
    </>
  );
}

export default function Pagina() {
  return <Suspense fallback={<Cargando />}><InicioAdmin /></Suspense>;
}
