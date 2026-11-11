import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

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
    return { id: Number(payload.id), nombre: String(payload.nombre), correo: String(payload.correo), rol: payload.rol as Sesion["rol"] };
  } catch {
    return null;
  }
}

/** Exige sesión de master o administrador. Se llama en cada página y acción del panel. */
export async function exigirAdmin(): Promise<Sesion> {
  const s = await leerSesion();
  if (!s) redirect("/ingresar");
  if (s.rol !== "master" && s.rol !== "admin") redirect("/ingresar?motivo=permiso");
  return s;
}
