// Recibe una imagen ya recortada y reducida en el navegador y la guarda.
// En Vercel usa Vercel Blob; en desarrollo, sin token, la deja en public/uploads.
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { leerSesion } from "@/lib/sesion";

const TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAXIMO = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const s = await leerSesion();
  if (!s || (s.rol !== "master" && s.rol !== "admin")) return NextResponse.json({ error: "Sin permiso." }, { status: 401 });

  const archivo = (await req.formData()).get("archivo");
  if (!(archivo instanceof File)) return NextResponse.json({ error: "No llegó ninguna imagen." }, { status: 400 });
  const ext = TIPOS[archivo.type];
  if (!ext) return NextResponse.json({ error: "Solo se aceptan imágenes JPG, PNG o WebP." }, { status: 400 });
  if (archivo.size > MAXIMO) return NextResponse.json({ error: "La imagen pesa demasiado (máximo 4 MB)." }, { status: 400 });

  const nombre = `${randomBytes(12).toString("hex")}.${ext}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`anelo/${nombre}`, archivo, { access: "public", contentType: archivo.type });
    return NextResponse.json({ url: blob.url });
  }
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Falta conectar Vercel Blob (BLOB_READ_WRITE_TOKEN)." }, { status: 500 });
  }
  const carpeta = path.join(process.cwd(), "public", "uploads");
  await mkdir(carpeta, { recursive: true });
  await writeFile(path.join(carpeta, nombre), Buffer.from(await archivo.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${nombre}` });
}
