import type { Metadata } from "next";
import { FormularioOlvide } from "@/components/Claves";
import "../../admin/admin.css";

export const metadata: Metadata = { title: "Olvidé mi clave", robots: { index: false } };

export default function Olvide() {
  return <main className="adm adm-ingreso"><FormularioOlvide /></main>;
}
