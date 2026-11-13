"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { validarSala } from "./planos";
import { exigirAdmin } from "./sesion";

export async function guardarSala(f: FormData) {
  await exigirAdmin();
  const id = Number(f.get("id")) || 0;
  const nombre = String(f.get("nombre") ?? "").trim();
  const ruta = `/admin/salas/${id || "nueva"}`;
  let cruda: unknown = null;
  try { cruda = JSON.parse(String(f.get("definicion") ?? "")); } catch { /* se informa abajo */ }
  const r = validarSala(cruda);
  if (!nombre || "error" in r) redirect(`${ruta}?error=${encodeURIComponent(!nombre ? "Escribe el nombre de la sala." : (r as { error: string }).error)}`);
  if (id) await db().update(schema.salas).set({ nombre, definicion: r.def }).where(eq(schema.salas.id, id));
  else await db().insert(schema.salas).values({ nombre, definicion: r.def });
  redirect(`/admin/salas?ok=${Date.now()}`);
}

export async function borrarSala(f: FormData) {
  await exigirAdmin();
  await db().delete(schema.salas).where(eq(schema.salas.id, Number(f.get("id")) || 0));
  redirect(`/admin/salas?ok=${Date.now()}`);
}
