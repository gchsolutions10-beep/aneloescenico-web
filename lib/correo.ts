// Avisos por correo con Resend. La clave y el remitente se configuran en el panel
// (Correo) o con las variables RESEND_API_KEY y CORREO_REMITENTE. Si faltan, no se
// envía nada: el comprador y el representante siempre pueden ver su estado en el sitio.
import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export type ConfigCorreo = { apiKey: string; remitente: string };

/** La clave nunca sale de aquí hacia el navegador: no forma parte de getConfig(). */
export async function leerConfigCorreo(): Promise<ConfigCorreo> {
  const [fila] = await db().select().from(schema.configuracion).where(eq(schema.configuracion.clave, "correo"));
  const guardada = (fila?.valor ?? {}) as Partial<ConfigCorreo>;
  return { apiKey: guardada.apiKey || process.env.RESEND_API_KEY || "", remitente: guardada.remitente || process.env.CORREO_REMITENTE || "" };
}

export async function enviarCorreo(para: string, asunto: string, texto: string): Promise<{ ok: boolean; error?: string }> {
  if (!para) return { ok: false, error: "Falta el destinatario." };
  try {
    const { apiKey, remitente } = await leerConfigCorreo();
    if (!apiKey || !remitente) return { ok: false, error: "El correo no está configurado." };
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: remitente, to: [para], subject: asunto, text: texto }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) return { ok: true };
    const j = await r.json().catch(() => ({}));
    console.warn("[correo] Resend respondió", r.status, j?.message);
    return { ok: false, error: `Resend respondió ${r.status}${j?.message ? `: ${j.message}` : ""}` };
  } catch (e) {
    console.warn("[correo] no se pudo enviar:", e instanceof Error ? e.message : e);
    return { ok: false, error: "No se pudo conectar con el servicio de correo." };
  }
}

export const urlBase = () => (process.env.SITIO_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");
