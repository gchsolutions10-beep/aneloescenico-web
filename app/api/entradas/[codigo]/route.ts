// Entradas en PDF: una página por entrada, con su código QR, para guardarlas en el teléfono
// o imprimirlas y entrar a la función sin conexión. Solo para compras ya pagadas.
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import { db, schema } from "@/db";
import { getConfig } from "@/lib/datos";
import { fechaLarga, hora, slugify } from "@/lib/util";

const ANCHO = 300, ALTO = 500, M = 22;
const vino = rgb(0.078, 0.039, 0.047), oro = rgb(0.84, 0.67, 0.32), tinta = rgb(0.09, 0.07, 0.06), gris = rgb(0.42, 0.36, 0.33);

/** Las fuentes estándar del PDF no traen todos los caracteres: se reemplazan los que falten. */
function limpio(fuente: PDFFont, texto: string) {
  const ok = new Set(fuente.getCharacterSet());
  return [...texto.replace(/[  ]/g, " ")].map((c) => (ok.has(c.codePointAt(0)!) ? c : "?")).join("");
}

/** Corta un texto en líneas que quepan en el ancho dado. */
function lineas(fuente: PDFFont, texto: string, tam: number, ancho: number) {
  const out: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(prueba, tam) <= ancho || !actual) actual = prueba;
    else { out.push(actual); actual = palabra; }
  }
  if (actual) out.push(actual);
  return out;
}

export async function GET(req: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const [o] = await db().select().from(schema.ordenes).where(eq(schema.ordenes.codigo, codigo));
  if (!o || o.estado !== "pagada") return NextResponse.json({ error: "No hay entradas para esta compra." }, { status: 404 });
  const [[f], entradas, { escuela }] = await Promise.all([
    db().select().from(schema.funciones).where(eq(schema.funciones.id, o.funcionId)),
    db().select().from(schema.entradas).where(eq(schema.entradas.ordenId, o.id)).orderBy(asc(schema.entradas.numero)),
    getConfig(),
  ]);
  const base = process.env.SITIO_URL?.replace(/\/$/, "") || new URL(req.url).origin;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Entradas · ${f.titulo}`);
  pdf.setAuthor(escuela.nombre);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const fecha = `${fechaLarga(f.fechaHora)}${f.fechaHora ? ` · ${hora(f.fechaHora)}` : ""}`;

  for (const e of entradas) {
    const p = pdf.addPage([ANCHO, ALTO]);
    const txt = (t: string, x: number, y: number, tam: number, fuente: PDFFont, color = tinta) => p.drawText(limpio(fuente, t), { x, y, size: tam, font: fuente, color });

    // Banda superior con el nombre de la escuela y la obra
    p.drawRectangle({ x: 0, y: ALTO - 150, width: ANCHO, height: 150, color: vino });
    txt(`${escuela.nombre.toUpperCase()} PRESENTA`, M, ALTO - 34, 8, negrita, oro);
    let y = ALTO - 62;
    for (const l of lineas(serif, limpio(serif, f.titulo), 22, ANCHO - 2 * M).slice(0, 3)) { txt(l, M, y, 22, serif, rgb(0.96, 0.93, 0.87)); y -= 24; }
    for (const l of lineas(normal, limpio(normal, fecha), 9, ANCHO - 2 * M).slice(0, 2)) { txt(l, M, Math.max(y - 2, ALTO - 140), 9, normal, rgb(0.85, 0.8, 0.75)); y -= 12; }

    // Butaca y zona
    txt("BUTACA", M, ALTO - 176, 7.5, negrita, gris);
    txt(String(e.numero), M, ALTO - 214, 36, negrita);
    txt("ZONA", ANCHO - M - 90, ALTO - 176, 7.5, negrita, gris);
    txt(e.zona, ANCHO - M - 90, ALTO - 196, 14, negrita);
    if (f.lugar) txt(f.lugar, ANCHO - M - 90, ALTO - 212, 8.5, normal, gris);
    if (o.compradorNombre) txt(o.compradorNombre, M, ALTO - 234, 9, normal, gris);

    // Línea de corte y QR
    for (let x = M; x < ANCHO - M; x += 8) p.drawLine({ start: { x, y: ALTO - 250 }, end: { x: x + 4, y: ALTO - 250 }, thickness: 1, color: rgb(0.75, 0.72, 0.7) });
    const png = await pdf.embedPng(await QRCode.toBuffer(`${base}/admin/validar?c=${e.codigo}`, { type: "png", margin: 1, width: 600, errorCorrectionLevel: "M" }));
    const lado = 176;
    p.drawImage(png, { x: (ANCHO - lado) / 2, y: 62, width: lado, height: lado });
    const cod = e.codigo.replace(/(.{4})(?=.)/g, "$1 ");
    txt(cod, (ANCHO - negrita.widthOfTextAtSize(cod, 11)) / 2, 44, 11, negrita);
    const pie = "Válida para una sola entrada. Muéstrala en la puerta.";
    txt(pie, (ANCHO - normal.widthOfTextAtSize(limpio(normal, pie), 7.5)) / 2, 24, 7.5, normal, gris);
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
