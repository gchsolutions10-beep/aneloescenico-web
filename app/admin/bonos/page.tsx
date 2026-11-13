import { desc } from "drizzle-orm";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Encabezado, Resultado } from "@/components/Ayuda";
import Cajon from "@/components/panel/Cajon";
import { db, schema } from "@/db";
import { accionAlternarBono, accionCrearBono } from "@/lib/acciones-taquilla";
import { exigirAdmin } from "@/lib/sesion";
import { fechaCorta, usd } from "@/lib/util";

export const metadata = { title: "Bonos de regalo" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Bonos({ searchParams }: Props) {
  await exigirAdmin();
  const q = await searchParams;
  const bonos = await db().select().from(schema.bonos).orderBy(desc(schema.bonos.id)).limit(200);
  return (
    <>
      <Encabezado titulo="Bonos de regalo" descripcion="Cupones con saldo en dólares para pagar entradas.">
        <Cajon key={q.nuevo ?? "nuevo"} titulo="Generar bono" boton="Generar bono" descripcion="Se crea un código único para entregar.">
      <form action={accionCrearBono} className="formulario-cajon">
          <div className="fila">
            <div className="campo"><label htmlFor="b-monto">Monto (USD)</label><input id="b-monto" name="monto" inputMode="decimal" required /></div>
            <div className="campo"><label htmlFor="b-para">Para quién es</label><input id="b-para" name="beneficiario" /></div>
            <div className="campo"><label htmlFor="b-vence">Vence el (opcional)</label><input id="b-vence" name="venceEl" type="date" /></div>
          </div>
          <div className="campo"><label htmlFor="b-nota">Nota interna</label><input id="b-nota" name="nota" placeholder="Premio de la rifa, cortesía a patrocinante…" /></div>
          <div className="cajon-pie"><button className="btn">Generar código</button></div>
        </form>
        </Cajon>
      </Encabezado>
      <Ayuda>
        <ul>
          <li>Un bono es un cupón con saldo en dólares. Quien lo tenga escribe el código al pagar sus entradas.</li>
          <li>Si el bono cubre toda la compra, las entradas salen al instante, sin esperar confirmación.</li>
          <li>Si cubre solo una parte, el resto se paga por Pago Móvil o transferencia. El saldo que sobre queda en el bono para otra compra.</li>
          <li>Si una compra se rechaza o se reembolsa, el saldo usado vuelve al bono.</li>
          <li>Desactiva un bono para que deje de servir (por ejemplo, si se perdió el código).</li>
        </ul>
      </Ayuda>
      <Resultado searchParams={searchParams} />
      {q.nuevo && (
        <section className="panel" role="status" style={{ background: "var(--a-ok-fondo)", borderColor: "#bfe3cd" }}>
          <span style={{ color: "var(--a-ok)", fontWeight: 600 }}>Bono creado. Entrega este código:</span>
          <b style={{ fontSize: "1.8rem", letterSpacing: ".16em", userSelect: "all", fontVariantNumeric: "tabular-nums" }}>{q.nuevo}</b>
        </section>
      )}


      <section className="panel">
        <h2>Bonos emitidos</h2>
        {bonos.length === 0 ? <p className="tenue">Aún no has generado bonos.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Código</th><th>Para</th><th>Monto</th><th>Saldo</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {bonos.map((b) => (
                <tr key={b.id}>
                  <td><b style={{ letterSpacing: ".08em", userSelect: "all" }}>{b.codigo}</b></td>
                  <td>{b.beneficiario || "—"}{b.nota && <><br /><span className="tenue">{b.nota}</span></>}</td>
                  <td>{usd(b.montoUsd)}</td>
                  <td><b>{usd(b.saldoUsd)}</b></td>
                  <td>{b.venceEl ? fechaCorta(b.venceEl) : "No vence"}</td>
                  <td><span className={`pastilla${b.activo && Number(b.saldoUsd) > 0 ? " si" : ""}`}>{!b.activo ? "Desactivado" : Number(b.saldoUsd) > 0 ? "Disponible" : "Usado"}</span></td>
                  <td><form action={accionAlternarBono}><input type="hidden" name="id" value={b.id} /><button className="btn sec chico">{b.activo ? "Desactivar" : "Reactivar"}</button></form></td>
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
  return <Suspense fallback={<Cargando />}><Bonos {...props} /></Suspense>;
}
