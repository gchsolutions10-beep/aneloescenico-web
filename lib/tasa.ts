// Tasa oficial del BCV (bolívares por dólar).
// Orden de búsqueda: 1) tasa manual fijada en el panel, 2) la guardada hoy,
// 3) bcv.org.ve, 4) DolarApi (que publica la tasa oficial del BCV), 5) la última guardada.
import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getConfig } from "./datos";

export type Tasa = { valor: number; fuente: "bcv" | "dolarapi" | "manual"; fecha: string; desactualizada: boolean };

/** Fecha de hoy en Venezuela (UTC-4), como AAAA-MM-DD. */
export const hoyCaracas = () => new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10);

const razonable = (v: number) => Number.isFinite(v) && v > 1 && v < 1_000_000;

/** Extrae el dólar de la portada del BCV: <div id="dolar"> … <strong> 36,50420000 </strong> */
export function parsearBcv(html: string): number | null {
  const m = html.match(/id="dolar"[\s\S]{0,800}?<strong>\s*([\d.,]+)\s*<\/strong>/i);
  if (!m) return null;
  const v = Number(m[1].replace(/\./g, "").replace(",", "."));
  return razonable(v) ? v : null;
}

async function pedir(url: string): Promise<Response> {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store", headers: { "user-agent": "Mozilla/5.0 (compatible; tasa-bcv)" } });
  if (!r.ok) throw new Error(`${url} respondió ${r.status}`);
  return r;
}

async function desdeBcv(): Promise<number> {
  const v = parsearBcv(await (await pedir("https://www.bcv.org.ve/")).text());
  if (v == null) throw new Error("No se encontró el dólar en la página del BCV");
  return v;
}

async function desdeDolarApi(): Promise<number> {
  const j = await (await pedir("https://ve.dolarapi.com/v1/dolares/oficial")).json();
  const v = Number(j?.promedio);
  if (!razonable(v)) throw new Error("DolarApi no devolvió una tasa válida");
  return v;
}

/** Consulta las fuentes y guarda la tasa de hoy. Devuelve null si ninguna respondió. */
export async function actualizarTasa(): Promise<Tasa | null> {
  for (const [fuente, leer] of [["bcv", desdeBcv], ["dolarapi", desdeDolarApi]] as const) {
    try {
      const valor = await leer();
      const fecha = hoyCaracas();
      await db().insert(schema.tasas).values({ fecha, valor: valor.toFixed(4), fuente })
        .onConflictDoUpdate({ target: schema.tasas.fecha, set: { valor: valor.toFixed(4), fuente, obtenidaEl: new Date() } });
      return { valor, fuente, fecha, desactualizada: false };
    } catch (e) {
      console.warn(`[tasa] ${fuente} falló:`, e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : e);
    }
  }
  return null;
}

let ultimoIntento = 0;

/** Tasa vigente para cobrar. Null solo si nunca se ha podido obtener ninguna. */
export async function getTasa(): Promise<Tasa | null> {
  const { cobros } = await getConfig();
  const hoy = hoyCaracas();
  if (cobros.tasaManual) return { valor: cobros.tasaManual, fuente: "manual", fecha: hoy, desactualizada: false };

  const [deHoy] = await db().select().from(schema.tasas).where(eq(schema.tasas.fecha, hoy));
  if (deHoy) return { valor: Number(deHoy.valor), fuente: deHoy.fuente as Tasa["fuente"], fecha: hoy, desactualizada: false };

  // Si las fuentes están caídas, no se insiste más de una vez cada 5 minutos.
  if (Date.now() - ultimoIntento > 5 * 60_000) {
    ultimoIntento = Date.now();
    const nueva = await actualizarTasa();
    if (nueva) return nueva;
  }
  const [ultima] = await db().select().from(schema.tasas).orderBy(desc(schema.tasas.fecha)).limit(1);
  return ultima ? { valor: Number(ultima.valor), fuente: ultima.fuente as Tasa["fuente"], fecha: ultima.fecha, desactualizada: true } : null;
}

export const enBs = (usd: number, tasa: number) => Math.round(usd * tasa * 100) / 100;
