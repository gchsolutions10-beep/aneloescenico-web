import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Resultado } from "@/components/Ayuda";
import { guardarCorreo, probarCorreo } from "@/lib/acciones-correo";
import { leerConfigCorreo } from "@/lib/correo";
import { exigirAdmin } from "@/lib/sesion";

export const metadata = { title: "Correo" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Correo({ searchParams }: Props) {
  const s = await exigirAdmin();
  const [c, q] = await Promise.all([leerConfigCorreo(), searchParams]);
  const lista = Boolean(c.apiKey && c.remitente);
  return (
    <>
      <h1>Correo</h1>
      <Ayuda>
        <p style={{ margin: "10px 0 0" }}>El sitio envía avisos por correo (pago confirmado, entradas, recibos, recordatorios de mensualidad) a través de Resend. Es opcional: sin configurar, todo sigue funcionando y cada persona consulta su estado en el sitio.</p>
        <ol>
          <li>Crea una cuenta gratuita en resend.com.</li>
          <li>En Resend, entra a <b>Domains</b> y agrega el dominio de la escuela. Te pedirá copiar unos registros en el panel donde compraste el dominio. Sin dominio verificado, Resend solo permite enviar a tu propio correo.</li>
          <li>En <b>API Keys</b>, crea una clave y pégala aquí.</li>
          <li>En Remitente escribe el nombre y una dirección de ese dominio, así: <code>A-Nelo Escénico &lt;taquilla@tudominio.com&gt;</code></li>
          <li>Guarda y usa Enviar prueba.</li>
        </ol>
      </Ayuda>
      <Resultado searchParams={searchParams} />
      {q.enviado && <p className="nota" role="status">Correo de prueba enviado a {q.enviado}. Revisa la bandeja (y la carpeta de spam).</p>}

      <form action={guardarCorreo} className="panel">
        <div className="cab"><h2>Configuración</h2><span className={`pastilla${lista ? " si" : ""}`}>{lista ? "Configurado" : "Sin configurar"}</span></div>
        <div className="campo">
          <label htmlFor="co-clave">Clave de Resend (API key)</label>
          <input id="co-clave" name="apiKey" type="password" autoComplete="off" placeholder={c.apiKey ? "Guardada. Escribe otra solo para reemplazarla." : "re_…"} />
          <small>Por seguridad, la clave guardada no se muestra.</small>
        </div>
        <div className="campo"><label htmlFor="co-rem">Remitente</label><input id="co-rem" name="remitente" defaultValue={c.remitente} placeholder="A-Nelo Escénico <taquilla@tudominio.com>" /></div>
        <div className="acciones">
          <button className="btn">Guardar</button>
          {c.apiKey && <button className="btn peligro" name="borrar" value="1">Quitar la clave</button>}
        </div>
      </form>

      <form action={probarCorreo} className="panel">
        <h2>Enviar prueba</h2>
        <div className="campo"><label htmlFor="co-para">Enviar a</label><input id="co-para" name="para" type="email" defaultValue={s.correo} /></div>
        <div><button className="btn sec" disabled={!lista}>Enviar correo de prueba</button></div>
      </form>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Correo {...props} /></Suspense>;
}
