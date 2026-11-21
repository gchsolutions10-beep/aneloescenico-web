// Estado en vivo del plano de una función. El plano lo consulta cada pocos segundos
// para mostrar las butacas que otras personas apartan, pagan o liberan.
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { leerSesion } from "@/lib/sesion";
import { estadoPlano } from "@/lib/taquilla";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [f] = Number.isInteger(id) ? await db().select().from(schema.funciones).where(eq(schema.funciones.id, id)) : [];
  if (!f || f.estado === "borrador") return NextResponse.json({ error: "No existe." }, { status: 404 });
  // El equipo ve las reservas con su grupo; el público las ve como vendidas.
  const s = await leerSesion();
  const equipo = Boolean(s && s.rol !== "representante");
  return NextResponse.json(await estadoPlano(f, equipo ? "equipo" : "publico"), { headers: { "cache-control": "no-store" } });
}
