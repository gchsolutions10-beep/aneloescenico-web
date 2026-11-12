import { boolean, date, index, integer, jsonb, numeric, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

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
  telefono: text("telefono").notNull().default(""),
  cedula: text("cedula").notNull().default(""),
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
  // borrador | a_la_venta | finalizada | cancelada  ("preventa" y "agotada" se deducen de la fecha y las butacas)
  estado: text("estado").notNull().default("borrador"),
  aforo: integer("aforo").notNull().default(0),
  /** Hasta este momento rige el precio de preventa de cada zona. */
  preventaHasta: timestamp("preventa_hasta", { withTimezone: true }),
  maxPorCompra: integer("max_por_compra").notNull().default(8),
  /** Clave de la plantilla de plano usada (ver lib/planos.ts); null = sin butacas numeradas. */
  plano: text("plano"),
  creadoEl,
});

const usd = (nombre: string) => numeric(nombre, { precision: 10, scale: 2 });

export const zonas = pgTable("zonas", {
  id: serial("id").primaryKey(),
  funcionId: integer("funcion_id").notNull().references(() => funciones.id, { onDelete: "cascade" }),
  clave: text("clave").notNull(), // vip | general ...
  nombre: text("nombre").notNull(),
  color: text("color").notNull().default("#e3bd5e"),
  precioPreventa: usd("precio_preventa"),
  precioRegular: usd("precio_regular").notNull().default("0"),
  orden: integer("orden").notNull().default(0),
});

export const ordenes = pgTable("ordenes", {
  id: serial("id").primaryKey(),
  /** Código público e imposible de adivinar: es la llave del comprador para ver su orden. */
  codigo: text("codigo").notNull().unique(),
  funcionId: integer("funcion_id").notNull().references(() => funciones.id, { onDelete: "restrict" }),
  canal: text("canal").notNull().default("web"), // web | taquilla
  compradorNombre: text("comprador_nombre").notNull().default(""),
  telefono: text("telefono").notNull().default(""),
  correo: text("correo").notNull().default(""),
  vendedorId: integer("vendedor_id").references(() => usuarios.id),
  /** Lo que eligió el comprador: [{ numero, zona, precio }]. Se conserva aunque las butacas se liberen. */
  detalle: jsonb("detalle").notNull().$type<{ numero: number; zona: string; precio: number }[]>(),
  totalUsd: usd("total_usd").notNull(),
  /** Tasa BCV (Bs por dólar) fijada al crear la orden. */
  tasa: numeric("tasa", { precision: 14, scale: 4 }),
  // apartada | por_confirmar | pagada | vencida | rechazada | en_conflicto | reembolso_pendiente | reembolsada | anulada
  estado: text("estado").notNull().default("apartada"),
  venceEl: timestamp("vence_el", { withTimezone: true }),
  motivo: text("motivo").notNull().default(""),
  creadoEl,
}, (t) => [index("ordenes_estado_idx").on(t.estado), index("ordenes_funcion_idx").on(t.funcionId)]);

export const butacas = pgTable("butacas", {
  id: serial("id").primaryKey(),
  funcionId: integer("funcion_id").notNull().references(() => funciones.id, { onDelete: "cascade" }),
  zonaId: integer("zona_id").notNull().references(() => zonas.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(),
  bloque: text("bloque").notNull(), // izquierdo | central | derecho
  fila: integer("fila").notNull(),
  pos: integer("pos").notNull(),
  // libre | apartada | por_confirmar | vendida | bloqueada
  estado: text("estado").notNull().default("libre"),
  ordenId: integer("orden_id").references(() => ordenes.id, { onDelete: "set null" }),
  apartadaHasta: timestamp("apartada_hasta", { withTimezone: true }),
}, (t) => [unique("butacas_funcion_numero").on(t.funcionId, t.numero)]);

export const bonos = pgTable("bonos", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull().unique(),
  montoUsd: usd("monto_usd").notNull(),
  saldoUsd: usd("saldo_usd").notNull(),
  beneficiario: text("beneficiario").notNull().default(""),
  nota: text("nota").notNull().default(""),
  venceEl: timestamp("vence_el", { withTimezone: true }),
  activo: boolean("activo").notNull().default(true),
  creadoPor: integer("creado_por").references(() => usuarios.id),
  creadoEl,
});

export const pagos = pgTable("pagos", {
  id: serial("id").primaryKey(),
  ordenId: integer("orden_id").notNull().references(() => ordenes.id, { onDelete: "cascade" }),
  metodo: text("metodo").notNull(), // pago_movil | transferencia | bono | efectivo | punto | cortesia
  referencia: text("referencia").notNull().default(""),
  montoUsd: usd("monto_usd").notNull(),
  montoBs: numeric("monto_bs", { precision: 16, scale: 2 }),
  capturaUrl: text("captura_url"),
  bonoId: integer("bono_id").references(() => bonos.id),
  // reportado | confirmado | rechazado | reembolsado
  estado: text("estado").notNull().default("reportado"),
  revisadoPor: integer("revisado_por").references(() => usuarios.id),
  nota: text("nota").notNull().default(""),
  /** Momento en que el dinero quedó confirmado; es la fecha que usa el cierre de caja. */
  confirmadoEl: timestamp("confirmado_el", { withTimezone: true }),
  creadoEl,
});

export const entradas = pgTable("entradas", {
  id: serial("id").primaryKey(),
  ordenId: integer("orden_id").notNull().references(() => ordenes.id, { onDelete: "cascade" }),
  funcionId: integer("funcion_id").notNull().references(() => funciones.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(),
  zona: text("zona").notNull(),
  precioUsd: usd("precio_usd").notNull(),
  codigo: text("codigo").notNull().unique(),
  usadaEl: timestamp("usada_el", { withTimezone: true }),
  validadaPor: integer("validada_por").references(() => usuarios.id),
  creadoEl,
});

export const elenco = pgTable("elenco", {
  id: serial("id").primaryKey(),
  funcionId: integer("funcion_id").notNull().references(() => funciones.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  personaje: text("personaje").notNull().default(""),
  /** Descripción del papel; aparece en la trayectoria del artista. */
  descripcion: text("descripcion").notNull().default(""),
  fotoUrl: text("foto_url"),
  /** Si el actor es estudiante de la escuela, esta participación alimenta su ficha de Protagonista. */
  estudianteId: integer("estudiante_id"),
  orden: integer("orden").notNull().default(0),
});

/** Tasa oficial del BCV (Bs por dólar), una por día. */
export const tasas = pgTable("tasas", {
  fecha: date("fecha").primaryKey(),
  valor: numeric("valor", { precision: 14, scale: 4 }).notNull(),
  fuente: text("fuente").notNull(), // bcv | dolarapi | manual
  obtenidaEl: timestamp("obtenida_el", { withTimezone: true }).notNull().defaultNow(),
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

/** Salas disponibles para crear planos. `definicion` sigue el formato de lib/planos.ts. */
export const salas = pgTable("salas", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  definicion: jsonb("definicion").notNull().$type<import("@/lib/planos").DefSala>(),
  creadoEl,
});

// ---------- Escuela ----------

export const estudiantes = pgTable("estudiantes", {
  id: serial("id").primaryKey(),
  /** Cuenta del representante en el portal (usuarios con rol "representante"). Puede faltar. */
  representanteId: integer("representante_id").references(() => usuarios.id, { onDelete: "set null" }),
  nivelId: integer("nivel_id").references(() => niveles.id, { onDelete: "set null" }),
  nombres: text("nombres").notNull(),
  apellidos: text("apellidos").notNull(),
  fechaNacimiento: date("fecha_nacimiento"),
  // solicitud | activo | retirado | egresado | rechazado
  estado: text("estado").notNull().default("solicitud"),
  fechaIngreso: date("fecha_ingreso"),
  /** Descuento sobre la mensualidad, de 0 a 100 (beca, hermanos). */
  becaPct: integer("beca_pct").notNull().default(0),
  repNombre: text("rep_nombre").notNull().default(""),
  repCedula: text("rep_cedula").notNull().default(""),
  repTelefono: text("rep_telefono").notNull().default(""),
  repCorreo: text("rep_correo").notNull().default(""),
  observaciones: text("observaciones").notNull().default(""),
  notas: text("notas").notNull().default(""), // internas, no las ve el representante
  creadoEl,
});

/** Pago reportado por un representante (o registrado por el equipo) que cubre uno o más cargos. */
export const reportesPago = pgTable("reportes_pago", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
  metodo: text("metodo").notNull(), // pago_movil | transferencia | efectivo | punto
  referencia: text("referencia").notNull().default(""),
  montoUsd: usd("monto_usd").notNull(),
  tasa: numeric("tasa", { precision: 14, scale: 4 }),
  montoBs: numeric("monto_bs", { precision: 16, scale: 2 }),
  capturaUrl: text("captura_url"),
  // reportado | confirmado | rechazado
  estado: text("estado").notNull().default("reportado"),
  revisadoPor: integer("revisado_por").references(() => usuarios.id),
  nota: text("nota").notNull().default(""),
  /** Número correlativo del recibo; se asigna al confirmar. */
  numeroRecibo: integer("numero_recibo").unique(),
  /** Copia de lo pagado, para que el recibo no cambie aunque después se edite un cargo. */
  detalle: jsonb("detalle").notNull().$type<{ estudiante: string; concepto: string; monto: number }[]>(),
  confirmadoEl: timestamp("confirmado_el", { withTimezone: true }),
  creadoEl,
});

export const cargos = pgTable("cargos", {
  id: serial("id").primaryKey(),
  estudianteId: integer("estudiante_id").notNull().references(() => estudiantes.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(), // inscripcion | mensualidad | otro
  concepto: text("concepto").notNull(),
  /** AAAA-MM para mensualidades; evita generar dos veces el mismo mes. */
  periodo: text("periodo"),
  montoUsd: usd("monto_usd").notNull(),
  venceEl: date("vence_el").notNull(),
  // pendiente | por_confirmar | pagado | anulado   ("en mora" = pendiente y vencido)
  estado: text("estado").notNull().default("pendiente"),
  reporteId: integer("reporte_id").references(() => reportesPago.id, { onDelete: "set null" }),
  recordadoEl: timestamp("recordado_el", { withTimezone: true }),
  moraAvisadaEl: timestamp("mora_avisada_el", { withTimezone: true }),
  creadoEl,
}, (t) => [unique("cargos_estudiante_tipo_periodo").on(t.estudianteId, t.tipo, t.periodo), index("cargos_estado_idx").on(t.estado)]);

// ---------- Protagonistas ----------

/** Ficha pública de un artista. Solo se muestra si está publicada Y el representante la autorizó. */
export const fichasArtista = pgTable("fichas_artista", {
  id: serial("id").primaryKey(),
  estudianteId: integer("estudiante_id").notNull().unique().references(() => estudiantes.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  publicada: boolean("publicada").notNull().default(false),
  /** Fecha en que el representante autorizó la publicación; null = sin autorización. */
  autorizadaEl: timestamp("autorizada_el", { withTimezone: true }),
  /** Cómo se dio la autorización: "portal" o el nombre de quien la registró en la escuela. */
  autorizadaVia: text("autorizada_via").notNull().default(""),
  nombreArtistico: text("nombre_artistico").notNull().default(""),
  frase: text("frase").notNull().default(""),
  bio: text("bio").notNull().default(""),
  gustos: text("gustos").notNull().default(""), // separados por coma
  fotoUrl: text("foto_url"),
  galeria: jsonb("galeria").notNull().$type<string[]>().default([]),
  orden: integer("orden").notNull().default(0),
  creadoEl,
});

/** Enlaces de un solo uso para restablecer la clave. Se guarda solo el hash del código. */
export const tokensClave = pgTable("tokens_clave", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  venceEl: timestamp("vence_el", { withTimezone: true }).notNull(),
  usadoEl: timestamp("usado_el", { withTimezone: true }),
  creadoEl,
});
