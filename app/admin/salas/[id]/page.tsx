import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda } from "@/components/Ayuda";
import EditorSala from "@/components/EditorSala";
import { db, schema } from "@/db";
import type { DefSala } from "@/lib/planos";
import { exigirAdmin } from "@/lib/sesion";

export const metadata = { title: "Editar sala" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

const EN_BLANCO: DefSala = {
  zonas: [{ clave: "general", nombre: "General", color: "#8fa3b8", precioPreventa: "", precioRegular: "10" }],
  bloques: [{ nombre: "Platea", filas: Array.from({ length: 5 }, () => ({ butacas: 10, zona: "general" })) }],
};

async function Sala({ params, searchParams }: Props) {
  await exigirAdmin();
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const buscar = async (n: number) => (await db().select().from(schema.salas).where(eq(schema.salas.id, n)))[0];
  const sala = id === "nueva" ? undefined : await buscar(Number(id) || 0);
  if (id !== "nueva" && !sala) notFound();
  const base = sala ?? (q.copiar ? await buscar(Number(q.copiar) || 0) : undefined);

  return (
    <>
      <div className="cab"><h1>{sala ? "Editar sala" : "Nueva sala"}</h1><Link className="btn sec" href="/admin/salas">← Volver</Link></div>
      <Ayuda>
        <ol>
          <li>Pon el nombre del lugar.</li>
          <li>Define las zonas de precio (por ejemplo VIP y General) con su color.</li>
          <li>Arma cada bloque fila por fila: cuántas butacas tiene la fila y a qué zona pertenece. “Agregar fila igual a la última” ahorra tiempo.</li>
          <li>Revisa el dibujo al final y guarda. Los números de butaca se asignan solos.</li>
        </ol>
      </Ayuda>
      <EditorSala key={base?.id ?? "nueva"} id={sala?.id ?? null} nombreInicial={sala?.nombre ?? (base ? `${base.nombre} (copia)` : "")} inicial={base?.definicion ?? EN_BLANCO} error={q.error} />
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Sala {...props} /></Suspense>;
}
