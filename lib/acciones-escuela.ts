"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import type { Estado } from "./acciones";
import { enviarCorreo, urlBase } from "./correo";
import { getConfig } from "./datos";
import * as e from "./escuela";
import { crearSesion, exigirAdmin, exigirRepresentante } from "./sesion";
import { getTasa } from "./tasa";

const { estudiantes, usuarios, cargos, reportesPago } = schema;
const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const entero = (f: FormData, k: string) => Number.parseInt(txt(f, k), 10) || 0;
const fecha = (f: FormData, k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(txt(f, k)) ? txt(f, k) : null);
const dinero = (f: FormData, k: string) => {
  const v = txt(f, k).replace(",", ".");
  return v !== "" && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v).toFixed(2) : null;
};
const captura = (f: FormData) => {
  const v = txt(f, "capturaUrl");
  return v.startsWith("/uploads/") || /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(v) ? v : null;
};
const mensaje = (x: unknown) => { if (x instanceof e.ErrorEscuela) return x.message; throw x; };
const conError = (ruta: string, x: unknown) => `${ruta}${ruta.includes("?") ? "&" : "?"}error=${encodeURIComponent(mensaje(x))}`;
const correoValido = (c: string) => /^\S+@\S+\.\S+$/.test(c);

// ---------- Representantes ----------

export async function registrarRepresentante(_: Estado, f: FormData): Promise<Estado> {
  const valores = { nombre: txt(f, "nombre"), correo: txt(f, "correo").toLowerCase(), telefono: txt(f, "telefono"), cedula: txt(f, "cedula") };
  const clave = String(f.get("clave") ?? "");
  if (valores.nombre.length < 3) return { error: "Escribe tu nombre y apellido.", valores };
  if (!correoValido(valores.correo)) return { error: "El correo no parece válido.", valores };
  if (!valores.telefono) return { error: "Déjanos un teléfono de contacto.", valores };
  if (clave.length < 8) return { error: "La clave debe tener al menos 8 caracteres.", valores };
  const [ya] = await db().select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, valores.correo));
  if (ya) return { error: "Ya existe una cuenta con ese correo. Ingresa con tu clave.", valores };
  const [u] = await db().insert(usuarios).values({ ...valores, claveHash: await bcrypt.hash(clave, 12), rol: "representante" }).returning();
  await crearSesion({ id: u.id, nombre: u.nombre, correo: u.correo, rol: "representante" });
  redirect(txt(f, "nivel") ? `/portal/inscribir?nivel=${entero(f, "nivel")}` : "/portal");
}

export async function solicitarInscripcion(_: Estado, f: FormData): Promise<Estado> {
  const s = await exigirRepresentante();
  const valores = { nombres: txt(f, "nombres"), apellidos: txt(f, "apellidos"), fechaNacimiento: txt(f, "fechaNacimiento"), nivelId: txt(f, "nivelId"), observaciones: txt(f, "observaciones") };
  if (!valores.nombres || !valores.apellidos) return { error: "Escribe los nombres y apellidos del estudiante.", valores };
  if (!fecha(f, "fechaNacimiento")) return { error: "Indica la fecha de nacimiento.", valores };
  if (!entero(f, "nivelId")) return { error: "Elige el nivel.", valores };
  if (!f.get("autorizo")) return { error: "Debes confirmar que eres su representante y autorizas la inscripción.", valores };
  const [yo] = await db().select().from(usuarios).where(eq(usuarios.id, s.id));
  await db().insert(estudiantes).values({
    representanteId: s.id, nivelId: entero(f, "nivelId"), nombres: valores.nombres, apellidos: valores.apellidos, fechaNacimiento: fecha(f, "fechaNacimiento"),
    observaciones: valores.observaciones, repNombre: yo.nombre, repCedula: yo.cedula, repTelefono: yo.telefono, repCorreo: yo.correo,
  });
  redirect("/portal?solicitud=1");
}

export async function pagarCargos(_: Estado, f: FormData): Promise<Estado> {
  const s = await exigirRepresentante();
  const valores = { metodo: txt(f, "metodo"), referencia: txt(f, "referencia"), capturaUrl: captura(f) ?? "" };
  let id: number;
  try {
    const tasa = await getTasa();
    id = await e.reportarPagoEscuela({ usuarioId: s.id, cargoIds: f.getAll("cargo").map(Number), metodo: valores.metodo, referencia: valores.referencia, capturaUrl: captura(f), tasa: tasa?.valor ?? null, esEquipo: false });
  } catch (x) {
    return { error: mensaje(x), valores };
  }
  redirect(`/portal?reportado=${id}`);
}

// ---------- Panel: inscripciones y estudiantes ----------

export async function accionAprobar(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "id");
  let destino = "/admin/inscripciones?ok=1";
  try {
    await e.aprobarInscripcion(id, (await getConfig()).cobros.diaVencimiento);
    const [est] = await db().select().from(estudiantes).where(eq(estudiantes.id, id));
    if (est?.repCorreo) await enviarCorreo(est.repCorreo, "Inscripción aprobada", `Hola ${est.repNombre}:\n\n${est.nombres} ${est.apellidos} fue admitido en la escuela. Entra al portal para ver y pagar la inscripción y la mensualidad:\n${urlBase()}/portal\n\nA-Nelo Escénico`);
  } catch (x) { destino = conError("/admin/inscripciones", x); }
  redirect(destino);
}

export async function accionRechazarSolicitud(f: FormData) {
  await exigirAdmin();
  await e.rechazarInscripcion(entero(f, "id"), txt(f, "motivo"));
  redirect("/admin/inscripciones?ok=1");
}

export async function guardarEstudiante(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "id");
  const estado = txt(f, "estado");
  const datos = {
    nombres: txt(f, "nombres"), apellidos: txt(f, "apellidos"), fechaNacimiento: fecha(f, "fechaNacimiento"), nivelId: entero(f, "nivelId") || null,
    becaPct: Math.min(100, Math.max(0, entero(f, "becaPct"))), repNombre: txt(f, "repNombre"), repCedula: txt(f, "repCedula"), repTelefono: txt(f, "repTelefono"),
    repCorreo: txt(f, "repCorreo").toLowerCase(), observaciones: txt(f, "observaciones"), notas: txt(f, "notas"),
  };
  if (!datos.nombres || !datos.apellidos) redirect(`/admin/estudiantes/${id || "nuevo"}?error=${encodeURIComponent("Faltan los nombres o los apellidos.")}`);
  if (id) {
    await db().update(estudiantes).set({ ...datos, ...(estado in e.ESTADOS_ESTUDIANTE ? { estado } : {}) }).where(eq(estudiantes.id, id));
    redirect(`/admin/estudiantes/${id}?ok=1`);
  }
  // Creado por el equipo: entra directamente como activo, con su inscripción y mensualidad.
  const [nuevo] = await db().insert(estudiantes).values(datos).returning();
  let destino = `/admin/estudiantes/${nuevo.id}?ok=1`;
  try { await e.aprobarInscripcion(nuevo.id, (await getConfig()).cobros.diaVencimiento); } catch (x) { destino = conError(`/admin/estudiantes/${nuevo.id}`, x); }
  redirect(destino);
}

/** Da acceso al portal: crea la cuenta del representante o vincula una que ya exista con ese correo. */
export async function darAccesoPortal(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "id");
  const ruta = `/admin/estudiantes/${id}`;
  const correo = txt(f, "correo").toLowerCase();
  const clave = String(f.get("clave") ?? "");
  const [est] = await db().select().from(estudiantes).where(eq(estudiantes.id, id));
  if (!est || !correoValido(correo)) redirect(`${ruta}?error=${encodeURIComponent("Escribe un correo válido para el representante.")}`);
  let [u] = await db().select().from(usuarios).where(eq(usuarios.correo, correo));
  if (u && u.rol !== "representante") redirect(`${ruta}?error=${encodeURIComponent("Ese correo pertenece a un miembro del equipo.")}`);
  if (!u) {
    if (clave.length < 8) redirect(`${ruta}?error=${encodeURIComponent("Escribe una clave inicial de al menos 8 caracteres.")}`);
    [u] = await db().insert(usuarios).values({ nombre: est.repNombre || "Representante", correo, telefono: est.repTelefono, cedula: est.repCedula, claveHash: await bcrypt.hash(clave, 12), rol: "representante" }).returning();
  }
  await db().update(estudiantes).set({ representanteId: u.id, repCorreo: est.repCorreo || correo }).where(eq(estudiantes.id, id));
  redirect(`${ruta}?ok=1`);
}

export async function quitarAccesoPortal(f: FormData) {
  await exigirAdmin();
  await db().update(estudiantes).set({ representanteId: null }).where(eq(estudiantes.id, entero(f, "id")));
  redirect(`/admin/estudiantes/${entero(f, "id")}?ok=1`);
}

// ---------- Panel: cargos y cobranza ----------

export async function agregarCargo(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "estudianteId");
  const monto = dinero(f, "monto");
  if (!monto || !txt(f, "concepto")) redirect(`/admin/estudiantes/${id}?error=${encodeURIComponent("Escribe el concepto y el monto del cargo.")}`);
  await db().insert(cargos).values({ estudianteId: id, tipo: "otro", concepto: txt(f, "concepto"), montoUsd: monto, venceEl: fecha(f, "venceEl") ?? e.hoy() });
  redirect(`/admin/estudiantes/${id}?ok=1#cuenta`);
}

export async function accionAnularCargo(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "estudianteId");
  let destino = `/admin/estudiantes/${id}?ok=1#cuenta`;
  try { await e.anularCargo(entero(f, "id")); } catch (x) { destino = conError(`/admin/estudiantes/${id}`, x); }
  redirect(destino);
}

/** Cobro hecho en la escuela (efectivo, punto, o pago móvil verificado en el momento). */
export async function cobrarEnEscuela(f: FormData) {
  const s = await exigirAdmin();
  const id = entero(f, "estudianteId");
  let destino: string;
  try {
    const tasa = await getTasa();
    const r = await e.reportarPagoEscuela({ usuarioId: s.id, cargoIds: f.getAll("cargo").map(Number), metodo: txt(f, "metodo"), referencia: txt(f, "referencia"), capturaUrl: null, tasa: tasa?.valor ?? null, esEquipo: true });
    destino = `/admin/estudiantes/${id}?recibo=${r}#cuenta`;
  } catch (x) { destino = conError(`/admin/estudiantes/${id}`, x); }
  redirect(destino);
}

async function avisarReporte(id: number, asunto: string, texto: string) {
  const [r] = await db().select({ correo: usuarios.correo, nombre: usuarios.nombre }).from(reportesPago).innerJoin(usuarios, eq(reportesPago.usuarioId, usuarios.id)).where(and(eq(reportesPago.id, id), eq(usuarios.rol, "representante")));
  if (r) await enviarCorreo(r.correo, asunto, `Hola ${r.nombre}:\n\n${texto}\n\nA-Nelo Escénico`);
}

export async function accionConfirmarReporte(f: FormData) {
  const s = await exigirAdmin();
  const id = entero(f, "id");
  let destino = "/admin/cobranza?ok=1";
  try {
    await e.confirmarReporte(id, s.id);
    await avisarReporte(id, "Pago confirmado: tu recibo está listo", `Confirmamos tu pago. Puedes ver e imprimir el recibo aquí:\n${urlBase()}/recibo/${id}`);
  } catch (x) { destino = conError("/admin/cobranza", x); }
  redirect(destino);
}

export async function accionRechazarReporte(f: FormData) {
  const s = await exigirAdmin();
  const id = entero(f, "id");
  let destino = "/admin/cobranza?ok=1";
  try {
    await e.rechazarReporte(id, s.id, txt(f, "motivo"));
    await avisarReporte(id, "No pudimos verificar tu pago", `Motivo: ${txt(f, "motivo") || "no encontramos el pago con esa referencia"}. Los cargos siguen pendientes; puedes reportar el pago de nuevo en el portal:\n${urlBase()}/portal`);
  } catch (x) { destino = conError("/admin/cobranza", x); }
  redirect(destino);
}

export async function accionGenerarMensualidades() {
  await exigirAdmin();
  const n = await e.generarMensualidades(e.periodoActual(), (await getConfig()).cobros.diaVencimiento);
  redirect(`/admin/cobranza?generadas=${n}`);
}
