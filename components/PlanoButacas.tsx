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
export const usdC = (v: number) => (Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`);
export const bsC = (v: number) => `Bs ${v.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Estado del plano, refrescado cada 6 segundos mientras la pestaña está visible. */
export function usePlanoVivo(funcionId: number, inicial: EstadoPlano) {
  const [plano, setPlano] = useState(inicial);
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
  return plano;
}

export type Linea = { n: number; zona: string; color: string; precio: number };

/** Butacas elegidas sobre un plano en vivo: si otra persona toma una, sale sola de la selección. */
export function useSeleccion(plano: EstadoPlano, { max, tocables = ["libre"], tope }: { max: number; tocables?: string[]; tope?: number }) {
  const [sel, setSel] = useState<number[]>([]);
  const [aviso, setAviso] = useState("");
  const porNumero = useMemo(() => new Map(plano.butacas.map((b) => [b.n, b])), [plano]);
  const zona = useMemo(() => new Map(plano.zonas.map((z) => [z.id, z])), [plano]);
  const vigentes = sel.filter((n) => tocables.includes(porNumero.get(n)?.e ?? ""));
  const perdidas = sel.length - vigentes.length;
  const lineas: Linea[] = vigentes.map((n) => {
    const z = zona.get(porNumero.get(n)!.z);
    return { n, zona: z?.nombre ?? "", color: z?.color ?? "#ccc", precio: z?.precio ?? 0 };
  });
  const total = lineas.reduce((s, l) => s + l.precio, 0);

  function tocar(n: number) {
    setAviso("");
    if (vigentes.includes(n)) return setSel(vigentes.filter((x) => x !== n));
    if (vigentes.length >= max) return setAviso(`Puedes elegir hasta ${max} ${max === 1 ? "butaca" : "butacas"}.`);
    const precio = zona.get(porNumero.get(n)!.z)?.precio ?? 0;
    if (tope != null && total + precio > tope + 0.001) return setAviso(`Con lo que pagaste (${usdC(tope)}) no alcanza para sumar esa butaca.`);
    setSel([...vigentes, n]);
  }
  const limpiar = () => { setAviso(""); setSel([]); };
  return { vigentes, perdidas, lineas, total, aviso, tocar, limpiar };
}

/** El dibujo del plano con su barra de zoom y su leyenda. */
export function MapaButacas({ plano, vigentes, tocables = ["libre"], tocar }: { plano: EstadoPlano; vigentes: number[]; tocables?: string[]; tocar: (n: number) => void }) {
  const [zoom, setZoom] = useState(1);
  const zona = useMemo(() => new Map(plano.zonas.map((z) => [z.id, z])), [plano]);
  // Los bloques se muestran en el orden de su numeración.
  const bloques = useMemo(() => [...new Set(plano.butacas.map((b) => b.b))], [plano]);
  const filas = (bloque: string) => {
    const m = new Map<number, EstadoPlano["butacas"]>();
    for (const b of plano.butacas) if (b.b === bloque) m.set(b.f, [...(m.get(b.f) ?? []), b]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([, bs]) => bs.sort((a, b) => a.p - b.p));
  };

  return (
    <>
      <div className="plano-barra">
        <span>{plano.libres} de {plano.total} butacas disponibles</span>
        <span className="zoom">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))} aria-label="Reducir el plano">−</button>
          <button type="button" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} aria-label="Ampliar el plano">+</button>
        </span>
      </div>
      <div className="plano-scroll" style={{ ["--tam" as string]: `calc(var(--base) * ${zoom})` }}>
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
                      return (
                        <button
                          key={b.n}
                          type="button"
                          className={`butaca e-${b.e}${mia ? " mia" : ""}`}
                          style={b.e === "libre" && !mia ? { background: z?.color } : undefined}
                          disabled={!tocables.includes(b.e)}
                          aria-pressed={mia}
                          aria-label={`Butaca ${b.n}, ${z?.nombre}, ${usdC(z?.precio ?? 0)}, ${mia ? "elegida" : NOMBRE_ESTADO[b.e] ?? b.e}`}
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
        {plano.zonas.map((z) => <span key={z.id}><i style={{ background: z.color }} />{z.nombre} · {usdC(z.precio)}</span>)}
        <span><i className="l-mia" />Selección</span>
        <span><i className="l-apartada" />Apartada</span>
        <span><i className="l-vendida" />Vendida</span>
      </div>
    </>
  );
}

export default function PlanoButacas({ funcionId, inicial, max, tasa, tocables = ["libre"], tope }: Props) {
  const plano = usePlanoVivo(funcionId, inicial);
  const { vigentes, perdidas, total, aviso, tocar } = useSeleccion(plano, { max, tocables, tope });

  return (
    <div className="plano-caja">
      <MapaButacas plano={plano} vigentes={vigentes} tocables={tocables} tocar={tocar} />
      <div className="plano-resumen" aria-live="polite">
        {perdidas > 0 && <p className="aviso error">{perdidas === 1 ? "Una de tus butacas acaba de ser tomada" : `${perdidas} de tus butacas acaban de ser tomadas`} por otra persona. Elige {perdidas === 1 ? "otra" : "otras"}.</p>}
        {aviso && <p className="aviso error">{aviso}</p>}
        {vigentes.length === 0 ? <p className="tenue">Toca las butacas que quieres.</p> : (
          <p>
            <strong>{vigentes.length === 1 ? "Butaca" : "Butacas"} {[...vigentes].sort((a, b) => a - b).join(", ")}</strong>
            {" · "}Total <strong>{usdC(total)}</strong>
            {tasa ? <span className="tenue"> ({bsC(Math.round(total * tasa * 100) / 100)})</span> : null}
          </p>
        )}
      </div>
      <input type="hidden" name="numeros" value={vigentes.join(",")} />
    </div>
  );
}
