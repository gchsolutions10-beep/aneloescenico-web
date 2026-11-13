import { count, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { Suspense } from "react";
import Marco from "@/components/panel/Marco";
import { db, schema } from "@/db";
import { salir } from "@/lib/acciones";
import { exigirEquipo } from "@/lib/sesion";
import { getTasa } from "@/lib/tasa";
import { bs } from "@/lib/util";
import "./admin.css";

export const metadata: Metadata = { title: { default: "Panel", template: "%s | Panel" }, robots: { index: false } };

const ROLES: Record<string, string> = { master: "Administrador principal", admin: "Administrador", vendedor: "Vendedor" };

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <div className="adm">
      <Suspense fallback={<p className="pm-cargando">Cargando el panel…</p>}>
        <Protegido>{children}</Protegido>
      </Suspense>
    </div>
  );
}

async function Protegido({ children }: { children: React.ReactNode }) {
  const s = await exigirEquipo();
  const n = (q: Promise<{ n: number }[]>) => q.then((r) => r[0].n);
  const equipo = s.rol !== "vendedor";
  const [pagos, inscripciones, cobranza, mensajes, tasa] = await Promise.all([
    n(db().select({ n: count() }).from(schema.ordenes).where(inArray(schema.ordenes.estado, ["por_confirmar", "en_conflicto", "reembolso_pendiente"]))),
    equipo ? n(db().select({ n: count() }).from(schema.estudiantes).where(eq(schema.estudiantes.estado, "solicitud"))) : 0,
    equipo ? n(db().select({ n: count() }).from(schema.reportesPago).where(eq(schema.reportesPago.estado, "reportado"))) : 0,
    equipo ? n(db().select({ n: count() }).from(schema.mensajes).where(eq(schema.mensajes.leido, false))) : 0,
    getTasa().catch(() => null),
  ]);
  return (
    <Marco nombre={s.nombre} rol={s.rol} rolNombre={ROLES[s.rol] ?? s.rol} contadores={{ pagos, inscripciones, cobranza, mensajes }} tasa={tasa ? bs(tasa.valor) : null} salir={salir}>
      {children}
    </Marco>
  );
}
