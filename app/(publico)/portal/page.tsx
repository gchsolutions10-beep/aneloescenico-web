import { and, desc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PagarCargos } from "@/components/Portal";
import { db, schema } from "@/db";
import { salir } from "@/lib/acciones";
import { getConfig } from "@/lib/datos";
import { estadoCargo, ESTADOS_ESTUDIANTE, generarMensualidades, METODOS_ESCUELA, NOMBRE_ESTADO_CARGO, periodoActual } from "@/lib/escuela";
import { exigirRepresentante } from "@/lib/sesion";
import { getTasa } from "@/lib/tasa";
import { fechaCorta, usd } from "@/lib/util";

export const metadata: Metadata = { title: "Portal de representantes", robots: { index: false } };
type Props = { searchParams: Promise<Record<string, string>> };

const dia = (f: string) => fechaCorta(new Date(`${f}T12:00:00-04:00`));
const CLASE: Record<string, string> = { pagado: "ok", en_mora: "alerta", por_confirmar: "espera", activo: "ok", solicitud: "espera", confirmado: "ok", rechazado: "alerta", reportado: "espera" };

async function Portal({ searchParams }: Props) {
  const s = await exigirRepresentante();
  const [{ cobros }, q] = await Promise.all([getConfig(), searchParams]);
  // Al entrar se asegura que la mensualidad del mes ya exista.
  await generarMensualidades(periodoActual(), cobros.diaVencimiento);
  const { estudiantes, cargos, niveles, reportesPago } = schema;
  const mios = await db().select({ e: estudiantes, nivel: niveles.nombre }).from(estudiantes).leftJoin(niveles, eq(estudiantes.nivelId, niveles.id)).where(eq(estudiantes.representanteId, s.id)).orderBy(estudiantes.id);
  const ids = mios.map((m) => m.e.id);
  const [susCargos, pagos, tasa] = await Promise.all([
    ids.length ? db().select().from(cargos).where(and(inArray(cargos.estudianteId, ids), inArray(cargos.estado, ["pendiente", "por_confirmar", "pagado"]))).orderBy(cargos.venceEl) : [],
    db().select().from(reportesPago).where(eq(reportesPago.usuarioId, s.id)).orderBy(desc(reportesPago.id)).limit(24),
    getTasa(),
  ]);
  const nombre = (id: number) => { const m = mios.find((x) => x.e.id === id)!.e; return `${m.nombres} ${m.apellidos}`; };
  const pendientes = susCargos.filter((c) => c.estado === "pendiente");

  return (
    <div className="formulario">
      <div className="cabecera-seccion" style={{ marginBottom: 0 }}>
        <div><span className="ceja">Portal de representantes</span><h1>Hola, {s.nombre.split(" ")[0]}</h1></div>
        <form action={salir}><button className="boton sec">Salir</button></form>
      </div>
      {q.solicitud && <p className="aviso" role="status">Recibimos la solicitud de inscripción. La escuela la revisará y aquí verás la respuesta.</p>}
      {q.reportado && <p className="aviso" role="status">Recibimos tu reporte de pago. Lo verificaremos y aquí aparecerá tu recibo.</p>}

      <div className="caja">
        <div className="cabecera-seccion" style={{ marginBottom: 0 }}><h2>Mis estudiantes</h2><Link href="/portal/inscribir">Inscribir a otro estudiante →</Link></div>
        {mios.length === 0 ? <p className="tenue" style={{ margin: 0 }}>Aún no has inscrito a nadie. <Link href="/portal/inscribir">Inscribe a tu primer estudiante</Link>.</p> : (
          <div className="desliza"><table className="tabla-simple"><tbody>
            {mios.map(({ e, nivel }) => (
              <tr key={e.id}>
                <td><b>{e.nombres} {e.apellidos}</b><br /><span className="tenue">{nivel ? `Nivel ${nivel}` : "Sin nivel"}{e.becaPct > 0 ? ` · Beca ${e.becaPct}%` : ""}</span></td>
                <td><span className={`etiqueta ${CLASE[e.estado] ?? ""}`}>{e.estado === "solicitud" ? "Solicitud en revisión" : ESTADOS_ESTUDIANTE[e.estado]}</span></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>

      {pendientes.length > 0 && (
        <div className="caja">
          <h2>Por pagar</h2>
          <PagarCargos tasa={tasa?.valor ?? null} cobros={cobros} cargos={pendientes.map((c) => ({ id: c.id, estudiante: nombre(c.estudianteId), concepto: c.concepto, monto: Number(c.montoUsd), vence: dia(c.venceEl), enMora: estadoCargo(c) === "en_mora" }))} />
        </div>
      )}
      {mios.some((m) => m.e.estado === "activo") && pendientes.length === 0 && <p className="aviso">Estás al día: no tienes pagos pendientes.</p>}

      {susCargos.length > 0 && (
        <div className="caja">
          <h2>Estado de cuenta</h2>
          <div className="desliza"><table className="tabla-simple">
            <thead><tr><th>Concepto</th><th>Vence</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>
              {[...susCargos].reverse().map((c) => { const est = estadoCargo(c); return (
                <tr key={c.id}><td>{c.concepto}<br /><span className="tenue">{nombre(c.estudianteId)}</span></td><td>{dia(c.venceEl)}</td><td>{usd(c.montoUsd)}</td><td><span className={`etiqueta ${CLASE[est] ?? ""}`}>{NOMBRE_ESTADO_CARGO[est]}</span></td></tr>
              ); })}
            </tbody>
          </table></div>
        </div>
      )}

      {pagos.length > 0 && (
        <div className="caja">
          <h2>Mis pagos y recibos</h2>
          <div className="desliza"><table className="tabla-simple">
            <thead><tr><th>Fecha</th><th>Pago</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id}>
                  <td>{fechaCorta(p.creadoEl)}</td>
                  <td>{METODOS_ESCUELA[p.metodo]}{p.referencia ? ` · ref. ${p.referencia}` : ""}<br /><span className="tenue">{p.detalle.map((d) => d.concepto).join(", ")}</span></td>
                  <td>{usd(p.montoUsd)}</td>
                  <td>{p.estado === "confirmado" ? <Link href={`/recibo/${p.id}`}>Ver recibo N.º {p.numeroRecibo}</Link> : <span className={`etiqueta ${CLASE[p.estado]}`}>{p.estado === "reportado" ? "Verificando" : `Rechazado: ${p.nota}`}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}

export default function Pagina(props: Props) {
  return (
    <section className="seccion"><div className="contenedor" style={{ maxWidth: 900 }}>
      <Suspense fallback={<p className="tenue">Cargando tu portal…</p>}><Portal {...props} /></Suspense>
    </div></section>
  );
}
