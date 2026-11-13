"use client";
import { useEffect, useRef, useState } from "react";
import { Icono } from "./Icono";

/** Botón de tres puntos con un menú de acciones de la fila. */
export default function MenuFila({ etiqueta = "Más acciones", children }: { etiqueta?: string; children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      // Las ventanas de confirmación se dibujan dentro del menú; un clic en ellas no lo cierra.
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", tecla); };
  }, [abierto]);
  return (
    <div className="menu-fila" ref={caja}>
      <button type="button" className="btn-icono" style={{ background: "#fff", border: "1px solid #ddd6d0" }} aria-label={etiqueta} aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <Icono nombre="puntos" tam={16} />
      </button>
      {abierto && <div role="menu">{children}</div>}
    </div>
  );
}
