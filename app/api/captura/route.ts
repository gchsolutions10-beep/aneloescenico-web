// Captura del comprobante de pago. La sube el comprador, sin sesión: solo se acepta
// si presenta el código de una orden que todavía espera pago.
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/db";

const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(req: Request) {
  const datos = await req.formData();
  const archivo = datos.get("archivo");
  const [o] = await db().select({ estado: schema.ordenes.estado }).from(schema.ordenes).where(eq(schema.ordenes.codigo, String(datos.get("codigo") ?? "")));
  if (!o || (o.estado !== "apartada" && o.estado !== "vencida")) return NextResponse.json({ error: "Esta orden no espera un pago." }, { status: 403 });
  if (!(archivo instanceof File) || !TIPOS[archivo.type]) return NextResponse.json({ error: "Sube una imagen JPG, PNG o WebP." }, { status: 400 });
  if (archivo.size > 3 * 1024 * 1024) return NextResponse.json({ error: "La imagen pesa demasiado (máximo 3 MB)." }, { status: 400 });

  const nombre = `${randomBytes(16).toString("hex")}.${TIPOS[archivo.type]}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`anelo/capturas/${nombre}`, archivo, { access: "public", contentType: archivo.type });
    return NextResponse.json({ url: blob.url });
  }
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Falta conectar Vercel Blob." }, { status: 500 });
  const carpeta = path.join(process.cwd(), "public", "uploads");
  await mkdir(carpeta, { recursive: true });
  await writeFile(path.join(carpeta, nombre), Buffer.from(await archivo.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${nombre}` });
}
