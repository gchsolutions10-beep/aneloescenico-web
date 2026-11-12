import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MenuAdmin } from "@/components/AdminPiezas";
import { salir } from "@/lib/acciones";
import { exigirEquipo } from "@/lib/sesion";
import "./admin.css";

export const metadata: Metadata = { title: { default: "Panel", template: "%s | Panel" }, robots: { index: false } };

const ROLES: Record<string, string> = { master: "Master", admin: "Administrador", vendedor: "Vendedor" };

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <div className="adm">
      <Suspense fallback={<p style={{ padding: 30 }}>Cargando el panel…</p>}>
        <Protegido>{children}</Protegido>
      </Suspense>
    </div>
  );
}

async function Protegido({ children }: { children: React.ReactNode }) {
  const s = await exigirEquipo();
  return (
    <div className="adm-marco">
      <nav className="adm-lado" aria-label="Panel">
        <div className="quien"><b>{s.nombre}</b><span>{ROLES[s.rol] ?? s.rol}</span></div>
        <MenuAdmin rol={s.rol} />
        <div className="sep">
          <Link href="/cuenta">Mi clave</Link>
          <Link href="/" target="_blank">Ver el sitio ↗</Link>
          <form action={salir}><button>Salir</button></form>
        </div>
      </nav>
      <div className="adm-cuerpo">{children}</div>
    </div>
  );
}
