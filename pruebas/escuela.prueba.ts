// Pruebas de las reglas de la escuela contra una base de datos real.
// Uso: npm run prueba   (borra los datos de estudiantes y cargos de esa base)
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import * as e from "@/lib/escuela";

const { estudiantes, cargos, reportesPago, niveles, usuarios } = schema;
const falla = (p: Promise<unknown>, patron: RegExp) => assert.rejects(p, (x: Error) => x instanceof e.ErrorEscuela && patron.test(x.message));
const paso = (n: string) => console.log("  ✓", n);
let ref = 500000;
const pm = (usuarioId: number, cargoIds: number[]) => ({ usuarioId, cargoIds, metodo: "pago_movil", referencia: String(ref++), capturaUrl: null, tasa: 900, esEquipo: false });

async function main() {
  await db().execute(sql`TRUNCATE cargos, reportes_pago, estudiantes RESTART IDENTITY CASCADE`);
  await db().execute(sql`DELETE FROM usuarios WHERE correo LIKE '%@escuela.prueba'`);
  await db().execute(sql`DELETE FROM niveles WHERE slug = 'nivel-prueba'`);
  await db().execute(sql`ALTER SEQUENCE recibos_seq RESTART WITH 1`);
  const [nivel] = await db().insert(niveles).values({ slug: "nivel-prueba", nombre: "Prueba", montoInscripcion: "20", montoMensualidad: "30" }).returning();
  const crearUsuario = async (nombre: string, rol: string) => (await db().insert(usuarios).values({ nombre, correo: `${nombre}@escuela.prueba`, claveHash: "x", rol }).returning())[0].id;
  const [ana, luis, admin] = [await crearUsuario("ana", "representante"), await crearUsuario("luis", "representante"), await crearUsuario("adm", "admin")];
  const alumno = async (nombres: string, rep: number | null, extra: Partial<typeof estudiantes.$inferInsert> = {}) =>
    (await db().insert(estudiantes).values({ nombres, apellidos: "Prueba", nivelId: nivel.id, representanteId: rep, ...extra }).returning())[0];
  const cargosDe = (id: number) => db().select().from(cargos).where(eq(cargos.estudianteId, id)).orderBy(cargos.id);
  const periodo = e.periodoActual();

  // Inscripción
  const a1 = await alumno("Hija de Ana", ana);
  await e.aprobarInscripcion(a1.id, 5);
  let cs = await cargosDe(a1.id);
  assert.deepEqual(cs.map((c) => [c.tipo, Number(c.montoUsd)]), [["inscripcion", 20], ["mensualidad", 30]]);
  assert.equal(cs[1].venceEl, `${periodo}-05`);
  await falla(e.aprobarInscripcion(a1.id, 5), /ya fue atendida/);
  paso("aprobar una solicitud genera la inscripción y la primera mensualidad, una sola vez");

  // Mensualidades: idempotentes, con beca, solo activos
  const a2 = await alumno("Hijo becado", ana, { estado: "activo", becaPct: 50 });
  const a3 = await alumno("Retirado", luis, { estado: "retirado" });
  const a4 = await alumno("Beca total", luis, { estado: "activo", becaPct: 100 });
  const a5 = await alumno("Hijo de Luis", luis, { estado: "activo" });
  assert.equal(await e.generarMensualidades(periodo, 5), 2);
  assert.equal(await e.generarMensualidades(periodo, 5), 0);
  await Promise.all(Array.from({ length: 5 }, () => e.generarMensualidades(periodo, 5)));
  assert.equal(Number((await cargosDe(a2.id))[0].montoUsd), 15);
  assert.equal((await cargosDe(a3.id)).length + (await cargosDe(a4.id)).length, 0);
  assert.equal((await db().select().from(cargos).where(eq(cargos.tipo, "mensualidad"))).length, 3);
  paso("mensualidades automáticas: no se duplican, aplican la beca y solo cubren a los activos");

  // Pago del representante
  cs = await cargosDe(a1.id);
  const deLuis = (await cargosDe(a5.id))[0];
  await falla(e.reportarPagoEscuela(pm(ana, [cs[0].id, deLuis.id])), /Solo puedes pagar los cargos de tus estudiantes/);
  await falla(e.reportarPagoEscuela({ ...pm(ana, [cs[0].id]), metodo: "efectivo" }), /Elige un método/);
  await falla(e.reportarPagoEscuela({ ...pm(ana, [cs[0].id]), referencia: "12" }), /referencia/);
  const r1 = await e.reportarPagoEscuela(pm(ana, [cs[0].id, cs[1].id]));
  let [rep] = await db().select().from(reportesPago).where(eq(reportesPago.id, r1));
  assert.deepEqual([Number(rep.montoUsd), Number(rep.montoBs), rep.estado, rep.numeroRecibo], [50, 45000, "reportado", null]);
  assert.deepEqual((await cargosDe(a1.id)).map((c) => c.estado), ["por_confirmar", "por_confirmar"]);
  await falla(e.reportarPagoEscuela(pm(ana, [cs[0].id])), /ya fue pagado o reportado/);
  await falla(e.reportarPagoEscuela({ ...pm(luis, [deLuis.id]), referencia: rep.referencia }), /ya fue reportada/);
  paso("un representante solo paga lo suyo; un cargo no se reporta dos veces ni se repite una referencia");

  // Confirmar → recibo correlativo; rechazar → vuelve a pendiente
  await e.confirmarReporte(r1, admin);
  [rep] = await db().select().from(reportesPago).where(eq(reportesPago.id, r1));
  assert.deepEqual([rep.estado, rep.numeroRecibo], ["confirmado", 1]);
  assert.deepEqual((await cargosDe(a1.id)).map((c) => c.estado), ["pagado", "pagado"]);
  await falla(e.confirmarReporte(r1, admin), /ya fue atendido/);
  const r2 = await e.reportarPagoEscuela(pm(luis, [deLuis.id]));
  await e.rechazarReporte(r2, admin, "No llegó");
  assert.deepEqual([(await cargosDe(a5.id))[0].estado, (await cargosDe(a5.id))[0].reporteId], ["pendiente", null]);
  const r3 = await e.reportarPagoEscuela({ usuarioId: admin, cargoIds: [deLuis.id], metodo: "efectivo", referencia: "", capturaUrl: null, tasa: 900, esEquipo: true });
  [rep] = await db().select().from(reportesPago).where(eq(reportesPago.id, r3));
  assert.deepEqual([rep.estado, rep.numeroRecibo, (await cargosDe(a5.id))[0].estado], ["confirmado", 2, "pagado"]);
  paso("confirmar emite recibo numerado de corrido; rechazar devuelve el cargo; el efectivo en la escuela queda pagado al instante");

  // Mora y anulación
  const [viejo] = await db().insert(cargos).values({ estudianteId: a2.id, tipo: "otro", concepto: "Vestuario", montoUsd: "12", venceEl: "2020-01-01" }).returning();
  assert.equal(e.estadoCargo(viejo), "en_mora");
  assert.equal(e.estadoCargo({ estado: "pendiente", venceEl: "2999-01-01" }), "pendiente");
  assert.ok((await e.cargosPorAvisar()).enMora.some((x) => x.c.id === viejo.id));
  await e.anularCargo(viejo.id);
  await falla(e.anularCargo(cs[0].id), /Solo se puede anular un cargo pendiente/);
  paso("un cargo vencido sin pagar está en mora; solo se anulan cargos pendientes");

  await db().execute(sql`TRUNCATE cargos, reportes_pago, estudiantes RESTART IDENTITY CASCADE`);
  await db().execute(sql`DELETE FROM usuarios WHERE correo LIKE '%@escuela.prueba'`);
  await db().execute(sql`DELETE FROM niveles WHERE slug = 'nivel-prueba'`);
  await db().execute(sql`ALTER SEQUENCE recibos_seq RESTART WITH 1`);
  console.log("Todas las pruebas de la escuela pasaron.");
  process.exit(0);
}
main().catch((x) => { console.error("FALLÓ:", x); process.exit(1); });
