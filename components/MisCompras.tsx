"use client";
// "Mis entradas": las compras hechas desde este teléfono quedan guardadas en el navegador,
// para que el comprador las encuentre aunque cierre la página mientras se confirma su pago.
// Solo se guarda el código de cada compra; el estado se consulta al servidor cada vez.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

const CLAVE = "anelo_compras";
const EVENTO = "anelo-compras";
const MAXIMO = 30;

type Guardada = { codigo: string; titulo: string; guardada: number };

const leerTexto = () => { try { return localStorage.getItem(CLAVE) ?? "[]"; } catch { return "[]"; } };
const leer = (texto: string): Guardada[] => {
  try {
    const v = JSON.parse(texto);
    return Array.isArray(v) ? v.filter((x) => x && typeof x.codigo === "string") : [];
  } catch { return []; }
};
function escribir(lista: Guardada[]) {
  try { localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAXIMO))); } catch { /* navegador sin almacenamiento */ }
  window.dispatchEvent(new Event(EVENTO));
}
const suscribir = (aviso: () => void) => {
  window.addEventListener("storage", aviso);
  window.addEventListener(EVENTO, aviso);
  return () => { window.removeEventListener("storage", aviso); window.removeEventListener(EVENTO, aviso); };
};
/** Las compras guardadas en este teléfono. En el servidor, ninguna. */
function useGuardadas(): Guardada[] {
  return leer(useSyncExternalStore(suscribir, leerTexto, () => "[]"));
}

/** Guarda la compra en este teléfono al abrir su página. No muestra nada. */
export function GuardarCompra({ codigo, titulo }: { codigo: string; titulo: string }) {
  useEffect(() => {
    const lista = leer(leerTexto());
    if (lista.some((x) => x.codigo === codigo)) return;
    escribir([{ codigo, titulo, guardada: Date.now() }, ...lista]);
  }, [codigo, titulo]);
  return null;
}

/** Quita una compra de este teléfono (la abrió alguien del equipo, no el comprador). No muestra nada. */
export function OlvidarCompra({ codigo }: { codigo: string }) {
  useEffect(() => {
    const lista = leer(leerTexto());
    if (lista.some((x) => x.codigo === codigo)) escribir(lista.filter((x) => x.codigo !== codigo));
  }, [codigo]);
  return null;
}

/** Recarga la página cada cierto tiempo mientras está visible (pago esperando confirmación). */
export function RefrescoAuto({ segundos = 20 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) router.refresh(); }, segundos * 1000);
    const volver = () => { if (!document.hidden) router.refresh(); };
    document.addEventListener("visibilitychange", volver);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", volver); };
  }, [router, segundos]);
  return null;
}

/** Enlace del menú: solo aparece si este teléfono tiene compras guardadas. */
export function EnlaceMisEntradas({ activo }: { activo: boolean }) {
  const n = useGuardadas().length;
  if (n === 0) return null;
  return (
    <li>
      <Link href="/mis-entradas" aria-current={activo ? "page" : undefined}>Mis entradas <span className="contador-menu">{n}</span></Link>
    </li>
  );
}

type Estado = { codigo: string; estado: string; titulo: string; cuando: string; butacas: number[] };

const TEXTO: Record<string, [string, string]> = {
  apartada: ["Apartada: falta reportar el pago", "oro"],
  vencida: ["Venció el apartado", "mal"],
  por_confirmar: ["Pago en revisión", "oro"],
  pagada: ["¡Entradas listas!", "si"],
  rechazada: ["Pago rechazado", "mal"],
  en_conflicto: ["Elige otras butacas o pide reembolso", "mal"],
  reembolso_pendiente: ["Reembolso en proceso", "oro"],
  reembolsada: ["Reembolsada", ""],
  anulada: ["Anulada", ""],
};

/** La lista de la página Mis entradas, con el estado de cada compra. */
export function ListaMisEntradas({ delEquipo = false }: { delEquipo?: boolean }) {
  const guardadas = useGuardadas();
  const codigos = guardadas.map((g) => g.codigo).join(",");
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  // Los códigos de la última respuesta: mientras no coincidan con los guardados, se está consultando.
  const [consultados, setConsultados] = useState<string | null>(null);
  const cargando = consultados !== codigos;

  useEffect(() => {
    let vivo = true;
    const leerEstados = async () => {
      if (!codigos) return;
      try {
        const r = await fetch(`/api/mis-compras?c=${codigos}`, { cache: "no-store" });
        if (!r.ok) return;
        const j: Estado[] = await r.json();
        if (vivo) { setEstados(Object.fromEntries(j.map((x) => [x.codigo, x]))); setConsultados(codigos); }
      } catch { /* sin conexión: se reintenta en la próxima vuelta */ }
    };
    leerEstados();
    // Mientras haya pagos en revisión, se vuelve a consultar sola.
    const t = setInterval(() => { if (!document.hidden) leerEstados(); }, 20000);
    return () => { vivo = false; clearInterval(t); };
  }, [codigos]);

  const quitar = (codigo: string) => escribir(guardadas.filter((g) => g.codigo !== codigo));

  if (guardadas.length === 0) {
    return (
      <div className="caja">
        <p style={{ margin: 0 }}>En este teléfono todavía no hay compras guardadas.</p>
        <p className="tenue" style={{ margin: 0 }}>Cuando compres entradas aquí, aparecerán en esta lista. Si compraste desde otro teléfono o navegador, abre el enlace que te enviamos por WhatsApp.</p>
        <p style={{ margin: 0 }}><Link className="boton" href="/funciones">Ver funciones</Link></p>
      </div>
    );
  }

  return (
    <div className="mis-compras">
      {delEquipo && (
        <div className="aviso">
          <p style={{ margin: 0 }}>Tienes la sesión del equipo abierta en este teléfono. Si aquí aparecen compras de clientes que abriste desde el panel antes de esta corrección, no son tuyas: quítalas todas de una vez.</p>
          <p style={{ margin: "10px 0 0" }}><button type="button" className="boton sec" onClick={() => escribir([])}>Vaciar la lista de este teléfono</button></p>
        </div>
      )}
      {guardadas.map((g) => {
        const e = estados[g.codigo];
        const [texto, clase] = e ? TEXTO[e.estado] ?? [e.estado, ""] : [cargando ? "Consultando…" : "No encontrada", ""];
        return (
          <article key={g.codigo} className={`caja compra${e?.estado === "pagada" ? " lista" : ""}`}>
            <div className="compra-cab">
              <div>
                <b>{e?.titulo ?? g.titulo}</b>
                {e && <span className="tenue">{e.cuando}{e.butacas.length ? ` · ${e.butacas.length === 1 ? "Butaca" : "Butacas"} ${e.butacas.join(", ")}` : ""}</span>}
              </div>
              <span className={`estado-compra ${clase}`}>{texto}</span>
            </div>
            <div className="compra-acciones">
              {e?.estado === "pagada" ? (
                <>
                  <Link className="boton" href={`/orden/${g.codigo}`}>Ver mis entradas</Link>
                  <a className="boton sec" href={`/api/entradas/${g.codigo}`} download>Descargar PDF</a>
                </>
              ) : e ? <Link className="boton sec" href={`/orden/${g.codigo}`}>Ver la compra</Link> : null}
              <button type="button" className="boton sec" onClick={() => quitar(g.codigo)}>Quitar de la lista</button>
            </div>
          </article>
        );
      })}
      <p className="tenue" style={{ fontSize: ".88rem", margin: 0 }}>Esta lista se guarda solo en este teléfono y este navegador. Descarga el PDF de tus entradas para tenerlas aunque no haya internet en la sala.</p>
    </div>
  );
}
