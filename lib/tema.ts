// Tema visual del sitio. Se guarda en la tabla `configuracion` (clave "tema")
// y el layout lo inyecta como variables CSS, así que cambia sin volver a desplegar.

export type Tema = {
  fondo: string;
  superficie: string;
  linea: string;
  texto: string;
  tenue: string;
  acento: string;
  sobreAcento: string;
  telon: string;
  titulos: "bodoni" | "bigshoulders" | "limelight";
  tamanoBase: number; // px
  radio: number; // px
  mostrarTelon: boolean;
};

export const PLANTILLAS: Record<string, { nombre: string; tema: Tema }> = {
  telon: {
    nombre: "Telón",
    tema: {
      fondo: "#140a0c", superficie: "#1f1013", linea: "#4a2229", texto: "#f6ecdf", tenue: "#b9a297",
      acento: "#d6ab52", sobreAcento: "#1a0c0e", telon: "#9c1f30",
      titulos: "bodoni", tamanoBase: 17, radio: 4, mostrarTelon: true,
    },
  },
  foco: {
    nombre: "Foco",
    tema: {
      fondo: "#050505", superficie: "#111111", linea: "#2b2b2b", texto: "#fafafa", tenue: "#9a9a9a",
      acento: "#ffc247", sobreAcento: "#050505", telon: "#fafafa",
      titulos: "bigshoulders", tamanoBase: 17, radio: 0, mostrarTelon: false,
    },
  },
  marquesina: {
    nombre: "Marquesina",
    tema: {
      fondo: "#0d0f2e", superficie: "#171a45", linea: "#30357a", texto: "#fff8e8", tenue: "#b3b6dc",
      acento: "#ffd447", sobreAcento: "#0d0f2e", telon: "#ff4f8b",
      titulos: "limelight", tamanoBase: 17, radio: 16, mostrarTelon: false,
    },
  },
};

export const TEMA_INICIAL: Tema = PLANTILLAS.telon.tema;

const HEX = /^#[0-9a-fA-F]{6}$/;
const COLORES = ["fondo", "superficie", "linea", "texto", "tenue", "acento", "sobreAcento", "telon"] as const;

/** Devuelve un tema válido: cualquier valor ausente o inválido se reemplaza por el inicial. */
export function sanearTema(entrada: unknown): Tema {
  const e = (entrada ?? {}) as Record<string, unknown>;
  const t: Tema = { ...TEMA_INICIAL };
  for (const c of COLORES) if (typeof e[c] === "string" && HEX.test(e[c] as string)) t[c] = e[c] as string;
  if (e.titulos === "bodoni" || e.titulos === "bigshoulders" || e.titulos === "limelight") t.titulos = e.titulos;
  const tam = Number(e.tamanoBase);
  if (tam >= 14 && tam <= 22) t.tamanoBase = Math.round(tam);
  const radio = Number(e.radio);
  if (radio >= 0 && radio <= 24) t.radio = Math.round(radio);
  if (typeof e.mostrarTelon === "boolean") t.mostrarTelon = e.mostrarTelon;
  return t;
}

const FUENTES: Record<Tema["titulos"], string> = {
  bodoni: "var(--f-bodoni), Didot, 'Times New Roman', serif",
  bigshoulders: "var(--f-bigshoulders), Impact, sans-serif",
  limelight: "var(--f-limelight), Georgia, serif",
};

export function temaACss(t: Tema): string {
  return `:root{--fondo:${t.fondo};--superficie:${t.superficie};--linea:${t.linea};--texto:${t.texto};--tenue:${t.tenue};--acento:${t.acento};--sobre-acento:${t.sobreAcento};--telon:${t.telon};--f-titulos:${FUENTES[t.titulos]};--tamano:${t.tamanoBase}px;--radio:${t.radio}px;--titulos-may:${t.titulos === "bigshoulders" ? "uppercase" : "none"};--titulos-peso:${t.titulos === "bigshoulders" ? 900 : t.titulos === "limelight" ? 400 : 500}}`;
}

function luminancia(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Contraste WCAG entre dos colores hex (1 a 21). 4.5 o más es legible para texto normal. */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
