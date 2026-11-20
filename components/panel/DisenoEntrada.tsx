"use client";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import SubirImagen from "@/components/SubirImagen";
import TarjetaEntrada from "@/components/TarjetaEntrada";
import { accionGuardarDiseno } from "@/lib/acciones-taquilla";
import { contraste, DISENO_INICIAL, type DisenoEntrada, ESTILOS, PALETAS, POSICIONES, problemaQr } from "@/lib/diseno-entrada";
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
      {(["estilo", "posicion", "fondo", "imagenUrl", "colorPrincipal", "colorAcento", "colorTexto", "colorQr", "colorQrFondo"] as const).map((k) => <input key={k} type="hidden" name={k} value={String(d[k])} />)}
      <input type="hidden" name="logoEnQr" value={d.logoEnQr ? "1" : ""} />

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
