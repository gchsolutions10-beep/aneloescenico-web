import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Resultado } from "@/components/Ayuda";
import EditorTema from "@/components/EditorTema";
import SubirImagen from "@/components/SubirImagen";
import { guardarLogo } from "@/lib/acciones";
import { getConfig } from "@/lib/datos";

export const metadata = { title: "Apariencia" };

async function Apariencia({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { tema, escuela } = await getConfig();
  return (
    <>
      <h1>Apariencia</h1>
      <Ayuda>
        <ol>
          <li>Sube el logo. Se recorta en cuadrado y se generan solos los íconos de la app.</li>
          <li>Elige una plantilla como punto de partida o cambia cada color tocando su recuadro.</li>
          <li>Mira la vista previa. Si aparece un aviso de legibilidad, ajusta el color indicado.</li>
          <li>Pulsa Guardar apariencia. El sitio cambia de inmediato.</li>
        </ol>
      </Ayuda>
      <Resultado searchParams={searchParams} errores={{ logo: "Primero elige la imagen del logo." }} />

      <form action={guardarLogo} className="panel">
        <h2>Logo</h2>
        <SubirImagen nombre="logoUrl" inicial={escuela.logoUrl || "/logo.png"} aspecto={1} ancho={512} etiqueta="Logo de la escuela" ayuda="Usa una imagen cuadrada, PNG de preferencia. También será el ícono de la app en el teléfono." logo={{ fondo: tema.fondo }} />
        <div><button className="btn">Guardar logo</button></div>
      </form>

      <EditorTema inicial={tema} />
    </>
  );
}

export default function Pagina(props: { searchParams: Promise<Record<string, string>> }) {
  return <Suspense fallback={<Cargando />}><Apariencia {...props} /></Suspense>;
}
