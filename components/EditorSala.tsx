"use client";
import { useState } from "react";
import { guardarSala } from "@/lib/acciones-salas";
import { generarButacas, totalButacas, type DefSala } from "@/lib/planos";

const COLORES = ["#e3bd5e", "#8fa3b8", "#d98a6a", "#8fc49a", "#c59be0", "#e58fb0", "#7fc7d9", "#cfcfcf"];

export default function EditorSala({ id, nombreInicial, inicial, error }: { id: number | null; nombreInicial: string; inicial: DefSala; error?: string }) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [d, setD] = useState<DefSala>(inicial);
  const cambiar = (f: (c: DefSala) => void) => setD((v) => { const c = structuredClone(v); f(c); return c; });
  const butacas = generarButacas(d);
  const color = Object.fromEntries(d.zonas.map((z) => [z.clave, z.color]));

  return (
    <form action={guardarSala} style={{ display: "grid", gap: 22 }}>
      <input type="hidden" name="id" value={id ?? ""} />
      <input type="hidden" name="definicion" value={JSON.stringify(d)} />
      {error && <p className="nota mal" role="alert">{error}</p>}

      <section className="panel">
        <div className="campo"><label htmlFor="sa-nombre">Nombre de la sala</label><input id="sa-nombre" name="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Teatro municipal, Auditorio del colegio…" /></div>
      </section>

      <section className="panel">
        <div className="cab"><h2>1. Zonas de precio</h2>
          <button type="button" className="btn sec chico" disabled={d.zonas.length >= 8} onClick={() => cambiar((c) => { c.zonas.push({ clave: `z${Date.now().toString(36)}`, nombre: "Nueva zona", color: COLORES.find((x) => !c.zonas.some((z) => z.color.toLowerCase() === x)) ?? COLORES[0], precioPreventa: "", precioRegular: "10" }); })}>Agregar zona</button>
        </div>
        <p className="tenue" style={{ margin: 0 }}>Precios sugeridos en dólares. Se pueden ajustar en cada función.</p>
        <div className="tabla"><table>
          <thead><tr><th>Color</th><th>Nombre</th><th>Preventa</th><th>Regular</th><th></th></tr></thead>
          <tbody>
            {d.zonas.map((z, i) => (
              <tr key={z.clave}>
                <td><input type="color" value={z.color} aria-label={`Color de ${z.nombre}`} onChange={(e) => cambiar((c) => { c.zonas[i].color = e.target.value; })} style={{ width: 40, height: 36, border: 0, padding: 0, background: "none" }} /></td>
                <td><input value={z.nombre} aria-label="Nombre de la zona" onChange={(e) => cambiar((c) => { c.zonas[i].nombre = e.target.value; })} /></td>
                <td><input value={z.precioPreventa} inputMode="decimal" aria-label={`Precio de preventa de ${z.nombre}`} onChange={(e) => cambiar((c) => { c.zonas[i].precioPreventa = e.target.value.replace(",", "."); })} /></td>
                <td><input value={z.precioRegular} inputMode="decimal" aria-label={`Precio regular de ${z.nombre}`} onChange={(e) => cambiar((c) => { c.zonas[i].precioRegular = e.target.value.replace(",", "."); })} /></td>
                <td>{d.zonas.length > 1 && <button type="button" className="btn peligro chico" onClick={() => cambiar((c) => {
                  const [fuera] = c.zonas.splice(i, 1);
                  // Las filas de la zona eliminada pasan a la primera que quede.
                  c.bloques.forEach((b) => b.filas.forEach((f) => { if (f.zona === fuera.clave) f.zona = c.zonas[0].clave; }));
                })}>Quitar</button>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <section className="panel">
        <div className="cab"><h2>2. Bloques y filas</h2>
          <button type="button" className="btn sec chico" disabled={d.bloques.length >= 8} onClick={() => cambiar((c) => { c.bloques.push({ nombre: `Bloque ${c.bloques.length + 1}`, filas: [{ butacas: 6, zona: c.zonas[0].clave }] }); })}>Agregar bloque</button>
        </div>
        <p className="tenue" style={{ margin: 0 }}>Un bloque es un grupo de butacas separado por un pasillo (por ejemplo: lado izquierdo, centro, lado derecho). Los bloques se muestran uno al lado del otro. La primera fila es la más cercana al escenario. La numeración es automática: de corrido, bloque por bloque.</p>
        <div className="bloques-editor">
          {d.bloques.map((b, i) => (
            <div key={i} className="bloque-editor">
              <div className="acciones">
                <input value={b.nombre} aria-label={`Nombre del bloque ${i + 1}`} onChange={(e) => cambiar((c) => { c.bloques[i].nombre = e.target.value; })} style={{ flex: 1, minWidth: 120 }} />
                {d.bloques.length > 1 && <button type="button" className="btn peligro chico" onClick={() => cambiar((c) => { c.bloques.splice(i, 1); })}>Quitar bloque</button>}
              </div>
              {b.filas.map((f, j) => (
                <div key={j} className="fila-editor">
                  <span className="tenue">Fila {j + 1}</span>
                  <input type="number" min={1} max={60} value={f.butacas} aria-label={`Butacas en la fila ${j + 1} de ${b.nombre}`} onChange={(e) => cambiar((c) => { c.bloques[i].filas[j].butacas = Math.min(60, Math.max(1, Number(e.target.value) || 1)); })} />
                  <select value={f.zona} aria-label={`Zona de la fila ${j + 1} de ${b.nombre}`} onChange={(e) => cambiar((c) => { c.bloques[i].filas[j].zona = e.target.value; })}>
                    {d.zonas.map((z) => <option key={z.clave} value={z.clave}>{z.nombre}</option>)}
                  </select>
                  <button type="button" className="btn sec chico" aria-label={`Quitar la fila ${j + 1}`} disabled={b.filas.length === 1} onClick={() => cambiar((c) => { c.bloques[i].filas.splice(j, 1); })}>✕</button>
                </div>
              ))}
              <button type="button" className="btn sec chico" disabled={b.filas.length >= 60} onClick={() => cambiar((c) => { const u = c.bloques[i].filas.at(-1)!; c.bloques[i].filas.push({ ...u }); })}>Agregar fila igual a la última</button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="cab"><h2>3. Así se verá</h2><span className="tenue">{totalButacas(d)} butacas</span></div>
        <div className="plano-caja" style={{ ["--base" as string]: "24px" }}>
          <div className="plano-scroll"><div className="plano-lienzo">
            <div className="escenario">ESCENARIO</div>
            <div className="plano">
              {d.bloques.map((b, i) => (
                <div key={i} className="lado">
                  {b.filas.map((_, j) => (
                    <div key={j} className="hilera">
                      {butacas.filter((x) => x.bloque === b.nombre && x.fila === j + 1).map((x) => <span key={x.numero} className="butaca" style={{ background: color[x.zona], display: "grid", placeItems: "center" }}>{x.numero}</span>)}
                    </div>
                  ))}
                  <span className="lado-nombre">{b.nombre}</span>
                </div>
              ))}
            </div>
          </div></div>
          <div className="leyenda">{d.zonas.map((z) => <span key={z.clave}><i style={{ background: z.color }} />{z.nombre}</span>)}</div>
        </div>
      </section>

      <div className="acciones"><button className="btn">Guardar sala</button></div>
    </form>
  );
}
