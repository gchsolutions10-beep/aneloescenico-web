import "server-only";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db, schema } from "@/db";

export const COOKIE_SESION = "anelo_sesion";
const DURACION_DIAS = 7;

export type Sesion = { id: number; nombre: string; correo: string; rol: "master" | "admin" | "vendedor" | "representante" };

function clave() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("Falta AUTH_SECRET (mínimo 32 caracteres).");
  return new TextEncoder().encode(s);
}

export async function crearSesion(s: Sesion) {
  const token = await new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${DURACION_DIAS}d`).sign(clave());
  (await cookies()).set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_DIAS * 24 * 3600,
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE_SESION);
}

export async function leerSesion(): Promise<Sesion | null> {
  await connection(); // la sesión siempre se evalúa en cada visita, nunca al precompilar
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave());
    // Se confirma contra la base: un usuario desactivado pierde el acceso de inmediato.
    const [u] = await db().select().from(schema.usuarios).where(eq(schema.usuarios.id, Number(payload.id)));
    if (!u || !u.activo) return null;
    return { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol as Sesion["rol"] };
  } catch {
    return null;
  }
}

/** Exige sesión de master o administrador. Se llama en cada página y acción del panel. */
export async function exigirAdmin(): Promise<Sesion> {
  const s = await leerSesion();
  if (!s) redirect("/ingresar");
  // Un vendedor que abre una pantalla de administración vuelve a su taquilla.
  if (s.rol === "vendedor") redirect("/admin/taquilla");
  if (s.rol !== "master" && s.rol !== "admin") redirect("/portal");
  return s;
}

/** Exige sesión de cualquier miembro del equipo: master, administrador o vendedor. */
export async function exigirEquipo(): Promise<Sesion> {
  const s = await leerSesion();
  if (!s) redirect("/ingresar");
  if (s.rol === "representante") redirect("/portal");
  return s;
}

export async function exigirMaster(): Promise<Sesion> {
  const s = await leerSesion();
  if (!s) redirect("/ingresar");
  if (s.rol !== "master") redirect("/admin");
  return s;
}

/** Exige sesión de representante (portal). El equipo se envía a su panel. */
export async function exigirRepresentante(): Promise<Sesion> {
  const s = await leerSesion();
  if (!s) redirect("/ingresar");
  if (s.rol !== "representante") redirect("/admin");
  return s;
}
