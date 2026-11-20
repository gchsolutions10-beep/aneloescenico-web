// Adornos de teatro para la entrada: telón, escenario, máscaras, marquesina y estrellas.
// Son formas simples (trazos y círculos) en la hoja de 300 × 500, con el eje Y hacia abajo,
// para que la web (SVG) y el PDF (pdf-lib) dibujen exactamente lo mismo.
import { ANCHO, type Caja, type DisenoEntrada, type Plano } from "./diseno-entrada";

export type Forma =
  | { tipo: "trazo"; d: string; color: string; opacidad?: number }
  | { tipo: "circulo"; x: number; y: number; r: number; color: string; opacidad?: number };

const n = (v: number) => Math.round(v * 10) / 10;
/** Pasa un trazo escrito en pares de números (0 a 1) a la caja indicada. Solo usa M, L, Q, C y Z. */
const enCaja = (plantilla: string, b: Caja) => plantilla.replace(/(-?[\d.]+)[ ,]+(-?[\d.]+)/g, (_, u, v) => `${n(b.x + Number(u) * b.w)} ${n(b.y + Number(v) * b.h)}`);
/** Lo mismo, reflejado de izquierda a derecha dentro de la hoja. */
const espejo = (plantilla: string, b: Caja) => plantilla.replace(/(-?[\d.]+)[ ,]+(-?[\d.]+)/g, (_, u, v) => `${n(ANCHO - (b.x + Number(u) * b.w))} ${n(b.y + Number(v) * b.h)}`);

const NEGRO = "#000000", BLANCO = "#ffffff";

function telon(e: Caja, d: DisenoEntrada): Forma[] {
  // Cortina recogida: ancha arriba y angosta abajo, para no tapar textos ni el QR.
  const cortina = "M0 0 L0.15 0 C0.11 0.3 0.05 0.5 0.042 1 L0 1 Z";
  const pliegues = ["M0.03 0 L0.05 0 C0.035 0.4 0.02 0.7 0.016 1 L0.008 1 C0.012 0.7 0.02 0.4 0.03 0 Z", "M0.09 0 L0.11 0 C0.08 0.35 0.045 0.6 0.036 1 L0.03 1 C0.038 0.6 0.065 0.35 0.09 0 Z"];
  const brillo = "M0.065 0 L0.075 0 C0.055 0.4 0.032 0.65 0.026 1 L0.022 1 C0.028 0.65 0.05 0.4 0.065 0 Z";
  const lado = (f: (p: string, b: Caja) => string): Forma[] => [
    { tipo: "trazo", d: f(cortina, e), color: d.colorAdorno },
    ...pliegues.map((p): Forma => ({ tipo: "trazo", d: f(p, e), color: NEGRO, opacidad: 0.28 })),
    { tipo: "trazo", d: f(brillo, e), color: BLANCO, opacidad: 0.14 },
  ];
  // Bambalinón: franja de arriba con ondas y un ribete dorado.
  const alto = 20 / e.h, onda = 12 / e.h, ondas = 6;
  const festones = (extra: number) => {
    let p = `M0 0 L1 0 L1 ${alto + extra}`;
    for (let i = ondas; i > 0; i--) p += ` Q${(i - 0.5) / ondas} ${alto + onda + extra} ${(i - 1) / ondas} ${alto + extra}`;
    return `${p} Z`;
  };
  return [...lado(enCaja), ...lado(espejo),
    { tipo: "trazo", d: enCaja(festones(2.5 / e.h), e), color: d.colorAcento },
    { tipo: "trazo", d: enCaja(festones(0), e), color: d.colorAdorno },
    { tipo: "trazo", d: enCaja(`M0 0 L1 0 L1 ${alto * 0.35} L0 ${alto * 0.35} Z`, e), color: NEGRO, opacidad: 0.22 },
  ];
}

function escenario(e: Caja, d: DisenoEntrada): Forma[] {
  const piso = 18 / e.h, curva = 30 / e.h;
  const yPiso = (t: number) => (1 - t) ** 2 * (1 - piso) + 2 * (1 - t) * t * (1 - curva) + t ** 2 * (1 - piso);
  const foco = (f: (p: string, b: Caja) => string): Forma[] => [
    { tipo: "trazo", d: f(`M0.15 0 L0.19 0 L0.66 ${1 - piso - 0.02} L0.38 ${1 - piso - 0.02} Z`, e), color: BLANCO, opacidad: 0.13 },
    { tipo: "trazo", d: f(`M0.155 0 L0.185 0 L0.56 ${1 - piso - 0.02} L0.46 ${1 - piso - 0.02} Z`, e), color: BLANCO, opacidad: 0.1 },
  ];
  return [...foco(enCaja), ...foco(espejo),
    { tipo: "circulo", x: n(e.x + 0.17 * e.w), y: e.y + 4, r: 4, color: d.colorAcento },
    { tipo: "circulo", x: n(ANCHO - (e.x + 0.17 * e.w)), y: e.y + 4, r: 4, color: d.colorAcento },
    { tipo: "trazo", d: enCaja(`M0 ${1 - piso} Q0.5 ${1 - curva} 1 ${1 - piso} L1 1 L0 1 Z`, e), color: d.colorAdorno },
    { tipo: "trazo", d: enCaja(`M0 ${1 - piso} Q0.5 ${1 - curva} 1 ${1 - piso} L1 ${1 - piso + 2 / e.h} Q0.5 ${1 - curva + 2 / e.h} 0 ${1 - piso + 2 / e.h} Z`, e), color: d.colorAcento, opacidad: 0.9 },
    // Candilejas: luces pequeñas en el borde del escenario.
    ...Array.from({ length: 9 }, (_, i): Forma => {
      const t = (i + 1) / 10;
      return { tipo: "circulo", x: n(e.x + t * e.w), y: n(e.y + yPiso(t) * e.h + 5), r: 1.7, color: d.colorAcento };
    }),
  ];
}

function mascaras(e: Caja, d: DisenoEntrada): Forma[] {
  const s = 46;
  const comedia: Caja = { x: e.x + e.w - 22 - s, y: e.y + e.h - s - 10, w: s, h: s };
  const tragedia: Caja = { x: comedia.x + s * 0.42, y: comedia.y - s * 0.22, w: s * 0.82, h: s * 0.82 };
  const cara = "M0.1 0.1 Q0.5 0 0.9 0.1 Q0.96 0.58 0.5 0.96 Q0.04 0.58 0.1 0.1 Z";
  const hueco = d.colorPrincipal;
  return [
    { tipo: "trazo", d: enCaja(cara, tragedia), color: d.colorTexto, opacidad: 0.92 },
    { tipo: "trazo", d: enCaja("M0.2 0.36 Q0.31 0.48 0.42 0.36 Q0.31 0.42 0.2 0.36 Z M0.58 0.36 Q0.69 0.48 0.8 0.36 Q0.69 0.42 0.58 0.36 Z", tragedia), color: hueco },
    { tipo: "trazo", d: enCaja("M0.3 0.8 Q0.5 0.56 0.7 0.8 Q0.5 0.68 0.3 0.8 Z", tragedia), color: hueco },
    { tipo: "trazo", d: enCaja(cara, comedia), color: d.colorAcento },
    { tipo: "trazo", d: enCaja("M0.2 0.42 Q0.31 0.26 0.42 0.42 Q0.31 0.34 0.2 0.42 Z M0.58 0.42 Q0.69 0.26 0.8 0.42 Q0.69 0.34 0.58 0.42 Z", comedia), color: hueco },
    { tipo: "trazo", d: enCaja("M0.27 0.6 Q0.5 0.88 0.73 0.6 Q0.5 0.72 0.27 0.6 Z", comedia), color: hueco },
  ];
}

function marquesina(t: Caja, e: Caja, d: DisenoEntrada): Forma[] {
  // Marco de bombillos alrededor del título, como el letrero de un teatro.
  const x = t.x - 10, y = t.y - 9, w = t.w + 20, h = Math.min(120, e.y + e.h - y - 6);
  const luces: Forma[] = [];
  const poner = (px: number, py: number) => {
    luces.push({ tipo: "circulo", x: n(px), y: n(py), r: 4.6, color: d.colorAcento, opacidad: 0.22 });
    luces.push({ tipo: "circulo", x: n(px), y: n(py), r: 2.2, color: d.colorAcento });
  };
  const nx = Math.round(w / 13), ny = Math.round(h / 13);
  for (let i = 0; i <= nx; i++) { poner(x + (w * i) / nx, y); poner(x + (w * i) / nx, y + h); }
  for (let j = 1; j < ny; j++) { poner(x, y + (h * j) / ny); poner(x + w, y + (h * j) / ny); }
  const marco = `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z M${x + 0.8} ${y + 0.8} L${x + 0.8} ${y + h - 0.8} L${x + w - 0.8} ${y + h - 0.8} L${x + w - 0.8} ${y + 0.8} Z`;
  return [{ tipo: "trazo", d: marco, color: d.colorAcento, opacidad: 0.55 }, ...luces];
}

// Posiciones candidatas (fracciones de la escena) y tamaño. Las que caen sobre el título se omiten.
const PUNTOS_ESTRELLAS: [number, number, number][] = [
  [0.03, 0.12, 4], [0.97, 0.1, 4], [0.03, 0.42, 3.5], [0.97, 0.36, 5], [0.03, 0.7, 4.5], [0.97, 0.62, 3.5],
  [0.12, 0.84, 5], [0.3, 0.92, 3.5], [0.52, 0.86, 4.5], [0.72, 0.93, 3], [0.88, 0.8, 5.5], [0.22, 0.74, 3],
  [0.42, 0.76, 2.5], [0.64, 0.74, 3], [0.97, 0.88, 3], [0.03, 0.95, 3],
];

function estrellas(e: Caja, t: Caja, d: DisenoEntrada): Forma[] {
  const texto = { x: t.x - 6, y: t.y - 6, w: t.w + 12, h: 112 };
  return PUNTOS_ESTRELLAS.flatMap(([u, v, r]): Forma[] => {
    const cx = e.x + u * e.w, cy = e.y + v * e.h;
    if (cx + r > texto.x && cx - r < texto.x + texto.w && cy + r > texto.y && cy - r < texto.y + texto.h) return [];
    const p = Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, radio = i % 2 ? r * 0.42 : r;
      return `${n(cx + radio * Math.cos(a))} ${n(cy + radio * Math.sin(a))}`;
    });
    return [{ tipo: "trazo", d: `M${p.join(" L")} Z`, color: d.colorAcento, opacidad: 0.9 }];
  });
}

/** Todas las formas de los adornos elegidos, en el orden en que se pintan. */
export function formasAdornos(d: DisenoEntrada, pl: Plano): Forma[] {
  const e = pl.escena;
  const a = new Set(d.adornos);
  return [
    ...(a.has("escenario") ? escenario(e, d) : []),
    ...(a.has("estrellas") ? estrellas(e, pl.titulo, d) : []),
    ...(a.has("telon") ? telon(e, d) : []),
    ...(a.has("marquesina") ? marquesina(pl.titulo, e, d) : []),
    ...(a.has("mascaras") ? mascaras(e, d) : []),
  ];
}
