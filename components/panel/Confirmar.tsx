"use client";
import { useEffect, useId, useRef, useState } from "react";

type Props = {
  /** Lo que se borra: "la función “X”". */
  que: string;
  /** Consecuencias, una por línea. */
  consecuencias?: string[];
  /** Consejo en lugar de borrar (por ejemplo, marcar como finalizada). */
  consejo?: string;
  /** Pide marcar "Entiendo que no se puede deshacer" antes de borrar. */
  fuerte?: boolean;
  texto?: string;
  claseBoton?: string;
  textoConfirmar?: string;
};

/**
 * Botón de borrar con ventana de confirmación. Debe ir DENTRO del <form> de la acción:
 * el botón "Borrar definitivamente" es el que envía ese formulario.
 */
export function BotonBorrar({ que, consecuencias = [], consejo, fuerte = false, texto = "Borrar", claseBoton = "btn peligro chico", textoConfirmar = "Borrar definitivamente" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [entiendo, setEntiendo] = useState(false);
  const id = useId();
  const cancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    cancelar.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [abierto]);

  return (
    <>
      <button type="button" className={claseBoton} onClick={() => { setEntiendo(false); setAbierto(true); }}>{texto}</button>
      {abierto && (
        <div className="modal-velo" onMouseDown={(e) => { if (e.target === e.currentTarget) setAbierto(false); }}>
          <section className="modal" role="alertdialog" aria-modal="true" aria-labelledby={`${id}-t`}>
            <h2 id={`${id}-t`}>¿Borrar {que}?</h2>
            {consecuencias.length > 0 && (
              <>
                <p className="tenue">Esto es lo que se pierde:</p>
                <ul>{consecuencias.map((c) => <li key={c}>{c}</li>)}</ul>
              </>
            )}
            {consejo && <p className="nota aviso">{consejo}</p>}
            {fuerte && (
              <label className="casilla entiendo"><input type="checkbox" checked={entiendo} onChange={(e) => setEntiendo(e.target.checked)} /> Entiendo que esto no se puede deshacer.</label>
            )}
            <div className="modal-acciones">
              <button type="button" ref={cancelar} className="btn sec" onClick={() => setAbierto(false)}>Cancelar</button>
              <button type="submit" className="btn rojo" disabled={fuerte && !entiendo}>{textoConfirmar}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
