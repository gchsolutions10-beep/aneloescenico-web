// Una entrada dibujada con su diseño. Sirve en el servidor (página de la compra) y en el
// navegador (vista previa del panel): no usa estado. Las medidas vienen de lib/diseno-entrada.
import type { CSSProperties } from "react";
import { ALTO, ANCHO, type Caja, codigoLegible, type DatosEntrada, type DisenoEntrada, PIE, plano } from "@/lib/diseno-entrada";

const u = (n: number) => `${(n / ANCHO) * 100}cqw`;
const caja = (c: Caja): CSSProperties => ({ position: "absolute", left: `${(c.x / ANCHO) * 100}%`, top: `${(c.y / ALTO) * 100}%`, width: `${(c.w / ANCHO) * 100}%`, height: `${(c.h / ALTO) * 100}%` });

type Props = {
  d: DisenoEntrada;
  datos: DatosEntrada;
  /** SVG del QR ya pintado con los colores del diseño. */
  qrSvg: string;
  /** Imagen de fondo ya resuelta (afiche o imagen propia), o null para usar el color. */
  imagen: string | null;
  logoUrl?: string;
  usada?: boolean;
};

export default function TarjetaEntrada({ d, datos, qrSvg, imagen, logoUrl, usada }: Props) {
  const p = plano(d, Boolean(imagen));
  const tinta = "#17110f", gris = "#6f625c";
  const sobre = (claro: boolean) => (claro ? d.colorTexto : tinta);
  const tenue = (claro: boolean) => (claro ? d.colorTexto : gris);
  const q = p.qr;
  const etiqueta: CSSProperties = { display: "block", fontSize: u(7.5), fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.8 };

  return (
    <div className={`entrada-d${usada ? " usada" : ""}`} style={{ position: "relative", aspectRatio: `${ANCHO} / ${ALTO}`, containerType: "inline-size", background: d.colorQrFondo, overflow: "hidden", borderRadius: 12, color: tinta, fontFamily: "system-ui, sans-serif", lineHeight: 1.15 }}>
      <div style={{ ...caja(p.banda), background: d.colorPrincipal }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {imagen && <img src={imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        {p.velo > 0 && <div style={{ position: "absolute", inset: 0, background: d.colorPrincipal, opacity: p.velo }} />}
      </div>

      <div style={{ ...caja(p.titulo), color: d.colorTexto, display: "grid", alignContent: "start", gap: u(4) }}>
        <span style={{ fontSize: u(8), fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: d.colorAcento }}>{datos.escuela} presenta</span>
        <b style={{ fontFamily: "var(--f-titulos, Georgia), Georgia, serif", fontWeight: 400, fontSize: u(22), lineHeight: 1.08, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{datos.titulo}</b>
        <span style={{ fontSize: u(9), opacity: 0.9 }}>{datos.fecha}</span>
      </div>

      <div style={{ ...caja(p.datos), color: sobre(p.datos.claro), display: "flex", flexDirection: p.datos.fila ? "row" : "column", justifyContent: p.datos.fila ? "space-between" : "flex-start", gap: u(p.datos.fila ? 8 : 12), flexWrap: p.datos.fila ? "wrap" : "nowrap", alignContent: "flex-start" }}>
        <div><small style={etiqueta}>Butaca</small><b style={{ fontSize: u(p.datos.fila ? 34 : 30), fontWeight: 800, lineHeight: 1 }}>{datos.numero}</b></div>
        <div style={{ textAlign: p.datos.fila ? "right" : "left" }}>
          <small style={etiqueta}>Zona</small><b style={{ fontSize: u(14) }}>{datos.zona}</b>
          {datos.lugar && <span style={{ display: "block", fontSize: u(8.5), color: tenue(p.datos.claro), marginTop: u(2) }}>{datos.lugar}</span>}
        </div>
        {datos.comprador && <span style={{ flexBasis: p.datos.fila ? "100%" : "auto", fontSize: u(9), color: tenue(p.datos.claro) }}>{datos.comprador}</span>}
      </div>

      {p.corte != null && <div style={{ position: "absolute", left: "7%", right: "7%", top: `${(p.corte / ALTO) * 100}%`, borderTop: "1.5px dashed #c4bdb8" }} />}

      {q.recuadro > 0 && <div style={{ ...caja({ x: q.x - q.recuadro, y: q.y - q.recuadro, w: q.lado + 2 * q.recuadro, h: q.lado + 2 * q.recuadro }), background: d.colorQrFondo, borderRadius: u(10) }} />}
      <div style={caja({ x: q.x, y: q.y, w: q.lado, h: q.lado })}>
        <div style={{ width: "100%", height: "100%" }} className="entrada-d-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {d.logoEnQr && logoUrl && <img src={logoUrl} alt="" style={{ position: "absolute", left: "39%", top: "39%", width: "22%", height: "22%", objectFit: "contain", background: d.colorQrFondo, borderRadius: "18%", padding: "2%", boxSizing: "border-box" }} />}
      </div>
      <code style={{ position: "absolute", left: `${((q.x - 20) / ANCHO) * 100}%`, width: `${((q.lado + 40) / ANCHO) * 100}%`, top: `${((p.codigo.y - 9) / ALTO) * 100}%`, textAlign: "center", fontSize: u(11), fontWeight: 700, letterSpacing: ".06em", color: sobre(p.codigo.claro), fontFamily: "ui-monospace, monospace" }}>{codigoLegible(datos.codigo)}</code>
      <span style={{ position: "absolute", left: 0, right: 0, top: `${((p.pie.y - 8) / ALTO) * 100}%`, textAlign: "center", fontSize: u(7.5), color: tenue(p.pie.claro) }}>{PIE}</span>
      {usada && <strong style={{ position: "absolute", top: "45%", left: "10%", right: "10%", textAlign: "center", background: "#a32a2a", color: "#fff", padding: u(6), borderRadius: u(6), fontSize: u(14), transform: "rotate(-8deg)" }}>Ya utilizada</strong>}
    </div>
  );
}
