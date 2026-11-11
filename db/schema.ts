import { boolean, integer, jsonb, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

const creadoEl = timestamp("creado_el", { withTimezone: true }).notNull().defaultNow();

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  correo: text("correo").notNull().unique(),
  claveHash: text("clave_hash").notNull(),
  // master | admin | vendedor | representante
  rol: text("rol").notNull().default("admin"),
  activo: boolean("activo").notNull().default(true),
  intentosFallidos: integer("intentos_fallidos").notNull().default(0),
  bloqueadoHasta: timestamp("bloqueado_hasta", { withTimezone: true }),
  creadoEl,
});

export const configuracion = pgTable("configuracion", {
  clave: text("clave").primaryKey(),
  valor: jsonb("valor").notNull(),
});

export const carrusel = pgTable("carrusel", {
  id: serial("id").primaryKey(),
  imagenUrl: text("imagen_url").notNull(),
  eyebrow: text("eyebrow").notNull().default(""),
  titulo: text("titulo").notNull(),
  texto: text("texto").notNull().default(""),
  botonTexto: text("boton_texto").notNull().default(""),
  botonEnlace: text("boton_enlace").notNull().default(""),
  orden: integer("orden").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
  creadoEl,
});

export const niveles = pgTable("niveles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nombre: text("nombre").notNull(),
  edades: text("edades").notNull().default(""),
  descripcion: text("descripcion").notNull().default(""),
  horario: text("horario").notNull().default(""),
  montoInscripcion: numeric("monto_inscripcion", { precision: 10, scale: 2 }),
  montoMensualidad: numeric("monto_mensualidad", { precision: 10, scale: 2 }),
  imagenUrl: text("imagen_url"),
  orden: integer("orden").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
  creadoEl,
});

export const entradasBlog = pgTable("entradas_blog", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  titulo: text("titulo").notNull(),
  extracto: text("extracto").notNull().default(""),
  contenido: text("contenido").notNull().default(""),
  portadaUrl: text("portada_url"),
  categoria: text("categoria").notNull().default("Escuela"),
  publicada: boolean("publicada").notNull().default(false),
  destacada: boolean("destacada").notNull().default(false),
  publicadaEl: timestamp("publicada_el", { withTimezone: true }),
  creadoEl,
});

export const funciones = pgTable("funciones", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  titulo: text("titulo").notNull(),
  subtitulo: text("subtitulo").notNull().default(""),
  sinopsis: text("sinopsis").notNull().default(""),
  aficheUrl: text("afiche_url"),
  fechaHora: timestamp("fecha_hora", { withTimezone: true }),
  lugar: text("lugar").notNull().default(""),
  // borrador | preventa | a_la_venta | agotada | finalizada | cancelada
  estado: text("estado").notNull().default("borrador"),
  aforo: integer("aforo").notNull().default(0),
  creadoEl,
});

export const mensajes = pgTable("mensajes", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  correo: text("correo").notNull().default(""),
  telefono: text("telefono").notNull().default(""),
  mensaje: text("mensaje").notNull(),
  leido: boolean("leido").notNull().default(false),
  creadoEl,
});
