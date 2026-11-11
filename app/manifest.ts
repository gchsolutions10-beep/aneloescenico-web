import type { MetadataRoute } from "next";
import { getConfig } from "@/lib/datos";

// App instalable: nombre, colores e íconos salen de lo configurado en el panel.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { tema, escuela } = await getConfig();
  return {
    name: `${escuela.nombre} | ${escuela.lema}`,
    short_name: escuela.nombre,
    description: escuela.descripcion,
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: tema.fondo,
    theme_color: tema.fondo,
    icons: [
      { src: escuela.icono192 || "/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: escuela.icono512 || "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: escuela.icono512 || "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
