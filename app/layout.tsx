import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Bodoni_Moda, Figtree, Limelight } from "next/font/google";
import { getConfig } from "@/lib/datos";
import { temaACss } from "@/lib/tema";
import RegistrarSW from "@/components/RegistrarSW";
import "./globals.css";

const cuerpo = Figtree({ subsets: ["latin"], variable: "--f-cuerpo" });
const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--f-bodoni", style: ["normal", "italic"] });
// Tipografías de las otras dos plantillas: solo se descargan si el tema las usa.
const bigShoulders = Big_Shoulders({ subsets: ["latin"], variable: "--f-bigshoulders", weight: ["700", "900"], preload: false, adjustFontFallback: false });
const limelight = Limelight({ subsets: ["latin"], variable: "--f-limelight", weight: "400", preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const { escuela } = await getConfig();
  const titulo = `${escuela.nombre} | ${escuela.lema}`;
  return {
    title: { default: titulo, template: `%s | ${escuela.nombre}` },
    description: escuela.descripcion,
    applicationName: escuela.nombre,
    appleWebApp: { capable: true, title: escuela.nombre, statusBarStyle: "black-translucent" },
    icons: { icon: escuela.icono192 || "/icono-192.png", apple: escuela.icono192 || "/icono-192.png" },
    openGraph: { title: titulo, description: escuela.descripcion, locale: "es_VE", type: "website" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { tema } = await getConfig();
  return { themeColor: tema.fondo, colorScheme: "dark", viewportFit: "cover" };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { tema } = await getConfig();
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${cuerpo.variable} ${bodoni.variable} ${bigShoulders.variable} ${limelight.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: temaACss(tema) }} />
      </head>
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
