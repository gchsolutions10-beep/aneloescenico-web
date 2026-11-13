import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Suspense } from "react";
import { CambiarButacas, CuentaRegresiva, FormularioPago } from "@/components/Compra";
import { db, schema } from "@/db";
import { accionCancelarApartado, accionPedirReembolso } from "@/lib/acciones-taquilla";
import { getConfig } from "@/lib/datos";
import { estadoPlano, limpiarVencidas, METODOS } from "@/lib/taquilla";
import { enBs } from "@/lib/tasa";
import { bs, fechaLarga, hora, usd } from "@/lib/util";

export const metadata: Metadata = { title: "Tu compra", robots: { index: false } };

type Props = { params: Promise<{ codigo: string }> };

export default function Pagina({ params }: Props) {
  return (
    <section className="seccion">
      <div className="contenedor" style={{ maxWidth: 860 }}>
        <Suspense fallback={<p className="tenue">Cargando tu compra…</p>}><Orden params={params} /></Suspense>
      </div>
    </section>
  );
}

async function Orden({ params }: Props) {
  const { codigo } = await params;
  await limpiarVencidas();
  const [o] = await db().select().from(schema.ordenes).where(eq(schema.ordenes.codigo, codigo));
  if (!o) notFound();
  const [[f], pagos, { cobros }] = await Promise.all([
    db().select().from(schema.funciones).where(eq(schema.funciones.id, o.funcionId)),
    db().select().from(schema.pagos).where(eq(schema.pagos.ordenId, o.id)).orderBy(asc(schema.pagos.id)),
    getConfig(),
  ]);
  const total = Number(o.totalUsd);
  const tasa = o.tasa ? Number(o.tasa) : null;
  const totalBs = tasa ? enBs(total, tasa) : null;
  const butacas = o.detalle.map((d) => d.numero).join(", ");

  const resumen = (
    <div className="caja">
      <div>
        <span className="ceja">{f.titulo}</span>
        <p style={{ margin: 0, textTransform: "capitalize" }}>{fechaLarga(f.fechaHora)}{f.fechaHora ? ` · ${hora(f.fechaHora)}` : ""}{f.lugar ? ` · ${f.lugar}` : ""}</p>
      </div>
      <dl className="cuenta">
        {o.detalle.map((d) => <div key={d.numero} style={{ display: "contents" }}><dt>Butaca {d.numero} · {d.zona}</dt><dd>{usd(d.precio)}</dd></div>)}
        <dt className="total">Total</dt><dd className="total">{usd(total)}</dd>
        {totalBs != null && <><dt>En bolívares (tasa BCV {bs(tasa!)})</dt><dd><strong>{bs(totalBs)}</strong></dd></>}
        {pagos.map((p) => <div key={p.id} style={{ display: "contents" }}><dt>{METODOS[p.metodo]}{p.referencia && p.metodo !== "bono" ? ` · ref. ${p.referencia}` : ""}</dt><dd>{usd(p.montoUsd)}</dd></div>)}
      </dl>
    </div>
  );

  if (o.estado === "apartada" || o.estado === "vencida") {
    const tardio = o.estado === "vencida";
    return (
      <div className="formulario">
        {tardio ? (
          <>
            <h1>Se cumplió el tiempo</h1>
            <p className="aviso error">Pasaron los {cobros.minutosApartado} minutos sin que reportaras el pago y las butacas {butacas} quedaron libres para otras personas.</p>
            <p><Link className="boton" href={`/funciones/${f.slug}#entradas`}>Elegir butacas de nuevo</Link></p>
            <h2 style={{ marginTop: 20 }}>¿Ya habías pagado?</h2>
            <p className="tenue">Repórtalo aquí. Si tus butacas siguen libres, quedan para ti. Si alguien más ya las compró, podrás elegir otras o pedir el reembolso.</p>
          </>
        ) : (
          <>
            <h1>Tus butacas están apartadas</h1>
            <div>
              <CuentaRegresiva vence={o.venceEl!.toISOString()} />
              <p className="tenue" style={{ margin: "6px 0 0" }}>Haz el pago y repórtalo antes de que el reloj llegue a cero. Si no, las butacas {butacas} se liberan.</p>
            </div>
          </>
        )}
        {resumen}
        <div className="caja">
          <h2>Paga y reporta</h2>
          <FormularioPago codigo={o.codigo} totalUsd={total} totalBs={totalBs} cobros={cobros} tardio={tardio} />
        </div>
        {!tardio && <form action={accionCancelarApartado}><input type="hidden" name="codigo" value={o.codigo} /><button className="boton sec">Cancelar y liberar las butacas</button></form>}
      </div>
    );
  }

  if (o.estado === "por_confirmar") {
    return (
      <div className="formulario">
        <h1>Recibimos tu reporte de pago</h1>
        <p className="aviso">Estamos verificando el pago. Tus butacas {butacas} están reservadas a tu nombre mientras tanto. {o.correo ? "Te avisaremos por correo cuando esté confirmado." : "Guarda este enlace para volver y ver tus entradas."}</p>
        {resumen}
        <p className="tenue">Puedes cerrar esta página. Vuelve a este mismo enlace para ver el estado.</p>
      </div>
    );
  }

  if (o.estado === "pagada") {
    const h = await headers();
    const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
    const entradas = await db().select().from(schema.entradas).where(eq(schema.entradas.ordenId, o.id)).orderBy(asc(schema.entradas.numero));
    const qrs = await Promise.all(entradas.map((e) => QRCode.toString(`${base}/admin/validar?c=${e.codigo}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" })));
    return (
      <div className="formulario">
        <div className="no-imprimir">
          <h1>¡Listo! Estas son tus entradas</h1>
          <p className="tenue">Muestra cada código QR en la puerta. Descarga el PDF para tenerlas en el teléfono sin necesidad de internet, o imprímelo.</p>
          <p><a className="boton" href={`/api/entradas/${o.codigo}`} download>Descargar entradas en PDF</a></p>
          <p className="aviso">Cuida este enlace y el PDF: quien los tenga puede usar estas entradas. Cada código QR deja pasar a una sola persona, la primera que lo presente.</p>
        </div>
        <div className="entradas">
          {entradas.map((e, i) => (
            <div key={e.id} className={`entrada${e.usadaEl ? " usada" : ""}`}>
              <div className="talon">
                <small>A-Nelo Escénico presenta</small>
                <b>{f.titulo}</b>
                <small style={{ textTransform: "none", letterSpacing: 0, fontSize: ".82rem" }}>{fechaLarga(f.fechaHora)}{f.fechaHora ? ` · ${hora(f.fechaHora)}` : ""}</small>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginTop: 12 }}>
                  <div><small>Butaca</small><span className="num">{e.numero}</span></div>
                  <div style={{ textAlign: "right" }}><small>Zona</small><strong>{e.zona}</strong></div>
                </div>
                {o.compradorNombre && <small style={{ marginTop: 10 }}>{o.compradorNombre}</small>}
              </div>
              <div className="qr">
                <div dangerouslySetInnerHTML={{ __html: qrs[i] }} />
                <code>{e.codigo}</code>
                {e.usadaEl && <strong>Ya utilizada</strong>}
              </div>
            </div>
          ))}
        </div>
        <div className="no-imprimir">{resumen}</div>
      </div>
    );
  }

  if (o.estado === "en_conflicto") {
    const plano = await estadoPlano(f);
    return (
      <div className="formulario">
        <h1>Tus butacas ya no están disponibles</h1>
        <p className="aviso error">Recibimos tu reporte de pago después de que venció el apartado, y para ese momento las butacas {butacas} ya se habían vendido a otra persona. Tu dinero no se pierde: elige una de estas dos opciones.</p>
        {resumen}
        <div className="caja">
          <h2>Opción 1: elegir otras butacas</h2>
          <p className="tenue">Puedes elegir hasta {o.detalle.length} {o.detalle.length === 1 ? "butaca" : "butacas"} de igual o menor valor ({usd(total)} en total).</p>
          {plano.libres > 0 ? <CambiarButacas codigo={o.codigo} funcionId={f.id} plano={plano} cantidad={o.detalle.length} tope={total} /> : <p className="aviso">No quedan butacas libres en esta función.</p>}
        </div>
        <div className="caja">
          <h2>Opción 2: pedir el reembolso</h2>
          <p className="tenue">Verificamos tu pago y te devolvemos el dinero por el mismo medio.</p>
          <form action={accionPedirReembolso}><input type="hidden" name="codigo" value={o.codigo} /><button className="boton sec">Solicitar reembolso</button></form>
        </div>
      </div>
    );
  }

  const cierre: Record<string, [string, string]> = {
    reembolso_pendiente: ["Reembolso solicitado", "Estamos verificando tu pago para devolverte el dinero. Te contactaremos por el teléfono o correo que dejaste."],
    reembolsada: ["Reembolso realizado", o.motivo || "Devolvimos tu pago."],
    rechazada: ["No pudimos verificar tu pago", `${o.motivo || "No encontramos el pago con esa referencia"}. Las butacas quedaron libres. Si crees que es un error, escríbenos.`],
    anulada: ["Compra cancelada", "Las butacas quedaron libres."],
  };
  const [titulo, texto] = cierre[o.estado] ?? ["Tu compra", ""];
  return (
    <div className="formulario">
      <h1>{titulo}</h1>
      <p className="aviso">{texto}</p>
      {resumen}
      <p><Link className="boton" href={`/funciones/${f.slug}`}>Volver a la función</Link> <Link className="boton sec" href="/contacto">Contáctanos</Link></p>
    </div>
  );
}
