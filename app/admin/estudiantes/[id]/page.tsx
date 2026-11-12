import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { BotonBorrar } from "@/components/AdminPiezas";
import { Ayuda, Resultado } from "@/components/Ayuda";
import { db, schema } from "@/db";
import { accionAnularCargo, agregarCargo, cobrarEnEscuela, darAccesoPortal, guardarEstudiante, quitarAccesoPortal } from "@/lib/acciones-escuela";
import { restablecerClaveRepresentante } from "@/lib/acciones-clave";
import { estadoCargo, ESTADOS_ESTUDIANTE, NOMBRE_ESTADO_CARGO } from "@/lib/escuela";
import { exigirAdmin } from "@/lib/sesion";
import { enlaceWhatsApp, fechaCorta, usd } from "@/lib/util";

export const metadata = { title: "Ficha del estudiante" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };
const dia = (f: string) => fechaCorta(new Date(`${f}T12:00:00-04:00`));

async function Ficha({ params, searchParams }: Props) {
  await exigirAdmin();
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const { estudiantes, cargos, niveles, usuarios } = schema;
  const e = id === "nuevo" ? undefined : (await db().select().from(estudiantes).where(eq(estudiantes.id, Number(id) || 0)))[0];
  if (id !== "nuevo" && !e) notFound();
  const [lista, susCargos, [cuenta]] = await Promise.all([
    db().select().from(niveles).orderBy(asc(niveles.orden)),
    e ? db().select().from(cargos).where(eq(cargos.estudianteId, e.id)).orderBy(desc(cargos.venceEl), desc(cargos.id)) : [],
    e?.representanteId ? db().select().from(usuarios).where(eq(usuarios.id, e.representanteId)) : [],
  ]);
  const pendientes = susCargos.filter((c) => c.estado === "pendiente");

  return (
    <>
      <div className="cab">
        <h1>{e ? `${e.nombres} ${e.apellidos}` : "Nuevo estudiante"}</h1>
        <div className="acciones">
          {e && e.estado !== "solicitud" && <Link className="btn sec" href={`/admin/protagonistas/${e.id}`}>Ficha de Protagonista</Link>}
          <Link className="btn sec" href={e?.estado === "solicitud" ? "/admin/inscripciones" : "/admin/estudiantes"}>← Volver</Link>
        </div>
      </div>
      <Ayuda>
        <ul>
          <li><b>Beca:</b> porcentaje de descuento sobre la mensualidad. Aplica a las mensualidades que se generen desde ahora.</li>
          <li><b>Estado:</b> solo a los activos se les genera mensualidad cada mes.</li>
          <li><b>Acceso al portal:</b> crea la cuenta del representante para que vea el estado de cuenta, reporte pagos y descargue recibos.</li>
          <li><b>Cobrar en la escuela:</b> marca los cargos, elige cómo pagó y se emite el recibo en el acto.</li>
          <li>Las notas internas no las ve el representante.</li>
        </ul>
      </Ayuda>
      <Resultado searchParams={searchParams} />
      {q.recibo && <p className="nota" role="status">Pago registrado. <Link href={`/recibo/${q.recibo}`} target="_blank">Abrir el recibo para imprimir ↗</Link></p>}
      {e?.estado === "solicitud" && <p className="nota">Esta es una solicitud sin aprobar. Corrige lo que haga falta, guarda y apruébala en <Link href="/admin/inscripciones">Inscripciones</Link>.</p>}

      <form action={guardarEstudiante} className="panel">
        <h2>Datos</h2>
        <input type="hidden" name="id" value={e?.id ?? ""} />
        <div className="fila">
          <div className="campo"><label htmlFor="es-nom">Nombres</label><input id="es-nom" name="nombres" required defaultValue={e?.nombres} /></div>
          <div className="campo"><label htmlFor="es-ape">Apellidos</label><input id="es-ape" name="apellidos" required defaultValue={e?.apellidos} /></div>
          <div className="campo"><label htmlFor="es-nac">Fecha de nacimiento</label><input id="es-nac" name="fechaNacimiento" type="date" defaultValue={e?.fechaNacimiento ?? ""} /></div>
        </div>
        <div className="fila">
          <div className="campo"><label htmlFor="es-niv">Nivel</label>
            <select id="es-niv" name="nivelId" defaultValue={e?.nivelId ?? ""} required><option value="" disabled>Elige</option>{lista.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select>
          </div>
          <div className="campo"><label htmlFor="es-beca">Beca o descuento (%)</label><input id="es-beca" name="becaPct" type="number" min={0} max={100} defaultValue={e?.becaPct ?? 0} /></div>
          {e && e.estado !== "solicitud" && (
            <div className="campo"><label htmlFor="es-est">Estado</label>
              <select id="es-est" name="estado" defaultValue={e.estado}>{["activo", "retirado", "egresado"].map((x) => <option key={x} value={x}>{ESTADOS_ESTUDIANTE[x]}</option>)}</select>
            </div>
          )}
        </div>
        <h2>Representante</h2>
        <div className="fila">
          <div className="campo"><label htmlFor="es-rn">Nombre</label><input id="es-rn" name="repNombre" defaultValue={e?.repNombre} /></div>
          <div className="campo"><label htmlFor="es-rc">Cédula</label><input id="es-rc" name="repCedula" defaultValue={e?.repCedula} /></div>
          <div className="campo"><label htmlFor="es-rt">Teléfono</label><input id="es-rt" name="repTelefono" type="tel" defaultValue={e?.repTelefono} /></div>
          <div className="campo"><label htmlFor="es-re">Correo</label><input id="es-re" name="repCorreo" type="email" defaultValue={e?.repCorreo} /></div>
        </div>
        <div className="campo"><label htmlFor="es-obs">Observaciones del representante (alergias, condiciones)</label><textarea id="es-obs" name="observaciones" defaultValue={e?.observaciones} /></div>
        <div className="campo"><label htmlFor="es-not">Notas internas</label><textarea id="es-not" name="notas" defaultValue={e?.notas} /></div>
        <div className="acciones">
          <button className="btn">{e ? "Guardar" : "Inscribir estudiante"}</button>
          {e?.repTelefono && <a className="btn sec" target="_blank" rel="noopener" href={enlaceWhatsApp(e.repTelefono)}>WhatsApp al representante</a>}
        </div>
        {!e && <p className="tenue" style={{ margin: 0 }}>Al inscribirlo queda activo y se generan su inscripción y la mensualidad del mes.</p>}
      </form>

      {e && e.estado !== "solicitud" && (
        <>
          <section className="panel">
            <h2>Acceso al portal</h2>
            {cuenta ? (
              <div className="acciones">
                <span>Vinculado a la cuenta de <b>{cuenta.nombre}</b> ({cuenta.correo}).</span>
                <form action={quitarAccesoPortal}><input type="hidden" name="id" value={e.id} /><button className="btn sec chico">Desvincular</button></form>
                <form action={restablecerClaveRepresentante} className="acciones"><input type="hidden" name="estudianteId" value={e.id} /><input type="hidden" name="usuarioId" value={cuenta.id} /><input name="clave" type="password" minLength={8} required placeholder="Clave nueva" aria-label="Clave nueva del representante" autoComplete="new-password" style={{ width: 170 }} /><button className="btn sec chico">Cambiarle la clave</button></form>
              </div>
            ) : (
              <form action={darAccesoPortal} style={{ display: "grid", gap: 12 }}>
                <p className="tenue" style={{ margin: 0 }}>Este estudiante no está vinculado a ninguna cuenta. Si el correo ya tiene cuenta de representante, se vincula; si no, se crea con la clave inicial que escribas.</p>
                <input type="hidden" name="id" value={e.id} />
                <div className="fila">
                  <div className="campo"><label htmlFor="ac-correo">Correo del representante</label><input id="ac-correo" name="correo" type="email" required defaultValue={e.repCorreo} /></div>
                  <div className="campo"><label htmlFor="ac-clave">Clave inicial (si la cuenta es nueva)</label><input id="ac-clave" name="clave" type="password" minLength={8} autoComplete="new-password" /></div>
                </div>
                <div><button className="btn sec">Dar acceso</button></div>
              </form>
            )}
          </section>

          <section className="panel" id="cuenta">
            <h2>Estado de cuenta</h2>
            {susCargos.length === 0 ? <p className="tenue">Sin cargos todavía.</p> : (
              <form action={cobrarEnEscuela} style={{ display: "grid", gap: 14 }}>
                <input type="hidden" name="estudianteId" value={e.id} />
                <div className="tabla"><table>
                  <thead><tr><th></th><th>Concepto</th><th>Vence</th><th>Monto</th><th>Estado</th></tr></thead>
                  <tbody>
                    {susCargos.map((c) => { const est = estadoCargo(c); return (
                      <tr key={c.id}>
                        <td>{c.estado === "pendiente" && <input type="checkbox" name="cargo" value={c.id} aria-label={`Cobrar ${c.concepto}`} style={{ width: 20, height: 20 }} />}</td>
                        <td>{c.concepto}</td><td>{dia(c.venceEl)}</td><td>{usd(c.montoUsd)}</td>
                        <td>
                          <span className={`pastilla${est === "pagado" ? " si" : est === "por_confirmar" ? " oro" : ""}`} style={est === "en_mora" ? { color: "var(--a-mal)" } : undefined}>{NOMBRE_ESTADO_CARGO[est]}</span>
                          {c.estado === "pagado" && c.reporteId && <> <Link href={`/recibo/${c.reporteId}`} target="_blank">Recibo ↗</Link></>}
                        </td>
                      </tr>
                    ); })}
                  </tbody>
                </table></div>
                {pendientes.length > 0 && (
                  <div className="fila">
                    <div className="campo"><label htmlFor="co-met">Cobrar lo marcado con</label>
                      <select id="co-met" name="metodo" defaultValue="efectivo"><option value="efectivo">Efectivo</option><option value="punto">Punto de venta</option><option value="pago_movil">Pago Móvil (ya verificado)</option><option value="transferencia">Transferencia (ya verificada)</option></select>
                    </div>
                    <div className="campo"><label htmlFor="co-ref">Referencia (pago móvil o transferencia)</label><input id="co-ref" name="referencia" inputMode="numeric" autoComplete="off" /></div>
                    <div className="campo" style={{ alignContent: "end" }}><button className="btn">Registrar cobro y emitir recibo</button></div>
                  </div>
                )}
              </form>
            )}
            {pendientes.length > 0 && (
              <div className="acciones">
                <span className="tenue">Anular un cargo pendiente:</span>
                {pendientes.map((c) => <form key={c.id} action={accionAnularCargo}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="estudianteId" value={e.id} /><BotonBorrar que={`el cargo “${c.concepto}”`} /> <span className="tenue">{c.concepto}</span></form>)}
              </div>
            )}
            <form action={agregarCargo} style={{ display: "grid", gap: 12, borderTop: "1px solid var(--a-linea)", paddingTop: 16 }}>
              <h3>Agregar otro cargo</h3>
              <input type="hidden" name="estudianteId" value={e.id} />
              <div className="fila">
                <div className="campo"><label htmlFor="ca-con">Concepto</label><input id="ca-con" name="concepto" required placeholder="Vestuario, uniforme, taller…" /></div>
                <div className="campo"><label htmlFor="ca-mon">Monto (USD)</label><input id="ca-mon" name="monto" inputMode="decimal" required /></div>
                <div className="campo"><label htmlFor="ca-ven">Vence el</label><input id="ca-ven" name="venceEl" type="date" /></div>
              </div>
              <div><button className="btn sec">Agregar cargo</button></div>
            </form>
          </section>
        </>
      )}
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Ficha {...props} /></Suspense>;
}
