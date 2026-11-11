// Pruebas de las reglas de la taquilla contra una base de datos real.
// Uso: npm run prueba   (requiere DATABASE_URL apuntando a una base de pruebas; borra sus datos de taquilla)
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import * as t from "@/lib/taquilla";
import { generarButacas, SALA_184, validarSala } from "@/lib/planos";
import { parsearBcv } from "@/lib/tasa";

const { funciones, butacas, ordenes, bonos, entradas } = schema;
const comprador = { nombre: "Persona de prueba", telefono: "04120000000", correo: "", capturaUrl: null, bono: "" };
const CFG = { minutos: 15, tasa: 900 };
let ref = 10000;
const pagoMovil = () => ({ ...comprador, metodo: "pago_movil", referencia: String(ref++) });
const estadoDe = async (fId: number, n: number) => (await db().select().from(butacas).where(sql`funcion_id = ${fId} AND numero = ${n}`))[0].estado;
const orden = async (codigo: string) => (await db().select().from(ordenes).where(eq(ordenes.codigo, codigo)))[0];
const vencer = async (codigo: string) => {
  await db().execute(sql`UPDATE butacas SET apartada_hasta = now() - interval '1 minute' WHERE orden_id = (SELECT id FROM ordenes WHERE codigo = ${codigo})`);
  await db().execute(sql`UPDATE ordenes SET vence_el = now() - interval '1 minute' WHERE codigo = ${codigo}`);
};
const falla = (p: Promise<unknown>, patron: RegExp) => assert.rejects(p, (e: Error) => e instanceof t.ErrorTaquilla && patron.test(e.message));

async function main() {
  await db().execute(sql`TRUNCATE entradas, pagos, butacas, zonas, ordenes, bonos, elenco RESTART IDENTITY CASCADE; DELETE FROM funciones WHERE slug LIKE 'prueba-%'`);
  const [u] = await db().select().from(schema.usuarios).limit(1);
  const admin = u?.id ?? (await db().insert(schema.usuarios).values({ nombre: "Prueba", correo: "prueba@anelo.test", claveHash: "x", rol: "master" }).returning())[0].id;
  const [f] = await db().insert(funciones).values({ slug: "prueba-" + Date.now(), titulo: "Función de prueba", estado: "a_la_venta", fechaHora: new Date(Date.now() + 86400_000 * 20), preventaHasta: new Date(Date.now() + 86400_000) }).returning();
  const [sala] = await db().insert(schema.salas).values(SALA_184).returning();
  await t.crearPlano(f.id, sala.id);
  const gen = generarButacas(SALA_184.definicion);
  assert.deepEqual([gen[48].numero, gen[48].bloque, gen[48].zona], [49, "Lado central", "vip"]);
  assert.deepEqual([gen[136].numero, gen[136].bloque, gen[100].zona, gen[12].zona, gen[148].zona], [137, "Lado derecho", "general", "general", "general"]);
  assert.ok("error" in validarSala({ zonas: SALA_184.definicion.zonas, bloques: [{ nombre: "A", filas: [{ butacas: 5, zona: "palco" }] }] }));
  const paso = (nombre: string) => console.log("  ✓", nombre);

  // Plano y precios
  let plano = await t.estadoPlano(f);
  assert.equal(plano.butacas.length, 184); assert.equal(plano.libres, 184);
  assert.deepEqual(plano.zonas.map((z) => z.precio), [10, 8]);
  assert.deepEqual((await t.estadoPlano({ ...f, preventaHasta: new Date(Date.now() - 1000) })).zonas.map((z) => z.precio), [15, 10]);
  paso("plano de 184 butacas; precio de preventa hasta la fecha y regular después");

  // Dos personas por la misma butaca a la vez: solo una la obtiene
  const carrera = await Promise.allSettled(Array.from({ length: 8 }, () => t.apartar(f.id, [50, 51], CFG)));
  assert.equal(carrera.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await db().select().from(ordenes)).length, 1, "las órdenes perdedoras no quedan guardadas");
  const cod1 = (carrera.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<string>).value;
  paso("8 intentos simultáneos sobre las mismas butacas: gana exactamente uno");

  await falla(t.apartar(f.id, [51, 52], CFG), /51 ya no está disponible/);
  assert.equal(await estadoDe(f.id, 52), "libre", "un apartado fallido no deja butacas tomadas");
  await falla(t.apartar(f.id, [1, 2, 3, 4, 5, 6, 7, 8, 9], CFG), /hasta 8 butacas/);
  paso("apartado parcial imposible y límite por compra");

  // Pago normal → confirmar → entradas
  assert.equal(await t.reportarPago(cod1, pagoMovil()), "por_confirmar");
  assert.equal(await estadoDe(f.id, 50), "por_confirmar");
  await falla(t.venderEnTaquilla({ funcionId: f.id, numeros: [50], nombre: "", telefono: "", metodo: "efectivo", referencia: "", bono: "", vendedorId: admin, puedeCortesia: true, tasa: 900 }), /ya no está disponible/);
  await t.confirmarOrden((await orden(cod1)).id, admin);
  assert.equal(await estadoDe(f.id, 50), "vendida");
  assert.equal((await db().select().from(entradas)).length, 2);
  assert.equal(Number((await orden(cod1)).totalUsd), 20);
  paso("pago reportado bloquea la butaca también para taquilla; al confirmar se emiten las entradas");

  // Referencia repetida
  const cod2 = await t.apartar(f.id, [60], CFG);
  await falla(t.reportarPago(cod2, { ...comprador, metodo: "pago_movil", referencia: "10000" }), /ya fue reportada/);
  paso("una referencia de pago no se puede usar dos veces");

  // Vencimiento libera
  await vencer(cod2);
  plano = await t.estadoPlano(f);
  assert.equal(plano.butacas.find((b) => b.n === 60)!.e, "libre");
  assert.equal((await orden(cod2)).estado, "vencida");
  paso("a los 15 minutos sin pago las butacas quedan libres");

  // Pagó tarde y la butaca sigue libre → la recupera
  assert.equal(await t.reportarPago(cod2, pagoMovil()), "por_confirmar");
  assert.equal(await estadoDe(f.id, 60), "por_confirmar");
  await t.rechazarOrden((await orden(cod2)).id, admin, "No llegó el pago");
  assert.equal(await estadoDe(f.id, 60), "libre");
  paso("reporte tardío con butaca libre la recupera; rechazar el pago la libera");

  // Pagó tarde y la butaca ya se vendió → conflicto → cambia butacas
  const cod3 = await t.apartar(f.id, [70, 71], CFG);
  await vencer(cod3); await t.limpiarVencidas();
  await t.venderEnTaquilla({ funcionId: f.id, numeros: [70], nombre: "Cliente en sala", telefono: "", metodo: "efectivo", referencia: "", bono: "", vendedorId: admin, puedeCortesia: false, tasa: 900 });
  assert.equal(await t.reportarPago(cod3, pagoMovil()), "en_conflicto");
  assert.equal(await estadoDe(f.id, 71), "libre", "en conflicto no se queda con la butaca que sí estaba libre");
  await falla(t.cambiarButacas(cod3, [72, 73, 74]), /Elige esa cantidad o menos/);
  await t.cambiarButacas(cod3, [72, 73]);
  assert.equal((await orden(cod3)).estado, "por_confirmar");
  await t.confirmarOrden((await orden(cod3)).id, admin);
  assert.deepEqual((await orden(cod3)).detalle.map((d) => d.numero), [72, 73]);
  paso("butaca vendida a otra persona → conflicto; el comprador elige otras de igual valor");

  // Conflicto → reembolso
  const cod4 = await t.apartar(f.id, [80], CFG);
  await vencer(cod4); await t.limpiarVencidas();
  await t.venderEnTaquilla({ funcionId: f.id, numeros: [80], nombre: "", telefono: "", metodo: "punto", referencia: "", bono: "", vendedorId: admin, puedeCortesia: false, tasa: 900 });
  assert.equal(await t.reportarPago(cod4, pagoMovil()), "en_conflicto");
  await t.pedirReembolso(cod4);
  assert.equal((await orden(cod4)).estado, "reembolso_pendiente");
  await t.reembolsarOrden((await orden(cod4)).id, admin, "998877");
  assert.equal((await orden(cod4)).estado, "reembolsada");
  assert.equal(await estadoDe(f.id, 80), "vendida", "el reembolso no toca la butaca del otro comprador");
  paso("conflicto → reembolso sin afectar al comprador que sí tiene la butaca");

  // Bonos
  const [bono] = await db().insert(bonos).values({ codigo: "REGALO12345", montoUsd: "25", saldoUsd: "25" }).returning();
  const cod5 = await t.apartar(f.id, [90, 91], CFG); // 2 VIP preventa = 20
  assert.equal(await t.reportarPago(cod5, { ...comprador, metodo: "", referencia: "", bono: "regalo-12345" }), "pagada");
  assert.equal(Number((await db().select().from(bonos).where(eq(bonos.id, bono.id)))[0].saldoUsd), 5);
  assert.equal(await estadoDe(f.id, 90), "vendida");
  const cod6 = await t.apartar(f.id, [92], CFG); // 10; bono cubre 5
  await falla(t.reportarPago(cod6, { ...comprador, metodo: "", referencia: "", bono: "REGALO12345" }), /cubre \$5\.00.*\$5\.00 restantes/);
  assert.equal(Number((await db().select().from(bonos).where(eq(bonos.id, bono.id)))[0].saldoUsd), 5, "un intento fallido no gasta el bono");
  assert.equal(await t.reportarPago(cod6, { ...pagoMovil(), bono: "REGALO12345" }), "por_confirmar");
  assert.equal(Number((await db().select().from(bonos).where(eq(bonos.id, bono.id)))[0].saldoUsd), 0);
  await t.rechazarOrden((await orden(cod6)).id, admin, "Referencia incorrecta");
  assert.equal(Number((await db().select().from(bonos).where(eq(bonos.id, bono.id)))[0].saldoUsd), 5, "al rechazar, el bono recupera su saldo");
  const cod7 = await t.apartar(f.id, [92], CFG);
  await falla(t.reportarPago(cod7, { ...pagoMovil(), bono: "NOEXISTE" }), /no existe/);
  paso("bono cubre todo → entradas al instante; cubre parte → resto por pago móvil; rechazo devuelve el saldo");

  // Cortesía, bloqueo, validación en puerta
  await falla(t.venderEnTaquilla({ funcionId: f.id, numeros: [100], nombre: "", telefono: "", metodo: "cortesia", referencia: "", bono: "", vendedorId: admin, puedeCortesia: false, tasa: 900 }), /Solo un administrador/);
  const cod8 = await t.venderEnTaquilla({ funcionId: f.id, numeros: [100], nombre: "Invitado", telefono: "", metodo: "cortesia", referencia: "", bono: "", vendedorId: admin, puedeCortesia: true, tasa: 900 });
  assert.equal(Number((await orden(cod8)).totalUsd), 0);
  await t.alternarBloqueo(f.id, 184); assert.equal(await estadoDe(f.id, 184), "bloqueada");
  await falla(t.apartar(f.id, [184], CFG), /ya no está disponible/);
  await falla(t.alternarBloqueo(f.id, 100), /apartada o vendida/);
  const [e] = await db().select().from(entradas).where(eq(entradas.ordenId, (await orden(cod8)).id));
  assert.equal((await t.validarEntrada(e.codigo, admin, false)).resultado, "valida");
  assert.equal((await t.validarEntrada(e.codigo.toLowerCase(), admin, true)).resultado, "valida");
  assert.equal((await t.validarEntrada(e.codigo, admin, true)).resultado, "usada");
  assert.equal((await t.validarEntrada("XXXX", admin, true)).resultado, "inexistente");
  paso("cortesías solo para administradores; bloqueo de butacas; una entrada solo entra una vez");

  // BCV
  assert.equal(parsearBcv('<div id="dolar" class="col-sm-12"><div class="field-content"><div class="row recuadrotsmc"><div class="col-sm-6"><span> USD</span></div><div class="col-sm-6 centrado"><strong> 901,61750000 </strong></div></div></div></div>'), 901.6175);
  assert.equal(parsearBcv("<html>sin dato</html>"), null);
  paso("lectura del formato de la página del BCV");

  await db().execute(sql`TRUNCATE entradas, pagos, butacas, zonas, ordenes, bonos RESTART IDENTITY CASCADE; DELETE FROM funciones WHERE slug LIKE 'prueba-%'`);
  await db().delete(schema.salas).where(eq(schema.salas.id, sala.id));
  console.log("Todas las pruebas pasaron.");
  process.exit(0);
}
main().catch((e) => { console.error("FALLÓ:", e); process.exit(1); });
