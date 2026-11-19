"use client";

/** Imprime la página tal como se ve, sin el menú ni los botones. */
export default function Imprimir({ texto = "Imprimir" }: { texto?: string }) {
  return <button type="button" className="btn sec no-imprimir" onClick={() => window.print()}>{texto}</button>;
}
