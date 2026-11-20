// El QR de una entrada con los colores de su diseño. Funciona en el servidor y en el navegador.
import QRCode from "qrcode";
import type { DisenoEntrada } from "./diseno-entrada";

type ColoresQr = Pick<DisenoEntrada, "colorQr" | "colorQrFondo" | "logoEnQr">;

/** Con logo en el centro se usa la corrección de errores más alta: el QR se lee aunque el logo tape una parte. */
export const opcionesQr = (d: ColoresQr) => ({
  margin: 1,
  errorCorrectionLevel: (d.logoEnQr ? "H" : "M") as "H" | "M",
  color: { dark: `${d.colorQr}ff`, light: `${d.colorQrFondo}ff` },
});

export const svgQr = (texto: string, d: ColoresQr) => QRCode.toString(texto, { type: "svg", ...opcionesQr(d) });
export const pngQr = (texto: string, d: ColoresQr) => QRCode.toBuffer(texto, { type: "png", width: 600, ...opcionesQr(d) });
