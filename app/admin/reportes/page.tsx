import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda } from "@/components/Ayuda";
import { hoy } from "@/lib/escuela";
import { esDinero, esFecha, listaEstudiantes, movimientos, resumir, ventasPorFuncion } from "@/lib/reportes";
import { exigirAdmin } from "@/lib/sesion";
import { METODOS } from "@/lib/taquilla";
import { bs, usd } from "@/lib/util";

export const metadata = { title: "Reportes" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Reportes({ searchParams }: Props) {
  await exigirAdmin();
  const q = await searchParams;
  const desde = esFecha(q.desde) ? q.desde : `${hoy().slice(0, 8)}01`;
  const hasta = esFecha(q.hasta) ? q.hasta : hoy();
  const [lista, funciones, estudiantes] = await Promise.all([movimientos(desde, hasta), ventasPorFuncion(desde, hasta), listaEstudiantes()]);
  const dinero = lista.filter(esDinero);
  const de = (origen: string) => dinero.filter((m) => m.origen === origen).reduce((a, m) => a + Number(m.usd), 0);
  const activos = estudiantes.filter((e) => e.estado === "activo");
  const rango = `desde=${desde}&hasta=${hasta}`;

  return (
    <>
      <h1>Reportes</h1>
      <Ayuda>
        <ul>
          <li>Elige el rango de fechas. Por defecto, el mes en curso.</li>
          <li>Los montos son dinero ya confirmado. Lo que está “por confirmar” no aparece hasta que se confirme.</li>
          <li>Cada botón de descarga baja un archivo que se abre con Excel.</li>
        </ul>
      </Ayuda>
      <form className="acciones">
        <label htmlFor="rp-d" style={{ fontWeight: 600 }}>Desde</label><input id="rp-d" name="desde" type="date" defaultValue={desde} style={{ width: 170 }} />
        <label htmlFor="rp-h" style={{ fontWeight: 600 }}>Hasta</label><input id="rp-h" name="hasta" type="date" defaultValue={hasta} style={{ width: 170 }} />
        <button className="btn sec">Ver</button>
      </form>

      <section className="cifras">
        <div className="cifra"><b>{usd(de("Entradas") + de("Escuela"))}</b><span>Total recibido</span></div>
        <div className="cifra"><b>{usd(de("Entradas"))}</b><span>Entradas</span></div>
        <div className="cifra"><b>{usd(de("Escuela"))}</b><span>Escuela</span></div>
        <div className="cifra"><b>{usd(activos.reduce((a, e) => a + Number(e.vencido), 0))}</b><span>En mora hoy · {activos.filter((e) => Number(e.vencido) > 0).length} estudiantes</span></div>
      </section>

      <section className="panel">
        <div className="cab"><h2>Por método de pago</h2><a className="btn sec chico" href={`/api/exportar?tipo=movimientos&${rango}`}>Descargar todos los movimientos (Excel)</a></div>
        {dinero.length === 0 ? <p className="tenue">No hay dinero confirmado en este rango.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Método</th><th>Pagos</th><th>Dólares</th><th>Bolívares</th></tr></thead>
            <tbody>{resumir(dinero, (m) => m.metodo).map((r) => <tr key={r.clave}><td>{METODOS[r.clave] ?? r.clave}</td><td>{r.n}</td><td>{usd(r.usd)}</td><td>{r.bs > 0 ? bs(r.bs) : "—"}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>

      <section className="panel">
        <div className="cab"><h2>Entradas por función</h2><a className="btn sec chico" href={`/api/exportar?tipo=funciones&${rango}`}>Descargar (Excel)</a></div>
        {funciones.length === 0 ? <p className="tenue">No se emitieron entradas en este rango.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Función</th><th>Entradas</th><th>En línea</th><th>Taquilla</th><th>Cortesías</th><th>Ya entraron</th><th>Cobrado</th><th>En bonos</th></tr></thead>
            <tbody>{funciones.map((f) => <tr key={f.id}><td>{f.titulo}</td><td><b>{f.entradas}</b></td><td>{f.en_linea}</td><td>{f.taquilla}</td><td>{f.cortesias}</td><td>{f.usadas}</td><td>{usd(f.usd)}</td><td>{Number(f.bonos) > 0 ? usd(f.bonos) : "—"}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>

      <section className="panel">
        <div className="cab"><h2>Por persona del equipo</h2></div>
        {dinero.length === 0 ? <p className="tenue">Sin movimientos.</p> : (
          <div className="tabla"><table>
            <thead><tr><th>Confirmó o cobró</th><th>Pagos</th><th>Dólares</th></tr></thead>
            <tbody>{resumir(dinero, (m) => m.quien).map((r) => <tr key={r.clave}><td>{r.clave}</td><td>{r.n}</td><td>{usd(r.usd)}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>

      <section className="panel">
        <div className="cab"><h2>Estudiantes</h2><a className="btn sec chico" href="/api/exportar?tipo=estudiantes">Descargar la lista con deudas (Excel)</a></div>
        <p style={{ margin: 0 }}>{activos.length} activos · deben en total {usd(activos.reduce((a, e) => a + Number(e.debe), 0))}, de los cuales {usd(activos.reduce((a, e) => a + Number(e.vencido), 0))} ya vencieron.</p>
      </section>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Reportes {...props} /></Suspense>;
}
