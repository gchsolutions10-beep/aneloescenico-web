import { desc } from "drizzle-orm";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Resultado } from "@/components/Ayuda";
import { db, schema } from "@/db";
import { accionActualizarTasa, accionGuardarCobros } from "@/lib/acciones-taquilla";
import { getConfig } from "@/lib/datos";
import { exigirAdmin } from "@/lib/sesion";
import { getTasa } from "@/lib/tasa";
import { bs, fechaCorta } from "@/lib/util";

export const metadata = { title: "Cobros y tasa" };
type Props = { searchParams: Promise<Record<string, string>> };

const FUENTE: Record<string, string> = { bcv: "bcv.org.ve", dolarapi: "DolarApi (tasa oficial BCV)", manual: "fijada a mano" };

async function Cobros({ searchParams }: Props) {
  await exigirAdmin();
  const [{ cobros: c }, tasa, historial] = await Promise.all([getConfig(), getTasa(), db().select().from(schema.tasas).orderBy(desc(schema.tasas.fecha)).limit(7)]);
  return (
    <>
      <h1>Cobros y tasa</h1>
      <Ayuda>
        <ul>
          <li>Los precios están en dólares. El comprador ve el monto en bolívares calculado con la tasa oficial del BCV del día.</li>
          <li>La tasa se consulta sola una vez al día. Si un día no se puede consultar, se usa la última guardada y aquí aparece un aviso.</li>
          <li><b>Tasa manual:</b> si escribes un valor, se cobra con ese y se ignora la consulta. Déjalo vacío para volver a la tasa automática.</li>
          <li>Los datos de Pago Móvil y transferencia son los que ve el comprador al pagar. Si dejas uno vacío, ese método no se ofrece.</li>
        </ul>
      </Ayuda>
      <Resultado searchParams={searchParams} />

      <section className="panel">
        <h2>Tasa de hoy</h2>
        {tasa ? (
          <p style={{ margin: 0 }}>
            <b style={{ fontSize: "1.8rem" }}>{bs(tasa.valor)}</b> por dólar <span className="tenue">· {FUENTE[tasa.fuente]} · {tasa.fecha}</span>
            {tasa.desactualizada && <><br /><span className="pastilla oro">No se pudo consultar hoy: se usa la del {tasa.fecha}</span></>}
          </p>
        ) : <p className="nota mal" style={{ margin: 0 }}>Todavía no hay tasa. Pulsa Consultar ahora o fija una tasa manual; sin tasa, el comprador solo ve el monto en dólares.</p>}
        <form action={accionActualizarTasa}><button className="btn sec">Consultar ahora</button></form>
        {historial.length > 1 && <p className="tenue" style={{ margin: 0, fontSize: ".85rem" }}>Últimos días: {historial.map((h) => `${fechaCorta(new Date(`${h.fecha}T12:00:00-04:00`))} ${Number(h.valor).toFixed(2)}`).join(" · ")}</p>}
      </section>

      <form action={accionGuardarCobros} className="panel">
        <h2>Pago Móvil</h2>
        <div className="fila">
          <div className="campo"><label htmlFor="pm-b">Banco</label><input id="pm-b" name="pmBanco" defaultValue={c.pagoMovil.banco} /></div>
          <div className="campo"><label htmlFor="pm-t">Teléfono</label><input id="pm-t" name="pmTelefono" defaultValue={c.pagoMovil.telefono} /></div>
          <div className="campo"><label htmlFor="pm-c">Cédula o RIF</label><input id="pm-c" name="pmCedula" defaultValue={c.pagoMovil.cedula} /></div>
          <div className="campo"><label htmlFor="pm-n">Titular</label><input id="pm-n" name="pmTitular" defaultValue={c.pagoMovil.titular} /></div>
        </div>
        <h2>Transferencia</h2>
        <div className="fila">
          <div className="campo"><label htmlFor="tr-b">Banco</label><input id="tr-b" name="trBanco" defaultValue={c.transferencia.banco} /></div>
          <div className="campo"><label htmlFor="tr-c">Número de cuenta</label><input id="tr-c" name="trCuenta" defaultValue={c.transferencia.cuenta} /></div>
          <div className="campo"><label htmlFor="tr-d">Cédula o RIF</label><input id="tr-d" name="trCedula" defaultValue={c.transferencia.cedula} /></div>
          <div className="campo"><label htmlFor="tr-n">Titular</label><input id="tr-n" name="trTitular" defaultValue={c.transferencia.titular} /></div>
        </div>
        <h2>Reglas</h2>
        <div className="fila">
          <div className="campo"><label htmlFor="c-min">Minutos de apartado</label><input id="c-min" name="minutosApartado" type="number" min={5} max={60} defaultValue={c.minutosApartado} /><small>Tiempo que el comprador tiene para pagar antes de que sus butacas se liberen.</small></div>
          <div className="campo"><label htmlFor="c-tasa">Tasa manual (Bs por dólar)</label><input id="c-tasa" name="tasaManual" inputMode="decimal" defaultValue={c.tasaManual ?? ""} placeholder="Vacío = tasa BCV automática" /></div>
        </div>
        <div><button className="btn">Guardar</button></div>
      </form>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Cobros {...props} /></Suspense>;
}
