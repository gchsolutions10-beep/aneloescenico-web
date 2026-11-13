import type { NombreIcono } from "./iconos";

// e = todo el equipo, a = administradores, m = solo master
export type Quien = "e" | "a" | "m";
export type Item = { href: string; nombre: string; icono: NombreIcono; quien: Quien; contador?: "pagos" | "inscripciones" | "cobranza" | "mensajes" };
export type Grupo = { id: string; titulo: string; items: Item[] };

export const GRUPOS: Grupo[] = [
  { id: "inicio", titulo: "", items: [{ href: "/admin", nombre: "Inicio", icono: "inicio", quien: "a" }] },
  { id: "taquilla", titulo: "Taquilla", items: [
    { href: "/admin/taquilla", nombre: "Vender entradas", icono: "entrada", quien: "e" },
    { href: "/admin/pagos", nombre: "Pagos de entradas", icono: "tarjeta", quien: "e", contador: "pagos" },
    { href: "/admin/validar", nombre: "Validar entradas", icono: "qr", quien: "e" },
    { href: "/admin/caja", nombre: "Cierre de caja", icono: "caja", quien: "e" },
  ] },
  { id: "funciones", titulo: "Funciones", items: [
    { href: "/admin/funciones", nombre: "Funciones", icono: "mascaras", quien: "a" },
    { href: "/admin/salas", nombre: "Salas", icono: "butacas", quien: "a" },
    { href: "/admin/bonos", nombre: "Bonos de regalo", icono: "regalo", quien: "a" },
  ] },
  { id: "escuela", titulo: "Escuela", items: [
    { href: "/admin/inscripciones", nombre: "Inscripciones", icono: "inscribir", quien: "a", contador: "inscripciones" },
    { href: "/admin/estudiantes", nombre: "Estudiantes", icono: "personas", quien: "a" },
    { href: "/admin/cobranza", nombre: "Cobranza", icono: "monedas", quien: "a", contador: "cobranza" },
    { href: "/admin/protagonistas", nombre: "Protagonistas", icono: "estrella", quien: "a" },
    { href: "/admin/niveles", nombre: "Niveles", icono: "capas", quien: "a" },
  ] },
  { id: "sitio", titulo: "Sitio web", items: [
    { href: "/admin/carrusel", nombre: "Carrusel", icono: "imagen", quien: "a" },
    { href: "/admin/blog", nombre: "Blog", icono: "pluma", quien: "a" },
    { href: "/admin/mensajes", nombre: "Mensajes", icono: "sobre", quien: "a", contador: "mensajes" },
    { href: "/admin/apariencia", nombre: "Apariencia", icono: "paleta", quien: "a" },
  ] },
  { id: "reportes", titulo: "Reportes", items: [{ href: "/admin/reportes", nombre: "Reportes", icono: "grafico", quien: "a" }] },
  { id: "ajustes", titulo: "Ajustes", items: [
    { href: "/admin/configuracion", nombre: "Datos de la escuela", icono: "edificio", quien: "a" },
    { href: "/admin/cobros", nombre: "Cobros y tasa BCV", icono: "tasa", quien: "a" },
    { href: "/admin/correo", nombre: "Correo", icono: "arroba", quien: "a" },
    { href: "/admin/usuarios", nombre: "Usuarios", icono: "escudo", quien: "m" },
  ] },
];

export const puedeVer = (quien: Quien, rol: string) => quien === "e" || (quien === "a" && rol !== "vendedor") || (quien === "m" && rol === "master");

/** El ítem del menú que corresponde a una ruta (el de prefijo más largo). */
export function itemDeRuta(ruta: string): { grupo: Grupo; item: Item } | null {
  let mejor: { grupo: Grupo; item: Item } | null = null;
  for (const grupo of GRUPOS) for (const item of grupo.items) {
    const coincide = item.href === "/admin" ? ruta === "/admin" : ruta === item.href || ruta.startsWith(`${item.href}/`);
    if (coincide && (!mejor || item.href.length > mejor.item.href.length)) mejor = { grupo, item };
  }
  return mejor;
}
