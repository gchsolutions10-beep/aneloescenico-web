"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { limpiarArchivos } from "./archivos";
import { exigirAdmin, exigirRepresentante } from "./sesion";
import { slugify } from "./util";

const { fichasArtista, estudiantes } = schema;
const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const imagen = (v: string) => (v.startsWith("/uploads/") || /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(v) ? v : "");

async function slugLibre(base: string, estudianteId: number) {
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const [otro] = await db().select({ e: fichasArtista.estudianteId }).from(fichasArtista).where(eq(fichasArtista.slug, slug));
    if (!otro || otro.e === estudianteId) return slug;
  }
}

/** Crea la ficha vacía de un estudiante si aún no existe. */
async function asegurarFicha(estudianteId: number) {
  const [ya] = await db().select().from(fichasArtista).where(eq(fichasArtista.estudianteId, estudianteId));
  if (ya) return ya;
  const [e] = await db().select().from(estudiantes).where(eq(estudiantes.id, estudianteId));
  if (!e) return null;
  const [nueva] = await db().insert(fichasArtista).values({ estudianteId, slug: await slugLibre(slugify(e.nombres), estudianteId) }).returning();
  return nueva;
}

export async function guardarFicha(f: FormData) {
  const s = await exigirAdmin();
  const estudianteId = Number(f.get("estudianteId")) || 0;
  const ficha = await asegurarFicha(estudianteId);
  if (!ficha) redirect("/admin/protagonistas");
  const [e] = await db().select().from(estudiantes).where(eq(estudiantes.id, estudianteId));
  const nombreArtistico = txt(f, "nombreArtistico");
  // Autorización registrada en la escuela (planilla firmada). La que da el representante en el portal no se toca aquí.
  const enFisico = f.get("autorizacionFisica") === "on";
  const autorizacion = ficha.autorizadaVia === "portal" ? {} : enFisico
    ? (ficha.autorizadaEl ? {} : { autorizadaEl: new Date(), autorizadaVia: `Registrada por ${s.nombre}` })
    : { autorizadaEl: null, autorizadaVia: "" };
  const viejas = [ficha.fotoUrl, ...ficha.galeria];
  await db().update(fichasArtista).set({
    nombreArtistico, slug: await slugLibre(slugify(nombreArtistico || e.nombres), estudianteId), frase: txt(f, "frase"), bio: txt(f, "bio"), gustos: txt(f, "gustos"),
    fotoUrl: imagen(txt(f, "fotoUrl")) || null, galeria: ["galeria1", "galeria2", "galeria3", "galeria4"].map((k) => imagen(txt(f, k))).filter(Boolean),
    publicada: f.get("publicada") === "on", orden: Number(f.get("orden")) || 0, ...autorizacion,
  }).where(eq(fichasArtista.id, ficha.id));
  await limpiarArchivos(viejas);
  updateTag("protagonistas"); updateTag("funciones");
  redirect(`/admin/protagonistas/${estudianteId}?ok=1`);
}

/** Borra la ficha y sus fotos. La participación en obras (elenco) se conserva. */
export async function borrarFicha(f: FormData) {
  await exigirAdmin();
  const estudianteId = Number(f.get("estudianteId")) || 0;
  const [x] = await db().delete(fichasArtista).where(eq(fichasArtista.estudianteId, estudianteId)).returning();
  if (x) await limpiarArchivos([x.fotoUrl, ...x.galeria]);
  updateTag("protagonistas"); updateTag("funciones");
  redirect("/admin/protagonistas?ok=1");
}

/** El representante da o retira su autorización desde el portal. Retirarla oculta la ficha de inmediato. */
export async function autorizarFicha(f: FormData) {
  const s = await exigirRepresentante();
  const estudianteId = Number(f.get("estudianteId")) || 0;
  const [e] = await db().select().from(estudiantes).where(and(eq(estudiantes.id, estudianteId), eq(estudiantes.representanteId, s.id)));
  if (e) {
    const ficha = await asegurarFicha(estudianteId);
    const dar = f.get("accion") === "autorizar";
    await db().update(fichasArtista).set(dar ? { autorizadaEl: new Date(), autorizadaVia: "portal" } : { autorizadaEl: null, autorizadaVia: "" }).where(eq(fichasArtista.id, ficha!.id));
    updateTag("protagonistas"); updateTag("funciones");
  }
  redirect("/portal#protagonistas");
}
