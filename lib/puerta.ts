// Control de puerta: ingreso, salida temporal y regreso con la misma entrada.
// Cada cambio es un UPDATE condicionado: si dos puertas escanean la misma entrada
// en el mismo instante, solo una registra el movimiento.
import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { fechaCorta, hora } from "./util";

const { entradas, funciones, ordenes, movimientosPuerta, usuarios } = schema;

export type EstadoPuerta = "sin_usar" | "dentro" | "fuera" | "anulada";
export type Movida = "entrar" | "salir" | "deshacer";

export type FichaEntrada = {
  codigo: string; numero: number; zona: string; estado: EstadoPuerta;
  /** Hora del último cambio (ingreso o salida), ya escrita para mostrar. */
  desde: string | null;
};
export type Consulta =
  | { resultado: "inexistente"; codigo: string }
  | {
      resultado: "ok"; entrada: FichaEntrada; ordenCodigo: string; comprador: string; estadoOrden: string;
      funcion: { id: number; titulo: string; cuando: string; esHoy: boolean };
      hermanas: FichaEntrada[];
      historial: { tipo: string; cuando: string; quien: string }[];
      conteo: { dentro: number; fuera: number; total: number };
      /** Lo que acaba de pasar, si se pidió un movimiento. */
      hecho?: { ok: boolean; mensaje: string };
    };

const VALIDAS = ["pagada"];
export const limpiarCodigo = (c: string) => {
  // El QR trae el enlace completo (…/admin/validar?c=CODIGO); también se acepta el código suelto.
  const m = /[?&]c=([A-Za-z0-9-]+)/.exec(c);
  return (m ? m[1] : c).toUpperCase().replace(/[^A-Z0-9]/g, "");
};
const dia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(d);
const cuando = (d: Date | null) => (d ? `${fechaCorta(d)} · ${hora(d)}` : null);

function estadoDe(e: typeof entradas.$inferSelect, estadoOrden: string): EstadoPuerta {
  if (!VALIDAS.includes(estadoOrden)) return "anulada";
  if (!e.usadaEl) return "sin_usar";
  return e.fueraDesde ? "fuera" : "dentro";
}
const ficha = (e: typeof entradas.$inferSelect, estadoOrden: string): FichaEntrada => ({
  codigo: e.codigo, numero: e.numero, zona: e.zona, estado: estadoDe(e, estadoOrden), desde: cuando(e.fueraDesde ?? e.usadaEl),
});

/** Todo lo que la persona de la puerta necesita ver de una entrada. */
export async function consultar(codigoCrudo: string): Promise<Consulta> {
  const codigo = limpiarCodigo(codigoCrudo);
  if (!codigo) return { resultado: "inexistente", codigo };
  const [f] = await db().select({ e: entradas, fn: funciones, o: ordenes }).from(entradas)
    .innerJoin(funciones, eq(entradas.funcionId, funciones.id)).innerJoin(ordenes, eq(entradas.ordenId, ordenes.id))
    .where(eq(entradas.codigo, codigo));
  if (!f) return { resultado: "inexistente", codigo };
  const [hermanas, historial, conteo] = await Promise.all([
    db().select().from(entradas).where(eq(entradas.ordenId, f.o.id)).orderBy(asc(entradas.numero)),
    db().select({ tipo: movimientosPuerta.tipo, el: movimientosPuerta.creadoEl, quien: usuarios.nombre }).from(movimientosPuerta)
      .leftJoin(usuarios, eq(usuarios.id, movimientosPuerta.usuarioId)).where(eq(movimientosPuerta.entradaId, f.e.id)).orderBy(desc(movimientosPuerta.creadoEl)).limit(12),
    db().select({
      dentro: sql<number>`count(*) FILTER (WHERE ${entradas.usadaEl} IS NOT NULL AND ${entradas.fueraDesde} IS NULL)::int`,
      fuera: sql<number>`count(*) FILTER (WHERE ${entradas.fueraDesde} IS NOT NULL)::int`,
      total: sql<number>`count(*)::int`,
    }).from(entradas).innerJoin(ordenes, eq(entradas.ordenId, ordenes.id)).where(and(eq(entradas.funcionId, f.fn.id), inArray(ordenes.estado, VALIDAS))),
  ]);
  return {
    resultado: "ok",
    entrada: ficha(f.e, f.o.estado),
    ordenCodigo: f.o.codigo,
    comprador: f.o.compradorNombre,
    estadoOrden: f.o.estado,
    funcion: { id: f.fn.id, titulo: f.fn.titulo, cuando: cuando(f.fn.fechaHora) ?? "Fecha por anunciar", esHoy: f.fn.fechaHora ? dia(f.fn.fechaHora) === dia(new Date()) : false },
    hermanas: hermanas.map((h) => ficha(h, f.o.estado)),
    historial: historial.map((h) => ({ tipo: h.tipo, cuando: cuando(h.el) ?? "", quien: h.quien ?? "—" })),
    conteo: conteo[0],
  };
}

/** Aplica un movimiento a una entrada. Devuelve un mensaje para la puerta; nunca lanza por estados inválidos. */
async function moverUna(codigo: string, movida: Movida, usuarioId: number): Promise<{ ok: boolean; mensaje: string }> {
  const [f] = await db().select({ e: entradas, estadoOrden: ordenes.estado }).from(entradas)
    .innerJoin(ordenes, eq(entradas.ordenId, ordenes.id)).where(eq(entradas.codigo, codigo));
  if (!f) return { ok: false, mensaje: "La entrada no existe." };
  if (!VALIDAS.includes(f.estadoOrden)) return { ok: false, mensaje: "Esta entrada fue anulada o reembolsada: no puede entrar." };
  const id = f.e.id;
  const ahora = new Date();
  let cambio: { id: number }[] = [];
  let tipo = "";
  if (movida === "entrar") {
    tipo = "entrada";
    // Primer ingreso, o regreso después de una salida temporal.
    cambio = await db().update(entradas).set({ usadaEl: ahora, validadaPor: usuarioId }).where(and(eq(entradas.id, id), isNull(entradas.usadaEl))).returning({ id: entradas.id });
    if (!cambio.length) cambio = await db().update(entradas).set({ fueraDesde: null }).where(and(eq(entradas.id, id), isNotNull(entradas.fueraDesde))).returning({ id: entradas.id });
    if (!cambio.length) return { ok: false, mensaje: `La butaca ${f.e.numero} ya está adentro desde las ${hora(f.e.usadaEl)}.` };
  } else if (movida === "salir") {
    tipo = "salida";
    cambio = await db().update(entradas).set({ fueraDesde: ahora }).where(and(eq(entradas.id, id), isNotNull(entradas.usadaEl), isNull(entradas.fueraDesde))).returning({ id: entradas.id });
    if (!cambio.length) return { ok: false, mensaje: f.e.usadaEl ? "Ya tenía registrada la salida." : "Todavía no ha entrado: no puede registrar salida." };
  } else {
    tipo = "anulado";
    cambio = await db().update(entradas).set({ usadaEl: null, fueraDesde: null, validadaPor: null }).where(and(eq(entradas.id, id), isNotNull(entradas.usadaEl))).returning({ id: entradas.id });
    if (!cambio.length) return { ok: false, mensaje: "La entrada no tenía ingreso que deshacer." };
  }
  await db().insert(movimientosPuerta).values({ entradaId: id, tipo, usuarioId });
  const msg = { entrada: f.e.usadaEl ? `Regresó: butaca ${f.e.numero}.` : `Adelante: butaca ${f.e.numero}.`, salida: `Salida registrada: butaca ${f.e.numero}. Puede volver a entrar con la misma entrada.`, anulado: `Ingreso deshecho: la butaca ${f.e.numero} queda sin usar.` };
  return { ok: true, mensaje: msg[tipo as keyof typeof msg] };
}

/**
 * Mueve una entrada, o todas las de la misma compra (`todas`), y devuelve la consulta actualizada.
 * Con `todas`, solo se mueven las que están en el estado que corresponde; las demás se dejan como están.
 */
export async function mover(codigoCrudo: string, movida: Movida, usuarioId: number, todas = false): Promise<Consulta> {
  const codigo = limpiarCodigo(codigoCrudo);
  let hecho: { ok: boolean; mensaje: string };
  if (todas) {
    const antes = await consultar(codigo);
    if (antes.resultado !== "ok") return antes;
    const aptas = antes.hermanas.filter((h) => (movida === "entrar" ? h.estado === "sin_usar" || h.estado === "fuera" : movida === "salir" ? h.estado === "dentro" : h.estado === "dentro" || h.estado === "fuera"));
    const r = await Promise.all(aptas.map((h) => moverUna(h.codigo, movida, usuarioId)));
    const n = r.filter((x) => x.ok).length;
    const verbo = movida === "entrar" ? "entraron" : movida === "salir" ? "salieron" : "quedaron sin usar";
    hecho = n ? { ok: true, mensaje: `${n} de ${antes.hermanas.length} ${n === 1 ? "entrada" : "entradas"} ${verbo}.` } : { ok: false, mensaje: "Ninguna entrada de esta compra estaba en condiciones para eso." };
  } else {
    hecho = await moverUna(codigo, movida, usuarioId);
  }
  const despues = await consultar(codigo);
  return despues.resultado === "ok" ? { ...despues, hecho } : despues;
}
