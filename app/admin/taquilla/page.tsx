import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { connection } from "next/server";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Encabezado, Resultado } from "@/components/Ayuda";
import Caja from "@/components/panel/Caja";
import PestanasCaja from "@/components/panel/PestanasCaja";
import { db, schema } from "@/db";
import { cambiarEstadoFuncion } from "@/lib/acciones";
import { getCupos } from "@/lib/datos";
import { hoy } from "@/lib/escuela";
import { esDinero, movimientos, resumir } from "@/lib/reportes";
import { exigirEquipo } from "@/lib/sesion";
import { estadoPlano, METODOS } from "@/lib/taquilla";
import { getTasa } from "@/lib/tasa";
import { bs, enlaceWhatsApp, fechaCorta, haceHoras, hora, usd } from "@/lib/util";

export const metadata = { title: "Taquilla" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Taquilla({ searchParams }: Props) {
  const s = await exigirEquipo();
  const q = await searchParams;
  await connection();
  const ayer = haceHoras(24);
  const [lista, cupos, tasa] = await Promise.all([
    db().select().from(schema.funciones).where(inArray(schema.funciones.estado, ["a_la_venta", "borrador"])).orderBy(asc(schema.funciones.fechaHora)),
    getCupos(),
    getTasa(),
  ]);
  // Las funciones que ya pasaron hace más de un día no se muestran.
  const vigentes = lista.filter((x) => !x.fechaHora || x.fechaHora > ayer);
  const enVenta = vigentes.filter((x) => x.estado === "a_la_venta");
  const borradores = vigentes.filter((x) => x.estado === "borrador");
  const f = enVenta.find((x) => x.id === Number(q.funcion)) ?? enVenta[0];
  const plano = f ? await estadoPlano(f) : null;

  // Tu caja de hoy: lo que cobraste tú, en taquilla y confirmando pagos.
  const dia = hoy();
  const [mios, ultimas] = await Promise.all([
    movimientos(dia, dia, s.id),
    db().select({ codigo: schema.ordenes.codigo, total: schema.ordenes.totalUsd, detalle: schema.ordenes.detalle, cliente: schema.ordenes.compradorNombre, creado: schema.ordenes.creadoEl, funcion: schema.funciones.titulo })
      .from(schema.ordenes).innerJoin(schema.funciones, eq(schema.funciones.id, schema.ordenes.funcionId))
      .where(and(eq(schema.ordenes.canal, "taquilla"), eq(schema.ordenes.vendedorId, s.id), gte(schema.ordenes.creadoEl, new Date(`${dia}T00:00:00-04:00`))))
      .orderBy(desc(schema.ordenes.creadoEl)).limit(5),
  ]);
  const dinero = mios.filter(esDinero);
  const totalHoy = dinero.reduce((a, m) => a + Number(m.usd), 0);

  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const [vendida] = q.vendida ? await db().select().from(schema.ordenes).where(eq(schema.ordenes.codigo, q.vendida)) : [];
  const [pagoVendida] = vendida ? await db().select().from(schema.pagos).where(eq(schema.pagos.ordenId, vendida.id)).orderBy(desc(schema.pagos.id)).limit(1) : [];

  return (
    <>
      <Encabezado titulo="Taquilla" descripcion={`Caja de ${s.nombre} · ${fechaCorta(new Date())}`}>
        <Link className="btn sec" href="/admin/validar">Validar entradas</Link>
      </Encabezado>
      <PestanasCaja actual="vender" />
      <Resultado searchParams={searchParams} />

      {vendida && (
        <section className="venta-lista" role="status">
          <span className="aviso-check" aria-hidden="true">✓</span>
          <div>
            <h2>Venta registrada</h2>
            <p>{vendida.detalle.length === 1 ? "Butaca" : "Butacas"} <b>{vendida.detalle.map((d) => d.numero).join(", ")}</b> · {usd(vendida.totalUsd)}{pagoVendida ? ` · ${METODOS[pagoVendida.metodo] ?? pagoVendida.metodo}` : ""}{vendida.compradorNombre !== "Venta en taquilla" ? ` · ${vendida.compradorNombre}` : ""}</p>
          </div>
          <div className="acciones">
            <Link className="btn" href={`/orden/${vendida.codigo}`} target="_blank">Imprimir entradas ↗</Link>
            <a className="btn sec" href={`/api/entradas/${vendida.codigo}`}>PDF</a>
            {vendida.telefono && <a className="btn sec" target="_blank" rel="noopener" href={enlaceWhatsApp(vendida.telefono, `Tus entradas de A-Nelo Escénico: ${base}/orden/${vendida.codigo}`)}>WhatsApp</a>}
          </div>
        </section>
      )}

      <section className="boletera" aria-label="Funciones">
        {enVenta.map((x) => {
          const c = cupos[x.id];
          return (
            <Link key={x.id} href={`/admin/taquilla?funcion=${x.id}`} className="boleto" aria-current={f?.id === x.id ? "true" : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.aficheUrl ? <img src={x.aficheUrl} alt="" /> : <span className="inicial" aria-hidden="true">{x.titulo.slice(0, 1)}</span>}
              <span>
                <b>{x.titulo}</b>
                <small>{x.fechaHora ? `${fechaCorta(x.fechaHora)} · ${hora(x.fechaHora)}` : "Fecha por anunciar"}</small>
                <small className={c && c.libres === 0 ? "agotado" : ""}>{c ? (c.libres === 0 ? "Agotada" : `${c.libres} libres de ${c.total}`) : "Sin plano"}</small>
              </span>
            </Link>
          );
        })}
        {borradores.map((x) => (
          <div key={x.id} className="boleto borrador">
            <span className="inicial" aria-hidden="true">{x.titulo.slice(0, 1)}</span>
            <span>
              <b>{x.titulo}</b>
              <small>{x.fechaHora ? `${fechaCorta(x.fechaHora)} · ${hora(x.fechaHora)}` : "Fecha por anunciar"}</small>
              {s.rol === "vendedor" ? <small>En borrador: un administrador debe ponerla a la venta.</small> : (
                <form action={cambiarEstadoFuncion}>
                  <input type="hidden" name="id" value={x.id} /><input type="hidden" name="estado" value="a_la_venta" />
                  <input type="hidden" name="volver" value={`/admin/taquilla?funcion=${x.id}`} />
                  <button className="btn chico sec">En borrador · Poner a la venta</button>
                </form>
              )}
            </span>
          </div>
        ))}
      </section>

      {enVenta.length === 0 && (
        <div className="panel vacio">
          <p>No hay funciones a la venta.{borradores.length > 0 ? " Las de arriba están en borrador: ponlas a la venta para poder vender." : ""}</p>
          {s.rol !== "vendedor" && <Link className="btn" href="/admin/funciones">Ir a Funciones</Link>}
        </div>
      )}

      {f && plano && (plano.butacas.length === 0
        ? <div className="panel vacio"><p>“{f.titulo}” todavía no tiene plano de butacas.</p>{s.rol !== "vendedor" && <Link className="btn" href={`/admin/funciones/${f.id}?tab=butacas`}>Configurar la sala</Link>}</div>
        : <Caja key={`${f.id}-${q.vendida ?? ""}`} funcion={{ id: f.id, titulo: f.titulo, cuando: f.fechaHora ? `${fechaCorta(f.fechaHora)} · ${hora(f.fechaHora)}` : "Fecha por anunciar" }} inicial={plano} tasa={tasa?.valor ?? null} puedeCortesia={s.rol !== "vendedor"} puedeReservadas={s.rol !== "vendedor"} />
      )}

      <section className="panel mi-caja">
        <div className="cab">
          <div><h2>Tu caja de hoy</h2><p className="tenue" style={{ fontSize: 13 }}>Lo que cobraste tú hoy: ventas de taquilla y pagos que confirmaste.</p></div>
          <Link className="btn sec" href="/admin/caja">Ver cierre de caja</Link>
        </div>
        <div className="mi-caja-cifras">
          <div className="principal"><b>{usd(totalHoy)}</b><span>Total recibido</span></div>
          {resumir(dinero, (m) => m.metodo).map((r) => <div key={r.clave}><b>{usd(r.usd)}</b><span>{METODOS[r.clave] ?? r.clave} · {r.n}{r.bs > 0 ? ` · ${bs(r.bs)}` : ""}</span></div>)}
        </div>
        {ultimas.length > 0 && (
          <div className="tabla"><table>
            <thead><tr><th>Hora</th><th>Venta</th><th>Total</th><th><span className="sr">Entradas</span></th></tr></thead>
            <tbody>{ultimas.map((o) => (
              <tr key={o.codigo}>
                <td>{hora(o.creado)}</td>
                <td>{o.funcion}<br /><span className="tenue">Butacas {o.detalle.map((d) => d.numero).join(", ")}{o.cliente !== "Venta en taquilla" ? ` · ${o.cliente}` : ""}</span></td>
                <td>{usd(o.total)}</td>
                <td style={{ textAlign: "right" }}><Link className="btn sec chico" href={`/orden/${o.codigo}`} target="_blank">Entradas ↗</Link></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>

      <Ayuda>
        <ol>
          <li>Elige la función arriba. Las que están en borrador aparecen apagadas: un administrador puede ponerlas a la venta desde aquí.</li>
          <li>Toca las butacas en el plano: se suman al ticket de la derecha (en el teléfono, debajo). La × de cada línea la quita.</li>
          <li>Elige la forma de pago. En efectivo, escribe lo que te dieron y la caja calcula el vuelto en dólares o bolívares.</li>
          <li>Pulsa <b>Cobrar</b>. Las butacas quedan vendidas y aparecen los botones para imprimir o enviar las entradas.</li>
          <li><b>Tu caja de hoy</b> suma todo lo que cobraste. Al terminar el turno, abre <b>Cierre de caja</b> y compáralo con el efectivo y el banco.</li>
        </ol>
      </Ayuda>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Taquilla {...props} /></Suspense>;
}
