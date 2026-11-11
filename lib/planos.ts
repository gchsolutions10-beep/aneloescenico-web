// Definición de una sala: zonas de precio y bloques de butacas.
// Las salas se guardan en la tabla `salas` y se editan desde el panel. Al crear el plano
// de una función se copian a `zonas` y `butacas`, así cada función tiene su propio estado
// y editar una sala después no altera funciones ya creadas.
import { z } from "zod";

export const esquemaSala = z.object({
  zonas: z.array(z.object({
    clave: z.string().min(1).max(30),
    nombre: z.string().trim().min(1, "Cada zona necesita un nombre.").max(40),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    precioPreventa: z.string().regex(/^\d{0,6}(\.\d{1,2})?$/),
    precioRegular: z.string().regex(/^\d{1,6}(\.\d{1,2})?$/, "Cada zona necesita un precio regular."),
  })).min(1, "La sala necesita al menos una zona.").max(8),
  bloques: z.array(z.object({
    nombre: z.string().trim().min(1, "Cada bloque necesita un nombre.").max(40),
    filas: z.array(z.object({ butacas: z.number().int().min(1).max(60), zona: z.string() })).min(1, "Cada bloque necesita al menos una fila.").max(60),
  })).min(1, "La sala necesita al menos un bloque.").max(8),
});
export type DefSala = z.infer<typeof esquemaSala>;

export type ButacaPlano = { numero: number; bloque: string; fila: number; pos: number; zona: string };

export const MAX_BUTACAS = 1500;
export const totalButacas = (d: DefSala) => d.bloques.reduce((s, b) => s + b.filas.reduce((t, f) => t + f.butacas, 0), 0);

/** Numera las butacas de corrido: bloque por bloque, fila por fila, de izquierda a derecha. */
export function generarButacas(d: DefSala): ButacaPlano[] {
  const lista: ButacaPlano[] = [];
  let n = 1;
  for (const b of d.bloques) {
    b.filas.forEach((f, i) => {
      for (let p = 1; p <= f.butacas; p++) lista.push({ numero: n++, bloque: b.nombre, fila: i + 1, pos: p, zona: f.zona });
    });
  }
  return lista;
}

/** Revisa una definición recibida del editor. Devuelve la definición limpia o un mensaje de error. */
export function validarSala(entrada: unknown): { def: DefSala } | { error: string } {
  const r = esquemaSala.safeParse(entrada);
  if (!r.success) return { error: r.error.issues[0].message };
  const claves = new Set(r.data.zonas.map((z) => z.clave));
  if (claves.size !== r.data.zonas.length) return { error: "Hay dos zonas con la misma clave." };
  if (r.data.bloques.some((b) => b.filas.some((f) => !claves.has(f.zona)))) return { error: "Hay filas asignadas a una zona que ya no existe." };
  if (new Set(r.data.bloques.map((b) => b.nombre)).size !== r.data.bloques.length) return { error: "Dos bloques no pueden llamarse igual." };
  if (totalButacas(r.data) > MAX_BUTACAS) return { error: `La sala no puede pasar de ${MAX_BUTACAS} butacas.` };
  return { def: r.data };
}

const lateral = (nombre: string) => ({ nombre, filas: Array.from({ length: 12 }, (_, i) => ({ butacas: 4, zona: i < 3 ? "vip" : "general" })) });

/** La sala de la escuela: 184 butacas, laterales de 4 × 12 y bloque central. */
export const SALA_184: { nombre: string; definicion: DefSala } = {
  nombre: "Sala principal · 184 butacas",
  definicion: {
    zonas: [
      { clave: "vip", nombre: "VIP", color: "#e3bd5e", precioPreventa: "10", precioRegular: "15" },
      { clave: "general", nombre: "General", color: "#8fa3b8", precioPreventa: "8", precioRegular: "10" },
    ],
    bloques: [
      lateral("Lado izquierdo"),
      { nombre: "Lado central", filas: [7, 8, 7, 8, 7, 8, 7, 8, 7, 8, 7, 6].map((butacas, i) => ({ butacas, zona: i < 7 ? "vip" : "general" })) },
      lateral("Lado derecho"),
    ],
  },
};
