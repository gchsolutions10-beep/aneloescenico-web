"use server";

import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { ESCUELA_INICIAL, type Escuela } from "./datos";
import { cerrarSesion, crearSesion, exigirAdmin } from "./sesion";
import { sanearTema } from "./tema";
import { deInputLocal, ESTADOS_FUNCION, slugify } from "./util";

/** `valores` devuelve lo escrito para que el formulario no se vacíe cuando hay un error. */
export type Estado = { error?: string; ok?: string; valores?: Record<string, string> } | null;

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const marcado = (f: FormData, k: string) => f.get(k) === "on";
const entero = (f: FormData, k: string) => Number.parseInt(txt(f, k), 10) || 0;
const dinero = (f: FormData, k: string) => {
  const v = txt(f, k).replace(",", ".");
  return v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v).toFixed(2) : null;
};
/** Solo se aceptan imágenes subidas por nuestro propio endpoint. */
const imagen = (f: FormData, k: string) => {
  const v = txt(f, k);
  return v.startsWith("/uploads/") || /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(v) ? v : "";
};
/** Enlaces internos (/ruta) o https. Evita esquemas como javascript: */
const enlace = (f: FormData, k: string) => {
  const v = txt(f, k);
  return /^\/(?!\/)/.test(v) || /^https:\/\//.test(v) ? v : "";
};

async function slugLibre(tabla: "blog" | "funciones", base: string, idPropio: number) {
  const t = tabla === "blog" ? schema.entradasBlog : schema.funciones;
  let slug = base;
  for (let i = 2; ; i++) {
    const [otro] = await db().select({ id: t.id }).from(t).where(eq(t.slug, slug));
    if (!otro || otro.id === idPropio) return slug;
    slug = `${base}-${i}`;
  }
}

// ---------- Acceso ----------

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

export async function ingresar(_: Estado, f: FormData): Promise<Estado> {
  const correo = txt(f, "correo").toLowerCase();
  const clave = String(f.get("clave") ?? "");
  const valores = { correo };
  if (!correo || !clave) return { error: "Escribe tu correo y tu clave.", valores };

  // Primera vez: si no existe ningún usuario, se crea el master con las variables de entorno.
  const [{ n }] = await db().select({ n: count() }).from(schema.usuarios);
  if (n === 0) {
    const mCorreo = process.env.MASTER_EMAIL?.toLowerCase();
    const mClave = process.env.MASTER_PASSWORD;
    if (!mCorreo || !mClave) return { error: "Aún no hay usuarios. Define MASTER_EMAIL y MASTER_PASSWORD en Vercel y vuelve a intentar." };
    await db().insert(schema.usuarios).values({ nombre: "Master", correo: mCorreo, claveHash: await bcrypt.hash(mClave, 12), rol: "master" }).onConflictDoNothing();
  }

  const generico = { error: "Correo o clave incorrectos.", valores };
  const [u] = await db().select().from(schema.usuarios).where(eq(schema.usuarios.correo, correo));
  if (!u || !u.activo) {
    await bcrypt.hash(clave, 12); // mismo tiempo de respuesta exista o no el usuario
    return generico;
  }
  if (u.bloqueadoHasta && u.bloqueadoHasta > new Date()) {
    return { error: `Demasiados intentos. Espera ${MINUTOS_BLOQUEO} minutos y vuelve a probar.`, valores };
  }
  if (!(await bcrypt.compare(clave, u.claveHash))) {
    const intentos = u.intentosFallidos + 1;
    const bloquear = intentos >= MAX_INTENTOS;
    await db().update(schema.usuarios).set({
      intentosFallidos: bloquear ? 0 : intentos,
      bloqueadoHasta: bloquear ? new Date(Date.now() + MINUTOS_BLOQUEO * 60_000) : null,
    }).where(eq(schema.usuarios.id, u.id));
    return generico;
  }
  await db().update(schema.usuarios).set({ intentosFallidos: 0, bloqueadoHasta: null }).where(eq(schema.usuarios.id, u.id));
  await crearSesion({ id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol as "master" });
  redirect("/admin");
}

export async function salir() {
  await cerrarSesion();
  redirect("/ingresar");
}

// ---------- Configuración ----------

async function guardarConfig(clave: string, valor: unknown) {
  await db().insert(schema.configuracion).values({ clave, valor }).onConflictDoUpdate({ target: schema.configuracion.clave, set: { valor } });
  updateTag("config");
}

async function escuelaActual(): Promise<Escuela> {
  const [fila] = await db().select().from(schema.configuracion).where(eq(schema.configuracion.clave, "escuela"));
  return { ...ESCUELA_INICIAL, ...((fila?.valor as Partial<Escuela>) ?? {}) };
}

export async function guardarTema(f: FormData) {
  await exigirAdmin();
  const tema = sanearTema({
    ...Object.fromEntries(["fondo", "superficie", "linea", "texto", "tenue", "acento", "sobreAcento", "telon", "titulos"].map((k) => [k, txt(f, k)])),
    tamanoBase: entero(f, "tamanoBase"),
    radio: entero(f, "radio"),
    mostrarTelon: marcado(f, "mostrarTelon"),
  });
  await guardarConfig("tema", tema);
  redirect("/admin/apariencia?ok=1");
}

export async function guardarLogo(f: FormData) {
  await exigirAdmin();
  const logoUrl = imagen(f, "logoUrl");
  if (!logoUrl) redirect("/admin/apariencia?error=logo");
  await guardarConfig("escuela", { ...(await escuelaActual()), logoUrl, icono192: imagen(f, "icono192"), icono512: imagen(f, "icono512") });
  redirect("/admin/apariencia?ok=1");
}

export async function guardarEscuela(f: FormData) {
  await exigirAdmin();
  const actual = await escuelaActual();
  await guardarConfig("escuela", {
    ...actual,
    nombre: txt(f, "nombre") || actual.nombre,
    lema: txt(f, "lema"),
    descripcion: txt(f, "descripcion"),
    ciudad: txt(f, "ciudad"),
    direccion: txt(f, "direccion"),
    telefono: txt(f, "telefono"),
    whatsapp: txt(f, "whatsapp").replace(/\D/g, ""),
    instagram: txt(f, "instagram").replace(/^@/, ""),
    correo: txt(f, "correo"),
    sobreNosotros: txt(f, "sobreNosotros"),
    directorNombre: txt(f, "directorNombre"),
    directorBio: txt(f, "directorBio"),
    directorFotoUrl: imagen(f, "directorFotoUrl"),
  } satisfies Escuela);
  redirect("/admin/configuracion?ok=1");
}

export async function marcarAppInstalada() {
  await exigirAdmin();
  await guardarConfig("escuela", { ...(await escuelaActual()), appInstalada: true });
  redirect("/admin");
}

// ---------- Carrusel ----------

export async function guardarSlide(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "id");
  const datos = {
    imagenUrl: imagen(f, "imagenUrl"),
    eyebrow: txt(f, "eyebrow"),
    titulo: txt(f, "titulo"),
    texto: txt(f, "texto"),
    botonTexto: txt(f, "botonTexto"),
    botonEnlace: enlace(f, "botonEnlace"),
    orden: entero(f, "orden"),
    activo: marcado(f, "activo"),
  };
  if (!datos.imagenUrl || !datos.titulo) redirect(`/admin/carrusel?error=faltan${id ? `&editar=${id}` : ""}`);
  if (id) await db().update(schema.carrusel).set(datos).where(eq(schema.carrusel.id, id));
  else await db().insert(schema.carrusel).values(datos);
  updateTag("carrusel");
  redirect("/admin/carrusel?ok=1");
}

export async function borrarSlide(f: FormData) {
  await exigirAdmin();
  await db().delete(schema.carrusel).where(eq(schema.carrusel.id, entero(f, "id")));
  updateTag("carrusel");
  redirect("/admin/carrusel?ok=1");
}

// ---------- Niveles ----------

export async function guardarNivel(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "id");
  const nombre = txt(f, "nombre");
  if (!nombre) redirect("/admin/niveles?error=faltan");
  const datos = {
    nombre,
    edades: txt(f, "edades"),
    descripcion: txt(f, "descripcion"),
    horario: txt(f, "horario"),
    montoInscripcion: dinero(f, "montoInscripcion"),
    montoMensualidad: dinero(f, "montoMensualidad"),
    imagenUrl: imagen(f, "imagenUrl") || null,
    orden: entero(f, "orden"),
    activo: marcado(f, "activo"),
  };
  if (id) await db().update(schema.niveles).set(datos).where(eq(schema.niveles.id, id));
  else {
    const base = slugify(nombre);
    const [existe] = await db().select({ id: schema.niveles.id }).from(schema.niveles).where(eq(schema.niveles.slug, base));
    await db().insert(schema.niveles).values({ ...datos, slug: existe ? `${base}-${Date.now().toString(36)}` : base });
  }
  updateTag("niveles");
  redirect("/admin/niveles?ok=1");
}

// ---------- Blog ----------

export async function guardarEntrada(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "id");
  const titulo = txt(f, "titulo");
  if (!titulo) redirect(`/admin/blog/${id || "nueva"}?error=faltan`);
  const publicada = marcado(f, "publicada");
  const [previa] = id ? await db().select().from(schema.entradasBlog).where(eq(schema.entradasBlog.id, id)) : [];
  const datos = {
    titulo,
    // La dirección de una entrada ya publicada no cambia, para no romper enlaces compartidos.
    slug: previa?.publicadaEl ? previa.slug : await slugLibre("blog", slugify(titulo), id),
    extracto: txt(f, "extracto"),
    contenido: String(f.get("contenido") ?? "").replace(/\r\n/g, "\n").trim(),
    portadaUrl: imagen(f, "portadaUrl") || null,
    categoria: txt(f, "categoria") || "Escuela",
    publicada,
    destacada: marcado(f, "destacada"),
    publicadaEl: publicada ? (previa?.publicadaEl ?? new Date()) : (previa?.publicadaEl ?? null),
  };
  if (id) await db().update(schema.entradasBlog).set(datos).where(eq(schema.entradasBlog.id, id));
  else await db().insert(schema.entradasBlog).values(datos);
  updateTag("blog");
  redirect("/admin/blog?ok=1");
}

export async function borrarEntrada(f: FormData) {
  await exigirAdmin();
  await db().delete(schema.entradasBlog).where(eq(schema.entradasBlog.id, entero(f, "id")));
  updateTag("blog");
  redirect("/admin/blog?ok=1");
}

// ---------- Funciones (cartelera; la venta de entradas llega en la Fase 2) ----------

export async function guardarFuncion(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "id");
  const titulo = txt(f, "titulo");
  if (!titulo) redirect(`/admin/funciones?error=faltan${id ? `&editar=${id}` : ""}`);
  const estado = txt(f, "estado");
  const datos = {
    titulo,
    slug: await slugLibre("funciones", slugify(titulo), id),
    subtitulo: txt(f, "subtitulo"),
    sinopsis: txt(f, "sinopsis"),
    aficheUrl: imagen(f, "aficheUrl") || null,
    fechaHora: deInputLocal(txt(f, "fechaHora")),
    lugar: txt(f, "lugar"),
    estado: estado in ESTADOS_FUNCION ? estado : "borrador",
  };
  let destino = "/admin/funciones?ok=1";
  if (id) await db().update(schema.funciones).set(datos).where(eq(schema.funciones.id, id));
  else {
    // Recién creada: se sigue en su pantalla de venta para crear el plano y los precios.
    const [nueva] = await db().insert(schema.funciones).values(datos).returning({ id: schema.funciones.id });
    destino = `/admin/funciones/${nueva.id}`;
  }
  updateTag("funciones");
  redirect(destino);
}

export async function borrarFuncion(f: FormData) {
  await exigirAdmin();
  await db().delete(schema.funciones).where(eq(schema.funciones.id, entero(f, "id")));
  updateTag("funciones");
  redirect("/admin/funciones?ok=1");
}

// ---------- Mensajes de contacto ----------

const esquemaMensaje = z.object({
  nombre: z.string().min(2, "Escribe tu nombre.").max(120),
  correo: z.union([z.literal(""), z.string().email("El correo no parece válido.").max(160)]),
  telefono: z.string().max(40),
  mensaje: z.string().min(5, "Escribe tu mensaje.").max(3000),
});

export async function enviarMensaje(_: Estado, f: FormData): Promise<Estado> {
  if (txt(f, "sitio")) return { ok: "¡Gracias! Recibimos tu mensaje." }; // campo trampa para robots
  const valores = { nombre: txt(f, "nombre"), correo: txt(f, "correo"), telefono: txt(f, "telefono"), mensaje: txt(f, "mensaje") };
  const r = esquemaMensaje.safeParse(valores);
  if (!r.success) return { error: r.error.issues[0].message, valores };
  if (!r.data.correo && !r.data.telefono) return { error: "Déjanos un correo o un teléfono para poder responderte.", valores };
  await db().insert(schema.mensajes).values(r.data);
  return { ok: "¡Gracias! Recibimos tu mensaje y te responderemos pronto." };
}

export async function marcarLeido(f: FormData) {
  await exigirAdmin();
  await db().update(schema.mensajes).set({ leido: true }).where(eq(schema.mensajes.id, entero(f, "id")));
  redirect("/admin/mensajes");
}

export async function borrarMensaje(f: FormData) {
  await exigirAdmin();
  await db().delete(schema.mensajes).where(eq(schema.mensajes.id, entero(f, "id")));
  redirect("/admin/mensajes");
}
