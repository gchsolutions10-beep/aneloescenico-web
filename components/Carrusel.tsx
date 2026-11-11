"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type Diapositiva = { id: number; imagenUrl: string; eyebrow: string; titulo: string; texto: string; botonTexto: string; botonEnlace: string };

const SEGUNDOS = 6;

export default function Carrusel({ slides, conTelon }: { slides: Diapositiva[]; conTelon: boolean }) {
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const toque = useRef<number | null>(null);
  const n = slides.length;
  const ir = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || pausa || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), SEGUNDOS * 1000);
    return () => clearInterval(t);
  }, [n, pausa]);

  return (
    <section
      className={`escena${conTelon ? " con-telon" : ""}`}
      aria-roledescription="carrusel"
      aria-label="Fotos de la escuela"
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
      onFocus={() => setPausa(true)}
      onBlur={() => setPausa(false)}
      onTouchStart={(e) => (toque.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (toque.current == null) return;
        const dx = e.changedTouches[0].clientX - toque.current;
        if (Math.abs(dx) > 50) ir(i + (dx < 0 ? 1 : -1));
        toque.current = null;
      }}
    >
      {slides.map((s, k) => {
        const Titulo = k === 0 ? "h1" : "h2";
        return (
          <div key={s.id} className={`diapositiva${k === i ? " activa" : ""}`} aria-hidden={k !== i}>
            <Image src={s.imagenUrl} alt="" fill sizes="100vw" priority={k === 0} />
            <div className="contenedor">
              <div className="texto">
                {s.eyebrow && <span className="ceja">{s.eyebrow}</span>}
                <Titulo>{s.titulo}</Titulo>
                {s.texto && <p>{s.texto}</p>}
                {s.botonTexto && s.botonEnlace && (
                  <Link className="boton" href={s.botonEnlace} tabIndex={k === i ? 0 : -1}>{s.botonTexto}</Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {n > 1 && (
        <>
          <button type="button" className="flecha ant" aria-label="Foto anterior" onClick={() => ir(i - 1)}>‹</button>
          <button type="button" className="flecha sig" aria-label="Foto siguiente" onClick={() => ir(i + 1)}>›</button>
          <div className="puntos contenedor">
            {slides.map((s, k) => (
              <button key={s.id} type="button" aria-label={`Foto ${k + 1} de ${n}`} aria-current={k === i} onClick={() => ir(k)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
