// Reglas de la escuela: inscripciones, mensualidades, pagos y recibos.
// Igual que en la taquilla, cada cambio de estado ocurre dentro de una transacción.
import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { estudiantes, cargos, reportesPago, niveles } = schema;
type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

/** Error con un mensaje pensado para mostrárselo a la persona. */
export class ErrorEscuela extends Error {}

export const ESTADOS_ESTUDIANTE: Record<string, string> = { solicitud: "Solicitud", activo: "Activo", retirado: "Retirado", egresado: "Egresado", rechazado: "No admitido" };
export const METODOS_ESCUELA: Record<string, string> = { pago_movil: "Pago Móvil", transferencia: "Transferencia", efectivo: "Efectivo", punto: "Punto de venta" };

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const n2 = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

/** Fecha de hoy en Venezuela (UTC-4), como AAAA-MM-DD. */
export const hoy = () => new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10);
export const periodoActual = () => hoy().slice(0, 7);
export const nombrePeriodo = (p: string) => `${MESES[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;

/** Estado que ve la gente: un cargo pendiente y vencido está "en mora". */
export function estadoCargo(c: { estado: string; venceEl: string }): "pagado" | "por_confirmar" | "en_mora" | "pendiente" | "anulado" {
  if (c.estado === "pendiente" && c.venceEl < hoy()) return "en_mora";
  return c.estado as "pagado";
}
export const NOMBRE_ESTADO_CARGO: Record<string, string> = { pagado: "Pagado", por_confirmar: "Pago por confirmar", en_mora: "En mora", pendiente: "Pendiente", anulado: "Anulado" };

function vencimiento(periodo: string, dia: number) {
  const d = Math.min(28, Math.max(1, dia));
  return `${periodo}-${String(d).padStart(2, "0")}`;
}

/**
 * Crea la mensualidad del período para cada estudiante activo que aún no la tenga.
 * Se puede llamar las veces que sea: nunca duplica (restricción única por estudiante y período).
 */
export async function generarMensualidades(periodo: string, diaVencimiento: number, tx: Tx | ReturnType<typeof db> = db()): Promise<number> {
  const r = await tx.execute(sql`
    INSERT INTO cargos (estudiante_id, tipo, concepto, periodo, monto_usd, vence_el)
    SELECT e.id, 'mensualidad', ${`Mensualidad ${nombrePeriodo(periodo)} · `} || n.nombre, ${periodo},
           round(n.monto_mensualidad * (100 - e.beca_pct) / 100.0, 2), ${vencimiento(periodo, diaVencimiento)}::date
    FROM estudiantes e JOIN niveles n ON n.id = e.nivel_id
    WHERE e.estado = 'activo' AND n.monto_mensualidad > 0 AND e.beca_pct < 100
      AND (e.fecha_ingreso IS NULL OR to_char(e.fecha_ingreso, 'YYYY-MM') <= ${periodo})
    ON CONFLICT (estudiante_id, tipo, periodo) DO NOTHING`);
  return r.rowCount ?? 0;
}

/** Admite una solicitud: el estudiante queda activo y se generan su inscripción y su primera mensualidad. */
export async function aprobarInscripcion(estudianteId: number, diaVencimiento: number) {
  await db().transaction(async (tx) => {
    const [e] = await tx.select().from(estudiantes).where(eq(estudiantes.id, estudianteId)).for("update");
    if (!e || e.estado !== "solicitud") throw new ErrorEscuela("Esta solicitud ya fue atendida.");
    if (!e.nivelId) throw new ErrorEscuela("Asigna un nivel al estudiante antes de aprobar.");
    const [n] = await tx.select().from(niveles).where(eq(niveles.id, e.nivelId));
    await tx.update(estudiantes).set({ estado: "activo", fechaIngreso: hoy() }).where(eq(estudiantes.id, e.id));
    if (n?.montoInscripcion && Number(n.montoInscripcion) > 0) {
      await tx.insert(cargos).values({ estudianteId: e.id, tipo: "inscripcion", concepto: `Inscripción · ${n.nombre}`, periodo: hoy().slice(0, 4), montoUsd: n.montoInscripcion, venceEl: hoy() }).onConflictDoNothing();
    }
    await generarMensualidades(periodoActual(), diaVencimiento, tx);
  });
}

export async function rechazarInscripcion(estudianteId: number, motivo: string) {
  await db().update(estudiantes).set({ estado: "rechazado", notas: motivo }).where(and(eq(estudiantes.id, estudianteId), eq(estudiantes.estado, "solicitud")));
}

export type PagoEscuela = {
  usuarioId: number; cargoIds: number[]; metodo: string; referencia: string; capturaUrl: string | null; tasa: number | null;
  /** true cuando lo registra el equipo: puede cobrar cualquier cargo y usar efectivo o punto. */
  esEquipo: boolean;
};

/** Registra un pago que cubre uno o más cargos. Devuelve el id del reporte. */
export async function reportarPagoEscuela(p: PagoEscuela): Promise<number> {
  const ids = [...new Set(p.cargoIds.filter((n) => Number.isInteger(n) && n > 0))];
  if (ids.length === 0) throw new ErrorEscuela("Marca al menos un cargo para pagar.");
  const permitidos = p.esEquipo ? ["pago_movil", "transferencia", "efectivo", "punto"] : ["pago_movil", "transferencia"];
  if (!permitidos.includes(p.metodo)) throw new ErrorEscuela("Elige un método de pago.");
  const conReferencia = p.metodo === "pago_movil" || p.metodo === "transferencia";
  const ref = p.referencia.replace(/\s/g, "");
  if (conReferencia && !/^\d{4,20}$/.test(ref)) throw new ErrorEscuela("Escribe el número de referencia del pago (solo dígitos, al menos los últimos 4).");

  return db().transaction(async (tx) => {
    const filas = await tx.select({ c: cargos, e: estudiantes }).from(cargos).innerJoin(estudiantes, eq(cargos.estudianteId, estudiantes.id))
      .where(and(inArray(cargos.id, ids), eq(cargos.estado, "pendiente"))).for("update", { of: cargos });
    if (filas.length !== ids.length) throw new ErrorEscuela("Alguno de los cargos ya fue pagado o reportado. Actualiza la página.");
    if (!p.esEquipo && filas.some((f) => f.e.representanteId !== p.usuarioId)) throw new ErrorEscuela("Solo puedes pagar los cargos de tus estudiantes.");
    if (conReferencia) {
      const [repetida] = await tx.select({ id: reportesPago.id }).from(reportesPago).where(and(eq(reportesPago.referencia, ref), eq(reportesPago.metodo, p.metodo), inArray(reportesPago.estado, ["reportado", "confirmado"]))).limit(1);
      if (repetida) throw new ErrorEscuela("Esa referencia ya fue reportada en otro pago. Revisa el número.");
    }
    const total = filas.reduce((s, f) => s + Number(f.c.montoUsd), 0);
    const [r] = await tx.insert(reportesPago).values({
      usuarioId: p.usuarioId, metodo: p.metodo, referencia: conReferencia ? ref : "", montoUsd: n2(total),
      tasa: p.tasa ? p.tasa.toFixed(4) : null, montoBs: p.tasa ? n2(total * p.tasa) : null, capturaUrl: p.capturaUrl,
      detalle: filas.map((f) => ({ estudiante: `${f.e.nombres} ${f.e.apellidos}`, concepto: f.c.concepto, monto: Number(f.c.montoUsd) })),
    }).returning();
    await tx.update(cargos).set({ estado: "por_confirmar", reporteId: r.id }).where(inArray(cargos.id, ids));
    // Lo que cobra el equipo en persona no necesita una segunda revisión.
    if (p.esEquipo) await confirmar(tx, r.id, p.usuarioId);
    return r.id;
  });
}

async function confirmar(tx: Tx, reporteId: number, usuarioId: number) {
  const [r] = await tx.select().from(reportesPago).where(eq(reportesPago.id, reporteId)).for("update");
  if (!r || r.estado !== "reportado") throw new ErrorEscuela("Este pago ya fue atendido.");
  // El número de recibo sale de una secuencia: correlativo y sin repetidos aunque se confirmen dos a la vez.
  await tx.execute(sql`UPDATE reportes_pago SET estado = 'confirmado', revisado_por = ${usuarioId}, confirmado_el = now(), numero_recibo = nextval('recibos_seq') WHERE id = ${reporteId}`);
  await tx.update(cargos).set({ estado: "pagado" }).where(eq(cargos.reporteId, reporteId));
}

/** El equipo verificó el pago: los cargos quedan pagados y se emite el recibo. */
export async function confirmarReporte(reporteId: number, usuarioId: number) {
  await db().transaction((tx) => confirmar(tx, reporteId, usuarioId));
}

/** El pago no llegó: los cargos vuelven a estar pendientes. */
export async function rechazarReporte(reporteId: number, usuarioId: number, nota: string) {
  await db().transaction(async (tx) => {
    const [r] = await tx.select().from(reportesPago).where(eq(reportesPago.id, reporteId)).for("update");
    if (!r || r.estado !== "reportado") throw new ErrorEscuela("Este pago ya fue atendido.");
    await tx.update(reportesPago).set({ estado: "rechazado", revisadoPor: usuarioId, nota: nota || "No pudimos verificar el pago" }).where(eq(reportesPago.id, reporteId));
    await tx.update(cargos).set({ estado: "pendiente", reporteId: null }).where(eq(cargos.reporteId, reporteId));
  });
}

export async function anularCargo(cargoId: number) {
  const r = await db().update(cargos).set({ estado: "anulado" }).where(and(eq(cargos.id, cargoId), eq(cargos.estado, "pendiente"))).returning({ id: cargos.id });
  if (r.length === 0) throw new ErrorEscuela("Solo se puede anular un cargo pendiente.");
}

/** Cargos que necesitan aviso por correo. Marca cada uno para no avisar dos veces. */
export async function cargosPorAvisar(diasAntes = 3) {
  const base = () => db().select({ c: cargos, e: estudiantes, correoCuenta: schema.usuarios.correo }).from(cargos)
    .innerJoin(estudiantes, eq(cargos.estudianteId, estudiantes.id)).leftJoin(schema.usuarios, eq(estudiantes.representanteId, schema.usuarios.id));
  const porVencer = await base().where(sql`${cargos.estado} = 'pendiente' AND ${cargos.recordadoEl} IS NULL AND ${cargos.venceEl} >= ${hoy()}::date AND ${cargos.venceEl} <= ${hoy()}::date + ${diasAntes}::int`);
  const enMora = await base().where(sql`${cargos.estado} = 'pendiente' AND ${cargos.moraAvisadaEl} IS NULL AND ${cargos.venceEl} < ${hoy()}::date`);
  return { porVencer, enMora };
}
