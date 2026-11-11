"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import type { Estado } from "./acciones";
import { COBROS_INICIAL, getConfig, type Cobros } from "./datos";
import { exigirAdmin, exigirEquipo, exigirMaster } from "./sesion";
import * as t from "./taquilla";
import { actualizarTasa, getTasa } from "./tasa";
import { deInputLocal } from "./util";

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
  let destino = "/admin/pagos?ok=1";
  try { await t.confirmarOrden(entero(f, "id"), s.id); } catch (e) { destino = conError("/admin/pagos", e); }
  updateTag("cupos");
  redirect(destino);
}

export async function accionRechazar(f: FormData) {
  const s = await exigirEquipo();
  let destino = "/admin/pagos?ok=1";
  try { await t.rechazarOrden(entero(f, "id"), s.id, txt(f, "motivo")); } catch (e) { destino = conError("/admin/pagos", e); }
  updateTag("cupos");
  redirect(destino);
}

export async function accionReembolsar(f: FormData) {
  const s = await exigirAdmin();
  let destino = "/admin/pagos?ok=1";
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
      bono: txt(f, "bono"), vendedorId: s.id, puedeCortesia: s.rol !== "vendedor", tasa: tasa?.valor ?? null,
    });
    destino = `/admin/taquilla?funcion=${funcionId}&vendida=${codigo}`;
  } catch (e) {
    destino = conError(`/admin/taquilla?funcion=${funcionId}`, e);
  }
  updateTag("cupos");
  redirect(destino);
}

export async function accionValidar(f: FormData) {
  const s = await exigirEquipo();
  const c = txt(f, "c").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!f.get("marcar")) redirect(`/admin/validar?c=${c}`);
  const { resultado } = await t.validarEntrada(c, s.id, true);
  redirect(`/admin/validar?c=${c}&r=${resultado}`);
}

// ---------- Administración de funciones ----------

export async function accionCrearPlano(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "id");
  let destino = `/admin/funciones/${id}?ok=1`;
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
  redirect(`/admin/funciones/${id}?ok=1`);
}

export async function accionBloquear(f: FormData) {
  await exigirAdmin();
  const id = entero(f, "id");
  let destino = `/admin/funciones/${id}?ok=1#butacas`;
  try { for (const n of numeros(f)) await t.alternarBloqueo(id, n); } catch (e) { destino = conError(`/admin/funciones/${id}`, e); }
  updateTag("cupos");
  redirect(destino);
}

export async function accionGuardarActor(f: FormData) {
  await exigirAdmin();
  const funcionId = entero(f, "funcionId");
  const foto = txt(f, "fotoUrl");
  const nombre = txt(f, "nombre");
  if (nombre) {
    await db().insert(schema.elenco).values({
      funcionId, nombre, personaje: txt(f, "personaje"), orden: entero(f, "orden"),
      fotoUrl: foto.startsWith("/uploads/") || /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(foto) ? foto : null,
    });
    updateTag("funciones");
  }
  redirect(`/admin/funciones/${funcionId}?ok=1#elenco`);
}

export async function accionBorrarActor(f: FormData) {
  await exigirAdmin();
  await db().delete(schema.elenco).where(eq(schema.elenco.id, entero(f, "id")));
  updateTag("funciones");
  redirect(`/admin/funciones/${entero(f, "funcionId")}?ok=1#elenco`);
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
  redirect("/admin/bonos?ok=1");
}

// ---------- Cobros y tasa ----------

export async function accionGuardarCobros(f: FormData) {
  await exigirAdmin();
  const manual = Number(txt(f, "tasaManual").replace(",", "."));
  const valor: Cobros = {
    pagoMovil: { banco: txt(f, "pmBanco"), telefono: txt(f, "pmTelefono"), cedula: txt(f, "pmCedula"), titular: txt(f, "pmTitular") },
    transferencia: { banco: txt(f, "trBanco"), cuenta: txt(f, "trCuenta"), titular: txt(f, "trTitular"), cedula: txt(f, "trCedula") },
    minutosApartado: Math.min(60, Math.max(5, entero(f, "minutosApartado") || COBROS_INICIAL.minutosApartado)),
    tasaManual: manual > 0 ? manual : null,
  };
  await db().insert(schema.configuracion).values({ clave: "cobros", valor }).onConflictDoUpdate({ target: schema.configuracion.clave, set: { valor } });
  updateTag("config");
  redirect("/admin/cobros?ok=1");
}

export async function accionActualizarTasa() {
  await exigirAdmin();
  const nueva = await actualizarTasa();
  redirect(nueva ? "/admin/cobros?ok=1" : "/admin/cobros?error=" + encodeURIComponent("No se pudo consultar la tasa ahora. Se sigue usando la última guardada; también puedes fijarla a mano."));
}

// ---------- Usuarios (solo master) ----------

export async function accionCrearUsuario(f: FormData) {
  await exigirMaster();
  const correo = txt(f, "correo").toLowerCase();
  const clave = String(f.get("clave") ?? "");
  const rol = txt(f, "rol") === "admin" ? "admin" : "vendedor";
  const error = (m: string) => redirect("/admin/usuarios?error=" + encodeURIComponent(m));
  if (!txt(f, "nombre") || !/^\S+@\S+\.\S+$/.test(correo)) error("Escribe el nombre y un correo válido.");
  if (clave.length < 8) error("La clave debe tener al menos 8 caracteres.");
  const [ya] = await db().select({ id: schema.usuarios.id }).from(schema.usuarios).where(eq(schema.usuarios.correo, correo));
  if (ya) error("Ya existe un usuario con ese correo.");
  await db().insert(schema.usuarios).values({ nombre: txt(f, "nombre"), correo, claveHash: await bcrypt.hash(clave, 12), rol });
  redirect("/admin/usuarios?ok=1");
}

export async function accionEditarUsuario(f: FormData) {
  await exigirMaster();
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
  // El master no se puede desactivar ni modificar desde aquí.
  await db().update(schema.usuarios).set(cambios).where(and(eq(schema.usuarios.id, id), ne(schema.usuarios.rol, "master")));
  redirect("/admin/usuarios?ok=1");
}
