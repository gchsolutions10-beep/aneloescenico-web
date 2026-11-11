import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { db, schema } from "@/db";
import { getConfig } from "@/lib/datos";
import { METODOS_ESCUELA } from "@/lib/escuela";
import { leerSesion } from "@/lib/sesion";
import { bs, fechaLarga, usd } from "@/lib/util";

export const metadata: Metadata = { title: "Recibo", robots: { index: false } };
type Props = { params: Promise<{ id: string }> };

async function Recibo({ params }: Props) {
  const s = await leerSesion();
  if (!s) redirect("/ingresar");
  const [r] = await db().select().from(schema.reportesPago).where(eq(schema.reportesPago.id, Number((await params).id) || 0));
  // Solo lo ve quien pagó o el equipo. A los demás se les responde igual que si no existiera.
  if (!r || r.estado !== "confirmado" || (s.rol === "representante" && r.usuarioId !== s.id)) notFound();
  const { escuela } = await getConfig();
  const [pagador] = r.usuarioId ? await db().select().from(schema.usuarios).where(eq(schema.usuarios.id, r.usuarioId)) : [];
  return (
    <>
      <div className="recibo">
        <div className="cab-recibo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}><img src={escuela.logoUrl || "/logo.png"} alt="" width={64} height={64} style={{ borderRadius: "50%" }} /><div><b style={{ fontSize: "1.2rem" }}>{escuela.nombre}</b><br /><small>{escuela.lema}{escuela.ciudad ? ` · ${escuela.ciudad}` : ""}</small></div></div>
          <div style={{ textAlign: "right" }}><small>Recibo de pago</small><div className="num">N.º {String(r.numeroRecibo).padStart(5, "0")}</div></div>
        </div>
        <p style={{ margin: 0 }}><small>Fecha</small><br />{fechaLarga(r.confirmadoEl)}</p>
        {pagador?.rol === "representante" && <p style={{ margin: "10px 0 0" }}><small>Recibimos de</small><br /><b>{pagador.nombre}</b>{pagador.cedula ? ` · C.I. ${pagador.cedula}` : ""}</p>}
        <table>
          <thead><tr><th>Concepto</th><th>Estudiante</th><th>Monto</th></tr></thead>
          <tbody>{r.detalle.map((d, i) => <tr key={i}><td>{d.concepto}</td><td>{d.estudiante}</td><td>{usd(d.monto)}</td></tr>)}</tbody>
          <tfoot><tr><th colSpan={2}>Total</th><th>{usd(r.montoUsd)}</th></tr></tfoot>
        </table>
        <p style={{ margin: 0 }}><small>Forma de pago</small><br />{METODOS_ESCUELA[r.metodo]}{r.referencia ? ` · referencia ${r.referencia}` : ""}{r.montoBs ? ` · ${bs(r.montoBs)} a la tasa BCV de ${bs(r.tasa!)}` : ""}</p>
        <p style={{ margin: "18px 0 0" }}><small>Comprobante interno de la escuela. No es una factura fiscal.</small></p>
      </div>
      <p className="no-imprimir tenue" style={{ textAlign: "center", marginTop: 18 }}>Para guardarlo como PDF, usa la opción Imprimir de tu navegador y elige “Guardar como PDF”.</p>
    </>
  );
}

export default function Pagina(props: Props) {
  return <section className="seccion"><div className="contenedor"><Suspense fallback={<p className="tenue">Cargando el recibo…</p>}><Recibo {...props} /></Suspense></div></section>;
}
