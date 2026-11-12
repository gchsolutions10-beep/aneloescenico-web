import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ElegirButacas } from "@/components/Compra";
import { Prosa } from "@/components/Piezas";
import { getConfig, getFuncion } from "@/lib/datos";
import { enPreventa, estadoPlano, precioDe, yaPaso } from "@/lib/taquilla";
import { getTasa } from "@/lib/tasa";
import { bs, fechaLarga, hora, usd } from "@/lib/util";

type Props = { params: Promise<{ slug: string }> };
type Funcion = NonNullable<Awaited<ReturnType<typeof getFuncion>>>;

export async function generateMetadata({ params }: Props) {
  const f = await getFuncion((await params).slug);
  if (!f) return {};
  const descripcion = f.sinopsis || `${f.titulo}: ${fechaLarga(f.fechaHora)}`;
  return { title: f.titulo, description: descripcion, openGraph: { title: f.titulo, description: descripcion, images: f.aficheUrl ? [f.aficheUrl] : undefined } };
}

export default function Pagina({ params }: Props) {
  return <Suspense><Detalle params={params} /></Suspense>;
}

async function Detalle({ params }: Props) {
  const f = await getFuncion((await params).slug);
  if (!f) notFound();
  return (
    <>
      <section className="portada-pagina">
        <div className="contenedor funcion-cab">
          <div className="afiche">
            <div className="img">
              {f.aficheUrl ? <Image src={f.aficheUrl} alt={`Afiche de ${f.titulo}`} fill sizes="260px" priority /> : <b>{f.titulo}</b>}
            </div>
          </div>
          <div>
            <span className="ceja">Funciones de Teatro</span>
            <h1>{f.titulo}</h1>
            {f.subtitulo && <p style={{ fontStyle: "italic" }}>{f.subtitulo}</p>}
            <p style={{ color: "var(--texto)", textTransform: "capitalize" }}><strong>{fechaLarga(f.fechaHora)}{f.fechaHora ? ` · ${hora(f.fechaHora)}` : ""}</strong>{f.lugar ? ` · ${f.lugar}` : ""}</p>
            <Suspense fallback={null}><Precios f={f} /></Suspense>
            {f.sinopsis && <Prosa texto={f.sinopsis} />}
          </div>
        </div>
      </section>

      {f.elenco.length > 0 && (
        <section className="seccion">
          <div className="contenedor">
            <div className="cabecera-seccion"><div><span className="ceja">En escena</span><h2>Elenco</h2></div></div>
            <div className="elenco">
              {f.elenco.map((a) => {
                const cuerpo = (
                  <>
                    <div className="foto">{a.fotoUrl ? <Image src={a.fotoUrl} alt="" fill sizes="100px" /> : a.nombre.slice(0, 1)}</div>
                    <figcaption>{a.nombre}{a.personaje && <small>{a.personaje}</small>}</figcaption>
                  </>
                );
                return <figure key={a.id}>{a.slugFicha ? <Link href={`/protagonistas/${a.slugFicha}`} style={{ color: "inherit", textDecoration: "none" }}>{cuerpo}</Link> : cuerpo}</figure>;
              })}
            </div>
          </div>
        </section>
      )}

      <section className="seccion" id="entradas">
        <div className="contenedor">
          <div className="cabecera-seccion"><div><span className="ceja">Taquilla</span><h2>Elige tus butacas</h2></div></div>
          <Suspense fallback={<p className="tenue">Cargando el plano de la sala…</p>}><Taquilla f={f} /></Suspense>
        </div>
      </section>
    </>
  );
}

// Los precios dependen de la hora (preventa) y de la tasa del día: se calculan en cada visita.
async function Precios({ f }: { f: Funcion }) {
  await connection();
  if (f.zonas.length === 0) return null;
  const tasa = await getTasa();
  const preventa = enPreventa(f);
  return (
    <>
      <div className="precios">
        {f.zonas.map((z) => {
          const precio = precioDe(z, f);
          return (
            <div key={z.id} className="precio">
              <span>{z.nombre}</span>
              <b>{usd(precio)} {preventa && z.precioPreventa != null && Number(z.precioRegular) > precio && <s>{usd(z.precioRegular)}</s>}</b>
              {tasa && <small className="tenue">{bs(Math.round(precio * tasa.valor * 100) / 100)}</small>}
            </div>
          );
        })}
      </div>
      <p className="tenue" style={{ fontSize: ".88rem", maxWidth: "60ch" }}>
        {preventa && <>Precio de preventa hasta el {fechaLarga(f.preventaHasta)}. </>}
        {tasa && <>Se paga en bolívares a la tasa BCV{tasa.fuente === "manual" ? "" : " del día"}: {bs(tasa.valor)} por dólar.</>}
      </p>
    </>
  );
}

async function Taquilla({ f }: { f: Funcion }) {
  await connection();
  if (f.estado === "cancelada") return <p className="vacio">Esta función fue cancelada.</p>;
  if (f.estado === "finalizada" || yaPaso(f)) return <p className="vacio">Esta función ya se presentó. Mira las próximas en la <Link href="/funciones">cartelera</Link>.</p>;
  if (f.zonas.length === 0) return <p className="vacio">La venta de entradas para esta función abrirá pronto.</p>;
  const [plano, tasa, { cobros }] = await Promise.all([estadoPlano(f), getTasa(), getConfig()]);
  if (plano.libres === 0) return <p className="vacio">Entradas agotadas. Si se libera alguna butaca, aparecerá aquí.</p>;
  return <ElegirButacas funcionId={f.id} plano={plano} max={f.maxPorCompra} tasa={tasa?.valor ?? null} minutos={cobros.minutosApartado} />;
}
