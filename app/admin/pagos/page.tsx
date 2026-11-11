import { desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Resultado } from "@/components/Ayuda";
import { db, schema } from "@/db";
import { accionConfirmar, accionRechazar, accionReembolsar } from "@/lib/acciones-taquilla";
import { exigirEquipo } from "@/lib/sesion";
import { ESTADOS_ORDEN, limpiarVencidas, METODOS } from "@/lib/taquilla";
import { bs, enlaceWhatsApp, fechaCorta, hora, usd } from "@/lib/util";

export const metadata = { title: "Pagos" };
type Props = { searchParams: Promise<Record<string, string>> };

const ABIERTAS = ["por_confirmar", "en_conflicto", "reembolso_pendiente"];

async function Pagos({ searchParams }: Props) {
  const s = await exigirEquipo();
  await limpiarVencidas();
  const { ordenes, funciones, pagos } = schema;
  const filas = await db().select({ o: ordenes, titulo: funciones.titulo }).from(ordenes).innerJoin(funciones, eq(ordenes.funcionId, funciones.id))
    .where(inArray(ordenes.estado, [...ABIERTAS, "pagada", "rechazada", "reembolsada"])).orderBy(desc(ordenes.id)).limit(120);
  const delas = filas.length ? await db().select().from(pagos).where(inArray(pagos.ordenId, filas.map((x) => x.o.id))) : [];
  const pagosDe = (id: number) => delas.filter((p) => p.ordenId === id);
  const abiertas = filas.filter((x) => ABIERTAS.includes(x.o.estado)).reverse();
  const cerradas = filas.filter((x) => !ABIERTAS.includes(x.o.estado)).slice(0, 40);

  return (
    <>
      <h1>Pagos</h1>
      <Ayuda>
        <ol>
          <li>Abre tu banco y busca el pago por su <b>referencia</b> y su <b>monto en bolívares</b>. La captura es solo una ayuda: lo que cuenta es que el dinero esté en la cuenta.</li>
          <li>Si llegó, pulsa <b>Confirmar pago</b>: las butacas quedan vendidas y el comprador recibe sus entradas.</li>
          <li>Si no aparece, escribe el motivo y pulsa <b>Rechazar</b>: las butacas vuelven a quedar libres.</li>
          <li><b>Butacas ya no disponibles:</b> el comprador pagó tarde y sus butacas se vendieron. Él elige otras butacas o pide reembolso; cuando pida reembolso, devuélvele el dinero y márcalo aquí.</li>
        </ol>
      </Ayuda>
      <Resultado searchParams={searchParams} />

      <h2>Por atender ({abiertas.length})</h2>
      {abiertas.length === 0 && <p className="tenue">No hay pagos pendientes.</p>}
      {abiertas.map(({ o, titulo }) => (
        <article key={o.id} className="panel">
          <div className="cab">
            <h3>{o.compradorNombre || "Sin nombre"} · {titulo}</h3>
            <span className={`pastilla${o.estado === "por_confirmar" ? " oro" : ""}`}>{ESTADOS_ORDEN[o.estado]}</span>
          </div>
          <p style={{ margin: 0 }}>
            {o.detalle.length === 1 ? "Butaca" : "Butacas"} <b>{o.detalle.map((d) => `${d.numero} (${d.zona})`).join(", ")}</b> · Total <b>{usd(o.totalUsd)}</b>
            <span className="tenue"> · {fechaCorta(o.creadoEl)} {hora(o.creadoEl)}</span>
          </p>
          <div className="tabla"><table>
            <thead><tr><th>Método</th><th>Referencia</th><th>Monto</th><th>Captura</th></tr></thead>
            <tbody>
              {pagosDe(o.id).map((p) => (
                <tr key={p.id}>
                  <td>{METODOS[p.metodo]}</td>
                  <td><b style={{ userSelect: "all" }}>{p.referencia || "—"}</b></td>
                  <td>{p.montoBs ? <b>{bs(p.montoBs)}</b> : null} <span className="tenue">{usd(p.montoUsd)}</span></td>
                  <td>{p.capturaUrl ? <a href={p.capturaUrl} target="_blank" rel="noopener">Ver captura ↗</a> : <span className="tenue">Sin captura</span>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="acciones">
            {o.telefono && <a className="btn sec chico" target="_blank" rel="noopener" href={enlaceWhatsApp(o.telefono)}>WhatsApp: {o.telefono}</a>}
            {o.correo && <span className="tenue">{o.correo}</span>}
            <Link className="btn sec chico" href={`/orden/${o.codigo}`} target="_blank">Ver lo que ve el comprador ↗</Link>
          </div>
          {o.estado === "por_confirmar" && (
            <div className="acciones">
              <form action={accionConfirmar}><input type="hidden" name="id" value={o.id} /><button className="btn">Confirmar pago</button></form>
              <form action={accionRechazar} className="acciones"><input type="hidden" name="id" value={o.id} /><input name="motivo" placeholder="Motivo del rechazo" aria-label="Motivo del rechazo" required style={{ width: 240 }} /><button className="btn peligro">Rechazar</button></form>
            </div>
          )}
          {o.estado !== "por_confirmar" && (
            s.rol === "vendedor" ? <p className="tenue" style={{ margin: 0 }}>Un administrador debe procesar este caso.</p> : (
              <div className="acciones">
                <form action={accionReembolsar} className="acciones"><input type="hidden" name="id" value={o.id} /><input name="referencia" placeholder="Referencia del reembolso" aria-label="Referencia del reembolso" style={{ width: 240 }} /><button className="btn">Marcar como reembolsada</button></form>
                <form action={accionRechazar} className="acciones"><input type="hidden" name="id" value={o.id} /><input name="motivo" placeholder="El pago nunca llegó…" aria-label="Motivo del rechazo" required style={{ width: 200 }} /><button className="btn peligro">Rechazar (no hubo pago)</button></form>
              </div>
            )
          )}
          {o.estado === "en_conflicto" && <p className="tenue" style={{ margin: 0 }}>El comprador aún no ha elegido entre otras butacas o reembolso. Puedes escribirle por WhatsApp.</p>}
        </article>
      ))}

      <section className="panel">
        <h2>Últimos movimientos</h2>
        {cerradas.length === 0 ? <p className="tenue">Aún no hay ventas.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Fecha</th><th>Comprador</th><th>Función</th><th>Butacas</th><th>Pago</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>
              {cerradas.map(({ o, titulo }) => (
                <tr key={o.id}>
                  <td>{fechaCorta(o.creadoEl)}</td>
                  <td><Link href={`/orden/${o.codigo}`} target="_blank">{o.compradorNombre || "—"}</Link>{o.canal === "taquilla" && <> <span className="pastilla">Taquilla</span></>}</td>
                  <td>{titulo}</td>
                  <td>{o.detalle.map((d) => d.numero).join(", ")}</td>
                  <td>{pagosDe(o.id).map((p) => METODOS[p.metodo]).join(" + ")}</td>
                  <td>{usd(o.totalUsd)}</td>
                  <td><span className={`pastilla${o.estado === "pagada" ? " si" : ""}`}>{ESTADOS_ORDEN[o.estado]}</span></td>
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
  return <Suspense fallback={<Cargando />}><Pagos {...props} /></Suspense>;
}
