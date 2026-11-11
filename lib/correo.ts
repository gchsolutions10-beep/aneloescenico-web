// Avisos por correo con Resend. Si falta RESEND_API_KEY o CORREO_REMITENTE, no se envía nada
// (el comprador siempre puede ver el estado en la página de su orden).
import "server-only";

export async function enviarCorreo(para: string, asunto: string, texto: string) {
  const clave = process.env.RESEND_API_KEY;
  const de = process.env.CORREO_REMITENTE; // p. ej. "A-Nelo Escénico <taquilla@tudominio.com>"
  if (!clave || !de || !para) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${clave}`, "content-type": "application/json" },
      body: JSON.stringify({ from: de, to: [para], subject: asunto, text: texto }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.warn("[correo] Resend respondió", r.status);
  } catch (e) {
    console.warn("[correo] no se pudo enviar:", e instanceof Error ? e.message : e);
  }
}

export const urlBase = () => (process.env.SITIO_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");
