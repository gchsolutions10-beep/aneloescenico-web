// Estado de las compras guardadas en el teléfono del comprador (página Mis entradas).
// Solo responde por códigos exactos: el código de 16 caracteres es la llave de cada compra.
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { limpiarVencidas } from "@/lib/taquilla";
import { fechaCorta, hora } from "@/lib/util";

export async function GET(req: Request) {
  const codigos = [...new Set((new URL(req.url).searchParams.get("c") ?? "").split(","))].filter((c) => /^[A-Z0-9]{16}$/.test(c)).slice(0, 30);
  if (codigos.length === 0) return NextResponse.json([]);
  await limpiarVencidas();
  const filas = await db().select({ o: schema.ordenes, titulo: schema.funciones.titulo, fecha: schema.funciones.fechaHora })
    .from(schema.ordenes).innerJoin(schema.funciones, eq(schema.funciones.id, schema.ordenes.funcionId))
    .where(inArray(schema.ordenes.codigo, codigos));
  return NextResponse.json(
    filas.map(({ o, titulo, fecha }) => ({
      codigo: o.codigo, estado: o.estado, titulo,
      cuando: fecha ? `${fechaCorta(fecha)} · ${hora(fecha)}` : "Fecha por anunciar",
      butacas: o.detalle.map((d) => d.numero),
    })),
    { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } },
  );
}
