"use server";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import type { Estado } from "./acciones";
import { enviarCorreo, leerConfigCorreo } from "./correo";
import { exigirAdmin, leerSesion } from "./sesion";

const { usuarios, tokensClave } = schema;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const MINUTOS = 60;

/** Cambiar la clave propia, conociendo la actual. */
export async function cambiarMiClave(_: Estado, f: FormData): Promise<Estado> {
  const s = await leerSesion();
  if (!s) redirect("/ingresar");
  const actual = String(f.get("actual") ?? ""), nueva = String(f.get("nueva") ?? "");
  if (nueva.length < 8) return { error: "La clave nueva debe tener al menos 8 caracteres." };
  if (nueva !== String(f.get("repetir") ?? "")) return { error: "Las dos claves nuevas no coinciden." };
  const [u] = await db().select().from(usuarios).where(eq(usuarios.id, s.id));
  if (!(await bcrypt.compare(actual, u.claveHash))) return { error: "La clave actual no es correcta." };
  await db().update(usuarios).set({ claveHash: await bcrypt.hash(nueva, 12) }).where(eq(usuarios.id, s.id));
  return { ok: "Clave cambiada. Úsala la próxima vez que ingreses." };
}

/** Un administrador pone una clave nueva a un representante que la perdió. */
export async function restablecerClaveRepresentante(f: FormData) {
  await exigirAdmin();
  const estudianteId = Number(f.get("estudianteId")) || 0;
  const ruta = `/admin/estudiantes/${estudianteId}?tab=portal`;
  const clave = String(f.get("clave") ?? "");
  if (clave.length < 8) redirect(`${ruta}&error=${encodeURIComponent("La clave nueva debe tener al menos 8 caracteres.")}`);
  // Solo cuentas de representante: las del equipo se cambian en Usuarios.
  await db().update(usuarios).set({ claveHash: await bcrypt.hash(clave, 12), intentosFallidos: 0, bloqueadoHasta: null })
    .where(and(eq(usuarios.id, Number(f.get("usuarioId")) || 0), eq(usuarios.rol, "representante")));
  redirect(`${ruta}&ok=${Date.now()}`);
}

/** "Olvidé mi clave": envía un enlace de un solo uso. La respuesta es la misma exista o no la cuenta. */
export async function pedirEnlaceClave(_: Estado, f: FormData): Promise<Estado> {
  const correo = String(f.get("correo") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(correo)) return { error: "Escribe tu correo." };
  const config = await leerConfigCorreo();
  if (!config.apiKey || !config.remitente) return { error: "La recuperación por correo no está disponible todavía. Escribe a la escuela para que te asignen una clave nueva." };
  const [u] = await db().select().from(usuarios).where(and(eq(usuarios.correo, correo), eq(usuarios.activo, true), ne(usuarios.rol, "master")));
  if (u) {
    // No más de un enlace cada 5 minutos por cuenta.
    const [reciente] = await db().select({ id: tokensClave.id }).from(tokensClave).where(and(eq(tokensClave.usuarioId, u.id), gt(tokensClave.creadoEl, new Date(Date.now() - 5 * 60_000))));
    if (!reciente) {
      const token = randomBytes(32).toString("hex");
      await db().insert(tokensClave).values({ usuarioId: u.id, tokenHash: hash(token), venceEl: new Date(Date.now() + MINUTOS * 60_000) });
      const h = await headers();
      const base = process.env.SITIO_URL?.replace(/\/$/, "") || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
      await enviarCorreo(u.correo, "Restablecer tu clave", `Hola ${u.nombre}:\n\nPara elegir una clave nueva abre este enlace (vale ${MINUTOS} minutos y sirve una sola vez):\n${base}/ingresar/restablecer?t=${token}\n\nSi no lo pediste, ignora este correo.\n\nA-Nelo Escénico`);
    }
  }
  return { ok: "Si ese correo tiene una cuenta, te enviamos un enlace para elegir una clave nueva. Revisa también la carpeta de spam." };
}

export async function restablecerConEnlace(_: Estado, f: FormData): Promise<Estado> {
  const nueva = String(f.get("nueva") ?? "");
  if (nueva.length < 8) return { error: "La clave debe tener al menos 8 caracteres." };
  if (nueva !== String(f.get("repetir") ?? "")) return { error: "Las dos claves no coinciden." };
  // Se marca como usado en la misma operación que lo valida: el enlace no puede servir dos veces.
  const [t] = await db().update(tokensClave).set({ usadoEl: new Date() })
    .where(and(eq(tokensClave.tokenHash, hash(String(f.get("t") ?? ""))), isNull(tokensClave.usadoEl), gt(tokensClave.venceEl, new Date()))).returning();
  if (!t) return { error: "Este enlace ya se usó o venció. Pide uno nuevo." };
  await db().update(usuarios).set({ claveHash: await bcrypt.hash(nueva, 12), intentosFallidos: 0, bloqueadoHasta: null }).where(eq(usuarios.id, t.usuarioId));
  redirect("/ingresar?clave=1");
}
