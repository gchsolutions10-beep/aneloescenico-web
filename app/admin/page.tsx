import { asc, count, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import Link from "next/link";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Icono } from "@/components/panel/Icono";
import type { NombreIcono } from "@/components/panel/iconos";
import { db, schema } from "@/db";
import { marcarAppInstalada } from "@/lib/acciones";
import { getConfig, getCupos } from "@/lib/datos";
import { hoy, nombrePeriodo, periodoActual } from "@/lib/escuela";
import { esDinero, movimientos } from "@/lib/reportes";
import { exigirAdmin } from "@/lib/sesion";
import { enlaceWhatsApp, fechaCorta, hora, usd } from "@/lib/util";

export const metadata = { title: "Inicio" };
type Props = { searchParams: Promise<Record<string, string>> };

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function Cifra({ etiqueta, valor, detalle, icono, color, href }: { etiqueta: string; valor: string; detalle: string; icono: NombreIcono; color: string; href: string }) {
  return (
    <Link href={href} className="cifra">
      <span className="cab-cifra">{etiqueta}<span className={`burbuja ${color}`}><Icono nombre={icono} /></span></span>
      <b>{valor}</b>
      <span>{detalle}</span>
    </Link>
  );
}

async function InicioAdmin({ searchParams }: Props) {
  await exigirAdmin();
  const q = await searchParams;
  const dias = q.dias === "7" ? 7 : 14;
  const hoyStr = hoy();
  const inicioMes = `${hoyStr.slice(0, 8)}01`;
  const desdeGrafico = new Date(Date.parse(`${hoyStr}T12:00:00Z`) - (dias - 1) * 86400_000).toISOString().slice(0, 10);
  const contar = (tabla: PgTable, donde?: SQL) => db().select({ n: count() }).from(tabla).where(donde).then((r) => r[0].n);

  const [{ escuela, cobros }, enVenta, slides, publicadas, nFunciones, nivelesConMonto, sinLeer, pagosEntradas, solicitudes, pagosEscuela, activos, delMes, delGrafico, entradasMes, proximas, cupos, mensualidades, mora] = await Promise.all([
    getConfig(),
    contar(schema.funciones, eq(schema.funciones.estado, "a_la_venta")),
    contar(schema.carrusel),
    contar(schema.entradasBlog, eq(schema.entradasBlog.publicada, true)),
    contar(schema.funciones),
    contar(schema.niveles, isNotNull(schema.niveles.montoMensualidad)),
    contar(schema.mensajes, eq(schema.mensajes.leido, false)),
    contar(schema.ordenes, inArray(schema.ordenes.estado, ["por_confirmar", "en_conflicto", "reembolso_pendiente"])),
    contar(schema.estudiantes, eq(schema.estudiantes.estado, "solicitud")),
    contar(schema.reportesPago, eq(schema.reportesPago.estado, "reportado")),
    contar(schema.estudiantes, eq(schema.estudiantes.estado, "activo")),
    movimientos(inicioMes, hoyStr),
    movimientos(desdeGrafico, hoyStr),
    db().execute<{ mes: number; hoy: number }>(sql`
      SELECT count(*) FILTER (WHERE (creado_el AT TIME ZONE 'America/Caracas')::date >= ${inicioMes}::date)::int AS mes,
             count(*) FILTER (WHERE (creado_el AT TIME ZONE 'America/Caracas')::date = ${hoyStr}::date)::int AS hoy FROM entradas`).then((r) => r.rows[0]),
    db().select().from(schema.funciones).where(eq(schema.funciones.estado, "a_la_venta")).orderBy(asc(schema.funciones.fechaHora)).limit(4),
    getCupos(),
    db().execute<{ total: number; pagadas: number; confirmar: number }>(sql`
      SELECT count(*)::int AS total, count(*) FILTER (WHERE estado = 'pagado')::int AS pagadas, count(*) FILTER (WHERE estado = 'por_confirmar')::int AS confirmar
      FROM cargos WHERE tipo = 'mensualidad' AND periodo = ${periodoActual()}`).then((r) => r.rows[0]),
    db().execute<{ id: number; nombre: string; nivel: string | null; telefono: string; rep: string; debe: string }>(sql`
      SELECT e.id, e.nombres || ' ' || left(e.apellidos, 1) || '.' AS nombre, n.nombre AS nivel, e.rep_telefono AS telefono, e.rep_nombre AS rep, sum(c.monto_usd)::text AS debe
      FROM cargos c JOIN estudiantes e ON e.id = c.estudiante_id LEFT JOIN niveles n ON n.id = e.nivel_id
      WHERE c.estado = 'pendiente' AND c.vence_el < ${hoyStr}::date GROUP BY e.id, n.nombre ORDER BY min(c.vence_el) LIMIT 5`).then((r) => r.rows),
  ]);

  // Primeros pasos
  const pasos = [
    { hecho: Boolean(escuela.logoUrl), href: "/admin/apariencia", titulo: "Sube el logo y elige los colores", nota: "El logo también será el ícono de la app." },
    { hecho: Boolean(escuela.whatsapp || escuela.telefono), href: "/admin/configuracion", titulo: "Completa los datos de la escuela", nota: "Teléfono, WhatsApp, dirección y Sobre nosotros." },
    { hecho: slides > 0, href: "/admin/carrusel", titulo: "Sube las fotos del carrusel", nota: "Fotos grandes de las clases para la portada." },
    { hecho: nivelesConMonto > 0, href: "/admin/niveles", titulo: "Revisa los niveles, horarios y montos", nota: "Kids, Teen y Teenagers ya están creados." },
    { hecho: publicadas > 0, href: "/admin/blog/nueva", titulo: "Publica la primera novedad", nota: "Márcala como destacada para que salga en Inicio." },
    { hecho: Boolean(cobros.pagoMovil.telefono || cobros.transferencia.cuenta), href: "/admin/cobros", titulo: "Registra tus datos de pago", nota: "Pago Móvil y transferencia; revisa la tasa BCV." },
    { hecho: nFunciones > 0, href: "/admin/funciones", titulo: "Crea tu primera función", nota: "Afiche, sala, precios de preventa y regular." },
  ];
  const hechos = pasos.filter((p) => p.hecho).length + (escuela.appInstalada ? 1 : 0);
  const total = pasos.length + 1;
  const siguiente = pasos.find((p) => !p.hecho);

  // Cifras del mes
  const dinero = delMes.filter(esDinero);
  const suma = (lista: typeof dinero) => lista.reduce((s, m) => s + Number(m.usd), 0);
  const cobradoEntradas = suma(dinero.filter((m) => m.origen === "Entradas"));
  const cobradoEscuela = suma(dinero.filter((m) => m.origen === "Escuela"));
  const porAtender = pagosEntradas + pagosEscuela + solicitudes;

  // Gráfico: ingresos por día
  const porDia = Array.from({ length: dias }, (_, i) => {
    const fecha = new Date(Date.parse(`${desdeGrafico}T12:00:00Z`) + i * 86400_000).toISOString().slice(0, 10);
    const delDia = delGrafico.filter((m) => m.fecha === fecha && esDinero(m));
    return { fecha, ent: suma(delDia.filter((m) => m.origen === "Entradas")), esc: suma(delDia.filter((m) => m.origen === "Escuela")) };
  });
  const maximo = Math.max(1, ...porDia.map((d) => d.ent + d.esc));
  const totalGrafico = porDia.reduce((s, d) => s + d.ent + d.esc, 0);
  const ALTO = 190;

  const fechaHoy = new Date(`${hoyStr}T12:00:00-04:00`);
  const horaVe = Number(new Intl.DateTimeFormat("es-VE", { hour: "numeric", hour12: false, timeZone: "America/Caracas" }).format(new Date()));
  const saludo = horaVe < 12 ? "Buenos días" : horaVe < 19 ? "Buenas tardes" : "Buenas noches";

  const atender = [
    pagosEntradas > 0 && { titulo: `${pagosEntradas} ${pagosEntradas === 1 ? "pago de entradas" : "pagos de entradas"}`, detalle: "Verificar en el banco y confirmar", href: "/admin/pagos", accion: "Revisar", color: "#d6ab52" },
    pagosEscuela > 0 && { titulo: `${pagosEscuela} ${pagosEscuela === 1 ? "pago de la escuela" : "pagos de la escuela"}`, detalle: "Inscripciones y mensualidades reportadas", href: "/admin/cobranza", accion: "Revisar", color: "#d6ab52" },
    solicitudes > 0 && { titulo: `${solicitudes} ${solicitudes === 1 ? "solicitud de inscripción" : "solicitudes de inscripción"}`, detalle: "Enviadas desde el sitio", href: "/admin/inscripciones", accion: "Ver", color: "#2f6db3" },
    sinLeer > 0 && { titulo: `${sinLeer} ${sinLeer === 1 ? "mensaje sin leer" : "mensajes sin leer"}`, detalle: "Desde Contáctanos", href: "/admin/mensajes", accion: "Leer", color: "#8a7f7a" },
  ].filter(Boolean) as { titulo: string; detalle: string; href: string; accion: string; color: string }[];

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>{saludo}</h1>
          <p>{DIAS_SEMANA[fechaHoy.getDay()]} {fechaHoy.getDate()} de {MESES[fechaHoy.getMonth()]}</p>
        </div>
        <div className="acciones">
          <Link className="btn" href="/admin/taquilla"><Icono nombre="entrada" tam={16} />Vender entradas</Link>
          <Link className="btn sec" href="/admin/funciones">+ Nueva función</Link>
          <Link className="btn sec" href="/admin/estudiantes/nuevo">+ Inscribir estudiante</Link>
        </div>
      </div>

      {hechos < total && (
        <section className="panel" aria-label="Primeros pasos" style={{ gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 22px" }}>
            <div style={{ display: "grid", gap: 6, flex: "1 1 240px" }}>
              <strong>Primeros pasos · {hechos} de {total}</strong>
              <div className="progreso"><i style={{ width: `${(hechos / total) * 100}%` }} /></div>
            </div>
            {siguiente && <span style={{ flex: "2 1 280px", fontSize: 14 }} className="tenue">Siguiente: <strong style={{ color: "var(--a-texto)" }}>{siguiente.titulo.toLowerCase()}</strong>. {siguiente.nota}</span>}
            {siguiente && <Link className="btn oscuro chico" href={siguiente.href}>Continuar</Link>}
          </div>
          <details>
            <summary className="tenue" style={{ cursor: "pointer", fontSize: 13 }}>Ver todos los pasos</summary>
            <ol className="pasos" style={{ marginTop: 8 }}>
              {pasos.map((p) => (
                <li key={p.href + p.titulo} className={p.hecho ? "hecho" : ""}>
                  <Link href={p.href}><span className="tilde">{p.hecho ? "✓" : ""}</span><span>{p.titulo}<small>{p.nota}</small></span></Link>
                </li>
              ))}
              <li className={escuela.appInstalada ? "hecho" : ""}>
                <span>
                  <span className="tilde">{escuela.appInstalada ? "✓" : ""}</span>
                  <span style={{ flex: 1 }}>Instala la app en tu teléfono<small>Menú del navegador → “Agregar a pantalla de inicio”. <Link href="/admin/manual#app">Ver cómo</Link></small></span>
                  {!escuela.appInstalada && <form action={marcarAppInstalada}><button className="btn sec chico">Ya la instalé</button></form>}
                </span>
              </li>
            </ol>
          </details>
        </section>
      )}

      <section className="cifras" aria-label="Resumen del mes">
        <Cifra etiqueta="Cobrado este mes" valor={usd(cobradoEntradas + cobradoEscuela)} detalle={`Entradas ${usd(cobradoEntradas)} · Escuela ${usd(cobradoEscuela)}`} icono="monedas" color="b-vino" href="/admin/reportes" />
        <Cifra etiqueta="Entradas emitidas" valor={String(entradasMes.mes)} detalle={`${entradasMes.hoy} hoy · ${enVenta} ${enVenta === 1 ? "función" : "funciones"} a la venta`} icono="entrada" color="b-oro" href="/admin/funciones" />
        <Cifra etiqueta="Por atender" valor={String(porAtender)} detalle={porAtender ? `${pagosEntradas + pagosEscuela} pagos · ${solicitudes} inscripciones` : "Todo al día"} icono="alerta" color="b-rojo" href={pagosEntradas ? "/admin/pagos" : pagosEscuela ? "/admin/cobranza" : "/admin/inscripciones"} />
        <Cifra etiqueta="Estudiantes activos" valor={String(activos)} detalle={mora.length ? `${mora.length}${mora.length === 5 ? " o más" : ""} en mora` : "Nadie en mora"} icono="personas" color="b-verde" href="/admin/estudiantes" />
      </section>

      <div className="doble">
        <section className="panel" aria-label="Ingresos">
          <div className="cab">
            <div><h2>Ingresos confirmados</h2><p className="tenue" style={{ fontSize: 13, marginTop: 3 }}>{usd(totalGrafico)} en los últimos {dias} días</p></div>
            <nav className="pestanas" aria-label="Rango">
              <Link href="/admin?dias=7" aria-current={dias === 7 ? "page" : undefined}>7 días</Link>
              <Link href="/admin" aria-current={dias === 14 ? "page" : undefined}>14 días</Link>
            </nav>
          </div>
          {totalGrafico === 0 ? <div className="vacio" style={{ minHeight: 160 }}><p>Aún no hay ingresos confirmados en estos días.</p></div> : (
            <>
              <div className="grafico" role="img" aria-label={`Ingresos por día. Total ${usd(totalGrafico)}.`}>
                {porDia.map((d) => (
                  <div className="col" key={d.fecha} title={`${fechaCorta(new Date(`${d.fecha}T12:00:00-04:00`))} · Entradas ${usd(d.ent)} · Escuela ${usd(d.esc)}`}>
                    {d.esc > 0 && <i className="esc" style={{ height: Math.round((d.esc / maximo) * ALTO) }} />}
                    {d.ent > 0 && <i className="ent" style={{ height: Math.round((d.ent / maximo) * ALTO) }} />}
                  </div>
                ))}
              </div>
              <div className="ejes">{porDia.map((d) => <span key={d.fecha}>{Number(d.fecha.slice(8))}</span>)}</div>
              <div className="leyenda-g"><span><i style={{ background: "#8f1d2c" }} />Entradas</span><span><i style={{ background: "#d6ab52" }} />Escuela (inscripciones y mensualidades)</span></div>
            </>
          )}
        </section>

        <section className="panel" aria-label="Por atender" style={{ gap: 4 }}>
          <h2 style={{ marginBottom: 8 }}>Por atender</h2>
          {atender.length === 0 ? <div className="vacio" style={{ padding: "24px 0" }}><p>No hay nada pendiente.</p></div> : (
            <div className="lista-atender">
              {atender.map((a) => (
                <div key={a.href}>
                  <span className="punto" style={{ background: a.color }} />
                  <div><strong style={{ fontSize: 14 }}>{a.titulo}</strong><small>{a.detalle}</small></div>
                  <Link className="btn sec chico" href={a.href}>{a.accion}</Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="doble">
        <section className="panel" aria-label="Próximas funciones" style={{ gap: 4 }}>
          <div className="cab" style={{ marginBottom: 8 }}><h2>Próximas funciones</h2><Link href="/admin/funciones" style={{ fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Ver todas →</Link></div>
          {proximas.length === 0 ? <div className="vacio" style={{ padding: "24px 0" }}><p>No hay funciones a la venta.</p><Link className="btn sec chico" href="/admin/funciones">Crear una función</Link></div> : (
            <div className="lista-atender">
              {proximas.map((f) => {
                const c = cupos[f.id];
                const vendidas = c ? c.total - c.libres : 0;
                return (
                  <div key={f.id} style={{ flexWrap: "wrap" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {f.aficheUrl ? <img className="mini afiche" src={f.aficheUrl} alt="" /> : <span className="inicial" aria-hidden="true">{f.titulo.slice(0, 1)}</span>}
                    <div style={{ flex: "1 1 200px" }}><strong style={{ fontSize: 15 }}>{f.titulo}</strong><small>{f.fechaHora ? `${fechaCorta(f.fechaHora)} · ${hora(f.fechaHora)}` : "Fecha por definir"}</small></div>
                    {c && <div style={{ flex: "1 1 160px", display: "grid", gap: 6 }}><small style={{ fontVariantNumeric: "tabular-nums" }}><strong style={{ color: "var(--a-texto)" }}>{vendidas}</strong> de {c.total} vendidas</small><span className="barrita"><i style={{ width: `${c.total ? Math.round((vendidas / c.total) * 100) : 0}%` }} /></span></div>}
                    <Link className="btn sec chico" href={`/admin/funciones/${f.id}`}>Gestionar</Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel" aria-label="Mensualidades" style={{ gap: 12 }}>
          <h2>Mensualidades de {nombrePeriodo(periodoActual()).split(" ")[0]}</h2>
          {mensualidades.total === 0 ? <p className="tenue">Aún no se han generado mensualidades este mes.</p> : (
            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }} className="tenue"><strong style={{ fontSize: 22, color: "var(--a-texto)" }}>{mensualidades.pagadas}</strong> de {mensualidades.total} pagadas</span>
              <span style={{ height: 10, background: "#ece8e4", borderRadius: 5, overflow: "hidden", display: "flex" }}>
                <span style={{ width: `${(mensualidades.pagadas / mensualidades.total) * 100}%`, background: "#1f7a4d" }} />
                <span style={{ width: `${(mensualidades.confirmar / mensualidades.total) * 100}%`, background: "#d6ab52" }} />
              </span>
              <span className="tenue" style={{ fontSize: 12 }}>Verde: pagadas · Dorado: por confirmar · Gris: pendientes</span>
            </div>
          )}
          <strong style={{ fontSize: 13, color: "var(--a-mal)" }}>En mora</strong>
          {mora.length === 0 ? <p className="tenue" style={{ fontSize: 14 }}>Nadie está en mora.</p> : mora.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <Link href={`/admin/estudiantes/${m.id}`} style={{ flex: 1, color: "var(--a-texto)", textDecoration: "none" }}>{m.nombre}{m.nivel ? ` · ${m.nivel}` : ""}</Link>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{usd(m.debe)}</strong>
              {m.telefono && <a href={enlaceWhatsApp(m.telefono, `Hola ${m.rep}. Le escribimos de ${escuela.nombre}: hay ${usd(m.debe)} pendiente. Puede pagarlo desde el portal del sitio. ¡Gracias!`)} target="_blank" rel="noopener" style={{ fontSize: 12, fontWeight: 600, textDecoration: "none", color: "var(--a-ok)" }}>WhatsApp</a>}
            </div>
          ))}
          {mora.length > 0 && <Link href="/admin/cobranza" style={{ fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Ver la cobranza →</Link>}
        </section>
      </div>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><InicioAdmin {...props} /></Suspense>;
}
