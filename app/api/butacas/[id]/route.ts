// Estado en vivo del plano de una función. El plano lo consulta cada pocos segundos
// para mostrar las butacas que otras personas apartan, pagan o liberan.
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { estadoPlano } from "@/lib/taquilla";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [f] = Number.isInteger(id) ? await db().select().from(schema.funciones).where(eq(schema.funciones.id, id)) : [];
  if (!f || f.estado === "borrador") return NextResponse.json({ error: "No existe." }, { status: 404 });
  return NextResponse.json(await estadoPlano(f), { headers: { "cache-control": "no-store" } });
}
