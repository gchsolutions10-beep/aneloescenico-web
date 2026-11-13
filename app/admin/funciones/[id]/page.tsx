import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { BotonBorrar } from "@/components/panel/Confirmar";
import Cajon from "@/components/panel/Cajon";
import { Resultado } from "@/components/Ayuda";
import PlanoButacas from "@/components/PlanoButacas";
import SubirImagen from "@/components/SubirImagen";
import { db, schema } from "@/db";
import { accionBloquear, accionBorrarActor, accionCrearPlano, accionGuardarActor, accionGuardarVenta } from "@/lib/acciones-taquilla";
import { exigirAdmin } from "@/lib/sesion";
import { enPreventa, estadoPlano } from "@/lib/taquilla";
import { aInputLocal, ESTADOS_FUNCION, fechaLarga, hora, usd } from "@/lib/util";

export const metadata = { title: "Venta y butacas" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

type Alumno = { id: number; nombres: string; apellidos: string };

function FormActor({ funcionId, orden, alumnos }: { funcionId: number; orden: number; alumnos: Alumno[] }) {
  return (
        <form action={accionGuardarActor} className="formulario-cajon">
          <input type="hidden" name="funcionId" value={funcionId} />
          <input type="hidden" name="orden" value={orden} />
          <div className="fila">
            <div className="campo"><label htmlFor="a-est">¿Es estudiante de la escuela?</label>
              <select id="a-est" name="estudianteId" defaultValue=""><option value="">No (invitado)</option>{alumnos.map((a) => <option key={a.id} value={a.id}>{a.nombres} {a.apellidos}</option>)}</select>
              <small>Si lo eliges, esta obra aparece en la trayectoria de su ficha de Protagonista.</small>
            </div>
            <div className="campo"><label htmlFor="a-nombre">Nombre a mostrar</label><input id="a-nombre" name="nombre" /><small>Vacío = el nombre de su ficha.</small></div>
            <div className="campo"><label htmlFor="a-pers">Personaje</label><input id="a-pers" name="personaje" /></div>
          </div>
          <div className="campo"><label htmlFor="a-desc">Descripción del papel (opcional)</label><input id="a-desc" name="descripcion" /></div>
          <SubirImagen nombre="fotoUrl" aspecto={1} ancho={400} etiqueta="Foto (opcional; si es estudiante se usa la de su ficha)" />
          <div className="cajon-pie"><button className="btn">Agregar al elenco</button></div>
        </form>
  );
}

async function Detalle({ params, searchParams }: Props) {
  await exigirAdmin();
  const id = Number((await params).id) || 0;
  const [f] = await db().select().from(schema.funciones).where(eq(schema.funciones.id, id));
  if (!f) notFound();
  const [alumnos, salas, zonas, elenco, plano, [dinero]] = await Promise.all([
    db().select({ id: schema.estudiantes.id, nombres: schema.estudiantes.nombres, apellidos: schema.estudiantes.apellidos }).from(schema.estudiantes).where(sql`${schema.estudiantes.estado} IN ('activo', 'egresado')`).orderBy(asc(schema.estudiantes.nombres)),
    db().select().from(schema.salas).orderBy(asc(schema.salas.id)),
    db().select().from(schema.zonas).where(eq(schema.zonas.funcionId, id)).orderBy(asc(schema.zonas.orden)),
    db().select().from(schema.elenco).where(eq(schema.elenco.funcionId, id)).orderBy(asc(schema.elenco.orden), asc(schema.elenco.id)),
    estadoPlano(f),
    db().execute<{ cobrado: string; bonos: string }>(sql`
      SELECT coalesce(sum(p.monto_usd) FILTER (WHERE p.metodo <> 'bono'), 0) AS cobrado, coalesce(sum(p.monto_usd) FILTER (WHERE p.metodo = 'bono'), 0) AS bonos
      FROM pagos p JOIN ordenes o ON o.id = p.orden_id WHERE o.funcion_id = ${id} AND p.estado = 'confirmado'`).then((r) => r.rows),
  ]);
  const cuenta = (e: string) => plano.butacas.filter((b) => b.e === e).length;
  const q = await searchParams;
  const tab = ["butacas", "elenco"].includes(q.tab) ? q.tab : "venta";
  const base = `/admin/funciones/${f.id}`;

  return (
    <>
      <section className="panel ficha-cab">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {f.aficheUrl ? <img className="mini afiche" src={f.aficheUrl} alt="" style={{ width: 56 }} /> : <span className="inicial" aria-hidden="true">{f.titulo.slice(0, 1)}</span>}
        <div style={{ display: "grid", gap: 8, flex: "1 1 260px", minWidth: 0 }}>
          <h1 style={{ fontSize: "1.45rem" }}>{f.titulo}</h1>
          <div className="acciones">
            <span className="tenue" style={{ fontSize: 14 }}>{f.fechaHora ? `${fechaLarga(f.fechaHora)} · ${hora(f.fechaHora)}` : "Fecha por definir"}{f.plano ? ` · ${f.plano}` : ""}</span>
            <span className={`pastilla${f.estado === "a_la_venta" ? " si" : f.estado === "finalizada" ? " azul" : ""}`}>{ESTADOS_FUNCION[f.estado]}</span>
            {enPreventa(f) && <span className="pastilla oro">En preventa</span>}
          </div>
        </div>
        <div className="acciones">
          {f.estado === "a_la_venta" && zonas.length > 0 && <Link className="btn" href={`/admin/taquilla?funcion=${f.id}`}>Vender en taquilla</Link>}
          <Link className="btn sec" href={`/admin/funciones?editar=${f.id}`}>Editar datos</Link>
          {f.estado !== "borrador" && <Link className="btn sec" href={`/funciones/${f.slug}`} target="_blank">Ver en el sitio ↗</Link>}
        </div>
      </section>
      <Resultado searchParams={searchParams} />
      {f.estado === "borrador" && <p className="nota aviso">Es un borrador: no se ve en la cartelera. Para vender, cámbiala a A la venta en Editar datos.</p>}

      <nav className="subrayadas" aria-label="Secciones">
        <Link href={base} aria-current={tab === "venta" ? "page" : undefined}>Venta y precios</Link>
        <Link href={`${base}?tab=butacas`} aria-current={tab === "butacas" ? "page" : undefined}>Butacas{cuenta("bloqueada") ? ` (${cuenta("bloqueada")} bloqueadas)` : ""}</Link>
        <Link href={`${base}?tab=elenco`} aria-current={tab === "elenco" ? "page" : undefined}>Elenco ({elenco.length})</Link>
      </nav>

      {tab !== "elenco" && (zonas.length === 0 ? (
        <form action={accionCrearPlano} className="panel">
          <h2>Sala</h2>
          <p className="tenue" style={{ margin: 0 }}>Esta función aún no tiene butacas. Elige la sala para poder vender entradas.</p>
          <input type="hidden" name="id" value={f.id} />
          <div className="campo"><label htmlFor="v-plano">Sala</label>
            <select id="v-plano" name="sala">{salas.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select>
            <small>¿La función es en otro lugar? Crea su sala en <Link href="/admin/salas">Salas</Link>.</small>
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

          {tab === "venta" && <form action={accionGuardarVenta} className="panel">
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
          </form>}

          {tab === "butacas" && <form action={accionBloquear} className="panel" id="butacas">
            <h2>Butacas bloqueadas</h2>
            <p className="tenue" style={{ margin: 0 }}>Bloqueadas ahora: {cuenta("bloqueada")}. Las de borde dorado están bloqueadas.</p>
            <input type="hidden" name="id" value={f.id} />
            <PlanoButacas funcionId={f.id} inicial={plano} max={2000} tocables={["libre", "bloqueada"]} />
            <div><button className="btn">Bloquear o liberar las elegidas</button></div>
          </form>}
        </>
      ))}

      {tab === "elenco" && <section className="panel" id="elenco">
        <div className="cab">
          <div><h2>Elenco</h2><p className="tenue" style={{ fontSize: 13, marginTop: 3 }}>Aparece en carrusel en la página de la función. Los estudiantes enlazan a su ficha de Protagonista.</p></div>
          <Cajon key={q.ok ?? "actor"} titulo="Agregar al elenco" boton="Agregar actor">
            <FormActor funcionId={f.id} orden={elenco.length + 1} alumnos={alumnos} />
          </Cajon>
        </div>
        {elenco.length === 0 && <div className="vacio"><p>Todavía no hay actores en el elenco.</p></div>}
        {elenco.length > 0 && (
          <div className="tabla"><table>
            <tbody>
              {elenco.map((a) => (
                <tr key={a.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <td style={{ width: 60 }}>{a.fotoUrl ? <img src={a.fotoUrl} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", display: "block" }} /> : <span className="tenue">—</span>}</td>
                  <td><b>{a.nombre}</b><br /><span className="tenue">{a.personaje}</span></td>
                  <td><form action={accionBorrarActor}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="funcionId" value={f.id} /><BotonBorrar que={`a ${a.nombre} del elenco`} consecuencias={["Deja de aparecer en la página de la función y en su trayectoria."]} /></form></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>}
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Detalle {...props} /></Suspense>;
}
