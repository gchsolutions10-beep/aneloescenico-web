import Aviso from "./panel/Aviso";

export function Ayuda({ children }: { children: React.ReactNode }) {
  return (
    <details className="ayuda">
      <summary>¿Cómo se usa esta pantalla?</summary>
      {children}
    </details>
  );
}

type Busqueda = Promise<Record<string, string | string[] | undefined>>;

/** Resultado tras guardar (las acciones redirigen con ?ok=1 o ?error=...): aviso flotante o error visible. */
export async function Resultado({ searchParams, errores = {}, ok = "Guardado. El sitio ya muestra los cambios." }: { searchParams: Busqueda; errores?: Record<string, string>; ok?: string }) {
  const q = await searchParams;
  if (q.ok) return <Aviso key={String(q.ok)} mensaje={ok} />;
  if (typeof q.error === "string") return <p className="nota mal" role="alert">{errores[q.error] ?? (q.error.length > 3 ? q.error : "No se pudo guardar. Revisa los campos.")}</p>;
  return null;
}

/** Encabezado de página: título, descripción y acciones (botones a la derecha). */
export function Encabezado({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children?: React.ReactNode }) {
  return (
    <div className="encabezado">
      <div><h1>{titulo}</h1>{descripcion && <p>{descripcion}</p>}</div>
      {children && <div className="acciones">{children}</div>}
    </div>
  );
}
