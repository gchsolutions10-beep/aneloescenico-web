"use client";
import { useState } from "react";
import { guardarTema } from "@/lib/acciones";
import { contraste, PLANTILLAS, type Tema } from "@/lib/tema";

const COLORES: [keyof Tema, string][] = [
  ["fondo", "Fondo"], ["superficie", "Tarjetas"], ["linea", "Líneas"], ["texto", "Texto"],
  ["tenue", "Texto secundario"], ["acento", "Acento (botones)"], ["sobreAcento", "Texto sobre acento"], ["telon", "Telón"],
];
const FUENTE: Record<Tema["titulos"], string> = {
  bodoni: "var(--f-bodoni), serif", bigshoulders: "var(--f-bigshoulders), sans-serif", limelight: "var(--f-limelight), serif",
};

export default function EditorTema({ inicial }: { inicial: Tema }) {
  const [t, setT] = useState<Tema>(inicial);
  const pon = <K extends keyof Tema>(k: K, v: Tema[K]) => setT((a) => ({ ...a, [k]: v }));

  const avisos = [
    contraste(t.texto, t.fondo) < 4.5 && "El texto casi no se distingue del fondo.",
    contraste(t.texto, t.superficie) < 4.5 && "El texto casi no se distingue sobre las tarjetas.",
    contraste(t.tenue, t.fondo) < 4.5 && "El texto secundario se lee con dificultad sobre el fondo.",
    contraste(t.sobreAcento, t.acento) < 4.5 && "El texto de los botones no se lee bien sobre el color de acento.",
    contraste(t.acento, t.fondo) < 3 && "El color de acento se pierde contra el fondo.",
  ].filter(Boolean) as string[];

  return (
    <form action={guardarTema} className="panel">
      <div className="cab">
        <h2>Colores y letra</h2>
        <div className="acciones">
          <span className="tenue">Plantillas:</span>
          {Object.entries(PLANTILLAS).map(([k, p]) => (
            <button key={k} type="button" className="btn sec chico" onClick={() => setT(p.tema)}>{p.nombre}</button>
          ))}
        </div>
      </div>

      <div className="colores">
        {COLORES.map(([k, nombre]) => (
          <label key={k} className="color">
            <input type="color" name={k} value={t[k] as string} onChange={(e) => pon(k, e.target.value as never)} />
            <span>{nombre}</span>
          </label>
        ))}
      </div>

      <div className="fila">
        <div className="campo">
          <label htmlFor="t-titulos">Letra de los títulos</label>
          <select id="t-titulos" name="titulos" value={t.titulos} onChange={(e) => pon("titulos", e.target.value as Tema["titulos"])}>
            <option value="bodoni">Clásica (Bodoni)</option>
            <option value="bigshoulders">Cartel en mayúsculas (Big Shoulders)</option>
            <option value="limelight">Marquesina (Limelight)</option>
          </select>
        </div>
        <div className="campo">
          <label htmlFor="t-tamano">Tamaño de letra: {t.tamanoBase} px</label>
          <input id="t-tamano" type="range" name="tamanoBase" min={14} max={22} value={t.tamanoBase} onChange={(e) => pon("tamanoBase", Number(e.target.value))} />
        </div>
        <div className="campo">
          <label htmlFor="t-radio">Esquinas redondeadas: {t.radio} px</label>
          <input id="t-radio" type="range" name="radio" min={0} max={24} value={t.radio} onChange={(e) => pon("radio", Number(e.target.value))} />
        </div>
      </div>
      <label className="casilla">
        <input type="checkbox" name="mostrarTelon" checked={t.mostrarTelon} onChange={(e) => pon("mostrarTelon", e.target.checked)} />
        Mostrar el telón a los lados del carrusel
      </label>

      <div>
        <h3 style={{ marginBottom: 8 }}>Vista previa</h3>
        <div className="previa">
          <div className="lienzo" style={{ background: t.fondo, color: t.texto, fontSize: t.tamanoBase, borderLeft: t.mostrarTelon ? `22px solid ${t.telon}` : undefined, borderRight: t.mostrarTelon ? `22px solid ${t.telon}` : undefined }}>
            <span style={{ color: t.acento, fontSize: ".76em", letterSpacing: ".2em", fontWeight: 700 }}>FORMACIÓN TEATRAL</span>
            <p className="t" style={{ fontFamily: FUENTE[t.titulos], fontSize: "2.2em", textTransform: t.titulos === "bigshoulders" ? "uppercase" : "none", fontWeight: t.titulos === "bigshoulders" ? 900 : 500 }}>
              Un escenario para <span style={{ color: t.acento }}>grandes artistas</span>
            </p>
            <div className="tj" style={{ background: t.superficie, borderColor: t.linea, borderRadius: t.radio }}>
              <b>Tarjeta de novedad</b>
              <div style={{ color: t.tenue, fontSize: ".9em" }}>Texto secundario de ejemplo</div>
            </div>
            <span className="b" style={{ background: t.acento, color: t.sobreAcento, borderRadius: t.radio + 2 }}>Inscripciones abiertas</span>
          </div>
        </div>
      </div>

      {avisos.length > 0 && (
        <div className="nota mal" role="status">
          <b>Revisa la legibilidad antes de guardar:</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>{avisos.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}
      <div className="acciones">
        <button className="btn">Guardar apariencia</button>
        <button type="button" className="btn sec" onClick={() => setT(inicial)}>Deshacer cambios</button>
      </div>
    </form>
  );
}
