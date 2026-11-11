"use client";
import { useState } from "react";

type Props = {
  nombre: string; // name del campo oculto que recibe la URL
  inicial?: string | null;
  aspecto: number; // ancho / alto del recorte, p. ej. 16/9, 2/3, 1
  ancho: number; // ancho final en píxeles
  etiqueta: string;
  ayuda?: string;
  /** Para el logo: conserva transparencia y genera además los íconos de la app. */
  logo?: { fondo: string };
};

type Encuadre = 0 | 0.5 | 1;

async function subir(blob: Blob, nombre: string): Promise<string> {
  const cuerpo = new FormData();
  cuerpo.append("archivo", new File([blob], nombre, { type: blob.type }));
  const r = await fetch("/api/subir", { method: "POST", body: cuerpo });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) throw new Error(j.error || "No se pudo subir la imagen.");
  return j.url;
}

function aBlob(c: HTMLCanvasElement, tipo: string, calidad?: number) {
  return new Promise<Blob>((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo procesar la imagen."))), tipo, calidad));
}

/** Recorta la imagen al aspecto pedido (ajuste automático) y la reduce al ancho final. */
function recortar(img: ImageBitmap, aspecto: number, ancho: number, encuadre: Encuadre) {
  let sw = img.width, sh = img.height;
  if (sw / sh > aspecto) sw = Math.round(sh * aspecto); else sh = Math.round(sw / aspecto);
  const sx = Math.round((img.width - sw) * encuadre), sy = Math.round((img.height - sh) * encuadre);
  const w = Math.min(ancho, sw), h = Math.round(w / aspecto);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return c;
}

function icono(origen: HTMLCanvasElement, lado: number, fondo: string) {
  const c = document.createElement("canvas");
  c.width = c.height = lado;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, lado, lado);
  const m = Math.round(lado * 0.1); // margen de seguridad para íconos "maskable"
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(origen, m, m, lado - 2 * m, lado - 2 * m);
  return c;
}

export default function SubirImagen({ nombre, inicial, aspecto, ancho, etiqueta, ayuda, logo }: Props) {
  const [url, setUrl] = useState(inicial ?? "");
  const [iconos, setIconos] = useState({ i192: "", i512: "" });
  const [estado, setEstado] = useState<"" | "subiendo" | string>("");
  const [encuadre, setEncuadre] = useState<Encuadre>(0.5);
  const [archivo, setArchivo] = useState<File | null>(null);
  // Hacia dónde sobra imagen: a los lados (h) o arriba y abajo (v).
  const [eje, setEje] = useState<"h" | "v">("v");

  async function procesar(f: File, enc: Encuadre) {
    setEstado("subiendo");
    try {
      const img = await createImageBitmap(f);
      setEje(img.width / img.height > aspecto ? "h" : "v");
      const lienzo = recortar(img, aspecto, ancho, enc);
      const blob = logo ? await aBlob(lienzo, "image/png") : await aBlob(lienzo, "image/jpeg", 0.86);
      setUrl(await subir(blob, logo ? "logo.png" : "foto.jpg"));
      if (logo) {
        const [i192, i512] = await Promise.all([192, 512].map(async (l) => subir(await aBlob(icono(lienzo, l, logo.fondo), "image/png"), `icono-${l}.png`)));
        setIconos({ i192, i512 });
      }
      setEstado("");
    } catch (e) {
      setEstado(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    }
  }

  const subiendo = estado === "subiendo";
  return (
    <div className="campo subir">
      <span className="etq">{etiqueta}</span>
      <div className="vista" style={{ aspectRatio: aspecto, width: aspecto >= 1 ? 320 : 160 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="Vista previa" /> : <span>Sin imagen</span>}
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={etiqueta}
        disabled={subiendo}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { setArchivo(f); procesar(f, encuadre); }
        }}
      />
      {archivo && !logo && (
        <div className="encuadre">
          Encuadre:
          {([[0, eje === "v" ? "Arriba" : "Izquierda"], [0.5, "Centro"], [1, eje === "v" ? "Abajo" : "Derecha"]] as [Encuadre, string][]).map(([v, t]) => (
            <button key={v} type="button" className={`btn chico${encuadre === v ? "" : " sec"}`} disabled={subiendo} onClick={() => { setEncuadre(v); procesar(archivo, v); }}>{t}</button>
          ))}
        </div>
      )}
      {subiendo && <small role="status">Ajustando y subiendo la imagen…</small>}
      {estado && !subiendo && <small role="alert" style={{ color: "var(--a-mal)" }}>{estado}</small>}
      {ayuda && <small>{ayuda}</small>}
      <input type="hidden" name={nombre} value={url} />
      {logo && <><input type="hidden" name="icono192" value={iconos.i192} /><input type="hidden" name="icono512" value={iconos.i512} /></>}
    </div>
  );
}
