import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalParaDb = globalThis as unknown as { pool?: Pool };

function crearPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable DATABASE_URL (conexión a Neon).");
  return new Pool({ connectionString: url, max: 5 });
}

// Un solo pool por proceso (también entre recargas en desarrollo).
export function db() {
  globalParaDb.pool ??= crearPool();
  return drizzle(globalParaDb.pool, { schema });
}

export const hayBaseDeDatos = () => Boolean(process.env.DATABASE_URL);
export { schema };
