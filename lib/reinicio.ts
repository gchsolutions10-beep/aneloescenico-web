// Reinicio completo de los datos: deja la escuela como recién instalada.
// Solo lo puede ejecutar el usuario master, y su propia cuenta se conserva.
import "server-only";
import { del, list } from "@vercel/blob";
import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { hayBlob } from "./blob";
import { SALA_184 } from "./planos";

/** Lo que hay que escribir para confirmar el reinicio. */
export const FRASE_REINICIO = "BORRAR TODO";

export type Conteo = { funciones: number; entradas: number; estudiantes: number; pagos: number; bonos: number; blog: number; fotos: number; usuarios: number };

export async function contarDatos(masterId: number): Promise<Conteo> {
  const r = await db().execute<Record<keyof Conteo, number>>(sql`SELECT
    (SELECT count(*)::int FROM funciones) AS funciones,
    (SELECT count(*)::int FROM entradas) AS entradas,
    (SELECT count(*)::int FROM estudiantes) AS estudiantes,
    (SELECT count(*)::int FROM pagos) + (SELECT count(*)::int FROM reportes_pago) AS pagos,
    (SELECT count(*)::int FROM bonos) AS bonos,
    (SELECT count(*)::int FROM entradas_blog) AS blog,
    (SELECT count(*)::int FROM carrusel) AS fotos,
    (SELECT count(*)::int FROM usuarios WHERE id <> ${masterId}) AS usuarios`);
  return r.rows[0];
}

/**
 * Borra todo lo cargado (funciones, ventas, pagos, estudiantes, blog, fotos, configuración y
 * demás usuarios) y vuelve a crear lo inicial: los niveles Kids, Teen y Teenagers y la sala de
 * 184 butacas. Después borra las imágenes guardadas. Conserva solo la cuenta `masterId`.
 */
export async function reiniciarTodo(masterId: number) {
  await db().transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE entradas, pagos, butacas, zonas, ordenes, bonos, elenco, funciones,
      reportes_pago, cargos, fichas_artista, estudiantes, mensajes, entradas_blog, carrusel, niveles, salas,
      configuracion, tokens_clave RESTART IDENTITY CASCADE`);
    await tx.execute(sql`DELETE FROM usuarios WHERE id <> ${masterId}`);
    await tx.execute(sql`ALTER SEQUENCE recibos_seq RESTART WITH 1`);
    await tx.insert(schema.niveles).values([
      { slug: "kids", nombre: "Kids", descripcion: "El primer encuentro con el escenario: juego, imaginación y trabajo en grupo.", orden: 1 },
      { slug: "teen", nombre: "Teen", descripcion: "Voz, cuerpo y construcción de personaje para quienes ya quieren contar historias.", orden: 2 },
      { slug: "teenagers", nombre: "Teenagers", descripcion: "Interpretación, improvisación y montaje de obras completas.", orden: 3 },
    ]);
    await tx.insert(schema.salas).values(SALA_184);
  });
  await borrarTodosLosArchivos();
}

async function borrarTodosLosArchivos() {
  try {
    if (hayBlob()) {
      let cursor: string | undefined;
      do {
        const r = await list({ prefix: "anelo/", cursor, limit: 1000 });
        if (r.blobs.length) await del(r.blobs.map((b) => b.url));
        cursor = r.hasMore ? r.cursor : undefined;
      } while (cursor);
    } else {
      const carpeta = path.join(process.cwd(), "public", "uploads");
      for (const n of await readdir(carpeta).catch(() => [] as string[])) {
        if (/^[a-f0-9]+\.(jpg|png|webp)$/.test(n)) await unlink(path.join(carpeta, n)).catch(() => {});
      }
    }
  } catch (e) {
    console.warn("[reinicio] no se pudieron borrar todas las imágenes:", e instanceof Error ? e.message : e);
  }
}
