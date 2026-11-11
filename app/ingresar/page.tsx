import type { Metadata } from "next";
import { FormularioIngreso } from "@/components/AdminPiezas";
import "../admin/admin.css";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

export default function Ingresar() {
  return (
    <main className="adm adm-ingreso">
      <FormularioIngreso />
    </main>
  );
}
