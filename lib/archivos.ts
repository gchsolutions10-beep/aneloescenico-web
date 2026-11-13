// Limpieza de imágenes: cuando un registro se borra o cambia de foto, el archivo viejo se
// elimina de Vercel Blob (o de public/uploads en desarrollo), pero solo si ya nada lo usa.
// Una misma foto puede estar en dos lugares (por ejemplo, la de la ficha de un artista y la
// del elenco de una función), por eso siempre se revisa antes de borrar.
import "server-only";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { del, list } from "@vercel/blob";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { hayBlob } from "./blob";

const DE_BLOB = /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//;
const LOCAL = /^\/uploads\/[a-f0-9]+\.(jpg|png|webp)$/;
export const esArchivoPropio = (u: unknown): u is string => typeof u === "string" && (DE_BLOB.test(u) || LOCAL.test(u));

/** De una lista de direcciones, devuelve las que todavía usa algún registro. */
async function enUso(urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const r = await db().execute<{ url: string }>(sql`
    SELECT u AS url FROM jsonb_array_elements_text(${JSON.stringify(urls)}::jsonb) AS u WHERE
      EXISTS (SELECT 1 FROM carrusel WHERE imagen_url = u) OR
      EXISTS (SELECT 1 FROM entradas_blog WHERE portada_url = u) OR
      EXISTS (SELECT 1 FROM funciones WHERE afiche_url = u) OR
      EXISTS (SELECT 1 FROM elenco WHERE foto_url = u) OR
      EXISTS (SELECT 1 FROM niveles WHERE imagen_url = u) OR
      EXISTS (SELECT 1 FROM fichas_artista WHERE foto_url = u OR galeria ? u) OR
      EXISTS (SELECT 1 FROM pagos WHERE captura_url = u) OR
      EXISTS (SELECT 1 FROM reportes_pago WHERE captura_url = u) OR
      EXISTS (SELECT 1 FROM configuracion WHERE strpos(valor::text, u) > 0)`);
  return new Set(r.rows.map((x) => x.url));
}

async function eliminar(urls: string[]) {
  const blob = urls.filter((u) => DE_BLOB.test(u));
  const locales = urls.filter((u) => LOCAL.test(u));
  if (blob.length && hayBlob()) await del(blob);
  for (const u of locales) await unlink(path.join(process.cwd(), "public", u)).catch(() => {});
}

/** Borra los archivos que ya no usa ningún registro. Nunca interrumpe la acción que la llama. */
export async function limpiarArchivos(posibles: (string | null | undefined)[]) {
  try {
    const propias = [...new Set(posibles.filter(esArchivoPropio))];
    const usadas = await enUso(propias);
    await eliminar(propias.filter((u) => !usadas.has(u)));
  } catch (e) {
    console.warn("[archivos] no se pudo limpiar:", e instanceof Error ? ((e.cause as Error | undefined)?.message ?? e.message) : e);
  }
}

export type Inventario = { total: number; bytes: number; sinUso: { url: string; bytes: number }[] };

/**
 * Revisa todos los archivos guardados y devuelve los que nada usa. Solo cuenta como "sin uso"
 * lo subido hace más de un día, para no tocar una foto recién subida de un formulario sin guardar.
 */
export async function inventario(): Promise<Inventario> {
  const archivos: { url: string; bytes: number; fecha: Date }[] = [];
  if (hayBlob()) {
    let cursor: string | undefined;
    do {
      const r = await list({ prefix: "anelo/", cursor, limit: 1000 });
      archivos.push(...r.blobs.map((b) => ({ url: b.url, bytes: b.size, fecha: new Date(b.uploadedAt) })));
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
  } else {
    const { readdir, stat } = await import("node:fs/promises");
    const carpeta = path.join(process.cwd(), "public", "uploads");
    for (const n of await readdir(carpeta).catch(() => [] as string[])) {
      const url = `/uploads/${n}`;
      if (!LOCAL.test(url)) continue;
      const s = await stat(path.join(carpeta, n));
      archivos.push({ url, bytes: s.size, fecha: s.mtime });
    }
  }
  const usadas = await enUso(archivos.map((a) => a.url));
  const ayer = Date.now() - 24 * 3600_000;
  return {
    total: archivos.length,
    bytes: archivos.reduce((s, a) => s + a.bytes, 0),
    sinUso: archivos.filter((a) => !usadas.has(a.url) && a.fecha.getTime() < ayer).map(({ url, bytes }) => ({ url, bytes })),
  };
}

export async function borrarSinUso(): Promise<number> {
  const { sinUso } = await inventario();
  await eliminar(sinUso.map((a) => a.url));
  return sinUso.length;
}
