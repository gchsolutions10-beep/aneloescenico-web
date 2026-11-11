import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda } from "@/components/Ayuda";
import { accionValidar } from "@/lib/acciones-taquilla";
import { exigirEquipo } from "@/lib/sesion";
import { validarEntrada } from "@/lib/taquilla";
import { fechaCorta, hora } from "@/lib/util";

export const metadata = { title: "Validar entradas" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Validar({ searchParams }: Props) {
  const s = await exigirEquipo();
  const q = await searchParams;
  const v = q.c ? await validarEntrada(q.c, s.id, false) : null;
  const recienValidada = q.r === "valida";

  return (
    <>
      <h1>Validar entradas</h1>
      <Ayuda>
        <ol>
          <li>Con la cámara del teléfono, apunta al código QR de la entrada y abre el enlace que aparece. Debes tener la sesión iniciada en ese teléfono.</li>
          <li>Verás la butaca y el nombre. Pulsa <b>Dar entrada</b>.</li>
          <li>Verde: adelante. Rojo: esa entrada ya entró antes o no existe.</li>
          <li>Si el QR no se lee, escribe aquí el código de letras que aparece debajo.</li>
        </ol>
      </Ayuda>

      {v && (
        v.resultado === "inexistente" ? (
          <section className="nota mal" role="alert"><h2>Entrada no válida</h2><p style={{ margin: "6px 0 0" }}>El código {q.c} no corresponde a ninguna entrada.</p></section>
        ) : (
          <section className={`nota${recienValidada || v.resultado === "valida" ? "" : " mal"}`} role="status" style={{ display: "grid", gap: 10 }}>
            <h2>{recienValidada ? "Adelante: entrada válida" : v.resultado === "usada" ? "Esta entrada ya fue usada" : "Entrada válida, aún sin usar"}</h2>
            <p style={{ margin: 0, fontSize: "1.1rem" }}>
              <b>{v.funcion!.titulo}</b><br />
              Butaca <b style={{ fontSize: "1.6rem" }}>{v.entrada!.numero}</b> · {v.entrada!.zona}{v.comprador ? ` · ${v.comprador}` : ""}
            </p>
            {v.entrada!.usadaEl && <p style={{ margin: 0 }}>Entró el {fechaCorta(v.entrada!.usadaEl)} a las {hora(v.entrada!.usadaEl)}.</p>}
            {v.resultado === "valida" && !recienValidada && (
              <form action={accionValidar}><input type="hidden" name="c" value={v.entrada!.codigo} /><input type="hidden" name="marcar" value="1" /><button className="btn" style={{ fontSize: "1.15rem", padding: "14px 26px" }}>Dar entrada</button></form>
            )}
          </section>
        )
      )}

      <form action={accionValidar} className="panel">
        <h2>Escribir el código</h2>
        <div className="campo"><label htmlFor="v-c">Código de la entrada</label><input id="v-c" name="c" required autoCapitalize="characters" autoComplete="off" style={{ letterSpacing: ".12em", textTransform: "uppercase" }} /></div>
        <div><button className="btn sec">Buscar</button></div>
      </form>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Validar {...props} /></Suspense>;
}
