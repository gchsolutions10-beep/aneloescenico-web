// Tarea diaria (Vercel Cron, ver vercel.json): genera las mensualidades del mes y envía
// los recordatorios por correo. Vercel la llama con "Authorization: Bearer CRON_SECRET".
import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { enviarCorreo, leerConfigCorreo, urlBase } from "@/lib/correo";
import { getConfig } from "@/lib/datos";
import { cargosPorAvisar, generarMensualidades, periodoActual } from "@/lib/escuela";
import { limpiarVencidas } from "@/lib/taquilla";
import { actualizarTasa } from "@/lib/tasa";

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { cobros } = await getConfig();
  const generadas = await generarMensualidades(periodoActual(), cobros.diaVencimiento);
  await limpiarVencidas();
  if (!cobros.tasaManual) await actualizarTasa();

  let avisos = 0;
  const correo = await leerConfigCorreo();
  if (correo.apiKey && correo.remitente) {
    const { porVencer, enMora } = await cargosPorAvisar();
    const enviar = async (lista: typeof porVencer, campo: "recordadoEl" | "moraAvisadaEl", asunto: string, intro: string) => {
      const enviados: number[] = [];
      for (const { c, e, correoCuenta } of lista) {
        const para = correoCuenta || e.repCorreo;
        if (!para) continue;
        const r = await enviarCorreo(para, asunto, `Hola ${e.repNombre || ""}:\n\n${intro}\n\n${c.concepto} · ${e.nombres} ${e.apellidos} · $${c.montoUsd} · vence el ${c.venceEl}\n\nPuedes pagar y reportar desde el portal:\n${urlBase()}/portal\n\nA-Nelo Escénico`);
        if (r.ok) enviados.push(c.id);
      }
      if (enviados.length) await db().update(schema.cargos).set({ [campo]: new Date() }).where(inArray(schema.cargos.id, enviados));
      avisos += enviados.length;
    };
    await enviar(porVencer, "recordadoEl", "Recordatorio de pago", "Te recordamos que este pago está por vencer:");
    await enviar(enMora, "moraAvisadaEl", "Tienes un pago vencido", "Este pago ya venció y sigue pendiente:");
  }
  return NextResponse.json({ generadas, avisos });
}
