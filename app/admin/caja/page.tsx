import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda } from "@/components/Ayuda";
import { hoy } from "@/lib/escuela";
import { esDinero, esFecha, movimientos, resumir } from "@/lib/reportes";
import { exigirEquipo } from "@/lib/sesion";
import { METODOS } from "@/lib/taquilla";
import { bs, usd } from "@/lib/util";

export const metadata = { title: "Cierre de caja" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Caja({ searchParams }: Props) {
  const s = await exigirEquipo();
  const q = await searchParams;
  const fecha = esFecha(q.fecha) ? q.fecha : hoy();
  // El vendedor solo ve su propia caja; los administradores ven la de todos.
  const lista = await movimientos(fecha, fecha, s.rol === "vendedor" ? s.id : undefined);
  const dinero = lista.filter(esDinero);
  const porPersona = resumir(dinero, (m) => m.quien);
  const total = dinero.reduce((a, m) => a + Number(m.usd), 0);

  return (
    <>
      <h1>Cierre de caja</h1>
      <Ayuda>
        <ul>
          <li>Muestra el dinero confirmado en un día: ventas de taquilla, pagos de entradas confirmados y cobros de la escuela.</li>
          <li>Cada pago cuenta para quien lo confirmó o lo cobró. Compara el efectivo de aquí con el que hay en la caja, y el pago móvil y las transferencias con el banco.</li>
          <li>Los bonos de regalo y las cortesías aparecen en el detalle, pero no suman: no son dinero recibido ese día.</li>
          {s.rol === "vendedor" && <li>Aquí ves solo lo que confirmaste o cobraste tú.</li>}
        </ul>
      </Ayuda>
      <form className="acciones">
        <label htmlFor="cj-fecha" style={{ fontWeight: 600 }}>Día</label>
        <input id="cj-fecha" name="fecha" type="date" defaultValue={fecha} max={hoy()} style={{ width: 180 }} />
        <button className="btn sec">Ver</button>
      </form>

      <section className="cifras">
        <div className="cifra"><b>{usd(total)}</b><span>Total recibido el {fecha}</span></div>
        {resumir(dinero, (m) => m.metodo).map((r) => <div key={r.clave} className="cifra"><b>{usd(r.usd)}</b><span>{METODOS[r.clave] ?? r.clave} · {r.n} {r.n === 1 ? "pago" : "pagos"}{r.bs > 0 ? ` · ${bs(r.bs)}` : ""}</span></div>)}
      </section>

      {porPersona.map((p) => (
        <section key={p.clave} className="panel">
          <div className="cab"><h2>{p.clave}</h2><b>{usd(p.usd)}</b></div>
          <div className="tabla"><table>
            <thead><tr><th>Método</th><th>Pagos</th><th>Dólares</th><th>Bolívares</th></tr></thead>
            <tbody>{resumir(dinero.filter((m) => m.quien === p.clave), (m) => m.metodo).map((r) => <tr key={r.clave}><td>{METODOS[r.clave] ?? r.clave}</td><td>{r.n}</td><td>{usd(r.usd)}</td><td>{r.bs > 0 ? bs(r.bs) : "—"}</td></tr>)}</tbody>
          </table></div>
        </section>
      ))}

      <section className="panel">
        <h2>Detalle del día</h2>
        {lista.length === 0 ? <p className="tenue">No hubo movimientos este día.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Hora</th><th>Concepto</th><th>Cliente</th><th>Método</th><th>Referencia</th><th>Monto</th><th>Confirmó</th></tr></thead>
            <tbody>
              {lista.map((m, i) => (
                <tr key={i}><td>{m.hora}</td><td>{m.concepto}<br /><span className="tenue">{m.origen} · {m.documento}</span></td><td>{m.cliente || "—"}</td><td>{METODOS[m.metodo] ?? m.metodo}</td><td>{m.referencia || "—"}</td><td>{usd(m.usd)}{m.bs ? <><br /><span className="tenue">{bs(m.bs)}</span></> : null}</td><td>{m.quien}</td></tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Caja {...props} /></Suspense>;
}
