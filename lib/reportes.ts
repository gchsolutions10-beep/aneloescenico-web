// Consultas de reportes. Todas las fechas se interpretan en hora de Venezuela.
import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

const dia = (col: string) => sql.raw(`(${col} AT TIME ZONE 'America/Caracas')::date`);
export const esFecha = (v: string | undefined): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));
const filas = async <T extends Record<string, unknown>>(q: ReturnType<typeof sql>) => (await db().execute<T>(q)).rows;

export type Movimiento = {
  origen: "Entradas" | "Escuela"; fecha: string; hora: string; quien: string; concepto: string; cliente: string;
  metodo: string; referencia: string; usd: string; bs: string | null; usuario_id: number | null; documento: string;
};

/** Todo el dinero confirmado entre dos fechas: pagos de entradas y pagos de la escuela, en una sola lista. */
export function movimientos(desde: string, hasta: string, usuarioId?: number) {
  const deUsuario = usuarioId ? sql`AND x.usuario_id = ${usuarioId}` : sql``;
  return filas<Movimiento>(sql`
    SELECT * FROM (
      SELECT 'Entradas' AS origen, ${dia("p.confirmado_el")}::text AS fecha, to_char(p.confirmado_el AT TIME ZONE 'America/Caracas', 'HH24:MI') AS hora,
             coalesce(u.nombre, 'Automático') AS quien, f.titulo || ' · butacas ' || (SELECT string_agg(d->>'numero', ', ') FROM jsonb_array_elements(o.detalle) d) AS concepto,
             o.comprador_nombre AS cliente, p.metodo, p.referencia, p.monto_usd::text AS usd, p.monto_bs::text AS bs, p.revisado_por AS usuario_id,
             CASE o.canal WHEN 'taquilla' THEN 'Taquilla' ELSE 'En línea' END AS documento, p.confirmado_el AS orden
      FROM pagos p JOIN ordenes o ON o.id = p.orden_id JOIN funciones f ON f.id = o.funcion_id LEFT JOIN usuarios u ON u.id = p.revisado_por
      WHERE p.estado = 'confirmado' AND p.confirmado_el IS NOT NULL
      UNION ALL
      SELECT 'Escuela', ${dia("r.confirmado_el")}::text, to_char(r.confirmado_el AT TIME ZONE 'America/Caracas', 'HH24:MI'),
             coalesce(u.nombre, '—'), (SELECT string_agg((d->>'concepto') || ' (' || (d->>'estudiante') || ')', '; ') FROM jsonb_array_elements(r.detalle) d),
             coalesce(rep.nombre, ''), r.metodo, r.referencia, r.monto_usd::text, r.monto_bs::text, r.revisado_por,
             'Recibo ' || lpad(r.numero_recibo::text, 5, '0'), r.confirmado_el
      FROM reportes_pago r LEFT JOIN usuarios u ON u.id = r.revisado_por LEFT JOIN usuarios rep ON rep.id = r.usuario_id AND rep.rol = 'representante'
      WHERE r.estado = 'confirmado'
    ) x
    WHERE x.fecha::date BETWEEN ${desde}::date AND ${hasta}::date ${deUsuario}
    ORDER BY x.orden`);
}

export type VentaFuncion = { id: number; titulo: string; entradas: number; cortesias: number; en_linea: number; taquilla: number; usd: string; bonos: string; usadas: number };

/** Entradas emitidas y dinero por función en el rango. */
export function ventasPorFuncion(desde: string, hasta: string) {
  return filas<VentaFuncion>(sql`
    SELECT f.id, f.titulo,
      count(e.id)::int AS entradas,
      count(e.id) FILTER (WHERE e.precio_usd = 0)::int AS cortesias,
      count(e.id) FILTER (WHERE o.canal = 'web')::int AS en_linea,
      count(e.id) FILTER (WHERE o.canal = 'taquilla')::int AS taquilla,
      count(e.id) FILTER (WHERE e.usada_el IS NOT NULL)::int AS usadas,
      coalesce((SELECT sum(p.monto_usd) FROM pagos p JOIN ordenes o2 ON o2.id = p.orden_id WHERE o2.funcion_id = f.id AND p.estado = 'confirmado' AND p.metodo <> 'bono'
                AND ${dia("p.confirmado_el")} BETWEEN ${desde}::date AND ${hasta}::date), 0)::text AS usd,
      coalesce((SELECT sum(p.monto_usd) FROM pagos p JOIN ordenes o2 ON o2.id = p.orden_id WHERE o2.funcion_id = f.id AND p.estado = 'confirmado' AND p.metodo = 'bono'
                AND ${dia("p.confirmado_el")} BETWEEN ${desde}::date AND ${hasta}::date), 0)::text AS bonos
    FROM funciones f JOIN entradas e ON e.funcion_id = f.id JOIN ordenes o ON o.id = e.orden_id
    WHERE ${dia("e.creado_el")} BETWEEN ${desde}::date AND ${hasta}::date
    GROUP BY f.id ORDER BY f.fecha_hora DESC NULLS LAST`);
}

export type FilaEstudiante = { apellidos: string; nombres: string; nivel: string | null; estado: string; beca: number; ingreso: string | null; representante: string; cedula: string; telefono: string; correo: string; debe: string; vencido: string };

export function listaEstudiantes() {
  return filas<FilaEstudiante>(sql`
    SELECT e.apellidos, e.nombres, n.nombre AS nivel, e.estado, e.beca_pct AS beca, e.fecha_ingreso::text AS ingreso,
      e.rep_nombre AS representante, e.rep_cedula AS cedula, e.rep_telefono AS telefono, e.rep_correo AS correo,
      coalesce((SELECT sum(c.monto_usd) FROM cargos c WHERE c.estudiante_id = e.id AND c.estado = 'pendiente'), 0)::text AS debe,
      coalesce((SELECT sum(c.monto_usd) FROM cargos c WHERE c.estudiante_id = e.id AND c.estado = 'pendiente' AND c.vence_el < (now() AT TIME ZONE 'America/Caracas')::date), 0)::text AS vencido
    FROM estudiantes e LEFT JOIN niveles n ON n.id = e.nivel_id WHERE e.estado <> 'rechazado' ORDER BY e.apellidos, e.nombres`);
}

/** Agrupa movimientos por una clave y suma dólares y bolívares. Los bonos y cortesías no son dinero recibido. */
export function resumir(lista: Movimiento[], clave: (m: Movimiento) => string) {
  const m = new Map<string, { n: number; usd: number; bs: number }>();
  for (const x of lista) {
    const k = clave(x), a = m.get(k) ?? { n: 0, usd: 0, bs: 0 };
    m.set(k, { n: a.n + 1, usd: a.usd + Number(x.usd), bs: a.bs + Number(x.bs ?? 0) });
  }
  return [...m.entries()].map(([k, v]) => ({ clave: k, ...v }));
}
export const esDinero = (m: Movimiento) => m.metodo !== "bono" && m.metodo !== "cortesia";

/** CSV que Excel abre directamente en español: separador punto y coma, decimales con coma y marca BOM. */
export function aCsv(cabecera: string[], lineas: (string | number | null)[][]): string {
  const celda = (v: string | number | null) => {
    const t = v == null ? "" : String(v);
    // Un texto que empieza por = + - @ podría ejecutarse como fórmula al abrir el archivo.
    const seguro = /^[=+\-@\t\r]/.test(t) && Number.isNaN(Number(t.replace(",", "."))) ? `'${t}` : t;
    return `"${seguro.replace(/"/g, '""')}"`;
  };
  return "﻿" + [cabecera, ...lineas].map((l) => l.map(celda).join(";")).join("\r\n");
}
export const numero = (v: string | number | null) => (v == null || v === "" ? "" : Number(v).toFixed(2).replace(".", ","));
