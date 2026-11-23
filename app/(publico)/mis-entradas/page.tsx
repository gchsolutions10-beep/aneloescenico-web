import type { Metadata } from "next";
import { Suspense } from "react";
import { ListaMisEntradas } from "@/components/MisCompras";
import { leerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mis entradas", robots: { index: false } };

/** Quien tiene la sesión del equipo ve además la opción de vaciar la lista. */
async function Lista() {
  const s = await leerSesion();
  return <ListaMisEntradas delEquipo={Boolean(s && s.rol !== "representante")} />;
}

export default function MisEntradas() {
  return (
    <section className="seccion">
      <div className="contenedor" style={{ maxWidth: 760, display: "grid", gap: 16 }}>
        <div>
          <span className="ceja">Tus compras en este teléfono</span>
          <h1 style={{ margin: "4px 0 0" }}>Mis entradas</h1>
        </div>
        <Suspense fallback={<ListaMisEntradas />}><Lista /></Suspense>
      </div>
    </section>
  );
}
