import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { BotonBorrar } from "@/components/AdminPiezas";
import { Ayuda, Resultado } from "@/components/Ayuda";
import PlanoButacas from "@/components/PlanoButacas";
import SubirImagen from "@/components/SubirImagen";
import { db, schema } from "@/db";
import { accionBloquear, accionBorrarActor, accionCrearPlano, accionGuardarActor, accionGuardarVenta } from "@/lib/acciones-taquilla";
import { PLANOS } from "@/lib/planos";
import { exigirAdmin } from "@/lib/sesion";
import { enPreventa, estadoPlano } from "@/lib/taquilla";
import { aInputLocal, ESTADOS_FUNCION, fechaLarga, hora, usd } from "@/lib/util";

export const metadata = { title: "Venta y butacas" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

async function Detalle({ params, searchParams }: Props) {
  await exigirAdmin();
  const id = Number((await params).id) || 0;
  const [f] = await db().select().from(schema.funciones).where(eq(schema.funciones.id, id));
  if (!f) notFound();
  const [zonas, elenco, plano, [dinero]] = await Promise.all([
    db().select().from(schema.zonas).where(eq(schema.zonas.funcionId, id)).orderBy(asc(schema.zonas.orden)),
    db().select().from(schema.elenco).where(eq(schema.elenco.funcionId, id)).orderBy(asc(schema.elenco.orden), asc(schema.elenco.id)),
    estadoPlano(f),
    db().execute<{ cobrado: string; bonos: string }>(sql`
      SELECT coalesce(sum(p.monto_usd) FILTER (WHERE p.metodo <> 'bono'), 0) AS cobrado, coalesce(sum(p.monto_usd) FILTER (WHERE p.metodo = 'bono'), 0) AS bonos
      FROM pagos p JOIN ordenes o ON o.id = p.orden_id WHERE o.funcion_id = ${id} AND p.estado = 'confirmado'`).then((r) => r.rows),
  ]);
  const cuenta = (e: string) => plano.butacas.filter((b) => b.e === e).length;

  return (
    <>
      <div className="cab">
        <div>
          <h1>{f.titulo}</h1>
          <p className="tenue" style={{ margin: 0 }}>{fechaLarga(f.fechaHora)} {hora(f.fechaHora)} · <span className={`pastilla${f.estado === "a_la_venta" ? " si" : ""}`}>{ESTADOS_FUNCION[f.estado]}</span>{enPreventa(f) && <> <span className="pastilla oro">En preventa</span></>}</p>
        </div>
        <div className="acciones">
          <Link className="btn sec" href={`/admin/funciones?editar=${f.id}`}>Editar datos y afiche</Link>
          {f.estado !== "borrador" && <Link className="btn sec" href={`/funciones/${f.slug}`} target="_blank">Ver en el sitio ↗</Link>}
        </div>
      </div>
      <Ayuda>
        <ol>
          <li><b>Plano:</b> elige la sala. Se crean las butacas numeradas y las zonas VIP y General.</li>
          <li><b>Precios:</b> cada zona tiene precio de preventa y precio regular, en dólares. El de preventa rige hasta la fecha y hora que indiques; después se cobra el regular automáticamente.</li>
          <li><b>Butacas bloqueadas:</b> toca las que quieras sacar de la venta (invitados, técnica) y pulsa el botón. Tocar una bloqueada la devuelve a la venta.</li>
          <li><b>Elenco:</b> agrega a cada actor con su foto y personaje; aparecen en carrusel en la página de la función.</li>
          <li>Para vender, el estado de la función debe ser <b>A la venta</b> (se cambia en Editar datos y afiche).</li>
        </ol>
      </Ayuda>
      <Resultado searchParams={searchParams} />

      {zonas.length === 0 ? (
        <form action={accionCrearPlano} className="panel">
          <h2>Plano de la sala</h2>
          <p className="tenue" style={{ margin: 0 }}>Esta función aún no tiene butacas. Elige el plano para poder vender entradas.</p>
          <input type="hidden" name="id" value={f.id} />
          <div className="campo"><label htmlFor="v-plano">Plano</label>
            <select id="v-plano" name="plano">{Object.entries(PLANOS).map(([k, p]) => <option key={k} value={k}>{p.nombre}</option>)}</select>
          </div>
          <div><button className="btn">Crear butacas</button></div>
        </form>
      ) : (
        <>
          <section className="cifras">
            <div className="cifra"><b>{cuenta("vendida")}</b><span>Vendidas</span></div>
            <div className="cifra"><b>{cuenta("por_confirmar")}</b><span>Pago por confirmar</span></div>
            <div className="cifra"><b>{cuenta("apartada")}</b><span>Apartadas ahora</span></div>
            <div className="cifra"><b>{plano.libres}</b><span>Libres</span></div>
            <div className="cifra"><b>{usd(dinero.cobrado)}</b><span>Cobrado{Number(dinero.bonos) > 0 ? ` + ${usd(dinero.bonos)} en bonos` : ""}</span></div>
          </section>

          <form action={accionGuardarVenta} className="panel">
            <h2>Precios y preventa</h2>
            <input type="hidden" name="id" value={f.id} />
            <div className="tabla"><table>
              <thead><tr><th>Zona</th><th>Precio de preventa (USD)</th><th>Precio regular (USD)</th></tr></thead>
              <tbody>
                {zonas.map((z) => (
                  <tr key={z.id}>
                    <td><span className="pastilla" style={{ background: z.color, color: "#111" }}>{z.nombre}</span></td>
                    <td><input name={`pre_${z.id}`} inputMode="decimal" defaultValue={z.precioPreventa ?? ""} aria-label={`Precio de preventa ${z.nombre}`} /></td>
                    <td><input name={`reg_${z.id}`} inputMode="decimal" required defaultValue={z.precioRegular} aria-label={`Precio regular ${z.nombre}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <div className="fila">
              <div className="campo"><label htmlFor="v-hasta">Preventa hasta (fecha y hora de Venezuela)</label><input id="v-hasta" name="preventaHasta" type="datetime-local" defaultValue={aInputLocal(f.preventaHasta)} /><small>Déjalo vacío si no hay preventa.</small></div>
              <div className="campo"><label htmlFor="v-max">Máximo de butacas por compra en línea</label><input id="v-max" name="maxPorCompra" type="number" min={1} max={20} defaultValue={f.maxPorCompra} /></div>
            </div>
            <div><button className="btn">Guardar precios</button></div>
          </form>

          <form action={accionBloquear} className="panel" id="butacas">
            <h2>Butacas bloqueadas</h2>
            <p className="tenue" style={{ margin: 0 }}>Bloqueadas ahora: {cuenta("bloqueada")}. Las de borde dorado están bloqueadas.</p>
            <input type="hidden" name="id" value={f.id} />
            <PlanoButacas funcionId={f.id} inicial={plano} max={184} tocables={["libre", "bloqueada"]} />
            <div><button className="btn">Bloquear o liberar las elegidas</button></div>
          </form>
        </>
      )}

      <section className="panel" id="elenco">
        <h2>Elenco</h2>
        {elenco.length > 0 && (
          <div className="tabla"><table>
            <tbody>
              {elenco.map((a) => (
                <tr key={a.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <td style={{ width: 60 }}>{a.fotoUrl ? <img src={a.fotoUrl} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", display: "block" }} /> : <span className="tenue">—</span>}</td>
                  <td><b>{a.nombre}</b><br /><span className="tenue">{a.personaje}</span></td>
                  <td><form action={accionBorrarActor}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="funcionId" value={f.id} /><BotonBorrar que={`a ${a.nombre} del elenco`} /></form></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        <form action={accionGuardarActor} style={{ display: "grid", gap: 14 }}>
          <input type="hidden" name="funcionId" value={f.id} />
          <input type="hidden" name="orden" value={elenco.length + 1} />
          <div className="fila">
            <div className="campo"><label htmlFor="a-nombre">Nombre del actor</label><input id="a-nombre" name="nombre" required /></div>
            <div className="campo"><label htmlFor="a-pers">Personaje</label><input id="a-pers" name="personaje" /></div>
          </div>
          <SubirImagen nombre="fotoUrl" aspecto={1} ancho={400} etiqueta="Foto (opcional)" />
          <div><button className="btn sec">Agregar al elenco</button></div>
        </form>
      </section>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Detalle {...props} /></Suspense>;
}
