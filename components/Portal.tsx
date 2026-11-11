"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { pagarCargos, registrarRepresentante, solicitarInscripcion } from "@/lib/acciones-escuela";
import type { Cobros } from "@/lib/datos";
import { subirCaptura } from "./Compra";

export function FormularioRegistro({ nivel }: { nivel?: string }) {
  const [estado, accion, enviando] = useActionState(registrarRepresentante, null);
  const v = estado?.valores;
  return (
    <form action={accion} className="formulario">
      {nivel && <input type="hidden" name="nivel" value={nivel} />}
      {estado?.error && <p className="aviso error" role="alert">{estado.error}</p>}
      <div className="campo"><label htmlFor="r-nombre">Tu nombre y apellido</label><input id="r-nombre" name="nombre" required autoComplete="name" defaultValue={v?.nombre} /></div>
      <div className="campo"><label htmlFor="r-cedula">Cédula</label><input id="r-cedula" name="cedula" autoComplete="off" defaultValue={v?.cedula} /></div>
      <div className="campo"><label htmlFor="r-tel">Teléfono o WhatsApp</label><input id="r-tel" name="telefono" type="tel" required autoComplete="tel" defaultValue={v?.telefono} /></div>
      <div className="campo"><label htmlFor="r-correo">Correo</label><input id="r-correo" name="correo" type="email" required autoComplete="username" defaultValue={v?.correo} /></div>
      <div className="campo"><label htmlFor="r-clave">Crea una clave (mínimo 8 caracteres)</label><input id="r-clave" name="clave" type="password" required minLength={8} autoComplete="new-password" /></div>
      <div><button className="boton" disabled={enviando}>{enviando ? "Creando tu cuenta…" : "Crear mi cuenta"}</button></div>
      <p className="tenue">¿Ya tienes cuenta? <Link href="/ingresar">Ingresa aquí</Link>.</p>
    </form>
  );
}

export function FormularioInscripcion({ niveles, nivelInicial }: { niveles: { id: number; nombre: string; edades: string }[]; nivelInicial?: string }) {
  const [estado, accion, enviando] = useActionState(solicitarInscripcion, null);
  const v = estado?.valores;
  return (
    <form action={accion} className="formulario">
      {estado?.error && <p className="aviso error" role="alert">{estado.error}</p>}
      <div className="campo"><label htmlFor="e-nombres">Nombres del estudiante</label><input id="e-nombres" name="nombres" required defaultValue={v?.nombres} /></div>
      <div className="campo"><label htmlFor="e-apellidos">Apellidos</label><input id="e-apellidos" name="apellidos" required defaultValue={v?.apellidos} /></div>
      <div className="campo"><label htmlFor="e-nac">Fecha de nacimiento</label><input id="e-nac" name="fechaNacimiento" type="date" required defaultValue={v?.fechaNacimiento} /></div>
      <div className="campo">
        <label htmlFor="e-nivel">Nivel</label>
        <select id="e-nivel" name="nivelId" required defaultValue={v?.nivelId ?? nivelInicial ?? ""}>
          <option value="" disabled>Elige un nivel</option>
          {niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}{n.edades ? ` · ${n.edades}` : ""}</option>)}
        </select>
      </div>
      <div className="campo"><label htmlFor="e-obs">¿Algo que debamos saber? (alergias, condiciones, experiencia previa)</label><textarea id="e-obs" name="observaciones" defaultValue={v?.observaciones} /></div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><input type="checkbox" name="autorizo" style={{ width: 20, height: 20, marginTop: 3, accentColor: "var(--acento)" }} /> <span>Soy su representante y autorizo su inscripción en la escuela.</span></label>
      <div><button className="boton" disabled={enviando}>{enviando ? "Enviando…" : "Enviar solicitud"}</button></div>
    </form>
  );
}

type Cargo = { id: number; estudiante: string; concepto: string; monto: number; vence: string; enMora: boolean };

export function PagarCargos({ cargos, cobros, tasa }: { cargos: Cargo[]; cobros: Cobros; tasa: number | null }) {
  const [estado, accion, enviando] = useActionState(pagarCargos, null);
  const v = estado?.valores;
  const [marcados, setMarcados] = useState<number[]>(cargos.map((c) => c.id));
  const hayPM = Boolean(cobros.pagoMovil.telefono), hayTR = Boolean(cobros.transferencia.cuenta);
  const [metodo, setMetodo] = useState(v?.metodo || (hayPM ? "pago_movil" : hayTR ? "transferencia" : ""));
  const [capturaUrl, setCapturaUrl] = useState(v?.capturaUrl ?? "");
  const [subida, setSubida] = useState("");
  const total = cargos.filter((c) => marcados.includes(c.id)).reduce((s, c) => s + c.monto, 0);
  const totalBs = tasa ? Math.round(total * tasa * 100) / 100 : null;
  const d = metodo === "pago_movil" ? cobros.pagoMovil : cobros.transferencia;
  const usd = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

  return (
    <form action={accion} className="formulario">
      {estado?.error && <p className="aviso error" role="alert">{estado.error}</p>}
      <div className="cargos">
        {cargos.map((c) => (
          <label key={c.id} className="cargo">
            <input type="checkbox" name="cargo" value={c.id} checked={marcados.includes(c.id)} onChange={(e) => setMarcados(e.target.checked ? [...marcados, c.id] : marcados.filter((x) => x !== c.id))} />
            <span><b>{c.concepto}</b><small>{c.estudiante} · vence {c.vence}{c.enMora && <strong className="mora"> · En mora</strong>}</small></span>
            <b>{usd(c.monto)}</b>
          </label>
        ))}
      </div>
      <dl className="cuenta">
        <dt className="total">Total a pagar</dt><dd className="total">{usd(total)}</dd>
        {totalBs != null && <><dt>En bolívares (tasa BCV Bs {tasa!.toLocaleString("es-VE", { minimumFractionDigits: 2 })})</dt><dd><strong>Bs {totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</strong></dd></>}
      </dl>
      {hayPM || hayTR ? (
        <>
          <div className="metodos">
            {hayPM && <label><input type="radio" name="metodo" value="pago_movil" checked={metodo === "pago_movil"} onChange={() => setMetodo("pago_movil")} /> Pago Móvil</label>}
            {hayTR && <label><input type="radio" name="metodo" value="transferencia" checked={metodo === "transferencia"} onChange={() => setMetodo("transferencia")} /> Transferencia</label>}
          </div>
          <div className="datos-pago">
            <div><span>Banco</span><b>{d.banco}</b></div>
            {metodo === "pago_movil" ? <div><span>Teléfono</span><b>{cobros.pagoMovil.telefono}</b></div> : <div><span>Cuenta</span><b>{cobros.transferencia.cuenta}</b></div>}
            <div><span>Cédula o RIF</span><b>{d.cedula}</b></div>
            <div><span>Titular</span><b>{d.titular}</b></div>
          </div>
          <div className="campo"><label htmlFor="pg-ref">Número de referencia del pago</label><input id="pg-ref" name="referencia" inputMode="numeric" autoComplete="off" defaultValue={v?.referencia} /></div>
          <div className="campo">
            <label htmlFor="pg-cap">Captura del comprobante (opcional)</label>
            <input id="pg-cap" type="file" accept="image/*" disabled={subida === "subiendo"} onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setSubida("subiendo");
              try { setCapturaUrl(await subirCaptura(f, "")); setSubida(""); } catch (err) { setSubida(err instanceof Error && err.message ? err.message : "No se pudo subir la captura."); }
            }} />
            {subida === "subiendo" && <small role="status">Subiendo la captura…</small>}
            {subida && subida !== "subiendo" && <small role="alert" style={{ color: "#ff8a80" }}>{subida}</small>}
            {capturaUrl && !subida && <small role="status">Captura recibida.</small>}
            <input type="hidden" name="capturaUrl" value={capturaUrl} />
          </div>
          <div><button className="boton" disabled={enviando || subida === "subiendo" || marcados.length === 0}>{enviando ? "Enviando…" : "Reportar pago"}</button></div>
        </>
      ) : <p className="aviso">Todavía no están publicados los datos de pago. Escríbenos para pagar.</p>}
    </form>
  );
}
