import { asc, desc } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Encabezado, Resultado } from "@/components/Ayuda";
import Cajon from "@/components/panel/Cajon";
import { BotonBorrar } from "@/components/panel/Confirmar";
import FormFuncion from "@/components/panel/FormFuncion";
import MenuFila from "@/components/panel/MenuFila";
import { db, schema } from "@/db";
import { borrarFuncion, cambiarEstadoFuncion } from "@/lib/acciones";
import { getCupos } from "@/lib/datos";
import { exigirAdmin } from "@/lib/sesion";
import { resumenFuncion } from "@/lib/taquilla";
import { aInputLocal, ESTADOS_FUNCION, fechaCorta, hora, usd } from "@/lib/util";

export const metadata = { title: "Funciones" };
type Props = { searchParams: Promise<Record<string, string>> };

const CLASE: Record<string, string> = { a_la_venta: "si", borrador: "", finalizada: "azul", cancelada: "mal" };
const FILTROS: [string, string][] = [["", "Todas"], ["a_la_venta", "A la venta"], ["borrador", "Borradores"], ["finalizada", "Finalizadas"], ["cancelada", "Canceladas"]];

async function Funciones({ searchParams }: Props) {
  await exigirAdmin();
  const q = await searchParams;
  const [todas, salas, cupos] = await Promise.all([
    db().select().from(schema.funciones).orderBy(desc(schema.funciones.fechaHora)),
    db().select().from(schema.salas).orderBy(asc(schema.salas.id)),
    getCupos(),
  ]);
  const lista = todas.filter((f) => !q.estado || f.estado === q.estado);
  const resumenes = Object.fromEntries(await Promise.all(lista.map(async (x) => [x.id, await resumenFuncion(x.id)] as const)));
  const editar = q.editar ? todas.find((f) => f.id === Number(q.editar)) : undefined;
  const nueva = Number(q.nueva) || 0;
  const salasForm = salas.map((s) => ({ id: s.id, nombre: s.nombre, zonas: s.definicion.zonas }));

  return (
    <>
      <Encabezado titulo="Funciones" descripcion="Crea una función, configura su sala y precios, y ponla a la venta.">
        <Cajon key={q.ok ?? "nueva"} titulo="Nueva función" boton="Nueva función" descripcion="Dos pasos: la obra, y después sala y precios.">
          <FormFuncion salas={salasForm} existentes={todas.map((f) => f.titulo)} />
        </Cajon>
      </Encabezado>
      <Resultado searchParams={searchParams} ok={nueva ? "Función creada. Revisa su venta y butacas cuando quieras." : "Guardado. El sitio ya muestra los cambios."} errores={{ faltan: "Falta el título de la obra." }} />
      <Ayuda>
        <ul>
          <li><b>Nueva función</b> abre el formulario a la derecha. Al crearla, el formulario se cierra y la función aparece arriba marcada como “Recién creada”.</li>
          <li><b>Gestionar</b> abre su venta: precios, butacas bloqueadas y elenco.</li>
          <li>Los tres puntos de cada fila tienen Editar, cambiar el estado y Borrar. Para una función real que ya pasó, usa Marcar como finalizada: se conserva en los reportes.</li>
        </ul>
      </Ayuda>

      <nav className="pestanas" aria-label="Filtrar por estado">
        {FILTROS.map(([k, n]) => (
          <Link key={k} href={k ? `/admin/funciones?estado=${k}` : "/admin/funciones"} aria-current={(q.estado ?? "") === k ? "page" : undefined}>
            {n}<small>{k ? todas.filter((f) => f.estado === k).length : todas.length}</small>
          </Link>
        ))}
      </nav>

      <section className="panel" style={{ padding: "6px 22px" }}>
        {lista.length === 0 ? (
          <div className="vacio"><p>{todas.length === 0 ? "Todavía no hay funciones." : "No hay funciones en esta lista."}</p></div>
        ) : (
          <div className="tabla"><table>
            <thead><tr><th>Función</th><th>Fecha</th><th>Estado</th><th>Entradas</th><th>Cobrado</th><th><span className="sr">Acciones</span></th></tr></thead>
            <tbody>
              {lista.map((x) => {
                const r = resumenes[x.id];
                const c = cupos[x.id];
                const vendidas = c ? c.total - c.libres : 0;
                return (
                  <tr key={x.id} className={x.id === nueva ? "recien" : undefined}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {x.aficheUrl ? <img className="mini afiche" src={x.aficheUrl} alt="" /> : <span className="inicial" aria-hidden="true">{x.titulo.slice(0, 1)}</span>}
                        <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                          <Link href={`/admin/funciones/${x.id}`} style={{ color: "var(--a-texto)", fontWeight: 700, textDecoration: "none" }}>{x.titulo}</Link>
                          <span className="tenue" style={{ fontSize: 13 }}>{x.plano ?? "Sin sala"}{x.lugar ? ` · ${x.lugar}` : ""}</span>
                        </div>
                        {x.id === nueva && <span className="pastilla si">Recién creada</span>}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{x.fechaHora ? `${fechaCorta(x.fechaHora)} · ${hora(x.fechaHora)}` : "Por definir"}</td>
                    <td><span className={`pastilla ${CLASE[x.estado] ?? ""}`}>{ESTADOS_FUNCION[x.estado]}</span></td>
                    <td style={{ minWidth: 130 }}>
                      {c ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}><b>{vendidas}</b> / {c.total}</span>
                          <span className="barrita"><i style={{ width: `${c.total ? Math.round((vendidas / c.total) * 100) : 0}%` }} /></span>
                        </div>
                      ) : <span className="tenue">Sin butacas</span>}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>{r.cobrado ? usd(r.cobrado) : "—"}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div className="acciones" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                        <Link className="btn sec chico" href={`/admin/funciones/${x.id}`}>Gestionar</Link>
                        <MenuFila>
                          <Link href={`/admin/funciones?editar=${x.id}${q.estado ? `&estado=${q.estado}` : ""}`}>Editar datos y afiche</Link>
                          <Link href={`/funciones/${x.slug}`} target="_blank">Ver en el sitio ↗</Link>
                          {x.estado !== "a_la_venta" && <form action={cambiarEstadoFuncion}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="estado" value="a_la_venta" /><button>Poner a la venta</button></form>}
                          {x.estado !== "finalizada" && <form action={cambiarEstadoFuncion}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="estado" value="finalizada" /><button>Marcar como finalizada</button></form>}
                          <form action={borrarFuncion}>
                            <input type="hidden" name="id" value={x.id} />
                            <BotonBorrar
                              que={`la función “${x.titulo}”`} texto="Borrar…" fuerte={r.ordenes > 0}
                              consecuencias={r.ordenes > 0
                                ? [`${r.entradas} entradas emitidas y ${usd(r.cobrado)} cobrados, que desaparecen de Reportes y del Cierre de caja.`, "Sus compras, pagos, plano de butacas, elenco y fotos.", "Los bonos de regalo usados recuperan su saldo."]
                                : ["Sus datos, su plano de butacas, su elenco y sus fotos. No tiene ventas."]}
                              consejo={r.ordenes > 0 ? "Si la función fue real, mejor márcala como finalizada: así se conserva en los reportes." : undefined}
                            />
                          </form>
                        </MenuFila>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </section>

      {editar && (
        <Cajon key={`editar-${editar.id}`} titulo="Editar función" abierto alCerrar={q.estado ? `/admin/funciones?estado=${q.estado}` : "/admin/funciones"}>
          <FormFuncion funcion={{ id: editar.id, titulo: editar.titulo, subtitulo: editar.subtitulo, sinopsis: editar.sinopsis, aficheUrl: editar.aficheUrl, fechaHora: aInputLocal(editar.fechaHora), lugar: editar.lugar, estado: editar.estado }} />
        </Cajon>
      )}
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Funciones {...props} /></Suspense>;
}
