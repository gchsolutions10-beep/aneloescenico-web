// Descarga de reportes en CSV (se abre con Excel). Solo para administradores.
import { NextResponse } from "next/server";
import { ESTADOS_ESTUDIANTE, hoy } from "@/lib/escuela";
import { aCsv, esFecha, listaEstudiantes, movimientos, numero, ventasPorFuncion } from "@/lib/reportes";
import { leerSesion } from "@/lib/sesion";
import { METODOS } from "@/lib/taquilla";

export async function GET(req: Request) {
  const s = await leerSesion();
  if (!s || (s.rol !== "master" && s.rol !== "admin")) return NextResponse.json({ error: "Sin permiso." }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const tipo = q.get("tipo") ?? "";
  const desde = esFecha(q.get("desde") ?? undefined) ? q.get("desde")! : `${hoy().slice(0, 8)}01`;
  const hasta = esFecha(q.get("hasta") ?? undefined) ? q.get("hasta")! : hoy();

  let csv: string, nombre: string;
  if (tipo === "movimientos") {
    const lista = await movimientos(desde, hasta);
    csv = aCsv(["Fecha", "Hora", "Origen", "Concepto", "Cliente", "Documento", "Método", "Referencia", "Monto USD", "Monto Bs", "Confirmó"],
      lista.map((m) => [m.fecha, m.hora, m.origen, m.concepto, m.cliente, m.documento, METODOS[m.metodo] ?? m.metodo, m.referencia, numero(m.usd), numero(m.bs), m.quien]));
    nombre = `movimientos_${desde}_a_${hasta}`;
  } else if (tipo === "funciones") {
    const lista = await ventasPorFuncion(desde, hasta);
    csv = aCsv(["Función", "Entradas", "En línea", "Taquilla", "Cortesías", "Ya entraron", "Cobrado USD", "En bonos USD"],
      lista.map((f) => [f.titulo, f.entradas, f.en_linea, f.taquilla, f.cortesias, f.usadas, numero(f.usd), numero(f.bonos)]));
    nombre = `ventas_por_funcion_${desde}_a_${hasta}`;
  } else if (tipo === "estudiantes") {
    const lista = await listaEstudiantes();
    csv = aCsv(["Apellidos", "Nombres", "Nivel", "Estado", "Beca %", "Ingreso", "Representante", "Cédula", "Teléfono", "Correo", "Debe USD", "Vencido USD"],
      lista.map((e) => [e.apellidos, e.nombres, e.nivel, ESTADOS_ESTUDIANTE[e.estado] ?? e.estado, e.beca, e.ingreso, e.representante, e.cedula, e.telefono, e.correo, numero(e.debe), numero(e.vencido)]));
    nombre = `estudiantes_${hoy()}`;
  } else {
    return NextResponse.json({ error: "Reporte desconocido." }, { status: 400 });
  }
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${nombre}.csv"`, "cache-control": "no-store" } });
}
