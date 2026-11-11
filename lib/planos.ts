// Plantillas de plano de sala. Al crear el plano de una función se copian a las
// tablas `zonas` y `butacas`, de modo que cada función tiene su propio estado.

export type ButacaPlano = { numero: number; bloque: "izquierdo" | "central" | "derecho"; fila: number; pos: number; zona: string };
export type Plano = {
  nombre: string;
  zonas: { clave: string; nombre: string; color: string; precioPreventa: string; precioRegular: string }[];
  butacas: ButacaPlano[];
};

/** Sala de 184 butacas, según el plano de la escuela: dos laterales de 4 × 12 y un bloque central. */
function sala184(): ButacaPlano[] {
  const b: ButacaPlano[] = [];
  const zona = (n: number) => (n <= 12 || (n >= 49 && n <= 100) || (n >= 137 && n <= 148) ? "vip" : "general");
  const lateral = (bloque: "izquierdo" | "derecho", desde: number) => {
    for (let f = 0; f < 12; f++) for (let p = 0; p < 4; p++) { const n = desde + f * 4 + p; b.push({ numero: n, bloque, fila: f + 1, pos: p + 1, zona: zona(n) }); }
  };
  lateral("izquierdo", 1);
  const central: [number, number][] = [[49, 55], [56, 63], [64, 70], [71, 78], [79, 85], [86, 93], [94, 100], [101, 108], [109, 115], [116, 123], [124, 130], [131, 136]];
  central.forEach(([a, z], f) => { for (let n = a; n <= z; n++) b.push({ numero: n, bloque: "central", fila: f + 1, pos: n - a + 1, zona: zona(n) }); });
  lateral("derecho", 137);
  return b;
}

export const PLANOS: Record<string, Plano> = {
  sala184: {
    nombre: "Sala principal · 184 butacas (VIP y General)",
    zonas: [
      { clave: "vip", nombre: "VIP", color: "#e3bd5e", precioPreventa: "10", precioRegular: "15" },
      { clave: "general", nombre: "General", color: "#8fa3b8", precioPreventa: "8", precioRegular: "10" },
    ],
    butacas: sala184(),
  },
};
