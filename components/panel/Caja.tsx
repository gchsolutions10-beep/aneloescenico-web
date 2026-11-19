"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { bsC, MapaButacas, usdC, usePlanoVivo, useSeleccion } from "@/components/PlanoButacas";
import { Icono } from "@/components/panel/Icono";
import type { NombreIcono } from "@/components/panel/iconos";
import { accionVender } from "@/lib/acciones-taquilla";
import type { EstadoPlano } from "@/lib/taquilla";

type Props = {
  funcion: { id: number; titulo: string; cuando: string };
  inicial: EstadoPlano;
  tasa: number | null;
  puedeCortesia: boolean;
};

const METODOS: [string, string, NombreIcono][] = [
  ["efectivo", "Efectivo", "monedas"],
  ["pago_movil", "Pago Móvil", "telefono"],
  ["transferencia", "Transferencia", "edificio"],
  ["punto", "Punto de venta", "tarjeta"],
  ["bono", "Solo bono", "regalo"],
  ["cortesia", "Cortesía", "estrella"],
];
const BILLETES = [5, 10, 20, 50, 100];
const redondo = (v: number) => Math.round(v * 100) / 100;

function Cobrar({ total, vacio, metodo, tasa }: { total: number; vacio: boolean; metodo: string; tasa: number | null }) {
  const { pending } = useFormStatus();
  const texto = metodo === "cortesia" ? "Entregar cortesía" : `Cobrar ${usdC(total)}`;
  return (
    <button className="btn caja-cobrar" disabled={vacio || pending}>
      {pending ? "Registrando venta…" : vacio ? "Elige las butacas" : <>{texto}{tasa && metodo !== "cortesia" && total > 0 ? <small>{bsC(redondo(total * tasa))}</small> : null}</>}
    </button>
  );
}

export default function Caja({ funcion, inicial, tasa, puedeCortesia }: Props) {
  const plano = usePlanoVivo(funcion.id, inicial);
  const { vigentes, perdidas, lineas, total, aviso, tocar, limpiar } = useSeleccion(plano, { max: 30 });
  const [metodo, setMetodo] = useState("efectivo");
  const [moneda, setMoneda] = useState<"usd" | "bs">("usd");
  const [recibido, setRecibido] = useState("");
  const [conBono, setConBono] = useState(false);
  const [conCliente, setConCliente] = useState(false);

  const totalBs = tasa ? redondo(total * tasa) : null;
  const cobro = moneda === "usd" ? total : totalBs ?? 0;
  const pago = Number(recibido.replace(",", ".")) || 0;
  const vuelto = redondo(pago - cobro);
  const metodos = METODOS.filter(([k]) => k !== "cortesia" || puedeCortesia);
  const conReferencia = metodo === "pago_movil" || metodo === "transferencia" || metodo === "punto";

  return (
    <form action={accionVender} className="registradora">
      <input type="hidden" name="funcionId" value={funcion.id} />
      <input type="hidden" name="numeros" value={vigentes.join(",")} />
      <input type="hidden" name="metodo" value={metodo} />

      <section className="panel caja-plano">
        <div className="plano-caja"><MapaButacas plano={plano} vigentes={vigentes} tocar={tocar} /></div>
      </section>

      <aside className="caja-ticket" id="ticket" aria-label="Ticket de venta">
        <header>
          <small>Ticket de venta</small>
          <b>{funcion.titulo}</b>
          <span>{funcion.cuando}{tasa ? ` · Tasa ${bsC(tasa)}` : ""}</span>
        </header>

        <div className="caja-lineas" aria-live="polite">
          {perdidas > 0 && <p className="nota mal">{perdidas === 1 ? "Una butaca se vendió en línea" : `${perdidas} butacas se vendieron en línea`} mientras elegías. Elige {perdidas === 1 ? "otra" : "otras"}.</p>}
          {aviso && <p className="nota mal">{aviso}</p>}
          {lineas.length === 0 ? (
            <p className="caja-vacia">Toca las butacas en el plano.<br />Cada una se suma aquí.</p>
          ) : (
            <ul>
              {[...lineas].sort((a, b) => a.n - b.n).map((l) => (
                <li key={l.n}>
                  <i style={{ background: l.color }} aria-hidden="true" />
                  <span>Butaca <b>{l.n}</b><small>{l.zona}</small></span>
                  <b>{usdC(l.precio)}</b>
                  <button type="button" onClick={() => tocar(l.n)} aria-label={`Quitar la butaca ${l.n}`}>×</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="caja-total">
          <div><span>{lineas.length} {lineas.length === 1 ? "entrada" : "entradas"}</span>{lineas.length > 0 && <button type="button" className="caja-limpiar" onClick={limpiar}>Vaciar</button>}</div>
          <div className="caja-monto"><b>{metodo === "cortesia" ? "$0" : usdC(total)}</b>{totalBs != null && metodo !== "cortesia" && <span>{bsC(totalBs)}</span>}</div>
        </div>

        <fieldset className="caja-metodos">
          <legend>Forma de pago</legend>
          <div>
            {metodos.map(([k, n, ic]) => (
              <button key={k} type="button" aria-pressed={metodo === k} onClick={() => setMetodo(k)}><Icono nombre={ic} tam={20} />{n}</button>
            ))}
          </div>
        </fieldset>

        {metodo === "efectivo" && total > 0 && (
          <div className="caja-vuelto">
            <div className="cab">
              <label htmlFor="c-recibido">Recibido</label>
              {tasa && (
                <div className="pestanas" role="tablist" aria-label="Moneda">
                  <button type="button" role="tab" aria-selected={moneda === "usd"} onClick={() => { setMoneda("usd"); setRecibido(""); }}>Dólares</button>
                  <button type="button" role="tab" aria-selected={moneda === "bs"} onClick={() => { setMoneda("bs"); setRecibido(""); }}>Bolívares</button>
                </div>
              )}
            </div>
            <input id="c-recibido" inputMode="decimal" autoComplete="off" value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder={moneda === "usd" ? usdC(total) : bsC(cobro)} />
            {moneda === "usd" && (
              <div className="caja-billetes">
                <button type="button" onClick={() => setRecibido(String(total))}>Exacto</button>
                {BILLETES.filter((b) => b >= total).slice(0, 4).map((b) => <button key={b} type="button" onClick={() => setRecibido(String(b))}>${b}</button>)}
              </div>
            )}
            {pago > 0 && (
              <p className={`caja-cambio${vuelto < 0 ? " falta" : ""}`}>
                {vuelto < 0 ? "Falta" : "Vuelto"} <b>{moneda === "usd" ? usdC(Math.abs(vuelto)) : bsC(Math.abs(vuelto))}</b>
                {moneda === "usd" && vuelto > 0 && tasa ? <small> ({bsC(redondo(vuelto * tasa))})</small> : null}
              </p>
            )}
          </div>
        )}

        {conReferencia && (
          <div className="campo">
            <label htmlFor="c-ref">{metodo === "punto" ? "Número de aprobación (opcional)" : "Referencia del pago"}</label>
            <input id="c-ref" name="referencia" inputMode="numeric" autoComplete="off" required={metodo !== "punto"} placeholder="Últimos dígitos" />
          </div>
        )}

        {(metodo === "bono" || conBono) ? (
          <div className="campo">
            <label htmlFor="c-bono">Código del bono de regalo</label>
            <input id="c-bono" name="bono" autoCapitalize="characters" autoComplete="off" required={metodo === "bono"} />
            {metodo !== "bono" && <small>El bono se descuenta primero; el resto se cobra con {METODOS.find((m) => m[0] === metodo)?.[1]}.</small>}
          </div>
        ) : metodo !== "cortesia" && <button type="button" className="caja-mas" onClick={() => setConBono(true)}>+ El cliente trae un bono de regalo</button>}

        {conCliente ? (
          <div className="fila" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="campo"><label htmlFor="c-nombre">Nombre</label><input id="c-nombre" name="nombre" autoComplete="off" /></div>
            <div className="campo"><label htmlFor="c-tel">Teléfono</label><input id="c-tel" name="telefono" type="tel" autoComplete="off" placeholder="0414…" /></div>
          </div>
        ) : <button type="button" className="caja-mas" onClick={() => setConCliente(true)}>+ Datos del cliente (para enviarle las entradas por WhatsApp)</button>}

        <Cobrar total={total} vacio={lineas.length === 0} metodo={metodo} tasa={tasa} />
      </aside>

      {lineas.length > 0 && (
        <a href="#ticket" className="caja-flotante">
          <span>{lineas.length} {lineas.length === 1 ? "butaca" : "butacas"} · <b>{usdC(total)}</b></span>
          <span>Ir a cobrar ↓</span>
        </a>
      )}
    </form>
  );
}
