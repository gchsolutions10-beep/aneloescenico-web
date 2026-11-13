"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icono } from "./Icono";

type Props = {
  titulo: string;
  /** Texto del botón que lo abre. Sin él, no se muestra botón (se abre con `abierto`). */
  boton?: string;
  botonClase?: string;
  /** Abierto desde el inicio (por ejemplo, al editar con ?editar=). */
  abierto?: boolean;
  /** Al cerrar, ir a esta dirección (quita ?editar= de la URL). */
  alCerrar?: string;
  descripcion?: string;
  ancho?: number;
  children: React.ReactNode;
};

/**
 * Panel lateral para formularios: la página muestra primero la lista y el formulario se abre
 * con un botón. Tras guardar, la acción redirige y la página se vuelve a dibujar con el panel
 * cerrado (quien lo usa le da una `key` que cambia después de guardar).
 */
export default function Cajon({ titulo, boton, botonClase = "btn", abierto = false, alCerrar, descripcion, ancho = 560, children }: Props) {
  const [visible, setVisible] = useState(abierto);
  const router = useRouter();
  const panel = useRef<HTMLElement>(null);

  const cerrar = () => {
    setVisible(false);
    if (alCerrar) router.replace(alCerrar, { scroll: false });
  };

  useEffect(() => {
    if (!visible) return;
    const anterior = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea")?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", tecla); document.body.style.overflow = ""; anterior?.focus?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <>
      {boton && <button type="button" className={botonClase} onClick={() => setVisible(true)}>{botonClase === "btn" && <Icono nombre="mas" tam={16} grosor={2.2} />}{boton}</button>}
      {visible && (
        <div className="cajon-velo" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
          <section ref={panel} className="cajon" role="dialog" aria-modal="true" aria-label={titulo} style={{ width: `min(${ancho}px, 100%)` }}>
            <header className="cajon-cab">
              <div><h2>{titulo}</h2>{descripcion && <p>{descripcion}</p>}</div>
              <button type="button" className="btn-icono" onClick={cerrar} aria-label="Cerrar"><Icono nombre="cerrar" tam={16} grosor={2.2} /></button>
            </header>
            <div className="cajon-cuerpo">{children}</div>
          </section>
        </div>
      )}
    </>
  );
}
