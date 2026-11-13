"use client";
import { useMemo, useState } from "react";
import SubirImagen from "@/components/SubirImagen";
import { guardarFuncion } from "@/lib/acciones";
import { ESTADOS_FUNCION } from "@/lib/util";

export type SalaOpcion = { id: number; nombre: string; zonas: { clave: string; nombre: string; color: string; precioPreventa: string; precioRegular: string }[] };
type Datos = { id: number; titulo: string; subtitulo: string; sinopsis: string; aficheUrl: string | null; fechaHora: string; lugar: string; estado: string };

/**
 * Formulario de función dentro del panel lateral. Al crear tiene dos pasos (datos de la obra;
 * sala, precios y preventa); al editar, solo los datos y el estado.
 */
export default function FormFuncion({ funcion, salas = [], existentes = [] }: { funcion?: Datos; salas?: SalaOpcion[]; existentes?: string[] }) {
  const nueva = !funcion;
  const [paso, setPaso] = useState(1);
  const [titulo, setTitulo] = useState(funcion?.titulo ?? "");
  const [fecha, setFecha] = useState(funcion?.fechaHora ?? "");
  const [salaId, setSalaId] = useState(salas[0]?.id ?? 0);
  const [enviando, setEnviando] = useState(false);
  const sala = salas.find((s) => s.id === salaId);
  const duplicada = useMemo(() => {
    const t = titulo.trim().toLowerCase();
    return nueva && t !== "" && existentes.some((e) => e.toLowerCase() === t);
  }, [titulo, existentes, nueva]);
  const puedeSeguir = titulo.trim() !== "" && fecha !== "";

  return (
    <form action={guardarFuncion} onSubmit={() => setEnviando(true)}>
      <input type="hidden" name="id" value={funcion?.id ?? ""} />
      {nueva && (
        <div className="pasos-barra" aria-label={`Paso ${paso} de 2`}><span data-hecho /><span data-hecho={paso === 2 || undefined} /></div>
      )}

      <div style={{ display: paso === 1 ? "grid" : "none", gap: 16 }}>
        {nueva && <p className="tenue" style={{ fontSize: 13 }}>Paso 1 de 2 · Datos de la obra</p>}
        <div className="campo"><label htmlFor="fn-titulo">Título de la obra</label><input id="fn-titulo" name="titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej.: El recuerdo de aquella Navidad" /></div>
        {duplicada && <p className="nota aviso" role="status">Ya existe una función con este nombre. Si es otra fecha de la misma obra, sigue; si no, revisa la lista antes de crearla de nuevo.</p>}
        <div className="campo"><label htmlFor="fn-sub">Subtítulo <span className="tenue" style={{ fontWeight: 400 }}>(opcional)</span></label><input id="fn-sub" name="subtitulo" defaultValue={funcion?.subtitulo} /></div>
        <div className="fila">
          <div className="campo"><label htmlFor="fn-fecha">Fecha y hora</label><input id="fn-fecha" name="fechaHora" type="datetime-local" required value={fecha} onChange={(e) => setFecha(e.target.value)} /><small>Hora de Venezuela.</small></div>
          <div className="campo"><label htmlFor="fn-lugar">Lugar</label><input id="fn-lugar" name="lugar" defaultValue={funcion?.lugar} placeholder="Teatro de Acarigua" /></div>
        </div>
        <SubirImagen nombre="aficheUrl" inicial={funcion?.aficheUrl} aspecto={2 / 3} ancho={1000} etiqueta="Afiche" ayuda="Se recorta solo a formato de cartelera (vertical 2:3). Sin afiche, la cartelera muestra el título sobre un fondo de telón." />
        <div className="campo"><label htmlFor="fn-sin">Sinopsis <span className="tenue" style={{ fontWeight: 400 }}>(opcional)</span></label><textarea id="fn-sin" name="sinopsis" defaultValue={funcion?.sinopsis} /></div>
        {!nueva && (
          <div className="campo"><label htmlFor="fn-estado">Estado</label>
            <select id="fn-estado" name="estado" defaultValue={funcion.estado}>{Object.entries(ESTADOS_FUNCION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <small>A la venta: aparece en cartelera y se puede comprar. Finalizada: pasa al archivo.</small>
          </div>
        )}
      </div>

      {nueva && (
        <div style={{ display: paso === 2 ? "grid" : "none", gap: 16 }}>
          <p className="tenue" style={{ fontSize: 13 }}>Paso 2 de 2 · Sala, precios y preventa</p>
          {salas.length === 0 ? <p className="nota aviso">No hay salas. Crea una en Salas; mientras tanto la función queda sin butacas.</p> : (
            <>
              <div className="campo"><label htmlFor="fn-sala">Sala</label>
                <select id="fn-sala" name="sala" value={salaId} onChange={(e) => setSalaId(Number(e.target.value))}>{salas.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
              </div>
              {sala && (
                <div className="campo">
                  <span className="etq">Precios en dólares</span>
                  <div style={{ border: "1px solid var(--a-linea)", borderRadius: 10, overflow: "hidden" }}>
                    <table>
                      <thead><tr><th>Zona</th><th>Preventa</th><th>Regular</th></tr></thead>
                      <tbody>
                        {sala.zonas.map((z) => (
                          <tr key={`${sala.id}-${z.clave}`}>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><i style={{ width: 12, height: 12, borderRadius: 3, background: z.color, display: "inline-block" }} />{z.nombre}</span></td>
                            <td><input name={`pre_${z.clave}`} inputMode="decimal" defaultValue={z.precioPreventa} aria-label={`Precio de preventa ${z.nombre}`} /></td>
                            <td><input name={`reg_${z.clave}`} inputMode="decimal" required defaultValue={z.precioRegular} aria-label={`Precio regular ${z.nombre}`} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <small>El comprador paga en bolívares a la tasa BCV del día. Puedes cambiar los precios después en Venta y butacas.</small>
                </div>
              )}
            </>
          )}
          <div className="fila">
            <div className="campo"><label htmlFor="fn-prev">Preventa hasta</label><input id="fn-prev" name="preventaHasta" type="datetime-local" /><small>Vacío si no hay preventa.</small></div>
            <div className="campo"><label htmlFor="fn-max">Máximo por compra en línea</label><input id="fn-max" name="maxPorCompra" type="number" min={1} max={20} defaultValue={8} /></div>
          </div>
          <label className="casilla" style={{ background: "var(--a-sup2)", border: "1px solid var(--a-linea)", borderRadius: 10, padding: "12px 14px" }}>
            <input type="checkbox" name="publicar" />
            <span>Ponerla a la venta al crearla<small style={{ display: "block", fontWeight: 400, color: "var(--a-tenue)", marginTop: 2 }}>Si no, queda como borrador: no se ve en la cartelera hasta que la publiques.</small></span>
          </label>
        </div>
      )}

      <div className="cajon-pie">
        {nueva && paso === 2 && <button type="button" className="btn sec izq" onClick={() => setPaso(1)}>Atrás</button>}
        {nueva && paso === 1 && <button type="button" className="btn" disabled={!puedeSeguir} onClick={() => setPaso(2)}>Siguiente: sala y precios</button>}
        {(!nueva || paso === 2) && <button className="btn" disabled={enviando}>{enviando ? "Guardando…" : nueva ? "Crear función" : "Guardar cambios"}</button>}
      </div>
    </form>
  );
}
