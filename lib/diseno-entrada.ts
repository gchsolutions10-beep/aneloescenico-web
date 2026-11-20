// Diseño de la entrada de cada función. Lo usan la vista previa del panel, la entrada en la web
// y el PDF: todos dibujan sobre la misma hoja de 300 × 500 con las mismas medidas, así se ven iguales.

export type Estilo = "banda" | "completa";
export type PosicionQr = "centro" | "derecha" | "izquierda" | "arriba";
export type Fondo = "color" | "afiche" | "imagen";

export type DisenoEntrada = {
  estilo: Estilo;
  posicion: PosicionQr;
  fondo: Fondo;
  imagenUrl: string;
  /** Color de la banda o del fondo, y del velo sobre la imagen. */
  colorPrincipal: string;
  /** "Presenta" y detalles. */
  colorAcento: string;
  /** Texto sobre la banda o la imagen. */
  colorTexto: string;
  /** Cuadritos del QR: siempre oscuro. */
  colorQr: string;
  /** Fondo del QR y del cuerpo de la entrada: siempre claro. */
  colorQrFondo: string;
  logoEnQr: boolean;
};

export const DISENO_INICIAL: DisenoEntrada = {
  estilo: "banda", posicion: "centro", fondo: "color", imagenUrl: "",
  colorPrincipal: "#140a0c", colorAcento: "#d6ab52", colorTexto: "#f6ecdf", colorQr: "#140a0c", colorQrFondo: "#ffffff", logoEnQr: false,
};

export const POSICIONES: [PosicionQr, string][] = [["centro", "Abajo, al centro"], ["derecha", "Abajo, a la derecha"], ["izquierda", "Abajo, a la izquierda"], ["arriba", "Arriba"]];
export const ESTILOS: [Estilo, string, string][] = [["banda", "Banda", "La imagen o el color arriba y el cuerpo claro."], ["completa", "Entrada completa", "La imagen cubre toda la entrada; el QR va en un recuadro claro."]];

/** Combinaciones probadas: todas tienen el QR oscuro sobre claro, con contraste de sobra. */
export const PALETAS: [string, Partial<DisenoEntrada>][] = [
  ["Telón", { colorPrincipal: "#140a0c", colorAcento: "#d6ab52", colorTexto: "#f6ecdf", colorQr: "#140a0c", colorQrFondo: "#ffffff" }],
  ["Vino", { colorPrincipal: "#6b1420", colorAcento: "#f2c66d", colorTexto: "#fff4e6", colorQr: "#6b1420", colorQrFondo: "#fff8ef" }],
  ["Navidad", { colorPrincipal: "#0f3d2e", colorAcento: "#e8c35a", colorTexto: "#fdf6e3", colorQr: "#7a1020", colorQrFondo: "#fffaf0" }],
  ["Noche", { colorPrincipal: "#0e1a33", colorAcento: "#8fb3ff", colorTexto: "#eef3ff", colorQr: "#0e1a33", colorQrFondo: "#f4f7ff" }],
  ["Dorado", { colorPrincipal: "#2b1d08", colorAcento: "#f0cf7a", colorTexto: "#fff7e3", colorQr: "#4a3008", colorQrFondo: "#fffaeb" }],
];

const esColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** Lee el diseño guardado (o nada) y completa lo que falte con el diseño inicial. */
export function normalizar(v: unknown): DisenoEntrada {
  const d = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const elegir = <T extends string>(x: unknown, ok: readonly T[], def: T): T => (ok.includes(x as T) ? (x as T) : def);
  const color = (k: keyof DisenoEntrada) => (esColor(d[k]) ? (d[k] as string).toLowerCase() : (DISENO_INICIAL[k] as string));
  return {
    estilo: elegir(d.estilo, ["banda", "completa"] as const, "banda"),
    posicion: elegir(d.posicion, ["centro", "derecha", "izquierda", "arriba"] as const, "centro"),
    fondo: elegir(d.fondo, ["color", "afiche", "imagen"] as const, "color"),
    imagenUrl: typeof d.imagenUrl === "string" ? d.imagenUrl : "",
    colorPrincipal: color("colorPrincipal"), colorAcento: color("colorAcento"), colorTexto: color("colorTexto"),
    colorQr: color("colorQr"), colorQrFondo: color("colorQrFondo"),
    logoEnQr: d.logoEnQr === true,
  };
}

// ---------- Contraste del QR ----------

const canal = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
export function luminancia(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}
export const contraste = (a: string, b: string) => { const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/** Mínimo para que cualquier cámara lo lea con la luz de una sala. */
export const CONTRASTE_MINIMO = 4.5;

/** Por qué este QR no se podría leer bien, o null si está bien. */
export function problemaQr(d: Pick<DisenoEntrada, "colorQr" | "colorQrFondo">): string | null {
  if (luminancia(d.colorQr) >= luminancia(d.colorQrFondo)) return "El QR debe ser más oscuro que su fondo. Al revés, muchos teléfonos no lo leen.";
  const c = contraste(d.colorQr, d.colorQrFondo);
  if (c < CONTRASTE_MINIMO) return `Los colores del QR se parecen demasiado (contraste ${c.toFixed(1)}; hace falta al menos ${CONTRASTE_MINIMO}). Oscurece el QR o aclara su fondo.`;
  return null;
}

// ---------- Geometría ----------

export const ANCHO = 300, ALTO = 500;
export type Caja = { x: number; y: number; w: number; h: number };

export type Plano = {
  /** Dónde va la imagen o el color principal. */
  banda: Caja;
  /** Velo de color sobre la imagen para que el texto se lea. */
  velo: number;
  titulo: Caja;
  datos: Caja & { fila: boolean; claro: boolean };
  qr: { x: number; y: number; lado: number; recuadro: number };
  codigo: { y: number; claro: boolean };
  corte: number | null;
  pie: { y: number; claro: boolean };
};

export function plano(d: DisenoEntrada, hayImagen: boolean): Plano {
  const completa = d.estilo === "completa";
  const pad = completa ? 9 : 0;
  const velo = hayImagen ? (completa ? 0.62 : 0.45) : 0;
  const p = d.posicion;
  if (p === "arriba") {
    const qr = { x: 62, y: 24, lado: 176, recuadro: pad };
    return {
      banda: completa ? { x: 0, y: 0, w: ANCHO, h: ALTO } : { x: 0, y: 248, w: ANCHO, h: ALTO - 248 }, velo,
      titulo: { x: 20, y: 262, w: 260, h: 140 },
      datos: { x: 20, y: 404, w: 260, h: 66, fila: true, claro: true },
      qr, codigo: { y: qr.y + qr.lado + pad + 14, claro: completa }, corte: null, pie: { y: 488, claro: true },
    };
  }
  if (p === "centro") {
    const qr = { x: 66, y: completa ? 270 : 266, lado: 168, recuadro: pad };
    return {
      banda: completa ? { x: 0, y: 0, w: ANCHO, h: ALTO } : { x: 0, y: 0, w: ANCHO, h: 168 }, velo,
      titulo: { x: 20, y: 20, w: 260, h: 140 },
      datos: { x: 20, y: completa ? 172 : 180, w: 260, h: 66, fila: true, claro: completa },
      qr, codigo: { y: qr.y + qr.lado + pad + 14, claro: completa }, corte: completa ? null : 254, pie: { y: 488, claro: completa },
    };
  }
  // A un lado: el QR abajo a la derecha o a la izquierda, los datos en la otra columna.
  const der = p === "derecha";
  const lado = 128;
  const qr = { x: der ? ANCHO - 20 - pad - lado : 20 + pad, y: 248, lado, recuadro: pad };
  return {
    banda: completa ? { x: 0, y: 0, w: ANCHO, h: ALTO } : { x: 0, y: 0, w: ANCHO, h: 214 }, velo,
    titulo: { x: 20, y: 20, w: 260, h: 186 },
    datos: { x: der ? 20 : 20 + lado + 2 * pad + 18, y: 238, w: 260 - lado - 2 * pad - 18, h: 200, fila: false, claro: completa },
    qr, codigo: { y: qr.y + qr.lado + pad + 14, claro: completa }, corte: null, pie: { y: 488, claro: completa },
  };
}

/** Datos de una entrada para dibujarla. */
export type DatosEntrada = {
  escuela: string; titulo: string; fecha: string; lugar: string;
  numero: number; zona: string; comprador: string; codigo: string;
};
export const codigoLegible = (c: string) => c.replace(/(.{4})(?=.)/g, "$1 ");
export const PIE = "Válida para una sola entrada. Muéstrala en la puerta.";
