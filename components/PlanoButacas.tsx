"use client";
import { useEffect, useMemo, useState } from "react";
import type { EstadoPlano } from "@/lib/taquilla";

type Props = {
  funcionId: number;
  inicial: EstadoPlano;
  /** Máximo de butacas que se pueden elegir. */
  max: number;
  /** Tasa BCV para mostrar el total en bolívares. */
  tasa?: number | null;
  /** Estados que se pueden tocar. Por defecto solo las libres. */
  tocables?: string[];
  /** Tope de dinero disponible (cambio de butacas por conflicto). */
  tope?: number;
};

const NOMBRE_ESTADO: Record<string, string> = { libre: "disponible", apartada: "apartada por otra persona", por_confirmar: "en proceso de pago", vendida: "vendida", bloqueada: "no disponible" };
const usd = (v: number) => (Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`);
const bs = (v: number) => `Bs ${v.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PlanoButacas({ funcionId, inicial, max, tasa, tocables = ["libre"], tope }: Props) {
  const [plano, setPlano] = useState(inicial);
  const [sel, setSel] = useState<number[]>([]);
  const [aviso, setAviso] = useState("");
  const [zoom, setZoom] = useState(1);

  // Refresco en vivo cada 6 segundos mientras la pestaña está visible.
  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/butacas/${funcionId}`, { cache: "no-store" });
        if (r.ok && vivo) setPlano(await r.json());
      } catch { /* sin conexión: se reintenta en la próxima vuelta */ }
    };
    const t = setInterval(leer, 6000);
    document.addEventListener("visibilitychange", leer);
    return () => { vivo = false; clearInterval(t); document.removeEventListener("visibilitychange", leer); };
  }, [funcionId]);

  const porNumero = useMemo(() => new Map(plano.butacas.map((b) => [b.n, b])), [plano]);
  const zona = useMemo(() => new Map(plano.zonas.map((z) => [z.id, z])), [plano]);
  // Los bloques se muestran en el orden de su numeración.
  const bloques = useMemo(() => [...new Set(plano.butacas.map((b) => b.b))], [plano]);
  // Si alguien más tomó una butaca que yo tenía marcada, sale de mi selección.
  const vigentes = sel.filter((n) => tocables.includes(porNumero.get(n)?.e ?? ""));
  const perdidas = sel.length - vigentes.length;
  const total = vigentes.reduce((s, n) => s + (zona.get(porNumero.get(n)!.z)?.precio ?? 0), 0);

  function tocar(n: number) {
    setAviso("");
    if (vigentes.includes(n)) return setSel(vigentes.filter((x) => x !== n));
    if (vigentes.length >= max) return setAviso(`Puedes elegir hasta ${max} ${max === 1 ? "butaca" : "butacas"}.`);
    const precio = zona.get(porNumero.get(n)!.z)?.precio ?? 0;
    if (tope != null && total + precio > tope + 0.001) return setAviso(`Con lo que pagaste (${usd(tope)}) no alcanza para sumar esa butaca.`);
    setSel([...vigentes, n]);
  }

  const filas = (bloque: string) => {
    const m = new Map<number, EstadoPlano["butacas"]>();
    for (const b of plano.butacas) if (b.b === bloque) m.set(b.f, [...(m.get(b.f) ?? []), b]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([, bs]) => bs.sort((a, b) => a.p - b.p));
  };

  return (
    <div className="plano-caja" style={{ ["--zoom" as string]: zoom }}>
      <div className="plano-barra">
        <span>{plano.libres} de {plano.total} butacas disponibles</span>
        <span className="zoom">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))} aria-label="Reducir el plano">−</button>
          <button type="button" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} aria-label="Ampliar el plano">+</button>
        </span>
      </div>
      <div className="plano-scroll">
        <div className="plano-lienzo">
          <div className="escenario">ESCENARIO</div>
          <div className="plano">
            {bloques.map((nombre) => (
              <div key={nombre} className="lado">
                {filas(nombre).map((fila, i) => (
                  <div key={i} className="hilera">
                    {fila.map((b) => {
                      const z = zona.get(b.z);
                      const mia = vigentes.includes(b.n);
                      const tocable = tocables.includes(b.e);
                      return (
                        <button
                          key={b.n}
                          type="button"
                          className={`butaca e-${b.e}${mia ? " mia" : ""}`}
                          style={b.e === "libre" && !mia ? { background: z?.color } : undefined}
                          disabled={!tocable}
                          aria-pressed={mia}
                          aria-label={`Butaca ${b.n}, ${z?.nombre}, ${usd(z?.precio ?? 0)}, ${mia ? "elegida" : NOMBRE_ESTADO[b.e] ?? b.e}`}
                          onClick={() => tocar(b.n)}
                        >{b.n}</button>
                      );
                    })}
                  </div>
                ))}
                <span className="lado-nombre">{nombre}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="leyenda">
        {plano.zonas.map((z) => <span key={z.id}><i style={{ background: z.color }} />{z.nombre} · {usd(z.precio)}</span>)}
        <span><i className="l-mia" />Tu selección</span>
        <span><i className="l-apartada" />Apartada</span>
        <span><i className="l-vendida" />Vendida</span>
      </div>

      <div className="plano-resumen" aria-live="polite">
        {perdidas > 0 && <p className="aviso error">{perdidas === 1 ? "Una de tus butacas acaba de ser tomada" : `${perdidas} de tus butacas acaban de ser tomadas`} por otra persona. Elige {perdidas === 1 ? "otra" : "otras"}.</p>}
        {aviso && <p className="aviso error">{aviso}</p>}
        {vigentes.length === 0 ? <p className="tenue">Toca las butacas que quieres.</p> : (
          <p>
            <strong>{vigentes.length === 1 ? "Butaca" : "Butacas"} {[...vigentes].sort((a, b) => a - b).join(", ")}</strong>
            {" · "}Total <strong>{usd(total)}</strong>
            {tasa ? <span className="tenue"> ({bs(Math.round(total * tasa * 100) / 100)})</span> : null}
          </p>
        )}
      </div>
      <input type="hidden" name="numeros" value={vigentes.join(",")} />
    </div>
  );
}
