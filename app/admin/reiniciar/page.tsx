import Link from "next/link";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Resultado } from "@/components/Ayuda";
import { accionReiniciar } from "@/lib/acciones";
import { contarDatos, FRASE_REINICIO } from "@/lib/reinicio";
import { exigirMaster } from "@/lib/sesion";

export const metadata = { title: "Reiniciar datos" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Reiniciar({ searchParams }: Props) {
  const s = await exigirMaster();
  const c = await contarDatos(s.id);
  const filas: [string, number][] = [
    ["Funciones", c.funciones], ["Entradas emitidas", c.entradas], ["Estudiantes", c.estudiantes], ["Pagos y recibos", c.pagos],
    ["Bonos de regalo", c.bonos], ["Entradas del blog", c.blog], ["Fotos del carrusel", c.fotos], ["Otros usuarios (equipo y representantes)", c.usuarios],
  ];
  return (
    <>
      <div className="encabezado">
        <div><h1>Reiniciar datos</h1><p>Deja la escuela como recién instalada. Úsalo para borrar las pruebas antes de empezar a trabajar de verdad.</p></div>
        <Link className="btn sec" href="/admin/configuracion">← Volver</Link>
      </div>
      <Resultado searchParams={searchParams} />
      <section className="panel peligro-zona">
        <h2>Esto se borra</h2>
        <div className="tabla"><table><tbody>{filas.map(([n, v]) => <tr key={n}><td>{n}</td><td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}><b>{v}</b></td></tr>)}</tbody></table></div>
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6, fontSize: 14 }}>
          <li>También la configuración: logo, colores, datos de la escuela, datos de pago, correo, y todas las fotos guardadas.</li>
          <li>Los niveles vuelven a ser Kids, Teen y Teenagers, sin horarios ni montos, y queda solo la Sala principal de 184 butacas.</li>
          <li>Se conservan las cuentas principales (la tuya, {s.correo}, y la de soporte técnico) con sus mismas claves.</li>
          <li>No se puede deshacer.</li>
        </ul>
        <form action={accionReiniciar} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
          <div className="campo"><label htmlFor="rn-frase">Para confirmar, escribe {FRASE_REINICIO}</label><input id="rn-frase" name="frase" required autoComplete="off" /></div>
          <div><button className="btn rojo">Borrar todo y empezar de cero</button></div>
        </form>
      </section>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Reiniciar {...props} /></Suspense>;
}
