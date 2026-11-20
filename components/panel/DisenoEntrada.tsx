"use client";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import SubirImagen from "@/components/SubirImagen";
import TarjetaEntrada from "@/components/TarjetaEntrada";
import { accionGuardarDiseno } from "@/lib/acciones-taquilla";
import { ADORNOS, type Adorno, contraste, DISENO_INICIAL, type DisenoEntrada, ESTILOS, PALETAS, POSICIONES, problemaQr } from "@/lib/diseno-entrada";
import { svgQr } from "@/lib/qr-entrada";

type Props = {
  funcionId: number;
  inicial: DisenoEntrada;
  titulo: string;
  fecha: string;
  lugar: string;
  escuela: string;
  aficheUrl: string | null;
  logoUrl: string;
};

/** Combinaciones listas de adornos. */
const COMBINACIONES: [string, Adorno[]][] = [["Función clásica", ["telon", "escenario"]], ["Gran estreno", ["marquesina", "estrellas"]], ["Teatro", ["telon", "mascaras"]], ["Noche mágica", ["escenario", "estrellas", "mascaras"]]];

/** Dibujitos de los botones de adornos. */
const ICONOS_ADORNO: Record<Adorno, React.ReactNode> = {
  telon: <><rect x="2" y="2" width="36" height="36" rx="4" fill="#f3eee9" /><path d="M2 2h9c-2 12-4 22-4 36H2z M38 2h-9c2 12 4 22 4 36h5z" fill="#8f1d2c" /><path d="M2 2h36v6q-3 4-6 0q-3 4-6 0q-3 4-6 0q-3 4-6 0q-3 4-6 0q-3 4-6 0z" fill="#8f1d2c" /><path d="M2 8q3 4 6 0q3 4 6 0q3 4 6 0q3 4 6 0q3 4 6 0q3 4 6 0" fill="none" stroke="#d6ab52" strokeWidth="1.2" /></>,
  escenario: <><rect x="2" y="2" width="36" height="36" rx="4" fill="#1d1517" /><path d="M9 3l3 0 9 25h-9z M31 3l-3 0-9 25h9z" fill="#fff" fillOpacity=".22" /><path d="M2 30q18-6 36 0v8H2z" fill="#8f1d2c" /><path d="M2 30q18-6 36 0" fill="none" stroke="#d6ab52" strokeWidth="1.2" /></>,
  mascaras: <><rect x="2" y="2" width="36" height="36" rx="4" fill="#1d1517" /><path d="M19 7q8-2 14 0q1 10-7 16q-8-6-7-16z" fill="#f6ecdf" /><path d="M7 13q8-2 14 0q1 10-7 16q-8-6-7-16z" fill="#d6ab52" /><path d="M10 18q2-2 3 0M15 18q2-2 3 0M11 23q3 3 6 0" fill="none" stroke="#1d1517" strokeWidth="1.3" strokeLinecap="round" /></>,
  marquesina: <><rect x="2" y="2" width="36" height="36" rx="4" fill="#1d1517" /><rect x="7" y="11" width="26" height="18" fill="none" stroke="#d6ab52" strokeOpacity=".6" />{[7, 13.5, 20, 26.5, 33].flatMap((x) => [<circle key={`a${x}`} cx={x} cy="11" r="1.6" fill="#d6ab52" />, <circle key={`b${x}`} cx={x} cy="29" r="1.6" fill="#d6ab52" />])}<circle cx="7" cy="20" r="1.6" fill="#d6ab52" /><circle cx="33" cy="20" r="1.6" fill="#d6ab52" /></>,
  estrellas: <><rect x="2" y="2" width="36" height="36" rx="4" fill="#0e1a33" />{[[10, 11, 4], [28, 9, 3], [31, 26, 4.5], [12, 29, 3], [20, 19, 2.5]].map(([x, y, r]) => <path key={x} d={Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.42 : r; return `${i ? "L" : "M"}${(x + q * Math.cos(a)).toFixed(1)} ${(y + q * Math.sin(a)).toFixed(1)}`; }).join(" ") + "Z"} fill="#f0cf7a" />)}</>,
};

const COLORES: [keyof DisenoEntrada, string, string][] = [
  ["colorPrincipal", "Principal", "La banda, o el velo sobre la imagen"],
  ["colorAcento", "Acento", "“Presenta”"],
  ["colorTexto", "Texto", "Sobre la banda o la imagen"],
  ["colorQr", "QR", "Siempre oscuro"],
  ["colorQrFondo", "Fondo del QR", "Siempre claro; también el cuerpo"],
];

function Guardar({ bloqueado }: { bloqueado: boolean }) {
  const { pending } = useFormStatus();
  return <button className="btn" disabled={bloqueado || pending}>{pending ? "Guardando…" : "Guardar diseño"}</button>;
}

export default function DisenoEntradaForm({ funcionId, inicial, titulo, fecha, lugar, escuela, aficheUrl, logoUrl }: Props) {
  const [d, setD] = useState<DisenoEntrada>(inicial);
  const [qr, setQr] = useState("");
  const cambiar = (c: Partial<DisenoEntrada>) => setD((x) => ({ ...x, ...c }));
  const problema = problemaQr(d);
  const alternar = (k: Adorno) => cambiar({ adornos: d.adornos.includes(k) ? d.adornos.filter((x) => x !== k) : [...d.adornos, k] });
  const imagen = d.fondo === "afiche" ? aficheUrl : d.fondo === "imagen" ? d.imagenUrl || null : null;

  // El QR de muestra se repinta con cada cambio de color o de logo.
  useEffect(() => {
    let vivo = true;
    svgQr(`${location.origin}/admin/validar?c=A7KQ2M9XWB4P`, d).then((s) => { if (vivo) setQr(s); });
    return () => { vivo = false; };
  }, [d]);

  return (
    <form action={accionGuardarDiseno} className="diseno-entrada">
      <input type="hidden" name="funcionId" value={funcionId} />
      {(["estilo", "posicion", "fondo", "imagenUrl", "colorPrincipal", "colorAcento", "colorTexto", "colorQr", "colorQrFondo", "colorAdorno"] as const).map((k) => <input key={k} type="hidden" name={k} value={String(d[k])} />)}
      <input type="hidden" name="logoEnQr" value={d.logoEnQr ? "1" : ""} />
      <input type="hidden" name="adornos" value={d.adornos.join(",")} />

      <section className="panel">
        <div className="campo">
          <span className="etq">Estilo</span>
          <div className="opciones-diseno dos">
            {ESTILOS.map(([k, n, t]) => (
              <button key={k} type="button" aria-pressed={d.estilo === k} onClick={() => cambiar({ estilo: k })}>
                <i className={`mini-entrada ${k}`} aria-hidden="true" /><span><b>{n}</b><small>{t}</small></span>
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <span className="etq">Posición del QR</span>
          <div className="opciones-diseno cuatro">
            {POSICIONES.map(([k, n]) => (
              <button key={k} type="button" aria-pressed={d.posicion === k} onClick={() => cambiar({ posicion: k })}>
                <i className={`mini-qr ${k}`} aria-hidden="true"><span /></i><small>{n}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <span className="etq">Fondo</span>
          <div className="pestanas" role="tablist">
            <button type="button" role="tab" aria-selected={d.fondo === "color"} onClick={() => cambiar({ fondo: "color" })}>Solo color</button>
            <button type="button" role="tab" aria-selected={d.fondo === "afiche"} disabled={!aficheUrl} title={aficheUrl ? undefined : "Esta función no tiene afiche"} onClick={() => cambiar({ fondo: "afiche" })}>Afiche de la obra</button>
            <button type="button" role="tab" aria-selected={d.fondo === "imagen"} onClick={() => cambiar({ fondo: "imagen" })}>Imagen propia</button>
          </div>
          {d.fondo === "imagen" && (
            <SubirImagen nombre="_imagen" inicial={d.imagenUrl} aspecto={3 / 5} ancho={900} etiqueta="Imagen para la entrada" ayuda="Se recorta sola al formato de la entrada (vertical)." alCambiar={(url) => cambiar({ imagenUrl: url })} />
          )}
          {!aficheUrl && <small>Para usar el afiche, súbelo en Funciones › Editar datos y afiche.</small>}
        </div>

        <div className="campo">
          <span className="etq">Adornos de teatro</span>
          <small>Se dibujan sobre la imagen o el color. Puedes combinar varios.</small>
          <div className="opciones-diseno adornos">
            {ADORNOS.map(([k, n]) => (
              <button key={k} type="button" aria-pressed={d.adornos.includes(k)} onClick={() => alternar(k)}>
                <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">{ICONOS_ADORNO[k]}</svg><small>{n}</small>
              </button>
            ))}
          </div>
          <div className="acciones">
            <small style={{ fontWeight: 600 }}>Ideas:</small>
            {COMBINACIONES.map(([n, a]) => <button key={n} type="button" className="btn sec chico" onClick={() => cambiar({ adornos: a })}>{n}</button>)}
            {d.adornos.length > 0 && <button type="button" className="btn sec chico" onClick={() => cambiar({ adornos: [] })}>Sin adornos</button>}
          </div>
          {(d.adornos.includes("telon") || d.adornos.includes("escenario")) && (
            <label className="color" style={{ maxWidth: 320 }}>
              <input type="color" value={d.colorAdorno} onChange={(e) => cambiar({ colorAdorno: e.target.value })} />
              <span>Color del telón y del escenario<small style={{ display: "block", fontWeight: 400, color: "var(--a-tenue)", fontSize: 12 }}>Máscaras, marquesina y estrellas usan el color de acento.</small></span>
            </label>
          )}
        </div>

        <div className="campo">
          <span className="etq">Colores</span>
          <div className="acciones">
            {PALETAS.map(([n, p]) => (
              <button key={n} type="button" className="btn sec chico paleta" onClick={() => cambiar(p)}>
                <i style={{ background: p.colorPrincipal }} /><i style={{ background: p.colorQr }} /><i style={{ background: p.colorAcento }} />{n}
              </button>
            ))}
          </div>
          <div className="colores">
            {COLORES.map(([k, n, t]) => (
              <label key={k} className="color">
                <input type="color" value={String(d[k])} onChange={(e) => cambiar({ [k]: e.target.value })} />
                <span>{n}<small style={{ display: "block", fontWeight: 400, color: "var(--a-tenue)", fontSize: 12 }}>{t}</small></span>
              </label>
            ))}
          </div>
          {problema
            ? <p className="nota mal" role="alert">{problema}</p>
            : <p className="nota" role="status">El QR se lee bien (contraste {contraste(d.colorQr, d.colorQrFondo).toFixed(1)}).</p>}
        </div>

        <label className="casilla">
          <input type="checkbox" checked={d.logoEnQr} onChange={(e) => cambiar({ logoEnQr: e.target.checked })} disabled={!logoUrl} />
          <span>Logo de la escuela en el centro del QR<small style={{ display: "block", fontWeight: 400, color: "var(--a-tenue)" }}>{logoUrl ? "El QR se hace más resistente para que se siga leyendo con el logo encima." : "Primero sube el logo en Apariencia."}</small></span>
        </label>

        <div className="acciones">
          <Guardar bloqueado={Boolean(problema)} />
          <button type="button" className="btn sec" onClick={() => setD(DISENO_INICIAL)}>Volver al diseño de la escuela</button>
        </div>
      </section>

      <aside className="vista-entrada" aria-label="Vista previa de la entrada">
        <span className="etq">Así se verá</span>
        <TarjetaEntrada d={d} imagen={imagen} qrSvg={qr} logoUrl={logoUrl}
          datos={{ escuela, titulo, fecha, lugar, numero: 24, zona: "VIP", comprador: "Nombre del cliente", codigo: "A7KQ2M9XWB4P" }} />
        <small className="tenue">Igual en la página de la compra y en el PDF. Los datos son de muestra.</small>
      </aside>
    </form>
  );
}
