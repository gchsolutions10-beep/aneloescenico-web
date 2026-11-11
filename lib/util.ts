export function slugify(texto: string): string {
  return texto
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "sin-titulo";
}

// La escuela está en Venezuela: UTC-4 todo el año, sin horario de verano.
const ZONA = "America/Caracas";

export function fechaLarga(d: Date | null): string {
  if (!d) return "Fecha por anunciar";
  return new Intl.DateTimeFormat("es-VE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: ZONA }).format(d);
}

export function fechaCorta(d: Date | null): string {
  if (!d) return "Por anunciar";
  return new Intl.DateTimeFormat("es-VE", { weekday: "short", day: "numeric", month: "short", timeZone: ZONA }).format(d).replace(/\./g, "");
}

export function hora(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("es-VE", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: ZONA }).format(d);
}

/** "2026-12-13T17:00" (hora de Venezuela) → Date */
export function deInputLocal(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valor)) return null;
  const d = new Date(`${valor.slice(0, 16)}:00-04:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Date → valor para <input type="datetime-local"> en hora de Venezuela */
export function aInputLocal(d: Date | null): string {
  if (!d) return "";
  return new Date(d.getTime() - 4 * 3600 * 1000).toISOString().slice(0, 16);
}

export function monto(v: string | null): string | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

export const ESTADOS_FUNCION: Record<string, string> = {
  borrador: "Borrador",
  preventa: "Preventa",
  a_la_venta: "A la venta",
  agotada: "Agotada",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};
