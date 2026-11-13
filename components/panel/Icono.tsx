import { ICONOS, type NombreIcono } from "./iconos";

export function Icono({ nombre, tam = 18, grosor = 1.8 }: { nombre: NombreIcono; tam?: number; grosor?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={nombre === "puntos" ? 3 : grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={ICONOS[nombre]} />
    </svg>
  );
}
