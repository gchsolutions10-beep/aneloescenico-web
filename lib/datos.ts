// Lecturas del sitio público. Cada una se guarda en caché y se invalida con su
// etiqueta cuando el administrador guarda cambios (ver lib/acciones.ts).
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, hayBaseDeDatos, schema } from "@/db";
import { sanearTema, TEMA_INICIAL, type Tema } from "./tema";

export type Escuela = {
  nombre: string;
  lema: string;
  descripcion: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  whatsapp: string;
  instagram: string;
  correo: string;
  sobreNosotros: string;
  directorNombre: string;
  directorBio: string;
  directorFotoUrl: string;
  logoUrl: string;
  icono192: string;
  icono512: string;
  appInstalada: boolean;
};

export type Cobros = {
  pagoMovil: { banco: string; telefono: string; cedula: string; titular: string };
  transferencia: { banco: string; cuenta: string; titular: string; cedula: string };
  minutosApartado: number;
  /** Si tiene valor, se cobra con esta tasa en lugar de la del BCV. */
  tasaManual: number | null;
};

export const COBROS_INICIAL: Cobros = {
  pagoMovil: { banco: "", telefono: "", cedula: "", titular: "" },
  transferencia: { banco: "", cuenta: "", titular: "", cedula: "" },
  minutosApartado: 15,
  tasaManual: null,
};

export const ESCUELA_INICIAL: Escuela = {
  nombre: "A-Nelo Escénico",
  lema: "Escuela de Teatro",
  descripcion: "Formación teatral en Acarigua. Niveles Kids, Teen y Teenagers. Un espacio artístico y cultural para pequeños y grandes artistas.",
  ciudad: "Acarigua",
  direccion: "",
  telefono: "",
  whatsapp: "",
  instagram: "aneloescenico",
  correo: "",
  sobreNosotros: "",
  directorNombre: "",
  directorBio: "",
  directorFotoUrl: "",
  logoUrl: "",
  icono192: "",
  icono512: "",
  appInstalada: false,
};

export async function getConfig(): Promise<{ tema: Tema; escuela: Escuela; cobros: Cobros }> {
  "use cache";
  cacheLife("hours");
  cacheTag("config");
  if (!hayBaseDeDatos()) return { tema: TEMA_INICIAL, escuela: ESCUELA_INICIAL, cobros: COBROS_INICIAL };
  const filas = await db().select().from(schema.configuracion);
  const por = Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
  return {
    tema: sanearTema(por.tema),
    escuela: { ...ESCUELA_INICIAL, ...((por.escuela as Partial<Escuela>) ?? {}) },
    cobros: { ...COBROS_INICIAL, ...((por.cobros as Partial<Cobros>) ?? {}) },
  };
}

export async function getCarrusel() {
  "use cache";
  cacheLife("hours");
  cacheTag("carrusel");
  if (!hayBaseDeDatos()) return [];
  return db().select().from(schema.carrusel).where(eq(schema.carrusel.activo, true)).orderBy(asc(schema.carrusel.orden), asc(schema.carrusel.id));
}

export async function getNiveles() {
  "use cache";
  cacheLife("hours");
  cacheTag("niveles");
  if (!hayBaseDeDatos()) return [];
  return db().select().from(schema.niveles).where(eq(schema.niveles.activo, true)).orderBy(asc(schema.niveles.orden), asc(schema.niveles.id));
}

export async function getNivel(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("niveles");
  if (!hayBaseDeDatos()) return null;
  const [n] = await db().select().from(schema.niveles).where(and(eq(schema.niveles.slug, slug), eq(schema.niveles.activo, true)));
  return n ?? null;
}

const publicadas = eq(schema.entradasBlog.publicada, true);
const recientes = [desc(schema.entradasBlog.publicadaEl), desc(schema.entradasBlog.id)] as const;

export async function getBlog() {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  if (!hayBaseDeDatos()) return [];
  return db().select().from(schema.entradasBlog).where(publicadas).orderBy(...recientes);
}

/** Novedades de Inicio: las destacadas; si no hay ninguna, las tres más recientes. */
export async function getNovedades() {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  if (!hayBaseDeDatos()) return [];
  const destacadas = await db().select().from(schema.entradasBlog).where(and(publicadas, eq(schema.entradasBlog.destacada, true))).orderBy(...recientes).limit(6);
  if (destacadas.length) return destacadas;
  return db().select().from(schema.entradasBlog).where(publicadas).orderBy(...recientes).limit(3);
}

export async function getEntrada(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");
  if (!hayBaseDeDatos()) return null;
  const [e] = await db().select().from(schema.entradasBlog).where(and(eq(schema.entradasBlog.slug, slug), publicadas));
  return e ?? null;
}

/** Cartelera: todo lo que no es borrador. Próximas primero, luego pasadas. */
export async function getFunciones() {
  "use cache";
  cacheLife("hours");
  cacheTag("funciones");
  if (!hayBaseDeDatos()) return { proximas: [], pasadas: [] };
  const todas = await db().select().from(schema.funciones).where(ne(schema.funciones.estado, "borrador")).orderBy(asc(schema.funciones.fechaHora));
  // "En preventa" depende de la hora; se calcula aquí, dentro de la caché, para que las páginas sigan siendo estáticas.
  const ahora = new Date();
  const lista = todas.map((f) => ({ ...f, enPreventa: Boolean(f.preventaHasta && ahora <= f.preventaHasta) }));
  return { proximas: lista.filter((f) => f.estado === "a_la_venta"), pasadas: lista.filter((f) => f.estado === "finalizada").reverse() };
}

/** Una función con sus zonas de precio y su elenco, para la página de detalle. */
export async function getFuncion(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("funciones");
  if (!hayBaseDeDatos()) return null;
  const [f] = await db().select().from(schema.funciones).where(and(eq(schema.funciones.slug, slug), ne(schema.funciones.estado, "borrador")));
  if (!f) return null;
  const [zonas, elenco] = await Promise.all([
    db().select().from(schema.zonas).where(eq(schema.zonas.funcionId, f.id)).orderBy(asc(schema.zonas.orden)),
    db().select().from(schema.elenco).where(eq(schema.elenco.funcionId, f.id)).orderBy(asc(schema.elenco.orden), asc(schema.elenco.id)),
  ]);
  return { ...f, zonas, elenco };
}

/** Butacas libres por función para la cartelera. Se refresca cada minuto y al vender o apartar. */
export async function getCupos(): Promise<Record<number, { libres: number; total: number }>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("cupos");
  if (!hayBaseDeDatos()) return {};
  const filas = await db().execute<{ funcion_id: number; libres: number; total: number }>(sql`
    SELECT funcion_id,
      count(*) FILTER (WHERE estado = 'libre' OR (estado = 'apartada' AND apartada_hasta < now()))::int AS libres,
      count(*) FILTER (WHERE estado <> 'bloqueada')::int AS total
    FROM butacas GROUP BY funcion_id`);
  return Object.fromEntries(filas.rows.map((r) => [r.funcion_id, { libres: r.libres, total: r.total }]));
}
