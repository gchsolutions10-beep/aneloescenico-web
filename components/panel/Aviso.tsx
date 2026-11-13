"use client";
import { useEffect, useState } from "react";
import { Icono } from "./Icono";

/** Aviso flotante de confirmación ("Guardado"). Se cierra solo a los 5 segundos. */
export default function Aviso({ mensaje }: { mensaje: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="aviso-flotante" role="status">
      <span className="aviso-check"><Icono nombre="check" tam={14} grosor={3} /></span>
      <span>{mensaje}</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Cerrar aviso">×</button>
    </div>
  );
}
