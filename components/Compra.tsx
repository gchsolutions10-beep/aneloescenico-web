"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { accionApartar, accionCambiarButacas, accionReportarPago } from "@/lib/acciones-taquilla";
import type { Cobros } from "@/lib/datos";
import type { EstadoPlano } from "@/lib/taquilla";
import PlanoButacas from "./PlanoButacas";

/** Plano + botón para apartar (página de la función). */
export function ElegirButacas({ funcionId, plano, max, tasa, minutos }: { funcionId: number; plano: EstadoPlano; max: number; tasa: number | null; minutos: number }) {
  const [estado, accion, enviando] = useActionState(accionApartar, null);
  return (
    <form action={accion} className="formulario">
      <input type="hidden" name="funcionId" value={funcionId} />
      <PlanoButacas funcionId={funcionId} inicial={plano} max={max} tasa={tasa} />
      {estado?.error && <p className="aviso error" role="alert">{estado.error}</p>}
      <div>
        <button className="boton" disabled={enviando}>{enviando ? "Apartando…" : `Apartar por ${minutos} minutos`}</button>
        <p className="tenue" style={{ fontSize: ".88rem", margin: "10px 0 0" }}>Al apartar, las butacas quedan reservadas a tu nombre durante {minutos} minutos para que hagas el pago. Si no lo reportas en ese tiempo, se liberan.</p>
      </div>
    </form>
  );
}

/** Plano para elegir butacas de reemplazo cuando hubo conflicto. */
export function CambiarButacas({ codigo, funcionId, plano, cantidad, tope }: { codigo: string; funcionId: number; plano: EstadoPlano; cantidad: number; tope: number }) {
  const [estado, accion, enviando] = useActionState(accionCambiarButacas, null);
  return (
    <form action={accion} className="formulario">
      <input type="hidden" name="codigo" value={codigo} />
      <PlanoButacas funcionId={funcionId} inicial={plano} max={cantidad} tope={tope} />
      {estado?.error && <p className="aviso error" role="alert">{estado.error}</p>}
      <div><button className="boton" disabled={enviando}>{enviando ? "Guardando…" : "Quedarme con estas butacas"}</button></div>
    </form>
  );
}

/** Reloj del apartado. Al llegar a cero recarga la página para mostrar el nuevo estado. */
export function CuentaRegresiva({ vence }: { vence: string }) {
  const router = useRouter();
  const [resta, setResta] = useState<number | null>(null);
  const avisado = useRef(false);
  useEffect(() => {
    const tic = () => {
      const s = Math.max(0, Math.round((new Date(vence).getTime() - Date.now()) / 1000));
      setResta(s);
      if (s === 0 && !avisado.current) { avisado.current = true; router.refresh(); }
    };
    tic();
    const t = setInterval(tic, 1000);
    return () => clearInterval(t);
  }, [vence, router]);
  if (resta == null) return <div className="reloj" aria-hidden="true">--:--</div>;
  return (
    <div className={`reloj${resta <= 120 ? " urge" : ""}`} role="timer" aria-label={`Quedan ${Math.floor(resta / 60)} minutos y ${resta % 60} segundos`}>
      {String(Math.floor(resta / 60)).padStart(2, "0")}:{String(resta % 60).padStart(2, "0")}
    </div>
  );
}

/** Reduce la captura en el navegador y la sube. */
export async function subirCaptura(archivo: File, codigo: string): Promise<string> {
  const img = await createImageBitmap(archivo);
  const escala = Math.min(1, 1400 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob>((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error())), "image/jpeg", 0.82));
  const cuerpo = new FormData();
  cuerpo.append("codigo", codigo);
  cuerpo.append("archivo", new File([blob], "captura.jpg", { type: "image/jpeg" }));
  const r = await fetch("/api/captura", { method: "POST", body: cuerpo });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) throw new Error(j.error || "No se pudo subir la captura.");
  return j.url;
}

type PropsPago = { codigo: string; totalUsd: number; totalBs: number | null; cobros: Cobros; tardio: boolean };

export function FormularioPago({ codigo, totalUsd, totalBs, cobros, tardio }: PropsPago) {
  const [estado, accion, enviando] = useActionState(accionReportarPago, null);
  const v = estado?.valores;
  const hayPM = Boolean(cobros.pagoMovil.telefono), hayTR = Boolean(cobros.transferencia.cuenta);
  const [metodo, setMetodo] = useState(v?.metodo || (hayPM ? "pago_movil" : hayTR ? "transferencia" : ""));
  const [capturaUrl, setCapturaUrl] = useState(v?.capturaUrl ?? "");
  const [subida, setSubida] = useState<"" | "subiendo" | string>("");
  const monto = totalBs != null ? `Bs ${totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}` : `$${totalUsd.toFixed(2)}`;
  const d = metodo === "pago_movil" ? cobros.pagoMovil : cobros.transferencia;

  return (
    <form action={accion} className="formulario">
      <input type="hidden" name="codigo" value={codigo} />
      {estado?.error && <p className="aviso error" role="alert">{estado.error}</p>}

      <div className="campo"><label htmlFor="p-nombre">Tu nombre y apellido</label><input id="p-nombre" name="nombre" required autoComplete="name" defaultValue={v?.nombre} /></div>
      <div className="campo"><label htmlFor="p-tel">Teléfono o WhatsApp</label><input id="p-tel" name="telefono" type="tel" autoComplete="tel" defaultValue={v?.telefono} /></div>
      <div className="campo"><label htmlFor="p-correo">Correo (para avisarte cuando confirmemos)</label><input id="p-correo" name="correo" type="email" autoComplete="email" defaultValue={v?.correo} /></div>

      <div className="campo">
        <label htmlFor="p-bono">¿Tienes un bono de regalo? (opcional)</label>
        <input id="p-bono" name="bono" autoCapitalize="characters" autoComplete="off" placeholder="Código del bono" defaultValue={v?.bono} />
        <small className="tenue">Si el bono cubre el total, no necesitas pagar nada más: deja vacía la referencia.</small>
      </div>

      {(hayPM || hayTR) ? (
        <>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 600, fontSize: ".92rem", marginBottom: 8 }}>¿Cómo pagas?</legend>
            <div className="metodos">
              {hayPM && <label><input type="radio" name="metodo" value="pago_movil" checked={metodo === "pago_movil"} onChange={() => setMetodo("pago_movil")} /> Pago Móvil</label>}
              {hayTR && <label><input type="radio" name="metodo" value="transferencia" checked={metodo === "transferencia"} onChange={() => setMetodo("transferencia")} /> Transferencia</label>}
            </div>
          </fieldset>
          <div className="datos-pago">
            <div><span>Monto a pagar</span><b>{monto}</b></div>
            <div><span>Banco</span><b>{d.banco}</b></div>
            {metodo === "pago_movil" ? <div><span>Teléfono</span><b>{cobros.pagoMovil.telefono}</b></div> : <div><span>Cuenta</span><b>{cobros.transferencia.cuenta}</b></div>}
            <div><span>Cédula o RIF</span><b>{d.cedula}</b></div>
            <div><span>Titular</span><b>{d.titular}</b></div>
          </div>
          <div className="campo"><label htmlFor="p-ref">Número de referencia del pago</label><input id="p-ref" name="referencia" inputMode="numeric" autoComplete="off" defaultValue={v?.referencia} /></div>
          <div className="campo">
            <label htmlFor="p-captura">Captura del comprobante (opcional, ayuda a confirmar más rápido)</label>
            <input id="p-captura" type="file" accept="image/*" disabled={subida === "subiendo"} onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setSubida("subiendo");
              try { setCapturaUrl(await subirCaptura(f, codigo)); setSubida(""); } catch (err) { setSubida(err instanceof Error && err.message ? err.message : "No se pudo subir la captura."); }
            }} />
            {subida === "subiendo" && <small role="status">Subiendo la captura…</small>}
            {subida && subida !== "subiendo" && <small role="alert" style={{ color: "#ff8a80" }}>{subida}</small>}
            {capturaUrl && !subida && <small role="status">Captura recibida.</small>}
            <input type="hidden" name="capturaUrl" value={capturaUrl} />
          </div>
        </>
      ) : (
        <p className="aviso">Todavía no están publicados los datos de pago. Escríbenos para completar tu compra o usa un bono de regalo.</p>
      )}

      <div><button className="boton" disabled={enviando || subida === "subiendo"}>{enviando ? "Enviando…" : tardio ? "Ya pagué: reportar mi pago" : "Reportar pago"}</button></div>
    </form>
  );
}
