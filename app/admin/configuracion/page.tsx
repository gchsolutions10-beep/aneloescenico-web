import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Resultado } from "@/components/Ayuda";
import SubirImagen from "@/components/SubirImagen";
import { guardarEscuela } from "@/lib/acciones";
import { getConfig } from "@/lib/datos";

export const metadata = { title: "Datos de la escuela" };

async function Configuracion({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { escuela: e } = await getConfig();
  return (
    <>
      <h1>Datos de la escuela</h1>
      <Ayuda>
        <ul>
          <li>Estos datos aparecen en el pie del sitio, en Contáctanos y en Sobre nosotros.</li>
          <li>WhatsApp va con código de país y sin signos: 584220333231. Activa el botón verde flotante.</li>
          <li>En los textos largos, deja una línea en blanco entre párrafos.</li>
        </ul>
      </Ayuda>
      <Resultado searchParams={searchParams} />
      <form action={guardarEscuela} className="panel">
        <h2>Identidad</h2>
        <div className="fila">
          <div className="campo"><label htmlFor="e-nombre">Nombre</label><input id="e-nombre" name="nombre" required defaultValue={e.nombre} /></div>
          <div className="campo"><label htmlFor="e-lema">Lema</label><input id="e-lema" name="lema" defaultValue={e.lema} /></div>
          <div className="campo"><label htmlFor="e-ciudad">Ciudad</label><input id="e-ciudad" name="ciudad" defaultValue={e.ciudad} /></div>
        </div>
        <div className="campo"><label htmlFor="e-desc">Descripción corta</label><textarea id="e-desc" name="descripcion" defaultValue={e.descripcion} /><small>Se usa en el pie del sitio y al compartir el enlace.</small></div>

        <h2>Contacto</h2>
        <div className="fila">
          <div className="campo"><label htmlFor="e-tel">Teléfono</label><input id="e-tel" name="telefono" defaultValue={e.telefono} /></div>
          <div className="campo"><label htmlFor="e-wa">WhatsApp</label><input id="e-wa" name="whatsapp" inputMode="numeric" defaultValue={e.whatsapp} placeholder="584220333231" /></div>
          <div className="campo"><label htmlFor="e-ig">Instagram</label><input id="e-ig" name="instagram" defaultValue={e.instagram} /></div>
          <div className="campo"><label htmlFor="e-correo">Correo</label><input id="e-correo" name="correo" type="email" defaultValue={e.correo} /></div>
        </div>
        <div className="campo"><label htmlFor="e-dir">Dirección</label><input id="e-dir" name="direccion" defaultValue={e.direccion} /></div>

        <h2>Sobre nosotros</h2>
        <div className="campo"><label htmlFor="e-sobre">Historia de la escuela</label><textarea id="e-sobre" name="sobreNosotros" className="alto" defaultValue={e.sobreNosotros} /></div>
        <div className="fila">
          <div className="campo"><label htmlFor="e-dn">Nombre del director</label><input id="e-dn" name="directorNombre" defaultValue={e.directorNombre} /></div>
        </div>
        <div className="campo"><label htmlFor="e-db">Reseña del director</label><textarea id="e-db" name="directorBio" defaultValue={e.directorBio} /></div>
        <SubirImagen nombre="directorFotoUrl" inicial={e.directorFotoUrl} aspecto={3 / 4} ancho={900} etiqueta="Foto del director" />
        <div><button className="btn">Guardar datos</button></div>
      </form>
    </>
  );
}

export default function Pagina(props: { searchParams: Promise<Record<string, string>> }) {
  return <Suspense fallback={<Cargando />}><Configuracion {...props} /></Suspense>;
}
