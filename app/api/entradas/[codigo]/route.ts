// Entradas en PDF: una página por entrada, con su código QR, para guardarlas en el teléfono
// o imprimirlas y entrar a la función sin conexión. Solo para compras ya pagadas.
// Usa el diseño de la función (lib/diseno-entrada): las mismas medidas que la entrada en la web.
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { clip, endPath, PDFDocument, type PDFFont, type PDFImage, type PDFPage, popGraphicsState, pushGraphicsState, rectangle, rgb, StandardFonts } from "pdf-lib";
import { db, schema } from "@/db";
import { formasAdornos } from "@/lib/adornos";
import { getConfig } from "@/lib/datos";
import { ALTO, ANCHO, codigoLegible, type DisenoEntrada, normalizar, PIE, plano } from "@/lib/diseno-entrada";
import { pngQr } from "@/lib/qr-entrada";
import { fechaLarga, hora, slugify } from "@/lib/util";

const color = (hex: string) => { const n = parseInt(hex.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
const tinta = rgb(0.09, 0.07, 0.06), gris = rgb(0.44, 0.38, 0.36);

/** Las fuentes estándar del PDF no traen todos los caracteres: se reemplazan los que falten. */
function limpio(fuente: PDFFont, texto: string) {
  const ok = new Set(fuente.getCharacterSet());
  return [...texto.replace(/[  ]/g, " ")].map((c) => (ok.has(c.codePointAt(0)!) ? c : "?")).join("");
}

/** Corta un texto en líneas que quepan en el ancho dado. */
function lineas(fuente: PDFFont, texto: string, tam: number, ancho: number) {
  const out: string[] = [];
  let actual = "";
  for (const palabra of limpio(fuente, texto).split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(prueba, tam) <= ancho || !actual) actual = prueba;
    else { out.push(actual); actual = palabra; }
  }
  if (actual) out.push(actual);
  return out;
}

/** Trae una imagen (afiche, fondo o logo) para el PDF. Si falla, la entrada sale con el color. */
async function traerImagen(pdf: PDFDocument, url: string, base: string): Promise<PDFImage | null> {
  if (!url) return null;
  try {
    const r = await fetch(new URL(url, base), { cache: "no-store" });
    if (!r.ok) return null;
    const b = new Uint8Array(await r.arrayBuffer());
    if (b[0] === 0x89 && b[1] === 0x50) return await pdf.embedPng(b);
    if (b[0] === 0xff && b[1] === 0xd8) return await pdf.embedJpg(b);
    return null;
  } catch { return null; }
}

/** Dibuja la imagen cubriendo el recuadro (como object-fit: cover), recortada a sus bordes. */
function cubrir(p: PDFPage, img: PDFImage, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  const yPdf = ALTO - y - h;
  p.pushOperators(pushGraphicsState(), rectangle(x, yPdf, w, h), clip(), endPath());
  p.drawImage(img, { x: x + (w - iw) / 2, y: yPdf + (h - ih) / 2, width: iw, height: ih });
  p.pushOperators(popGraphicsState());
}

const redondeado = (w: number, h: number, r: number) => `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;

export async function GET(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const [o] = await db().select().from(schema.ordenes).where(eq(schema.ordenes.codigo, codigo));
  if (!o || o.estado !== "pagada") return NextResponse.json({ error: "No hay entradas para esta compra." }, { status: 404 });
  const [[f], entradas, config] = await Promise.all([
    db().select().from(schema.funciones).where(eq(schema.funciones.id, o.funcionId)),
    db().select().from(schema.entradas).where(eq(schema.entradas.ordenId, o.id)).orderBy(asc(schema.entradas.numero)),
    getConfig(),
  ]);
  const { escuela } = config;
  const base = process.env.SITIO_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  const d: DisenoEntrada = normalizar(f.disenoEntrada);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Entradas · ${f.titulo}`);
  pdf.setAuthor(escuela.nombre);
  const [normal, negrita, serif, imagen, logo] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    pdf.embedFont(StandardFonts.TimesRoman),
    traerImagen(pdf, d.fondo === "afiche" ? f.aficheUrl ?? "" : d.fondo === "imagen" ? d.imagenUrl : "", base),
    d.logoEnQr ? traerImagen(pdf, config.escuela.icono512 || config.escuela.logoUrl, base) : Promise.resolve(null),
  ]);
  const fecha = `${fechaLarga(f.fechaHora)}${f.fechaHora ? ` · ${hora(f.fechaHora)}` : ""}`;
  const pl = plano(d, Boolean(imagen));
  const texto = color(d.colorTexto), acento = color(d.colorAcento);

  for (const e of entradas) {
    const p = pdf.addPage([ANCHO, ALTO]);
    // Coordenadas desde arriba, como en la web; el PDF cuenta desde abajo.
    const txt = (t: string, x: number, y: number, tam: number, fuente: PDFFont, c = tinta) => p.drawText(limpio(fuente, t), { x, y: ALTO - y, size: tam, font: fuente, color: c });
    const derecha = (t: string, x: number, y: number, tam: number, fuente: PDFFont, c = tinta) => txt(t, x - fuente.widthOfTextAtSize(limpio(fuente, t), tam), y, tam, fuente, c);
    const centro = (t: string, cx: number, y: number, tam: number, fuente: PDFFont, c = tinta) => txt(t, cx - fuente.widthOfTextAtSize(limpio(fuente, t), tam) / 2, y, tam, fuente, c);

    // Cuerpo, banda (imagen o color) y velo
    p.drawRectangle({ x: 0, y: 0, width: ANCHO, height: ALTO, color: color(d.colorQrFondo) });
    const b = pl.banda;
    p.drawRectangle({ x: b.x, y: ALTO - b.y - b.h, width: b.w, height: b.h, color: color(d.colorPrincipal) });
    if (imagen) {
      cubrir(p, imagen, b.x, b.y, b.w, b.h);
      if (pl.velo) p.drawRectangle({ x: b.x, y: ALTO - b.y - b.h, width: b.w, height: b.h, color: color(d.colorPrincipal), opacity: pl.velo });
    }
    for (const fo of formasAdornos(d, pl)) {
      if (fo.tipo === "trazo") p.drawSvgPath(fo.d, { x: 0, y: ALTO, color: color(fo.color), opacity: fo.opacidad ?? 1, borderWidth: 0 });
      else p.drawCircle({ x: fo.x, y: ALTO - fo.y, size: fo.r, color: color(fo.color), opacity: fo.opacidad ?? 1 });
    }

    // Título
    const t = pl.titulo;
    txt(`${escuela.nombre.toUpperCase()} PRESENTA`, t.x, t.y + 9, 8, negrita, acento);
    let y = t.y + 34;
    for (const l of lineas(serif, f.titulo, 22, t.w).slice(0, 3)) { txt(l, t.x, y, 22, serif, texto); y += 23.5; }
    for (const l of lineas(normal, fecha, 9, t.w).slice(0, 2)) { txt(l, t.x, y, 9, normal, texto); y += 11; }

    // Butaca, zona, lugar y comprador
    const dt = pl.datos;
    const fuerte = dt.claro ? texto : tinta, suave = dt.claro ? texto : gris;
    if (dt.fila) {
      txt("BUTACA", dt.x, dt.y + 8, 7.5, negrita, suave);
      txt(String(e.numero), dt.x, dt.y + 42, 34, negrita, fuerte);
      derecha("ZONA", dt.x + dt.w, dt.y + 8, 7.5, negrita, suave);
      derecha(e.zona, dt.x + dt.w, dt.y + 26, 14, negrita, fuerte);
      if (f.lugar) derecha(f.lugar, dt.x + dt.w, dt.y + 40, 8.5, normal, suave);
      if (o.compradorNombre) txt(o.compradorNombre, dt.x, dt.y + 60, 9, normal, suave);
    } else {
      txt("BUTACA", dt.x, dt.y + 8, 7.5, negrita, suave);
      txt(String(e.numero), dt.x, dt.y + 38, 30, negrita, fuerte);
      txt("ZONA", dt.x, dt.y + 62, 7.5, negrita, suave);
      let yz = dt.y + 78;
      for (const l of lineas(negrita, e.zona, 14, dt.w).slice(0, 2)) { txt(l, dt.x, yz, 14, negrita, fuerte); yz += 15; }
      for (const l of lineas(normal, f.lugar, 8.5, dt.w).slice(0, 2)) { txt(l, dt.x, yz, 8.5, normal, suave); yz += 10; }
      yz += 8;
      for (const l of lineas(normal, o.compradorNombre ?? "", 9, dt.w).slice(0, 3)) { txt(l, dt.x, yz, 9, normal, suave); yz += 11; }
    }

    if (pl.corte != null) for (let x = 22; x < ANCHO - 22; x += 8) p.drawLine({ start: { x, y: ALTO - pl.corte }, end: { x: x + 4, y: ALTO - pl.corte }, thickness: 1, color: rgb(0.77, 0.74, 0.72) });

    // QR (con su recuadro claro y el logo, si el diseño lo pide)
    const q = pl.qr;
    if (q.recuadro) {
      const l = q.lado + 2 * q.recuadro;
      p.drawSvgPath(redondeado(l, l, 10), { x: q.x - q.recuadro, y: ALTO - (q.y - q.recuadro), color: color(d.colorQrFondo) });
    }
    const png = await pdf.embedPng(await pngQr(`${base}/admin/validar?c=${e.codigo}`, d));
    p.drawImage(png, { x: q.x, y: ALTO - q.y - q.lado, width: q.lado, height: q.lado });
    if (logo) {
      const l = q.lado * 0.22, lx = q.x + q.lado * 0.39, ly = q.y + q.lado * 0.39;
      p.drawSvgPath(redondeado(l, l, l * 0.18), { x: lx, y: ALTO - ly, color: color(d.colorQrFondo) });
      const m = l * 0.06;
      p.drawImage(logo, { x: lx + m, y: ALTO - ly - l + m, width: l - 2 * m, height: l - 2 * m });
    }
    centro(codigoLegible(e.codigo), q.x + q.lado / 2, pl.codigo.y + 4, 11, negrita, pl.codigo.claro ? texto : tinta);
    centro(PIE, ANCHO / 2, pl.pie.y + 3, 7.5, normal, pl.pie.claro ? texto : gris);
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="entradas-${slugify(f.titulo)}.pdf"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
