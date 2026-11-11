import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Resultado } from "@/components/Ayuda";
import { db, schema } from "@/db";
import { accionConfirmarReporte, accionGenerarMensualidades, accionRechazarReporte } from "@/lib/acciones-escuela";
import { hoy, METODOS_ESCUELA, nombrePeriodo, periodoActual } from "@/lib/escuela";
import { exigirAdmin } from "@/lib/sesion";
import { bs, enlaceWhatsApp, fechaCorta, usd } from "@/lib/util";

export const metadata = { title: "Cobranza" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Cobranza({ searchParams }: Props) {
  await exigirAdmin();
  const q = await searchParams;
  const { reportesPago, usuarios, estudiantes, cargos } = schema;
  const [reportes, morosos, [mes]] = await Promise.all([
    db().select({ r: reportesPago, quien: usuarios.nombre, telefono: usuarios.telefono }).from(reportesPago).leftJoin(usuarios, eq(reportesPago.usuarioId, usuarios.id)).orderBy(desc(reportesPago.id)).limit(80),
    db().select({ e: estudiantes, debe: sql<string>`sum(${cargos.montoUsd})`, cuantos: sql<number>`count(*)::int`, desde: sql<string>`min(${cargos.venceEl})::text` })
      .from(cargos).innerJoin(estudiantes, eq(cargos.estudianteId, estudiantes.id)).where(sql`${cargos.estado} = 'pendiente' AND ${cargos.venceEl} < ${hoy()}::date`).groupBy(estudiantes.id).orderBy(sql`min(${cargos.venceEl})`),
    db().select({ total: sql<number>`count(*)::int`, pagadas: sql<number>`count(*) FILTER (WHERE ${cargos.estado} = 'pagado')::int`, cobrado: sql<string>`coalesce(sum(${cargos.montoUsd}) FILTER (WHERE ${cargos.estado} = 'pagado'), 0)`, porCobrar: sql<string>`coalesce(sum(${cargos.montoUsd}) FILTER (WHERE ${cargos.estado} IN ('pendiente', 'por_confirmar')), 0)` })
      .from(cargos).where(sql`${cargos.tipo} = 'mensualidad' AND ${cargos.periodo} = ${periodoActual()}`),
  ]);
  const pendientes = reportes.filter((x) => x.r.estado === "reportado").reverse();
  const cerrados = reportes.filter((x) => x.r.estado !== "reportado").slice(0, 30);

  return (
    <>
      <h1>Cobranza</h1>
      <Ayuda>
        <ol>
          <li><b>Pagos por confirmar:</b> busca en el banco la referencia y el monto en bolívares. Confirmar marca los cargos como pagados y emite el recibo numerado.</li>
          <li><b>En mora:</b> estudiantes con cargos vencidos sin pagar. Escríbele al representante desde aquí.</li>
          <li>Las mensualidades se generan solas cada mes para los estudiantes activos. El botón sirve para generarlas en el momento.</li>
        </ol>
      </Ayuda>
      <Resultado searchParams={searchParams} />
      {q.generadas != null && <p className="nota" role="status">{Number(q.generadas) > 0 ? `Se generaron ${q.generadas} mensualidades de ${nombrePeriodo(periodoActual())}.` : `Todos los estudiantes activos ya tenían su mensualidad de ${nombrePeriodo(periodoActual())}.`}</p>}

      <section className="cifras">
        <div className="cifra"><b>{mes.pagadas} de {mes.total}</b><span>Mensualidades de {nombrePeriodo(periodoActual())} pagadas</span></div>
        <div className="cifra"><b>{usd(mes.cobrado)}</b><span>Cobrado del mes</span></div>
        <div className="cifra"><b>{usd(mes.porCobrar)}</b><span>Por cobrar del mes</span></div>
        <div className="cifra"><b>{morosos.length}</b><span>Estudiantes en mora</span></div>
      </section>
      <form action={accionGenerarMensualidades}><button className="btn sec">Generar las mensualidades de {nombrePeriodo(periodoActual())}</button></form>

      <h2>Pagos por confirmar ({pendientes.length})</h2>
      {pendientes.length === 0 && <p className="tenue">No hay pagos pendientes.</p>}
      {pendientes.map(({ r, quien, telefono }) => (
        <article key={r.id} className="panel">
          <div className="cab"><h3>{quien ?? "Sin cuenta"}</h3><span className="tenue">{fechaCorta(r.creadoEl)}</span></div>
          <p style={{ margin: 0 }}>{METODOS_ESCUELA[r.metodo]} · Referencia <b style={{ userSelect: "all" }}>{r.referencia}</b> · {r.montoBs ? <b>{bs(r.montoBs)}</b> : null} <span className="tenue">{usd(r.montoUsd)}</span>{r.capturaUrl && <> · <a href={r.capturaUrl} target="_blank" rel="noopener">Ver captura ↗</a></>}</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>{r.detalle.map((d, i) => <li key={i}>{d.concepto} · {d.estudiante} · {usd(d.monto)}</li>)}</ul>
          <div className="acciones">
            <form action={accionConfirmarReporte}><input type="hidden" name="id" value={r.id} /><button className="btn">Confirmar pago</button></form>
            <form action={accionRechazarReporte} className="acciones"><input type="hidden" name="id" value={r.id} /><input name="motivo" required placeholder="Motivo del rechazo" aria-label="Motivo del rechazo" style={{ width: 220 }} /><button className="btn peligro">Rechazar</button></form>
            {telefono && <a className="btn sec chico" target="_blank" rel="noopener" href={enlaceWhatsApp(telefono)}>WhatsApp</a>}
          </div>
        </article>
      ))}

      <section className="panel">
        <h2>En mora</h2>
        {morosos.length === 0 ? <p className="tenue">Nadie está en mora.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Estudiante</th><th>Representante</th><th>Debe vencido</th><th>Desde</th><th></th></tr></thead>
            <tbody>
              {morosos.map(({ e, debe, cuantos, desde }) => (
                <tr key={e.id}>
                  <td><Link href={`/admin/estudiantes/${e.id}`}>{e.nombres} {e.apellidos}</Link></td>
                  <td>{e.repNombre || "—"}</td>
                  <td><b>{usd(debe)}</b> <span className="tenue">({cuantos} {cuantos === 1 ? "cargo" : "cargos"})</span></td>
                  <td>{fechaCorta(new Date(`${desde}T12:00:00-04:00`))}</td>
                  <td>{e.repTelefono && <a className="btn sec chico" target="_blank" rel="noopener" href={enlaceWhatsApp(e.repTelefono, `Hola ${e.repNombre}. Le escribimos de A-Nelo Escénico: ${e.nombres} tiene ${usd(debe)} pendiente. Puede pagarlo desde el portal del sitio. ¡Gracias!`)}>Recordar por WhatsApp</a>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      <section className="panel">
        <h2>Últimos pagos</h2>
        {cerrados.length === 0 ? <p className="tenue">Aún no hay pagos.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Fecha</th><th>Quién</th><th>Concepto</th><th>Pago</th><th>Monto</th><th></th></tr></thead>
            <tbody>
              {cerrados.map(({ r, quien }) => (
                <tr key={r.id}>
                  <td>{fechaCorta(r.creadoEl)}</td><td>{quien ?? "—"}</td><td>{r.detalle.map((d) => `${d.concepto} (${d.estudiante})`).join("; ")}</td>
                  <td>{METODOS_ESCUELA[r.metodo]}</td><td>{usd(r.montoUsd)}</td>
                  <td>{r.estado === "confirmado" ? <Link href={`/recibo/${r.id}`} target="_blank">Recibo {r.numeroRecibo} ↗</Link> : <span className="pastilla">Rechazado</span>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Cobranza {...props} /></Suspense>;
}
