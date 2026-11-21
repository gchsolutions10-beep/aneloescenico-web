"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import type { Estado } from "./acciones";
import { COBROS_INICIAL, getConfig, type Cobros } from "./datos";
import { limpiarArchivos } from "./archivos";
import { DISENO_INICIAL, normalizar, problemaQr } from "./diseno-entrada";
import { consultar, mover, type Consulta, type Movida } from "./puerta";
import { exigirAdmin, exigirEquipo, exigirMaster } from "./sesion";
import * as t from "./taquilla";
import { actualizarTasa, getTasa } from "./tasa";
import { deInputLocal, usuarioValido } from "./util";

const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const entero = (f: FormData, k: string) => Number.parseInt(txt(f, k), 10) || 0;
const numeros = (f: FormData) => txt(f, "numeros").split(",").map(Number).filter(Boolean);
const dinero = (f: FormData, k: string) => {
  const v = txt(f, k).replace(",", ".");
  return v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v).toFixed(2) : null;
};
const captura = (f: FormData) => {
  const v = txt(f, "capturaUrl");
  return v.startsWith("/uploads/") || /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(v) ? v : null;
};
const mensaje = (e: unknown) => {
  if (e instanceof t.ErrorTaquilla) return e.message;
  throw e; // errores inesperados (incluida la redirección de Next) siguen su curso
};
const conError = (ruta: string, e: unknown) => `${ruta}${ruta.includes("?") ? "&" : "?"}error=${encodeURIComponent(mensaje(e))}`;

// ---------- Comprador ----------

export async function accionApartar(_: Estado, f: FormData): Promise<Estado> {
  let codigo: string;
  try {
    const [{ cobros }, tasa] = await Promise.all([getConfig(), getTasa()]);
    codigo = await t.apartar(entero(f, "funcionId"), numeros(f), { minutos: cobros.minutosApartado, tasa: tasa?.valor ?? null });
  } catch (e) {
    return { error: mensaje(e) };
  }
  updateTag("cupos");
  redirect(`/orden/${codigo}`);
}

export async function accionReportarPago(_: Estado, f: FormData): Promise<Estado> {
  const codigo = txt(f, "codigo");
  const valores = { nombre: txt(f, "nombre"), telefono: txt(f, "telefono"), correo: txt(f, "correo"), metodo: txt(f, "metodo"), referencia: txt(f, "referencia"), bono: txt(f, "bono"), capturaUrl: captura(f) ?? "" };
  try {
    await t.reportarPago(codigo, { ...valores, capturaUrl: captura(f) });
  } catch (e) {
    return { error: mensaje(e), valores };
  }
  updateTag("cupos");
  redirect(`/orden/${codigo}`);
}

export async function accionCancelarApartado(f: FormData) {
  await t.cancelarApartado(txt(f, "codigo"));
  updateTag("cupos");
  redirect(`/orden/${txt(f, "codigo")}`);
}

export async function accionCambiarButacas(_: Estado, f: FormData): Promise<Estado> {
  const codigo = txt(f, "codigo");
  try {
    await t.cambiarButacas(codigo, numeros(f));
  } catch (e) {
    return { error: mensaje(e) };
  }
  updateTag("cupos");
  redirect(`/orden/${codigo}`);
}

export async function accionPedirReembolso(f: FormData) {
  await t.pedirReembolso(txt(f, "codigo"));
  redirect(`/orden/${txt(f, "codigo")}`);
}

// ---------- Equipo: pagos, taquilla y puerta ----------

export async function accionConfirmar(f: FormData) {
  const s = await exigirEquipo();
  let destino = `/admin/pagos?ok=${Date.now()}`;
  try { await t.confirmarOrden(entero(f, "id"), s.id); } catch (e) { destino = conError("/admin/pagos", e); }
  updateTag("cupos");
  redirect(destino);
}

export async function accionRechazar(f: FormData) {
  const s = await exigirEquipo();
  let destino = `/admin/pagos?ok=${Date.now()}`;
  try { await t.rechazarOrden(entero(f, "id"), s.id, txt(f, "motivo")); } catch (e) { destino = conError("/admin/pagos", e); }
  updateTag("cupos");
  redirect(destino);
}

export async function accionReembolsar(f: FormData) {
  const s = await exigirAdmin();
  let destino = `/admin/pagos?ok=${Date.now()}`;
  try { await t.reembolsarOrden(entero(f, "id"), s.id, txt(f, "referencia")); } catch (e) { destino = conError("/admin/pagos", e); }
  updateTag("cupos");
  redirect(destino);
}

export async function accionVender(f: FormData) {
  const s = await exigirEquipo();
  const funcionId = entero(f, "funcionId");
  let destino: string;
  try {
    const tasa = await getTasa();
    const codigo = await t.venderEnTaquilla({
      funcionId, numeros: numeros(f), nombre: txt(f, "nombre"), telefono: txt(f, "telefono"), metodo: txt(f, "metodo"), referencia: txt(f, "referencia"),
      bono: txt(f, "bono"), vendedorId: s.id, puedeCortesia: s.rol !== "vendedor", puedeReservadas: s.rol !== "vendedor", tasa: tasa?.valor ?? null,
    });
    destino = `/admin/taquilla?funcion=${funcionId}&vendida=${codigo}`;
  } catch (e) {
    destino = conError(`/admin/taquilla?funcion=${funcionId}`, e);
  }
  updateTag("cupos");
  redirect(destino);
}

/** Puerta: lee una entrada escaneada o escrita. */
export async function consultarEntrada(codigo: string): Promise<Consulta> {
  await exigirEquipo();
  return consultar(String(codigo ?? ""));
}

/** Puerta: dar entrada, registrar salida temporal o (solo administradores) deshacer un ingreso. */
export async function moverEntrada(codigo: string, movida: Movida, todas: boolean): Promise<Consulta> {
  const s = await exigirEquipo();
  if (!["entrar", "salir", "deshacer"].includes(movida)) throw new Error("Movimiento desconocido");
  if (movida === "deshacer" && s.rol === "vendedor") throw new Error("Solo un administrador puede deshacer un ingreso.");
  return mover(String(codigo ?? ""), movida, s.id, Boolean(todas));
}

// ---------- Administración de funciones ----------

export async function accionCrearPlano(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "id");
  let destino = `/admin/funciones/${id}?ok=${Date.now()}`;
  try { await t.crearPlano(id, entero(f, "sala")); } catch (e) { destino = conError(`/admin/funciones/${id}`, e); }
  updateTag("funciones"); updateTag("cupos");
  redirect(destino);
}

export async function accionGuardarVenta(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "id");
  await db().update(schema.funciones).set({ preventaHasta: deInputLocal(txt(f, "preventaHasta")), maxPorCompra: Math.min(20, Math.max(1, entero(f, "maxPorCompra") || 8)) }).where(eq(schema.funciones.id, id));
  const zonas = await db().select().from(schema.zonas).where(eq(schema.zonas.funcionId, id));
  for (const z of zonas) {
    await db().update(schema.zonas).set({ precioPreventa: dinero(f, `pre_${z.id}`), precioRegular: dinero(f, `reg_${z.id}`) ?? z.precioRegular }).where(eq(schema.zonas.id, z.id));
  }
  updateTag("funciones");
  redirect(`/admin/funciones/${id}?ok=${Date.now()}`);
}

/** Diseño de la entrada de una función. Rechaza colores de QR que los teléfonos no leerían. */
export async function accionGuardarDiseno(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "funcionId");
  const imagen = txt(f, "imagenUrl");
  const d = normalizar({
    estilo: txt(f, "estilo"), posicion: txt(f, "posicion"), fondo: txt(f, "fondo"),
    imagenUrl: imagen.startsWith("/uploads/") || /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(imagen) ? imagen : "",
    colorPrincipal: txt(f, "colorPrincipal"), colorAcento: txt(f, "colorAcento"), colorTexto: txt(f, "colorTexto"),
    colorQr: txt(f, "colorQr"), colorQrFondo: txt(f, "colorQrFondo"), logoEnQr: txt(f, "logoEnQr") === "1",
    adornos: txt(f, "adornos").split(","), colorAdorno: txt(f, "colorAdorno"),
  });
  if (d.fondo === "imagen" && !d.imagenUrl) d.fondo = "color";
  const base = `/admin/funciones/${id}?tab=entrada`;
  if (problemaQr(d)) redirect(`${base}&error=qr`);
  const igual = JSON.stringify(d) === JSON.stringify(DISENO_INICIAL);
  const [antes] = await db().select({ d: schema.funciones.disenoEntrada }).from(schema.funciones).where(eq(schema.funciones.id, id));
  await db().update(schema.funciones).set({ disenoEntrada: igual ? null : d }).where(eq(schema.funciones.id, id));
  // La imagen anterior queda suelta si se cambió: se borra si nadie más la usa.
  const vieja = antes ? normalizar(antes.d).imagenUrl : "";
  if (vieja && vieja !== d.imagenUrl) await limpiarArchivos([vieja]);
  updateTag("funciones");
  redirect(`${base}&ok=${Date.now()}`);
}

/** Reserva butacas para un grupo (invitados, prensa) o las libera. */
export async function accionReservar(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "id");
  const base = `/admin/funciones/${id}?tab=butacas`;
  const liberar = txt(f, "accion") === "liberar";
  const grupo = liberar ? "" : txt(f, "grupo");
  let destino: string;
  try {
    if (!liberar && !grupo) throw new t.ErrorTaquilla("Escribe para quién son: Prensa, Invitados especiales…");
    const r = await t.reservarButacas(id, numeros(f), grupo);
    const aviso = r.omitidas.length ? `&omitidas=${r.omitidas.join(",")}` : "";
    destino = `${base}&ok=${Date.now()}&hechas=${r.cambiadas}${aviso}`;
  } catch (e) {
    destino = conError(base, e);
  }
  updateTag("cupos");
  redirect(destino);
}

/** Saldo de un bono mientras el cliente paga su compra en línea. Solo para una compra que espera pago. */
export async function saldoBonoCompra(ordenCodigo: string, bono: string): Promise<{ saldo: number } | { error: string }> {
  const [o] = await db().select({ estado: schema.ordenes.estado }).from(schema.ordenes).where(eq(schema.ordenes.codigo, String(ordenCodigo ?? "")));
  if (!o || (o.estado !== "apartada" && o.estado !== "vencida")) return { error: "Esta compra ya no espera un pago." };
  try { return { saldo: (await t.saldoBono(String(bono ?? ""))).saldo }; } catch (e) { return { error: mensaje(e) }; }
}

/** Saldo de un bono en la taquilla. */
export async function saldoBonoTaquilla(bono: string): Promise<{ saldo: number } | { error: string }> {
  await exigirEquipo();
  try { return { saldo: (await t.saldoBono(String(bono ?? ""))).saldo }; } catch (e) { return { error: mensaje(e) }; }
}

export async function accionGuardarActor(f: FormData) {
  await exigirAdmin();
  const funcionId = entero(f, "funcionId");
  const estudianteId = entero(f, "estudianteId") || null;
  const esImagen = (v: string) => v.startsWith("/uploads/") || /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(v);
  let nombre = txt(f, "nombre");
  let foto = esImagen(txt(f, "fotoUrl")) ? txt(f, "fotoUrl") : null;
  if (estudianteId) {
    // Si es estudiante, se toman por defecto el nombre y la foto de su ficha de Protagonista.
    const [e] = await db().select({ nombres: schema.estudiantes.nombres, ficha: schema.fichasArtista }).from(schema.estudiantes)
      .leftJoin(schema.fichasArtista, eq(schema.fichasArtista.estudianteId, schema.estudiantes.id)).where(eq(schema.estudiantes.id, estudianteId));
    nombre ||= e?.ficha?.nombreArtistico || e?.nombres || "";
    foto ??= e?.ficha?.fotoUrl ?? null;
  }
  if (nombre) {
    await db().insert(schema.elenco).values({ funcionId, estudianteId, nombre, personaje: txt(f, "personaje"), descripcion: txt(f, "descripcion"), orden: entero(f, "orden"), fotoUrl: foto });
    updateTag("funciones"); updateTag("protagonistas");
  }
  redirect(`/admin/funciones/${funcionId}?tab=elenco&ok=${Date.now()}`);
}

export async function accionBorrarActor(f: FormData) {
  await exigirAdmin();
  const [x] = await db().delete(schema.elenco).where(eq(schema.elenco.id, entero(f, "id"))).returning();
  await limpiarArchivos([x?.fotoUrl]);
  updateTag("funciones"); updateTag("protagonistas");
  redirect(`/admin/funciones/${entero(f, "funcionId")}?tab=elenco&ok=${Date.now()}`);
}

// ---------- Bonos de regalo ----------

export async function accionCrearBono(f: FormData) {
  const s = await exigirAdmin();
  const monto = dinero(f, "monto");
  if (!monto || Number(monto) <= 0) redirect("/admin/bonos?error=" + encodeURIComponent("Escribe el monto del bono en dólares."));
  const vence = txt(f, "venceEl");
  const codigo = t.codigoAleatorio(10);
  await db().insert(schema.bonos).values({
    codigo, montoUsd: monto, saldoUsd: monto, beneficiario: txt(f, "beneficiario"), nota: txt(f, "nota"),
    venceEl: /^\d{4}-\d{2}-\d{2}$/.test(vence) ? new Date(`${vence}T23:59:59-04:00`) : null, creadoPor: s.id,
  });
  redirect(`/admin/bonos?nuevo=${codigo}`);
}

export async function accionAlternarBono(f: FormData) {
  await exigirAdmin();
  const [b] = await db().select().from(schema.bonos).where(eq(schema.bonos.id, entero(f, "id")));
  if (b) await db().update(schema.bonos).set({ activo: !b.activo }).where(eq(schema.bonos.id, b.id));
  redirect(`/admin/bonos?ok=${Date.now()}`);
}

// ---------- Cobros y tasa ----------

export async function accionGuardarCobros(f: FormData) {
  await exigirAdmin();
  const manual = Number(txt(f, "tasaManual").replace(",", "."));
  const valor: Cobros = {
    pagoMovil: { banco: txt(f, "pmBanco"), telefono: txt(f, "pmTelefono"), cedula: txt(f, "pmCedula"), titular: txt(f, "pmTitular") },
    transferencia: { banco: txt(f, "trBanco"), cuenta: txt(f, "trCuenta"), titular: txt(f, "trTitular"), cedula: txt(f, "trCedula") },
    minutosApartado: Math.min(60, Math.max(5, entero(f, "minutosApartado") || COBROS_INICIAL.minutosApartado)),
    diaVencimiento: Math.min(28, Math.max(1, entero(f, "diaVencimiento") || COBROS_INICIAL.diaVencimiento)),
    tasaManual: manual > 0 ? manual : null,
  };
  await db().insert(schema.configuracion).values({ clave: "cobros", valor }).onConflictDoUpdate({ target: schema.configuracion.clave, set: { valor } });
  updateTag("config");
  redirect(`/admin/cobros?ok=${Date.now()}`);
}

export async function accionActualizarTasa() {
  await exigirAdmin();
  const nueva = await actualizarTasa();
  redirect(nueva ? `/admin/cobros?ok=${Date.now()}` : "/admin/cobros?error=" + encodeURIComponent("No se pudo consultar la tasa ahora. Se sigue usando la última guardada; también puedes fijarla a mano."));
}

// ---------- Usuarios (solo master) ----------

export async function accionCrearUsuario(f: FormData) {
  await exigirMaster();
  const correo = txt(f, "correo").toLowerCase();
  const clave = String(f.get("clave") ?? "");
  const rol = txt(f, "rol") === "admin" ? "admin" : "vendedor";
  const error = (m: string) => redirect("/admin/usuarios?error=" + encodeURIComponent(m));
  if (!txt(f, "nombre") || !usuarioValido(correo)) error("Escribe el nombre y un usuario válido: letras, números, punto o guion, sin espacios (por ejemplo hgonzalez), o un correo.");
  if (clave.length < 8) error("La clave debe tener al menos 8 caracteres.");
  const [ya] = await db().select({ id: schema.usuarios.id }).from(schema.usuarios).where(eq(schema.usuarios.correo, correo));
  if (ya) error("Ese usuario ya existe. Elige otro.");
  await db().insert(schema.usuarios).values({ nombre: txt(f, "nombre"), correo, claveHash: await bcrypt.hash(clave, 12), rol });
  redirect(`/admin/usuarios?ok=${Date.now()}`);
}

export async function accionEditarUsuario(f: FormData) {
  const s = await exigirMaster();
  const id = entero(f, "id");
  const clave = String(f.get("clave") ?? "");
  const cambios: Partial<typeof schema.usuarios.$inferInsert> = {};
  if (f.get("accion") === "alternar") {
    const [u] = await db().select().from(schema.usuarios).where(eq(schema.usuarios.id, id));
    if (u) cambios.activo = !u.activo;
  } else {
    if (clave.length < 8) redirect("/admin/usuarios?error=" + encodeURIComponent("La clave nueva debe tener al menos 8 caracteres."));
    Object.assign(cambios, { claveHash: await bcrypt.hash(clave, 12), intentosFallidos: 0, bloqueadoHasta: null });
  }
  // Las cuentas principales no se desactivan ni se modifican desde aquí, con una excepción:
  // soporte técnico puede poner una clave nueva a la cuenta principal de la escuela si la olvidó.
  const [yo] = await db().select({ soporte: schema.usuarios.soporte }).from(schema.usuarios).where(eq(schema.usuarios.id, s.id));
  const [destino] = await db().select().from(schema.usuarios).where(eq(schema.usuarios.id, id));
  const rescate = Boolean(yo?.soporte) && destino?.rol === "master" && !destino.soporte && cambios.claveHash !== undefined;
  if (destino && (destino.rol !== "master" || rescate)) await db().update(schema.usuarios).set(cambios).where(eq(schema.usuarios.id, id));
  redirect(`/admin/usuarios?ok=${Date.now()}`);
}
