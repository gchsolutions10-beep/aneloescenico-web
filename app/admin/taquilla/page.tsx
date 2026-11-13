import { asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Resultado } from "@/components/Ayuda";
import PlanoButacas from "@/components/PlanoButacas";
import { db, schema } from "@/db";
import { accionVender } from "@/lib/acciones-taquilla";
import { exigirEquipo } from "@/lib/sesion";
import { estadoPlano } from "@/lib/taquilla";
import { getTasa } from "@/lib/tasa";
import { bs, enlaceWhatsApp, fechaCorta, hora, usd } from "@/lib/util";

export const metadata = { title: "Taquilla" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Taquilla({ searchParams }: Props) {
  const s = await exigirEquipo();
  const q = await searchParams;
  const funciones = await db().select().from(schema.funciones).where(eq(schema.funciones.estado, "a_la_venta")).orderBy(asc(schema.funciones.fechaHora));
  const f = funciones.find((x) => x.id === Number(q.funcion)) ?? (funciones.length === 1 ? funciones[0] : undefined);
  const [plano, tasa] = f ? await Promise.all([estadoPlano(f), getTasa()]) : [null, null];
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const [vendida] = q.vendida ? await db().select().from(schema.ordenes).where(eq(schema.ordenes.codigo, q.vendida)) : [];

  return (
    <>
      <h1>Taquilla</h1>
      <Ayuda>
        <ol>
          <li>Elige la función.</li>
          <li>Toca en el plano las butacas que pide el cliente. El plano se actualiza solo con lo que se vende en línea.</li>
          <li>Indica cómo paga y pulsa Vender. La venta queda pagada en el acto y se generan las entradas.</li>
          <li>Entrega las entradas: ábrelas para imprimir o envíalas por WhatsApp.</li>
        </ol>
        <p className="tenue" style={{ margin: "8px 0 0" }}>Una butaca rayada está apartada o esperando confirmación de pago: no se puede vender hasta que se libere.</p>
      </Ayuda>
      <Resultado searchParams={searchParams} />

      {vendida && (
        <section className="nota">
          <b>Venta registrada:</b> {vendida.detalle.length === 1 ? "butaca" : "butacas"} {vendida.detalle.map((d) => d.numero).join(", ")} · {usd(vendida.totalUsd)}
          <div className="acciones" style={{ marginTop: 10 }}>
            <Link className="btn" href={`/orden/${vendida.codigo}`} target="_blank">Abrir entradas ↗</Link>
            <a className="btn sec" href={`/api/entradas/${vendida.codigo}`}>Descargar PDF</a>
            {vendida.telefono && <a className="btn sec" target="_blank" rel="noopener" href={enlaceWhatsApp(vendida.telefono, `Tus entradas de A-Nelo Escénico: ${base}/orden/${vendida.codigo}`)}>Enviar por WhatsApp</a>}
          </div>
        </section>
      )}

      {funciones.length === 0 && <p className="tenue">No hay funciones a la venta. Un administrador debe poner una función en estado “A la venta”.</p>}
      {funciones.length > 1 && (
        <div className="acciones">
          {funciones.map((x) => <Link key={x.id} className={`btn${f?.id === x.id ? "" : " sec"}`} href={`/admin/taquilla?funcion=${x.id}`}>{x.titulo} · {fechaCorta(x.fechaHora)}</Link>)}
        </div>
      )}

      {f && plano && (plano.butacas.length === 0 ? <p className="tenue">Esta función todavía no tiene plano de butacas.</p> : (
        <form action={accionVender} className="panel" key={q.vendida ?? "venta"}>
          <div className="cab"><h2>{f.titulo}</h2><span className="tenue">{fechaCorta(f.fechaHora)} {hora(f.fechaHora)}{tasa ? ` · Tasa ${bs(tasa.valor)}` : ""}</span></div>
          <input type="hidden" name="funcionId" value={f.id} />
          <PlanoButacas funcionId={f.id} inicial={plano} max={30} tasa={tasa?.valor} />
          <div className="fila">
            <div className="campo"><label htmlFor="t-metodo">Forma de pago</label>
              <select id="t-metodo" name="metodo" defaultValue="efectivo">
                <option value="efectivo">Efectivo</option><option value="pago_movil">Pago Móvil</option><option value="transferencia">Transferencia</option>
                <option value="punto">Punto de venta</option><option value="bono">Solo bono de regalo</option>
                {s.rol !== "vendedor" && <option value="cortesia">Cortesía (sin cobro)</option>}
              </select>
            </div>
            <div className="campo"><label htmlFor="t-ref">Referencia (si aplica)</label><input id="t-ref" name="referencia" inputMode="numeric" autoComplete="off" /></div>
            <div className="campo"><label htmlFor="t-bono">Bono de regalo (si trae)</label><input id="t-bono" name="bono" autoCapitalize="characters" autoComplete="off" /></div>
          </div>
          <div className="fila">
            <div className="campo"><label htmlFor="t-nombre">Nombre del cliente (opcional)</label><input id="t-nombre" name="nombre" autoComplete="off" /></div>
            <div className="campo"><label htmlFor="t-tel">Teléfono (para enviarle las entradas)</label><input id="t-tel" name="telefono" type="tel" autoComplete="off" /></div>
          </div>
          <div><button className="btn">Vender</button></div>
        </form>
      ))}
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Taquilla {...props} /></Suspense>;
}
