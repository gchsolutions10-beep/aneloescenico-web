export function Ayuda({ children }: { children: React.ReactNode }) {
  return (
    <details className="ayuda">
      <summary>¿Cómo se usa esta pantalla?</summary>
      {children}
    </details>
  );
}

type Busqueda = Promise<Record<string, string | string[] | undefined>>;

/** Mensaje de resultado tras guardar (las acciones redirigen con ?ok=1 o ?error=...). */
export async function Resultado({ searchParams, errores = {} }: { searchParams: Busqueda; errores?: Record<string, string> }) {
  const q = await searchParams;
  if (q.ok) return <p className="nota" role="status">Guardado. El sitio ya muestra los cambios.</p>;
  if (typeof q.error === "string") return <p className="nota mal" role="alert">{errores[q.error] ?? "No se pudo guardar. Revisa los campos."}</p>;
  return null;
}
