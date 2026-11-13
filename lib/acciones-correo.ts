"use server";

import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { enviarCorreo, leerConfigCorreo } from "./correo";
import { exigirAdmin } from "./sesion";

export async function guardarCorreo(f: FormData) {
  await exigirAdmin();
  const actual = await leerConfigCorreo();
  const clave = String(f.get("apiKey") ?? "").trim();
  const valor = {
    apiKey: f.get("borrar") ? "" : clave || actual.apiKey, // en blanco = conservar la guardada
    remitente: String(f.get("remitente") ?? "").trim(),
  };
  await db().insert(schema.configuracion).values({ clave: "correo", valor }).onConflictDoUpdate({ target: schema.configuracion.clave, set: { valor } });
  redirect(`/admin/correo?ok=${Date.now()}`);
}

export async function probarCorreo(f: FormData) {
  const s = await exigirAdmin();
  const para = String(f.get("para") ?? "").trim() || s.correo;
  const r = await enviarCorreo(para, "Prueba de correo · A-Nelo Escénico", "Si lees esto, el correo del sitio quedó bien configurado.");
  redirect(r.ok ? `/admin/correo?enviado=${encodeURIComponent(para)}` : `/admin/correo?error=${encodeURIComponent(r.error ?? "No se pudo enviar.")}`);
}
