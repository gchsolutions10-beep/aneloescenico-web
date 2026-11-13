"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Icono } from "./Icono";
import { GRUPOS, itemDeRuta, puedeVer } from "./menu";

type Props = {
  nombre: string; rol: string; rolNombre: string;
  contadores: Record<string, number>;
  tasa: string | null;
  salir: () => Promise<void>;
  children: React.ReactNode;
};

const GUARDADO = "anelo-menu-cerrados";

// Grupos plegados: preferencia de esta persona en este navegador (sin almacenamiento, todos abiertos).
const leer = () => { try { return localStorage.getItem(GUARDADO) ?? "[]"; } catch { return "[]"; } };
const suscribir = (aviso: () => void) => { window.addEventListener("storage", aviso); window.addEventListener("anelo-menu", aviso); return () => { window.removeEventListener("storage", aviso); window.removeEventListener("anelo-menu", aviso); }; };

export default function Marco({ nombre, rol, rolNombre, contadores, tasa, salir, children }: Props) {
  const ruta = usePathname();
  const crudo = useSyncExternalStore(suscribir, leer, () => "[]");
  let cerrados: string[] = [];
  try { const v = JSON.parse(crudo); if (Array.isArray(v)) cerrados = v; } catch { /* valor dañado: todos abiertos */ }
  const [movil, setMovil] = useState(false);
  const alternar = (id: string) => {
    const nuevo = cerrados.includes(id) ? cerrados.filter((x) => x !== id) : [...cerrados, id];
    try { localStorage.setItem(GUARDADO, JSON.stringify(nuevo)); } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new Event("anelo-menu"));
  };

  const actual = itemDeRuta(ruta);
  const profundo = actual && ruta !== actual.item.href;
  const grupos = GRUPOS.map((g) => ({ ...g, items: g.items.filter((i) => puedeVer(i.quien, rol)) })).filter((g) => g.items.length);

  return (
    <div className="pm" data-movil={movil ? "abierto" : undefined}>
      <aside className="pm-lado" aria-label="Menú del panel">
        <div className="pm-marca">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={40} height={40} />
          <div><b>A-Nelo Escénico</b><span>Panel de la escuela</span></div>
          <button type="button" className="pm-cerrar-movil" onClick={() => setMovil(false)} aria-label="Cerrar menú"><Icono nombre="cerrar" /></button>
        </div>
        <nav className="pm-grupos">
          {grupos.map((g) => {
            const abierto = !g.titulo || !cerrados.includes(g.id) || g.items.some((i) => i.href === actual?.item.href);
            return (
              <div key={g.id} className="pm-grupo">
                {g.titulo && (
                  <button type="button" className="pm-titulo" aria-expanded={abierto} onClick={() => alternar(g.id)}>
                    <span>{g.titulo}</span><span className="pm-flecha" data-cerrado={!abierto || undefined}><Icono nombre="abajo" tam={14} grosor={2} /></span>
                  </button>
                )}
                {abierto && g.items.map((i) => {
                  const n = i.contador ? contadores[i.contador] ?? 0 : 0;
                  return (
                    <Link key={i.href} href={i.href} className="pm-item" aria-current={i.href === actual?.item.href ? "page" : undefined} onClick={() => setMovil(false)}>
                      <Icono nombre={i.icono} />
                      <span>{i.nombre}</span>
                      {n > 0 && <span className="pm-contador" aria-label={`${n} pendientes`}>{n}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="pm-pie">
          <Link href="/admin/manual" className="pm-item chico" aria-current={ruta === "/admin/manual" ? "page" : undefined}><Icono nombre="libro" /><span>Manual</span></Link>
          <Link href="/cuenta" className="pm-item chico"><Icono nombre="llave" /><span>Mi clave</span></Link>
          <a href="/" target="_blank" className="pm-item chico"><Icono nombre="externo" /><span>Ver el sitio</span></a>
          <form action={salir}><button className="pm-item chico"><Icono nombre="salir" /><span>Salir</span></button></form>
          <div className="pm-quien"><span aria-hidden="true">{nombre.slice(0, 1).toUpperCase()}</span><div><b>{nombre}</b><small>{rolNombre}</small></div></div>
        </div>
      </aside>
      {movil && <button type="button" className="pm-velo" aria-label="Cerrar menú" onClick={() => setMovil(false)} />}

      <div className="pm-principal">
        <header className="pm-barra">
          <button type="button" className="pm-abrir-movil" onClick={() => setMovil(true)} aria-label="Abrir menú"><Icono nombre="menu" /></button>
          <nav aria-label="Ruta" className="pm-ruta">
            <span>Panel</span>
            {actual?.grupo.titulo && <><span aria-hidden="true">/</span><span>{actual.grupo.titulo}</span></>}
            {actual && <><span aria-hidden="true">/</span>{profundo ? <Link href={actual.item.href}>{actual.item.nombre}</Link> : <strong>{actual.item.nombre}</strong>}</>}
            {profundo && <><span aria-hidden="true">/</span><strong>Detalle</strong></>}
          </nav>
          {tasa && <span className="pm-tasa">Tasa BCV · {tasa}</span>}
          <a href="/" target="_blank" className="pm-sitio">Ver el sitio ↗</a>
        </header>
        <div className="pm-contenido">{children}</div>
      </div>
    </div>
  );
}
