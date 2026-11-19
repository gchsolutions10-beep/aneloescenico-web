"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { consultarEntrada, moverEntrada } from "@/lib/acciones-taquilla";
import type { Consulta, EstadoPuerta, Movida } from "@/lib/puerta";

type Modo = "preguntar" | "entrada" | "salida";
const MODOS: [Modo, string, string][] = [
  ["preguntar", "Preguntar", "Muestra la entrada y tú eliges qué hacer."],
  ["entrada", "Entrada rápida", "Da entrada (o regreso) apenas lee el código."],
  ["salida", "Salida", "Registra la salida temporal apenas lee el código."],
];
const ESTADO: Record<EstadoPuerta, [string, string]> = {
  sin_usar: ["Sin usar", "azul"], dentro: ["Adentro", "si"], fuera: ["Salió · puede volver", "oro"], anulada: ["Anulada", "mal"],
};

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/** Pitido corto: agudo si salió bien, grave si hay problema. */
function pitar(ok: boolean) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const c = new Ctx(); const o = c.createOscillator(); const g = c.createGain();
    o.frequency.value = ok ? 1046 : 220; o.type = ok ? "sine" : "square"; g.gain.value = 0.08;
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + (ok ? 0.12 : 0.35));
    navigator.vibrate?.(ok ? 60 : [80, 60, 80]);
  } catch { /* sin sonido */ }
}

export default function Puerta({ inicial, puedeDeshacer }: { inicial: Consulta | null; puedeDeshacer: boolean }) {
  const [r, setR] = useState<Consulta | null>(inicial);
  const [modo, setModo] = useState<Modo>("preguntar");
  const [camara, setCamara] = useState<"apagada" | "leyendo" | "pausa" | "error">("apagada");
  const [errorCam, setErrorCam] = useState("");
  const [codigo, setCodigo] = useState("");
  const [ocupado, empezar] = useTransition();
  const video = useRef<HTMLVideoElement>(null);
  const flujo = useRef<MediaStream | null>(null);
  const ultimo = useRef({ c: "", t: 0 });
  const modoRef = useRef(modo);
  useEffect(() => { modoRef.current = modo; }, [modo]);

  const apagar = useCallback(() => {
    flujo.current?.getTracks().forEach((t) => t.stop());
    flujo.current = null;
    setCamara("apagada");
  }, []);
  useEffect(() => apagar, [apagar]);

  const procesar = useCallback((texto: string, desdeCamara: boolean) => {
    empezar(async () => {
      const m = modoRef.current;
      let res = await consultarEntrada(texto);
      if (desdeCamara && res.resultado === "ok") {
        const e = res.entrada.estado;
        if (m === "entrada" && (e === "sin_usar" || e === "fuera")) res = await moverEntrada(res.entrada.codigo, "entrar", false);
        else if (m === "salida" && e === "dentro") res = await moverEntrada(res.entrada.codigo, "salir", false);
        else if (m !== "preguntar") res = { ...res, hecho: { ok: false, mensaje: e === "dentro" ? "Esta entrada ya está adentro." : e === "anulada" ? "Entrada anulada: no puede entrar." : "Esta entrada no está adentro: no puede salir." } };
      }
      const ok = res.resultado === "ok" && res.entrada.estado !== "anulada" && (res.hecho ? res.hecho.ok : true);
      pitar(ok);
      setR(res);
      // En los modos rápidos la cámara sigue leyendo sola después de un momento.
      if (desdeCamara && m !== "preguntar") setTimeout(() => setCamara((c) => (c === "pausa" ? "leyendo" : c)), ok ? 1500 : 3000);
    });
  }, []);

  // Bucle de lectura: lector nativo si el teléfono lo trae, jsQR si no (iPhone).
  useEffect(() => {
    if (camara !== "leyendo") return;
    let vivo = true;
    let detector: Detector | null = null;
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    if (BD) try { detector = new BD({ formats: ["qr_code"] }); } catch { detector = null; }
    const lienzo = document.createElement("canvas");
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    let jsQR: typeof import("jsqr").default | null = null;
    if (!detector) import("jsqr").then((m) => { jsQR = m.default; });

    const vuelta = async () => {
      if (!vivo) return;
      const v = video.current;
      if (v && v.readyState >= 2) {
        let texto = "";
        try {
          if (detector) texto = (await detector.detect(v))[0]?.rawValue ?? "";
          else if (jsQR && ctx) {
            const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w) || 360;
            lienzo.width = w; lienzo.height = h;
            ctx.drawImage(v, 0, 0, w, h);
            texto = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" })?.data ?? "";
          }
        } catch { /* cuadro ilegible */ }
        const ahora = Date.now();
        if (texto && vivo && !(texto === ultimo.current.c && ahora - ultimo.current.t < 4000)) {
          ultimo.current = { c: texto, t: ahora };
          setCamara("pausa");
          procesar(texto, true);
          return;
        }
      }
      setTimeout(vuelta, 160);
    };
    vuelta();
    return () => { vivo = false; };
  }, [camara, procesar]);

  async function encender() {
    setErrorCam("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      flujo.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play(); }
      setCamara("leyendo");
    } catch (e) {
      setCamara("error");
      setErrorCam(e instanceof Error && e.name === "NotAllowedError"
        ? "El navegador no dio permiso para usar la cámara. Actívalo en los ajustes del navegador para este sitio y vuelve a intentarlo."
        : "No se pudo abrir la cámara. Usa el campo de código de abajo, o abre el QR con la cámara del teléfono.");
    }
  }

  const accion = (movida: Movida, todas = false) => {
    if (r?.resultado !== "ok") return;
    if (movida === "deshacer" && !confirm("¿Deshacer el ingreso? La entrada queda como si no se hubiera usado.")) return;
    empezar(async () => {
      const res = await moverEntrada(r.entrada.codigo, movida, todas);
      pitar(res.resultado === "ok" && Boolean(res.hecho?.ok));
      setR(res);
    });
  };
  const siguiente = () => { setR(null); setCodigo(""); if (flujo.current) setCamara("leyendo"); };

  return (
    <div className="puerta">
      <section className="panel puerta-escaner">
        <div className="cab">
          <h2>Escáner</h2>
          <div className="pestanas" role="tablist" aria-label="Qué hacer al leer un código">
            {MODOS.map(([k, n, d]) => <button key={k} type="button" role="tab" aria-selected={modo === k} title={d} onClick={() => setModo(k)}>{n}</button>)}
          </div>
        </div>
        <p className="tenue" style={{ fontSize: 13 }}>{MODOS.find((m) => m[0] === modo)![2]}</p>
        <div className={`puerta-visor${camara === "leyendo" || camara === "pausa" ? " activo" : ""}`}>
          <video ref={video} playsInline muted aria-label="Vista de la cámara" />
          {camara === "leyendo" && <span className="puerta-mira" aria-hidden="true" />}
          {camara === "pausa" && <span className="puerta-pausa">{ocupado ? "Leyendo…" : "Código leído"}</span>}
          {(camara === "apagada" || camara === "error") && (
            <div className="puerta-apagado">
              <button type="button" className="btn" onClick={encender}>Abrir cámara</button>
              <small>Apunta al código QR de la entrada, en papel o en el teléfono del cliente.</small>
            </div>
          )}
        </div>
        {errorCam && <p className="nota mal">{errorCam}</p>}
        <div className="acciones">
          {camara === "pausa" && <button type="button" className="btn" onClick={siguiente}>Escanear siguiente</button>}
          {(camara === "leyendo" || camara === "pausa") && <button type="button" className="btn sec" onClick={apagar}>Apagar cámara</button>}
        </div>
        <form className="puerta-manual" onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) procesar(codigo, false); }}>
          <label htmlFor="v-c">¿No lee el QR? Escribe el código impreso debajo</label>
          <div>
            <input id="v-c" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} placeholder="Ej. 7KQ2M9XW" />
            <button className="btn sec" disabled={ocupado}>Buscar</button>
          </div>
        </form>
      </section>

      <section className="puerta-resultado" aria-live="polite">
        {!r ? (
          <div className="panel vacio"><p>Escanea una entrada para ver aquí la butaca, quién la compró y qué se puede hacer.</p></div>
        ) : r.resultado === "inexistente" ? (
          <div className="panel puerta-ficha mal" role="alert">
            <span className="puerta-icono">✕</span>
            <h2>Entrada no válida</h2>
            <p>{r.codigo ? <>El código <b>{r.codigo}</b> no corresponde a ninguna entrada.</> : "El código leído no es una entrada de A-Nelo."}</p>
            <button type="button" className="btn sec" onClick={siguiente}>Escanear siguiente</button>
          </div>
        ) : (
          <Ficha r={r} ocupado={ocupado} puedeDeshacer={puedeDeshacer} accion={accion} siguiente={siguiente} />
        )}
      </section>
    </div>
  );
}

function Ficha({ r, ocupado, puedeDeshacer, accion, siguiente }: { r: Extract<Consulta, { resultado: "ok" }>; ocupado: boolean; puedeDeshacer: boolean; accion: (m: Movida, todas?: boolean) => void; siguiente: () => void }) {
  const e = r.entrada;
  const [txt, clase] = ESTADO[e.estado];
  const tono = r.hecho ? (r.hecho.ok ? "ok" : "mal") : e.estado === "anulada" ? "mal" : e.estado === "dentro" ? "aviso" : "ok";
  const porEntrar = r.hermanas.filter((h) => h.estado === "sin_usar" || h.estado === "fuera").length;
  const adentro = r.hermanas.filter((h) => h.estado === "dentro").length;

  return (
    <div className={`panel puerta-ficha ${tono}`}>
      {r.hecho && <p className={`puerta-hecho ${r.hecho.ok ? "ok" : "mal"}`} role="status"><span className="puerta-icono">{r.hecho.ok ? "✓" : "!"}</span>{r.hecho.mensaje}</p>}
      {!r.funcion.esHoy && <p className="nota aviso">Ojo: esta entrada es para <b>{r.funcion.cuando}</b>, no para hoy.</p>}
      <div className="puerta-datos">
        <div className="puerta-butaca"><small>Butaca</small><b>{e.numero}</b><span>{e.zona}</span></div>
        <div style={{ display: "grid", gap: 6, alignContent: "start" }}>
          <span className={`pastilla ${clase}`} style={{ justifySelf: "start" }}>{txt}{e.desde && e.estado !== "sin_usar" ? ` · ${e.desde}` : ""}</span>
          <h2>{r.funcion.titulo}</h2>
          <span className="tenue">{r.funcion.cuando}</span>
          <span>{r.comprador}</span>
        </div>
      </div>

      <div className="puerta-botones">
        {e.estado === "sin_usar" && <button type="button" className="btn grande verde" disabled={ocupado} onClick={() => accion("entrar")}>Dar entrada</button>}
        {e.estado === "fuera" && <button type="button" className="btn grande verde" disabled={ocupado} onClick={() => accion("entrar")}>Volver a entrar</button>}
        {e.estado === "dentro" && <button type="button" className="btn grande" disabled={ocupado} onClick={() => accion("salir")}>Registrar salida temporal</button>}
        {e.estado === "anulada" && <p className="nota mal">Esta compra fue anulada o reembolsada. La persona no puede entrar con esta entrada.</p>}
      </div>

      {r.hermanas.length > 1 && (
        <div className="puerta-grupo">
          <div className="cab"><h3>Esta compra tiene {r.hermanas.length} entradas</h3>
            <div className="acciones">
              {porEntrar > 1 && <button type="button" className="btn chico verde" disabled={ocupado} onClick={() => accion("entrar", true)}>Dar entrada a las {porEntrar}</button>}
              {adentro > 1 && <button type="button" className="btn sec chico" disabled={ocupado} onClick={() => accion("salir", true)}>Salida de las {adentro}</button>}
            </div>
          </div>
          <ul>
            {r.hermanas.map((h) => <li key={h.codigo} data-esta={h.codigo === e.codigo || undefined}><b>{h.numero}</b><span>{h.zona}</span><span className={`pastilla ${ESTADO[h.estado][1]}`}>{ESTADO[h.estado][0]}</span></li>)}
          </ul>
        </div>
      )}

      {r.historial.length > 0 && (
        <details className="puerta-historial">
          <summary>Historial de la puerta ({r.historial.length})</summary>
          <ul>{r.historial.map((h, i) => <li key={i}><b>{h.tipo === "entrada" ? "Entró" : h.tipo === "salida" ? "Salió" : "Ingreso deshecho"}</b> · {h.cuando} · {h.quien}</li>)}</ul>
        </details>
      )}

      <div className="puerta-pie">
        <span className="tenue">Sala: <b>{r.conteo.dentro}</b> adentro · {r.conteo.fuera} afuera · {r.conteo.total} vendidas</span>
        <div className="acciones">
          <Link className="btn sec chico" href={`/orden/${r.ordenCodigo}`} target="_blank">Ver la compra ↗</Link>
          {puedeDeshacer && (e.estado === "dentro" || e.estado === "fuera") && <button type="button" className="btn peligro chico" disabled={ocupado} onClick={() => accion("deshacer")}>Deshacer ingreso</button>}
          <button type="button" className="btn chico" onClick={siguiente}>Siguiente</button>
        </div>
      </div>
    </div>
  );
}
