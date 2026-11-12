// Reglas de la taquilla. La base de datos decide quién se queda con cada butaca:
// todo cambio de estado ocurre dentro de una transacción y con condiciones en el UPDATE,
// de modo que dos personas tocando la misma butaca a la vez nunca la obtienen ambas.
import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { enviarCorreo, urlBase } from "./correo";
import { generarButacas } from "./planos";
import { enBs } from "./tasa";

const { butacas, ordenes, pagos, bonos, entradas, zonas, funciones } = schema;

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];
export type Orden = typeof ordenes.$inferSelect;
export type Funcion = typeof funciones.$inferSelect;
export type Zona = typeof zonas.$inferSelect;

/** Error con un mensaje pensado para mostrárselo a la persona. */
export class ErrorTaquilla extends Error {}

export const METODOS: Record<string, string> = {
  pago_movil: "Pago Móvil", transferencia: "Transferencia", bono: "Bono de regalo",
  efectivo: "Efectivo", punto: "Punto de venta", cortesia: "Cortesía",
};
export const ESTADOS_ORDEN: Record<string, string> = {
  apartada: "Apartada", por_confirmar: "Pago por confirmar", pagada: "Pagada", vencida: "Vencida", rechazada: "Pago rechazado",
  en_conflicto: "Butacas ya no disponibles", reembolso_pendiente: "Reembolso solicitado", reembolsada: "Reembolsada", anulada: "Anulada",
};

// Sin caracteres que se confundan (0/O, 1/I/L).
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function codigoAleatorio(largo: number): string {
  const bytes = randomBytes(largo);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

const n2 = (v: number) => v.toFixed(2);

// ---------- Precios ----------

export function enPreventa(f: Pick<Funcion, "preventaHasta">, ahora = new Date()) {
  return Boolean(f.preventaHasta && ahora <= f.preventaHasta);
}

export function precioDe(z: Pick<Zona, "precioPreventa" | "precioRegular">, f: Pick<Funcion, "preventaHasta">, ahora = new Date()): number {
  return enPreventa(f, ahora) && z.precioPreventa != null ? Number(z.precioPreventa) : Number(z.precioRegular);
}

// ---------- Plano ----------

/** Crea las zonas y butacas de una función copiando una sala. No hace nada si ya tiene. */
export async function crearPlano(funcionId: number, salaId: number) {
  const [sala] = await db().select().from(schema.salas).where(eq(schema.salas.id, salaId));
  if (!sala) throw new ErrorTaquilla("Esa sala no existe.");
  const lista = generarButacas(sala.definicion);
  await db().transaction(async (tx) => {
    const [ya] = await tx.select({ id: butacas.id }).from(butacas).where(eq(butacas.funcionId, funcionId)).limit(1);
    if (ya) return;
    const zs = await tx.insert(zonas).values(sala.definicion.zonas.map((z, i) => ({
      funcionId, clave: z.clave, nombre: z.nombre, color: z.color, precioPreventa: z.precioPreventa || null, precioRegular: z.precioRegular, orden: i,
    }))).returning();
    const idDe = Object.fromEntries(zs.map((z) => [z.clave, z.id]));
    await tx.insert(butacas).values(lista.map((b) => ({ funcionId, zonaId: idDe[b.zona], numero: b.numero, bloque: b.bloque, fila: b.fila, pos: b.pos })));
    await tx.update(funciones).set({ plano: sala.nombre, aforo: lista.length }).where(eq(funciones.id, funcionId));
  });
}

/** Libera los apartados cuyo tiempo se cumplió. Se llama antes de cada lectura u operación. */
export async function limpiarVencidas(tx: Tx | ReturnType<typeof db> = db()) {
  await tx.execute(sql`UPDATE butacas SET estado = 'libre', orden_id = NULL, apartada_hasta = NULL WHERE estado = 'apartada' AND apartada_hasta < now()`);
  await tx.execute(sql`UPDATE ordenes SET estado = 'vencida' WHERE estado = 'apartada' AND vence_el < now()`);
}

export type EstadoPlano = {
  zonas: { id: number; nombre: string; color: string; precio: number; precioRegular: number }[];
  /** n: número, b: bloque, f: fila, p: posición, z: zona, e: estado, o: id de orden (solo para el equipo) */
  butacas: { n: number; b: string; f: number; p: number; z: number; e: string; o?: number | null }[];
  libres: number;
  total: number;
};

export async function estadoPlano(f: Funcion, conOrden = false): Promise<EstadoPlano> {
  await limpiarVencidas();
  const [zs, bs] = await Promise.all([
    db().select().from(zonas).where(eq(zonas.funcionId, f.id)).orderBy(asc(zonas.orden)),
    db().select().from(butacas).where(eq(butacas.funcionId, f.id)).orderBy(asc(butacas.numero)),
  ]);
  return {
    zonas: zs.map((z) => ({ id: z.id, nombre: z.nombre, color: z.color, precio: precioDe(z, f), precioRegular: Number(z.precioRegular) })),
    butacas: bs.map((b) => ({ n: b.numero, b: b.bloque, f: b.fila, p: b.pos, z: b.zonaId, e: b.estado, ...(conOrden ? { o: b.ordenId } : {}) })),
    libres: bs.filter((b) => b.estado === "libre").length,
    total: bs.filter((b) => b.estado !== "bloqueada").length,
  };
}

// ---------- Apartar ----------

function validarNumeros(numeros: number[]) {
  const unicos = [...new Set(numeros.filter((n) => Number.isInteger(n) && n > 0))];
  if (unicos.length === 0) throw new ErrorTaquilla("Elige al menos una butaca.");
  return unicos.sort((a, b) => a - b);
}

/** Toma las butacas para una orden. Falla (y no cambia nada) si alguna ya no está libre. */
async function tomarButacas(tx: Tx, funcionId: number, numeros: number[], ordenId: number, estado: "apartada" | "por_confirmar" | "vendida", hasta: Date | null) {
  const tomadas = await tx.update(butacas)
    .set({ estado, ordenId, apartadaHasta: hasta })
    .where(and(eq(butacas.funcionId, funcionId), inArray(butacas.numero, numeros), eq(butacas.estado, "libre")))
    .returning({ numero: butacas.numero });
  if (tomadas.length !== numeros.length) {
    const ok = new Set(tomadas.map((t) => t.numero));
    const faltan = numeros.filter((n) => !ok.has(n));
    throw new ErrorTaquilla(`${faltan.length === 1 ? "La butaca" : "Las butacas"} ${faltan.join(", ")} ya no ${faltan.length === 1 ? "está disponible" : "están disponibles"}. Elige ${faltan.length === 1 ? "otra" : "otras"}.`);
  }
}

async function detalleYTotal(tx: Tx, f: Funcion, numeros: number[]) {
  const filas = await tx.select({ numero: butacas.numero, zona: zonas }).from(butacas).innerJoin(zonas, eq(butacas.zonaId, zonas.id))
    .where(and(eq(butacas.funcionId, f.id), inArray(butacas.numero, numeros)));
  if (filas.length !== numeros.length) throw new ErrorTaquilla("Alguna de las butacas elegidas no existe en esta función.");
  const detalle = filas.sort((a, b) => a.numero - b.numero).map((x) => ({ numero: x.numero, zona: x.zona.nombre, precio: precioDe(x.zona, f) }));
  return { detalle, total: detalle.reduce((s, d) => s + d.precio, 0) };
}

/** La función terminó hace más de tres horas (o nunca tuvo fecha: entonces no ha pasado). */
export const yaPaso = (f: Pick<Funcion, "fechaHora">) => Boolean(f.fechaHora && f.fechaHora.getTime() + 3 * 3600_000 < Date.now());

function exigirEnVenta(f: Funcion | undefined): asserts f is Funcion {
  if (!f || f.estado !== "a_la_venta") throw new ErrorTaquilla("Esta función no está a la venta.");
  if (yaPaso(f)) throw new ErrorTaquilla("Esta función ya pasó.");
}

/** Crea una orden web y aparta sus butacas por los minutos configurados. Devuelve el código de la orden. */
export async function apartar(funcionId: number, numerosCrudos: number[], opciones: { minutos: number; tasa: number | null }): Promise<string> {
  const numeros = validarNumeros(numerosCrudos);
  return db().transaction(async (tx) => {
    await limpiarVencidas(tx);
    const [f] = await tx.select().from(funciones).where(eq(funciones.id, funcionId));
    exigirEnVenta(f);
    if (numeros.length > f.maxPorCompra) throw new ErrorTaquilla(`Puedes llevar hasta ${f.maxPorCompra} butacas por compra.`);
    const { detalle, total } = await detalleYTotal(tx, f, numeros);
    const vence = new Date(Date.now() + opciones.minutos * 60_000);
    const [o] = await tx.insert(ordenes).values({
      codigo: codigoAleatorio(16), funcionId, canal: "web", detalle, totalUsd: n2(total), tasa: opciones.tasa ? opciones.tasa.toFixed(4) : null, venceEl: vence,
    }).returning();
    await tomarButacas(tx, funcionId, numeros, o.id, "apartada", vence);
    return o.codigo;
  });
}

/** El comprador desiste antes de pagar: se liberan sus butacas. */
export async function cancelarApartado(codigo: string) {
  await db().transaction(async (tx) => {
    const [o] = await tx.select().from(ordenes).where(eq(ordenes.codigo, codigo)).for("update");
    if (!o || o.estado !== "apartada") return;
    await tx.update(butacas).set({ estado: "libre", ordenId: null, apartadaHasta: null }).where(and(eq(butacas.ordenId, o.id), eq(butacas.estado, "apartada")));
    await tx.update(ordenes).set({ estado: "anulada", motivo: "Cancelada por el comprador" }).where(eq(ordenes.id, o.id));
  });
}

// ---------- Bonos ----------

/** Descuenta del bono lo que cubra de `monto` y registra ese pago. Devuelve cuánto cubrió. */
async function aplicarBono(tx: Tx, codigoBono: string, ordenId: number, monto: number): Promise<number> {
  const codigo = codigoBono.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const [b] = await tx.select().from(bonos).where(eq(bonos.codigo, codigo)).for("update");
  if (!b || !b.activo) throw new ErrorTaquilla("Ese bono de regalo no existe o fue desactivado. Revisa el código.");
  if (b.venceEl && b.venceEl < new Date()) throw new ErrorTaquilla("Ese bono de regalo ya venció.");
  const saldo = Number(b.saldoUsd);
  if (saldo <= 0) throw new ErrorTaquilla("Ese bono de regalo ya no tiene saldo.");
  const cubre = Math.min(saldo, monto);
  await tx.update(bonos).set({ saldoUsd: n2(saldo - cubre) }).where(eq(bonos.id, b.id));
  await tx.insert(pagos).values({ ordenId, metodo: "bono", referencia: b.codigo, montoUsd: n2(cubre), bonoId: b.id });
  return cubre;
}

/** Devuelve al bono lo que una orden le había descontado (pago rechazado, reembolso o anulación). */
async function devolverBonos(tx: Tx, ordenId: number) {
  const usados = await tx.select().from(pagos).where(and(eq(pagos.ordenId, ordenId), eq(pagos.metodo, "bono"), inArray(pagos.estado, ["reportado", "confirmado"])));
  for (const p of usados) {
    if (p.bonoId) await tx.update(bonos).set({ saldoUsd: sql`${bonos.saldoUsd} + ${p.montoUsd}` }).where(eq(bonos.id, p.bonoId));
  }
}

// ---------- Pagar ----------

async function emitirEntradas(tx: Tx, o: Orden) {
  await tx.insert(entradas).values(o.detalle.map((d) => ({ ordenId: o.id, funcionId: o.funcionId, numero: d.numero, zona: d.zona, precioUsd: n2(d.precio), codigo: codigoAleatorio(12) })));
}

export type DatosPago = {
  nombre: string; telefono: string; correo: string;
  metodo: string; referencia: string; capturaUrl: string | null; bono: string;
};

/**
 * El comprador reporta su pago. Resultado:
 *  - "pagada": un bono cubrió todo; las entradas ya están emitidas.
 *  - "por_confirmar": el equipo debe verificar el pago.
 *  - "en_conflicto": reportó después de vencer el apartado y alguna butaca ya es de otra persona.
 */
export async function reportarPago(codigo: string, d: DatosPago): Promise<Orden["estado"]> {
  if (d.nombre.length < 2) throw new ErrorTaquilla("Escribe tu nombre.");
  if (!d.telefono && !d.correo) throw new ErrorTaquilla("Déjanos un teléfono o un correo para avisarte.");
  const estado = await db().transaction(async (tx) => {
    await limpiarVencidas(tx);
    const [o] = await tx.select().from(ordenes).where(eq(ordenes.codigo, codigo)).for("update");
    if (!o) throw new ErrorTaquilla("No encontramos esa orden.");
    if (o.estado !== "apartada" && o.estado !== "vencida") throw new ErrorTaquilla("Esta orden ya no admite un pago nuevo.");

    const numeros = o.detalle.map((x) => x.numero);
    const total = Number(o.totalUsd);
    let conflicto = false;
    if (o.estado === "vencida") {
      // Pagó a tiempo pero avisó tarde: se intenta recuperar exactamente las mismas butacas.
      const libres = await tx.select({ numero: butacas.numero }).from(butacas)
        .where(and(eq(butacas.funcionId, o.funcionId), inArray(butacas.numero, numeros), eq(butacas.estado, "libre"))).for("update");
      conflicto = libres.length !== numeros.length;
    }

    const cubierto = d.bono ? await aplicarBono(tx, d.bono, o.id, total) : 0;
    const resto = Math.round((total - cubierto) * 100) / 100;
    if (resto > 0) {
      if (d.metodo !== "pago_movil" && d.metodo !== "transferencia") throw new ErrorTaquilla(cubierto > 0 ? `El bono cubre $${n2(cubierto)}. Elige cómo pagas los $${n2(resto)} restantes.` : "Elige un método de pago.");
      const ref = d.referencia.replace(/\s/g, "");
      if (!/^\d{4,20}$/.test(ref)) throw new ErrorTaquilla("Escribe el número de referencia del pago (solo dígitos, al menos los últimos 4).");
      const [repetida] = await tx.select({ id: pagos.id }).from(pagos).where(and(eq(pagos.referencia, ref), eq(pagos.metodo, d.metodo), inArray(pagos.estado, ["reportado", "confirmado"]))).limit(1);
      if (repetida) throw new ErrorTaquilla("Esa referencia ya fue reportada en otra compra. Revisa el número.");
      await tx.insert(pagos).values({ ordenId: o.id, metodo: d.metodo, referencia: ref, montoUsd: n2(resto), montoBs: o.tasa ? n2(enBs(resto, Number(o.tasa))) : null, capturaUrl: d.capturaUrl });
    }

    const comprador = { compradorNombre: d.nombre, telefono: d.telefono, correo: d.correo };
    if (conflicto) {
      await tx.update(ordenes).set({ ...comprador, estado: "en_conflicto", venceEl: null }).where(eq(ordenes.id, o.id));
      return "en_conflicto";
    }
    if (o.estado === "vencida") await tomarButacas(tx, o.funcionId, numeros, o.id, "apartada", null);
    if (resto > 0) {
      await tx.update(butacas).set({ estado: "por_confirmar", apartadaHasta: null }).where(eq(butacas.ordenId, o.id));
      await tx.update(ordenes).set({ ...comprador, estado: "por_confirmar", venceEl: null }).where(eq(ordenes.id, o.id));
      return "por_confirmar";
    }
    // El bono cubrió todo: no hay nada que verificar.
    await tx.update(pagos).set({ estado: "confirmado", confirmadoEl: new Date() }).where(eq(pagos.ordenId, o.id));
    await tx.update(butacas).set({ estado: "vendida", apartadaHasta: null }).where(eq(butacas.ordenId, o.id));
    await tx.update(ordenes).set({ ...comprador, estado: "pagada", venceEl: null }).where(eq(ordenes.id, o.id));
    await emitirEntradas(tx, o);
    return "pagada";
  });
  if (estado === "pagada") await avisar(codigo, "Tus entradas están listas", "Tu pago quedó registrado. Abre este enlace para ver tus entradas:");
  if (estado === "en_conflicto") await avisar(codigo, "Tus butacas ya no están disponibles", "Recibimos tu pago después de que venció el apartado y esas butacas ya se vendieron. Entra para elegir otras butacas o pedir el reembolso:");
  return estado;
}

async function avisar(codigo: string, asunto: string, texto: string) {
  const [o] = await db().select().from(ordenes).where(eq(ordenes.codigo, codigo));
  if (o?.correo) await enviarCorreo(o.correo, asunto, `Hola ${o.compradorNombre}:\n\n${texto}\n${urlBase()}/orden/${o.codigo}\n\nA-Nelo Escénico`);
}

/** El equipo verificó el pago: las butacas quedan vendidas y se emiten las entradas. */
export async function confirmarOrden(ordenId: number, usuarioId: number) {
  const codigo = await db().transaction(async (tx) => {
    const [o] = await tx.select().from(ordenes).where(eq(ordenes.id, ordenId)).for("update");
    if (!o || o.estado !== "por_confirmar") throw new ErrorTaquilla("Esta orden ya no está por confirmar.");
    await tx.update(pagos).set({ estado: "confirmado", revisadoPor: usuarioId, confirmadoEl: new Date() }).where(and(eq(pagos.ordenId, o.id), eq(pagos.estado, "reportado")));
    await tx.update(butacas).set({ estado: "vendida" }).where(eq(butacas.ordenId, o.id));
    await tx.update(ordenes).set({ estado: "pagada" }).where(eq(ordenes.id, o.id));
    await emitirEntradas(tx, o);
    return o.codigo;
  });
  await avisar(codigo, "Pago confirmado: tus entradas están listas", "Confirmamos tu pago. Abre este enlace para ver tus entradas y preséntalas en la puerta:");
}

/** Libera butacas, devuelve bonos y marca los pagos; se usa al rechazar, reembolsar o anular. */
async function deshacer(tx: Tx, o: Orden, estadoPagos: "rechazado" | "reembolsado", estadoOrden: Orden["estado"], motivo: string, usuarioId: number) {
  await devolverBonos(tx, o.id);
  await tx.update(pagos).set({ estado: estadoPagos, revisadoPor: usuarioId, nota: motivo }).where(and(eq(pagos.ordenId, o.id), inArray(pagos.estado, ["reportado", "confirmado"])));
  await tx.update(butacas).set({ estado: "libre", ordenId: null, apartadaHasta: null }).where(eq(butacas.ordenId, o.id));
  await tx.delete(entradas).where(eq(entradas.ordenId, o.id));
  await tx.update(ordenes).set({ estado: estadoOrden, motivo }).where(eq(ordenes.id, o.id));
}

/** El pago no llegó o no coincide: se rechaza y las butacas vuelven a estar libres. */
export async function rechazarOrden(ordenId: number, usuarioId: number, motivo: string) {
  const codigo = await db().transaction(async (tx) => {
    const [o] = await tx.select().from(ordenes).where(eq(ordenes.id, ordenId)).for("update");
    if (!o || !["por_confirmar", "en_conflicto", "reembolso_pendiente"].includes(o.estado)) throw new ErrorTaquilla("Esta orden ya no se puede rechazar.");
    await deshacer(tx, o, "rechazado", "rechazada", motivo || "No pudimos verificar el pago", usuarioId);
    return o.codigo;
  });
  await avisar(codigo, "No pudimos verificar tu pago", `Motivo: ${motivo || "no encontramos el pago con esa referencia"}. Tus butacas quedaron libres. Puedes ver el detalle aquí:`);
}

/** Se devolvió el dinero (conflicto de butacas, función cancelada o venta anulada). */
export async function reembolsarOrden(ordenId: number, usuarioId: number, referencia: string) {
  const codigo = await db().transaction(async (tx) => {
    const [o] = await tx.select().from(ordenes).where(eq(ordenes.id, ordenId)).for("update");
    if (!o || !["en_conflicto", "reembolso_pendiente", "pagada", "por_confirmar"].includes(o.estado)) throw new ErrorTaquilla("Esta orden no admite reembolso.");
    await deshacer(tx, o, "reembolsado", "reembolsada", referencia ? `Reembolso ref. ${referencia}` : "Reembolsada", usuarioId);
    return o.codigo;
  });
  await avisar(codigo, "Tu reembolso fue procesado", `Devolvimos tu pago${referencia ? ` (referencia ${referencia})` : ""}. Detalle:`);
}

// ---------- Conflicto: el comprador elige ----------

/** Cambia las butacas de una orden en conflicto por otras libres de igual o menor valor. */
export async function cambiarButacas(codigo: string, numerosCrudos: number[]) {
  const numeros = validarNumeros(numerosCrudos);
  await db().transaction(async (tx) => {
    await limpiarVencidas(tx);
    const [o] = await tx.select().from(ordenes).where(eq(ordenes.codigo, codigo)).for("update");
    if (!o || o.estado !== "en_conflicto") throw new ErrorTaquilla("Esta orden no está esperando un cambio de butacas.");
    const [f] = await tx.select().from(funciones).where(eq(funciones.id, o.funcionId));
    if (numeros.length > o.detalle.length) throw new ErrorTaquilla(`Tu compra era de ${o.detalle.length} ${o.detalle.length === 1 ? "butaca" : "butacas"}. Elige esa cantidad o menos.`);
    const { detalle, total } = await detalleYTotal(tx, f, numeros);
    if (total > Number(o.totalUsd) + 0.001) throw new ErrorTaquilla(`Lo que pagaste ($${o.totalUsd}) no alcanza para esas butacas ($${n2(total)}). Elige butacas de igual o menor valor.`);
    await tomarButacas(tx, o.funcionId, numeros, o.id, "por_confirmar", null);
    await tx.update(ordenes).set({ detalle, estado: "por_confirmar", motivo: "Butacas cambiadas por conflicto" }).where(eq(ordenes.id, o.id));
  });
}

export async function pedirReembolso(codigo: string) {
  await db().update(ordenes).set({ estado: "reembolso_pendiente" }).where(and(eq(ordenes.codigo, codigo), eq(ordenes.estado, "en_conflicto")));
}

// ---------- Taquilla presencial ----------

export type VentaTaquilla = { funcionId: number; numeros: number[]; nombre: string; telefono: string; metodo: string; referencia: string; bono: string; vendedorId: number; puedeCortesia: boolean; tasa: number | null };

/** Venta en la sala: aparta, cobra y emite las entradas en un solo paso. Devuelve el código de la orden. */
export async function venderEnTaquilla(v: VentaTaquilla): Promise<string> {
  const numeros = validarNumeros(v.numeros);
  if (!["efectivo", "pago_movil", "transferencia", "punto", "bono", "cortesia"].includes(v.metodo)) throw new ErrorTaquilla("Elige cómo paga el cliente.");
  if (v.metodo === "cortesia" && !v.puedeCortesia) throw new ErrorTaquilla("Solo un administrador puede entregar cortesías.");
  return db().transaction(async (tx) => {
    await limpiarVencidas(tx);
    const [f] = await tx.select().from(funciones).where(eq(funciones.id, v.funcionId));
    exigirEnVenta(f);
    const { detalle, total } = await detalleYTotal(tx, f, numeros);
    const esCortesia = v.metodo === "cortesia";
    const [o] = await tx.insert(ordenes).values({
      codigo: codigoAleatorio(16), funcionId: f.id, canal: "taquilla", compradorNombre: v.nombre || "Venta en taquilla", telefono: v.telefono,
      vendedorId: v.vendedorId, detalle: esCortesia ? detalle.map((d) => ({ ...d, precio: 0 })) : detalle,
      totalUsd: n2(esCortesia ? 0 : total), tasa: v.tasa ? v.tasa.toFixed(4) : null, estado: "pagada",
    }).returning();
    await tomarButacas(tx, f.id, numeros, o.id, "vendida", null);
    if (esCortesia) {
      await tx.insert(pagos).values({ ordenId: o.id, metodo: "cortesia", montoUsd: "0", estado: "confirmado", revisadoPor: v.vendedorId, confirmadoEl: new Date() });
    } else {
      const cubierto = v.bono ? await aplicarBono(tx, v.bono, o.id, total) : 0;
      const resto = Math.round((total - cubierto) * 100) / 100;
      if (resto > 0) {
        if (v.metodo === "bono") throw new ErrorTaquilla(`El bono solo cubre $${n2(cubierto)}. Elige cómo paga los $${n2(resto)} restantes.`);
        await tx.insert(pagos).values({ ordenId: o.id, metodo: v.metodo, referencia: v.referencia.replace(/\s/g, ""), montoUsd: n2(resto), montoBs: v.tasa ? n2(enBs(resto, v.tasa)) : null });
      }
      await tx.update(pagos).set({ estado: "confirmado", revisadoPor: v.vendedorId, confirmadoEl: new Date() }).where(eq(pagos.ordenId, o.id));
    }
    await emitirEntradas(tx, o);
    return o.codigo;
  });
}

// ---------- Bloqueos y puerta ----------

/** Reserva o libera una butaca fuera de la venta (invitados, equipo técnico, butaca dañada). */
export async function alternarBloqueo(funcionId: number, numero: number) {
  await limpiarVencidas();
  const r = await db().execute(sql`
    UPDATE butacas SET estado = CASE estado WHEN 'libre' THEN 'bloqueada' ELSE 'libre' END
    WHERE funcion_id = ${funcionId} AND numero = ${numero} AND estado IN ('libre', 'bloqueada')`);
  if (r.rowCount === 0) throw new ErrorTaquilla(`La butaca ${numero} está apartada o vendida; no se puede bloquear.`);
}

export type Validacion = { resultado: "valida" | "usada" | "inexistente"; entrada?: typeof entradas.$inferSelect; funcion?: Funcion; comprador?: string };

/** Consulta una entrada por su código; con `marcar` la deja como usada si aún no lo estaba. */
export async function validarEntrada(codigoCrudo: string, usuarioId: number, marcar: boolean): Promise<Validacion> {
  const codigo = codigoCrudo.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const [fila] = await db().select({ entrada: entradas, funcion: funciones, orden: ordenes }).from(entradas)
    .innerJoin(funciones, eq(entradas.funcionId, funciones.id)).innerJoin(ordenes, eq(entradas.ordenId, ordenes.id)).where(eq(entradas.codigo, codigo));
  if (!fila) return { resultado: "inexistente" };
  const base = { entrada: fila.entrada, funcion: fila.funcion, comprador: fila.orden.compradorNombre };
  if (fila.entrada.usadaEl) return { resultado: "usada", ...base };
  if (marcar) {
    const [m] = await db().update(entradas).set({ usadaEl: new Date(), validadaPor: usuarioId }).where(and(eq(entradas.id, fila.entrada.id), sql`${entradas.usadaEl} IS NULL`)).returning();
    if (!m) return { resultado: "usada", ...base }; // otra puerta la validó en el mismo instante
    return { resultado: "valida", ...base, entrada: m };
  }
  return { resultado: "valida", ...base };
}
