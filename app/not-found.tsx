import Link from "next/link";

export default function NoEncontrada() {
  return (
    <main className="contenedor seccion" style={{ textAlign: "center" }}>
      <span className="ceja">Error 404</span>
      <h1>Esta escena no está en el libreto</h1>
      <p className="tenue" style={{ margin: "16px 0 24px" }}>La página que buscas no existe o cambió de lugar.</p>
      <Link className="boton" href="/">Volver al inicio</Link>
    </main>
  );
}
