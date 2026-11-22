import type { Metadata } from "next";
import { ListaMisEntradas } from "@/components/MisCompras";

export const metadata: Metadata = { title: "Mis entradas", robots: { index: false } };

export default function MisEntradas() {
  return (
    <section className="seccion">
      <div className="contenedor" style={{ maxWidth: 760, display: "grid", gap: 16 }}>
        <div>
          <span className="ceja">Tus compras en este teléfono</span>
          <h1 style={{ margin: "4px 0 0" }}>Mis entradas</h1>
        </div>
        <ListaMisEntradas />
      </div>
    </section>
  );
}
