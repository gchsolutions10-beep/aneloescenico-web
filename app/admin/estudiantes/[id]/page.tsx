import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Resultado } from "@/components/Ayuda";
import Cajon from "@/components/panel/Cajon";
import { BotonBorrar } from "@/components/panel/Confirmar";
import MenuFila from "@/components/panel/MenuFila";
import { db, schema } from "@/db";
import { restablecerClaveRepresentante } from "@/lib/acciones-clave";
import { accionAnularCargo, accionEliminarEstudiante, agregarCargo, cobrarEnEscuela, darAccesoPortal, guardarEstudiante, quitarAccesoPortal } from "@/lib/acciones-escuela";
import { estadoCargo, ESTADOS_ESTUDIANTE, hoy, NOMBRE_ESTADO_CARGO, resumenBorrado } from "@/lib/escuela";
import { exigirAdmin } from "@/lib/sesion";
import { getTasa } from "@/lib/tasa";
import { bs, enlaceWhatsApp, fechaCorta, fechaLarga, usd } from "@/lib/util";

export const metadata = { title: "Ficha del estudiante" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };
type Estudiante = typeof schema.estudiantes.$inferSelect;
type Nivel = typeof schema.niveles.$inferSelect;
const dia = (f: string) => fechaCorta(new Date(`${f}T12:00:00-04:00`));
const CLASE_CARGO: Record<string, string> = { pagado: "si", por_confirmar: "oro", en_mora: "mal", pendiente: "", anulado: "" };

/** Formulario de datos: página completa al inscribir en persona, panel lateral al editar. */
function FormEstudiante({ e, niveles }: { e?: Estudiante; niveles: Nivel[] }) {
  return (
    <form action={guardarEstudiante} className="formulario-cajon">
      <input type="hidden" name="id" value={e?.id ?? ""} />
      <h3>Estudiante</h3>
      <div className="fila">
        <div className="campo"><label htmlFor="es-nom">Nombres</label><input id="es-nom" name="nombres" required defaultValue={e?.nombres} /></div>
        <div className="campo"><label htmlFor="es-ape">Apellidos</label><input id="es-ape" name="apellidos" required defaultValue={e?.apellidos} /></div>
      </div>
      <div className="fila">
        <div className="campo"><label htmlFor="es-nac">Fecha de nacimiento</label><input id="es-nac" name="fechaNacimiento" type="date" defaultValue={e?.fechaNacimiento ?? ""} /></div>
        <div className="campo"><label htmlFor="es-niv">Nivel</label>
          <select id="es-niv" name="nivelId" defaultValue={e?.nivelId ?? ""} required><option value="" disabled>Elige</option>{niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select>
        </div>
      </div>
      <div className="fila">
        <div className="campo"><label htmlFor="es-beca">Beca o descuento (%)</label><input id="es-beca" name="becaPct" type="number" min={0} max={100} defaultValue={e?.becaPct ?? 0} /><small>Aplica a las mensualidades que se generen desde ahora.</small></div>
        {e && e.estado !== "solicitud" && (
          <div className="campo"><label htmlFor="es-est">Estado</label>
            <select id="es-est" name="estado" defaultValue={e.estado}>{["activo", "retirado", "egresado"].map((x) => <option key={x} value={x}>{ESTADOS_ESTUDIANTE[x]}</option>)}</select>
            <small>Solo a los activos se les genera mensualidad.</small>
          </div>
        )}
      </div>
      <h3>Representante</h3>
      <div className="fila">
        <div className="campo"><label htmlFor="es-rn">Nombre</label><input id="es-rn" name="repNombre" defaultValue={e?.repNombre} /></div>
        <div className="campo"><label htmlFor="es-rc">Cédula</label><input id="es-rc" name="repCedula" defaultValue={e?.repCedula} /></div>
      </div>
      <div className="fila">
        <div className="campo"><label htmlFor="es-rt">Teléfono</label><input id="es-rt" name="repTelefono" type="tel" defaultValue={e?.repTelefono} /></div>
        <div className="campo"><label htmlFor="es-re">Correo</label><input id="es-re" name="repCorreo" type="email" defaultValue={e?.repCorreo} /></div>
      </div>
      <div className="campo"><label htmlFor="es-obs">Observaciones del representante</label><textarea id="es-obs" name="observaciones" defaultValue={e?.observaciones} placeholder="Alergias, condiciones, experiencia previa" /></div>
      <div className="campo"><label htmlFor="es-not">Notas internas</label><textarea id="es-not" name="notas" defaultValue={e?.notas} /><small>El representante no las ve.</small></div>
      <div className="cajon-pie"><button className="btn">{e ? "Guardar cambios" : "Inscribir estudiante"}</button></div>
    </form>
  );
}

async function Ficha({ params, searchParams }: Props) {
  await exigirAdmin();
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const { estudiantes, cargos, niveles, usuarios } = schema;
  const lista = await db().select().from(niveles).orderBy(asc(niveles.orden));

  if (id === "nuevo") {
    return (
      <>
        <div className="encabezado"><div><h1>Inscribir estudiante</h1><p>Al inscribirlo queda activo y se generan su inscripción y la mensualidad del mes.</p></div><Link className="btn sec" href="/admin/estudiantes">← Volver</Link></div>
        <Resultado searchParams={searchParams} />
        <section className="panel" style={{ maxWidth: 760 }}><FormEstudiante niveles={lista} /></section>
      </>
    );
  }

  const [e] = await db().select().from(estudiantes).where(eq(estudiantes.id, Number(id) || 0));
  if (!e) notFound();
  const [susCargos, [cuenta], tasa] = await Promise.all([
    db().select().from(cargos).where(eq(cargos.estudianteId, e.id)).orderBy(desc(cargos.venceEl), desc(cargos.id)),
    e.representanteId ? db().select().from(usuarios).where(eq(usuarios.id, e.representanteId)) : [],
    getTasa().catch(() => null),
  ]);
  const nivel = lista.find((n) => n.id === e.nivelId);
  const pendientes = susCargos.filter((c) => c.estado === "pendiente");
  const vencido = pendientes.filter((c) => c.venceEl < hoy()).reduce((s, c) => s + Number(c.montoUsd), 0);
  const debe = pendientes.reduce((s, c) => s + Number(c.montoUsd), 0);
  const tab = ["cuenta", "portal"].includes(q.tab) ? q.tab : "resumen";
  const base = `/admin/estudiantes/${e.id}`;
  const iniciales = `${e.nombres[0] ?? ""}${e.apellidos[0] ?? ""}`.toUpperCase();
  const edad = e.fechaNacimiento ? Math.floor((Date.parse(hoy()) - Date.parse(e.fechaNacimiento)) / (365.25 * 86400_000)) : null;

  return (
    <>
      <section className="panel ficha-cab">
        <span className="avatar" aria-hidden="true">{iniciales}</span>
        <div style={{ display: "grid", gap: 8, flex: "1 1 260px", minWidth: 0 }}>
          <h1 style={{ fontSize: "1.5rem" }}>{e.nombres} {e.apellidos}</h1>
          <div className="acciones">
            {nivel && <span className="pastilla" style={{ background: "#f7e7e9", color: "var(--a-vino)" }}>Nivel {nivel.nombre}</span>}
            <span className={`pastilla ${e.estado === "activo" ? "si" : e.estado === "solicitud" ? "oro" : ""}`}>{e.estado === "solicitud" ? "Solicitud sin aprobar" : ESTADOS_ESTUDIANTE[e.estado]}{e.fechaIngreso && e.estado === "activo" ? ` desde ${dia(e.fechaIngreso)}` : ""}</span>
            {vencido > 0 && <span className="pastilla mal">En mora · {usd(vencido)}</span>}
            {e.becaPct > 0 && <span className="pastilla oro">Beca {e.becaPct}%</span>}
          </div>
        </div>
        <div className="acciones">
          {pendientes.length > 0 && <Link className="btn" href={`${base}?tab=cuenta`}>Cobrar</Link>}
          {e.repTelefono && <a className="btn sec" href={enlaceWhatsApp(e.repTelefono)} target="_blank" rel="noopener">WhatsApp</a>}
          <MenuFila>
            <Link href={`/admin/protagonistas/${e.id}`}>Ficha de Protagonista</Link>
            <Link href={e.estado === "solicitud" ? "/admin/inscripciones" : "/admin/estudiantes"}>Volver a la lista</Link>
          </MenuFila>
        </div>
      </section>

      <Resultado searchParams={searchParams} />
      {q.recibo && <p className="nota" role="status">Pago registrado. <Link href={`/recibo/${q.recibo}`} target="_blank">Abrir el recibo para imprimir ↗</Link></p>}
      {e.estado === "solicitud" && <p className="nota aviso">Es una solicitud sin aprobar. Corrige lo que haga falta y apruébala en <Link href="/admin/inscripciones">Inscripciones</Link>.</p>}

      <nav className="subrayadas" aria-label="Secciones de la ficha">
        <Link href={base} aria-current={tab === "resumen" ? "page" : undefined}>Resumen</Link>
        <Link href={`${base}?tab=cuenta`} aria-current={tab === "cuenta" ? "page" : undefined}>Estado de cuenta{pendientes.length ? ` (${pendientes.length})` : ""}</Link>
        <Link href={`${base}?tab=portal`} aria-current={tab === "portal" ? "page" : undefined}>Acceso al portal</Link>
        <Link href={`/admin/protagonistas/${e.id}`}>Protagonista ↗</Link>
      </nav>

      {tab === "resumen" && (
        <>
          <div className="doble">
            <section className="panel">
              <div className="cab">
                <h2>Datos del estudiante</h2>
                <Cajon key={q.ok ?? "editar"} titulo="Editar datos" boton="Editar" botonClase="btn sec chico">
                  <FormEstudiante e={e} niveles={lista} />
                </Cajon>
              </div>
              <dl className="datos-lectura">
                <div><dt>Nombres y apellidos</dt><dd>{e.nombres} {e.apellidos}</dd></div>
                <div><dt>Fecha de nacimiento</dt><dd>{e.fechaNacimiento ? `${fechaLarga(new Date(`${e.fechaNacimiento}T12:00:00-04:00`)).replace(/^[a-záéíóú]+, /, "")}${edad != null ? ` · ${edad} años` : ""}` : "—"}</dd></div>
                <div><dt>Nivel</dt><dd>{nivel?.nombre ?? "Sin nivel"}</dd></div>
                <div><dt>Beca</dt><dd>{e.becaPct ? `${e.becaPct}% de descuento en la mensualidad` : "Sin beca"}</dd></div>
                <div style={{ gridColumn: "1 / -1" }}><dt>Observaciones</dt><dd>{e.observaciones || "—"}</dd></div>
                {e.notas && <div style={{ gridColumn: "1 / -1" }}><dt>Notas internas</dt><dd>{e.notas}</dd></div>}
              </dl>
            </section>
            <div style={{ display: "grid", gap: 16 }}>
              <section className="panel" style={{ gap: 8 }}>
                <h2>Representante</h2>
                <strong>{e.repNombre || "—"}</strong>
                <span className="tenue">{[e.repCedula && `C.I. ${e.repCedula}`, e.repTelefono, e.repCorreo].filter(Boolean).join(" · ") || "Sin datos de contacto"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: cuenta ? "var(--a-ok)" : "var(--a-tenue)" }}>{cuenta ? "● Tiene acceso al portal" : "○ Sin acceso al portal"}</span>
              </section>
              <section className="panel" style={{ gap: 8 }}>
                <h2>Cuenta</h2>
                {debe > 0 ? <span>Debe <strong style={{ color: vencido ? "var(--a-mal)" : undefined }}>{usd(debe)}</strong>{vencido ? `, de los cuales ${usd(vencido)} ya vencieron` : ""}</span> : <span>Al día</span>}
                <Link href={`${base}?tab=cuenta`} style={{ fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Ver el estado de cuenta →</Link>
              </section>
            </div>
          </div>
          <Suspense fallback={null}><ZonaBorrar id={e.id} nombre={`${e.nombres} ${e.apellidos}`} /></Suspense>
        </>
      )}

      {tab === "cuenta" && (
        <section className="panel">
          <div className="cab">
            <h2>Estado de cuenta</h2>
            <Cajon key={q.ok ?? "cargo"} titulo="Agregar cargo" boton="Agregar cargo" botonClase="btn sec chico" descripcion="Vestuario, uniforme, taller u otro cobro.">
              <form action={agregarCargo} className="formulario-cajon">
                <input type="hidden" name="estudianteId" value={e.id} />
                <div className="campo"><label htmlFor="ca-con">Concepto</label><input id="ca-con" name="concepto" required placeholder="Vestuario de la obra" /></div>
                <div className="fila">
                  <div className="campo"><label htmlFor="ca-mon">Monto (USD)</label><input id="ca-mon" name="monto" inputMode="decimal" required /></div>
                  <div className="campo"><label htmlFor="ca-ven">Vence el</label><input id="ca-ven" name="venceEl" type="date" /><small>Vacío = hoy.</small></div>
                </div>
                <div className="cajon-pie"><button className="btn">Agregar cargo</button></div>
              </form>
            </Cajon>
          </div>
          {susCargos.length === 0 ? <div className="vacio"><p>Sin cargos todavía.</p></div> : (
            <form action={cobrarEnEscuela} style={{ display: "grid", gap: 14 }}>
              <input type="hidden" name="estudianteId" value={e.id} />
              <div className="tabla"><table>
                <thead><tr><th style={{ width: 36 }}><span className="sr">Elegir</span></th><th>Concepto</th><th>Vence</th><th>Monto</th><th>Estado</th></tr></thead>
                <tbody>
                  {susCargos.map((c) => { const est = estadoCargo(c); return (
                    <tr key={c.id}>
                      <td>{c.estado === "pendiente" && <input type="checkbox" name="cargo" value={c.id} defaultChecked={est === "en_mora"} aria-label={`Cobrar ${c.concepto}`} style={{ width: 19, height: 19, accentColor: "var(--a-vino)" }} />}</td>
                      <td>{c.concepto}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{dia(c.venceEl)}</td>
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>{usd(c.montoUsd)}</td>
                      <td>
                        <span className={`pastilla ${CLASE_CARGO[est]}`}>{NOMBRE_ESTADO_CARGO[est]}</span>
                        {c.estado === "pagado" && c.reporteId && <> <Link href={`/recibo/${c.reporteId}`} target="_blank" style={{ fontSize: 13 }}>Recibo ↗</Link></>}
                      </td>
                    </tr>
                  ); })}
                </tbody>
              </table></div>
              {pendientes.length > 0 && (
                <div className="fila" style={{ alignItems: "end", background: "var(--a-sup2)", border: "1px solid var(--a-linea)", borderRadius: 12, padding: "14px 16px" }}>
                  <div className="campo"><span className="etq">Cobrar lo marcado</span><small>Pendiente total: {usd(debe)}{tasa ? ` · ${bs(Math.round(debe * tasa.valor * 100) / 100)}` : ""}</small></div>
                  <div className="campo"><label htmlFor="co-met">Forma de pago</label>
                    <select id="co-met" name="metodo" defaultValue="efectivo"><option value="efectivo">Efectivo</option><option value="punto">Punto de venta</option><option value="pago_movil">Pago Móvil (ya verificado)</option><option value="transferencia">Transferencia (ya verificada)</option></select>
                  </div>
                  <div className="campo"><label htmlFor="co-ref">Referencia</label><input id="co-ref" name="referencia" inputMode="numeric" autoComplete="off" placeholder="Si pagó por banco" /></div>
                  <div className="campo"><button className="btn">Registrar cobro y emitir recibo</button></div>
                </div>
              )}
            </form>
          )}
          {pendientes.length > 0 && (
            <details>
              <summary className="tenue" style={{ cursor: "pointer", fontSize: 13 }}>Anular un cargo pendiente</summary>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {pendientes.map((c) => (
                  <form key={c.id} action={accionAnularCargo} className="acciones">
                    <input type="hidden" name="id" value={c.id} /><input type="hidden" name="estudianteId" value={e.id} />
                    <span style={{ flex: 1 }}>{c.concepto} · {usd(c.montoUsd)}</span>
                    <BotonBorrar que={`el cargo “${c.concepto}”`} texto="Anular" textoConfirmar="Anular cargo" consecuencias={["Deja de contar como deuda y no se puede cobrar después."]} />
                  </form>
                ))}
              </div>
            </details>
          )}
        </section>
      )}

      {tab === "portal" && (
        <section className="panel">
          <h2>Acceso al portal</h2>
          <p className="tenue">Con su cuenta, el representante ve el estado de cuenta, reporta pagos y descarga sus recibos.</p>
          {cuenta ? (
            <>
              <p>Vinculado a la cuenta de <strong>{cuenta.nombre}</strong> ({cuenta.correo}).</p>
              <div className="acciones">
                <Cajon key={q.ok ?? "clave"} titulo="Cambiar la clave del representante" boton="Cambiarle la clave" botonClase="btn sec">
                  <form action={restablecerClaveRepresentante} className="formulario-cajon">
                    <input type="hidden" name="estudianteId" value={e.id} /><input type="hidden" name="usuarioId" value={cuenta.id} />
                    <div className="campo"><label htmlFor="rc-clave">Clave nueva</label><input id="rc-clave" name="clave" type="password" minLength={8} required autoComplete="new-password" /><small>Mínimo 8 caracteres. Díctasela al representante; podrá cambiarla en Mi clave.</small></div>
                    <div className="cajon-pie"><button className="btn">Guardar clave</button></div>
                  </form>
                </Cajon>
                <form action={quitarAccesoPortal}><input type="hidden" name="id" value={e.id} /><BotonBorrar que="el vínculo con el portal" texto="Desvincular" textoConfirmar="Desvincular" claseBoton="btn peligro" consecuencias={["El representante deja de ver a este estudiante en su portal. Su cuenta no se borra."]} /></form>
              </div>
            </>
          ) : (
            <form action={darAccesoPortal} style={{ display: "grid", gap: 14, maxWidth: 640 }}>
              <p className="tenue">Si el correo ya tiene cuenta de representante, se vincula; si no, se crea con la clave inicial que escribas.</p>
              <input type="hidden" name="id" value={e.id} />
              <div className="fila">
                <div className="campo"><label htmlFor="ac-correo">Correo del representante</label><input id="ac-correo" name="correo" type="email" required defaultValue={e.repCorreo} /></div>
                <div className="campo"><label htmlFor="ac-clave">Clave inicial (si la cuenta es nueva)</label><input id="ac-clave" name="clave" type="password" minLength={8} autoComplete="new-password" /></div>
              </div>
              <div><button className="btn">Dar acceso</button></div>
            </form>
          )}
        </section>
      )}
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Ficha {...props} /></Suspense>;
}

const pl = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

async function ZonaBorrar({ id, nombre }: { id: number; nombre: string }) {
  const r = await resumenBorrado(id);
  if (!r) return null;
  const puntos = [
    `Se borran sus datos y su historial en la escuela.`,
    r.cargosPendientes + r.cargosPagados > 0 && `Se ${r.cargosPendientes + r.cargosPagados === 1 ? "borra su cargo" : `borran sus ${r.cargosPendientes + r.cargosPagados} cargos`} (${pl(r.cargosPagados, "pagado", "pagados")}, ${r.cargosPendientes} sin pagar).`,
    r.pagosPropios > 0 && `Se ${r.pagosPropios === 1 ? "borra 1 pago" : `borran ${r.pagosPropios} pagos`} por ${usd(r.montoPropio)}${r.recibos.length ? ` y ${r.recibos.length === 1 ? "el recibo" : "los recibos"} N.º ${r.recibos.join(", ")}` : ""}. Ese dinero desaparece de Cobranza, Reportes y Cierre de caja${r.recibos.length ? ", y quedará un salto en la numeración de recibos" : ""}.`,
    r.pagosCompartidos > 0 && `${r.pagosCompartidos} ${r.pagosCompartidos === 1 ? "pago cubre" : "pagos cubren"} también a otro estudiante: se ${r.pagosCompartidos === 1 ? "conserva" : "conservan"} con su recibo.`,
    r.tieneFicha && `Se borra su ficha de Protagonista y sus fotos.`,
    r.obras > 0 && `En el elenco de ${r.obras} ${r.obras === 1 ? "obra" : "obras"} se mantiene su nombre, pero deja de enlazar a su ficha.`,
  ].filter(Boolean) as string[];
  const puedeBorrarCuenta = r.cuenta && r.cuenta.otrosEstudiantes === 0;
  return (
    <form action={accionEliminarEstudiante} className="panel peligro-zona">
      <h2>Borrar estudiante</h2>
      <p className="tenue" style={{ margin: 0 }}>Para un estudiante real que dejó la escuela, cambia su estado a Retirado: así se conservan sus pagos y recibos. Borrar es para datos de prueba o errores.</p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>{puntos.map((p) => <li key={p}>{p}</li>)}</ul>
      <input type="hidden" name="id" value={id} />
      {puedeBorrarCuenta && <label className="casilla"><input type="checkbox" name="borrarCuenta" defaultChecked /> Borrar también la cuenta del portal ({r.cuenta!.correo}): no tiene otros estudiantes</label>}
      {r.cuenta && !puedeBorrarCuenta && <p className="tenue" style={{ margin: 0 }}>La cuenta del portal ({r.cuenta.correo}) se conserva: tiene otros estudiantes.</p>}
      <div><BotonBorrar que={`a ${nombre}`} consecuencias={puntos} texto="Borrar estudiante…" fuerte claseBoton="btn peligro" /></div>
    </form>
  );
}
