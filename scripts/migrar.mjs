// Aplica las migraciones y carga los datos iniciales. Se ejecuta antes de cada build.
// Si no hay DATABASE_URL (por ejemplo, un build local sin base de datos) no hace nada.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrar] Sin DATABASE_URL: se omiten las migraciones.");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./db/migraciones" });
  console.log("[migrar] Migraciones aplicadas.");

  // Niveles de la escuela, solo si la tabla está vacía.
  const { rows } = await pool.query("select count(*)::int as n from niveles");
  if (rows[0].n === 0) {
    await pool.query(
      `insert into niveles (slug, nombre, edades, descripcion, orden) values
        ('kids', 'Kids', '', 'El primer encuentro con el escenario: juego, imaginación y trabajo en grupo.', 1),
        ('teen', 'Teen', '', 'Voz, cuerpo y construcción de personaje para quienes ya quieren contar historias.', 2),
        ('teenagers', 'Teenagers', '', 'Interpretación, improvisación y montaje de obras completas.', 3)`
    );
    console.log("[migrar] Niveles iniciales creados.");
  }
} finally {
  await pool.end();
}
