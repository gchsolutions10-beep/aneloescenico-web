import { asc } from "drizzle-orm";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Resultado } from "@/components/Ayuda";
import { db, schema } from "@/db";
import { accionCrearUsuario, accionEditarUsuario } from "@/lib/acciones-taquilla";
import { exigirMaster } from "@/lib/sesion";

export const metadata = { title: "Usuarios" };
type Props = { searchParams: Promise<Record<string, string>> };
const ROLES: Record<string, string> = { master: "Master", admin: "Administrador", vendedor: "Vendedor" };

async function Usuarios({ searchParams }: Props) {
  await exigirMaster();
  const usuarios = await db().select().from(schema.usuarios).orderBy(asc(schema.usuarios.id));
  return (
    <>
      <h1>Usuarios</h1>
      <Ayuda>
        <ul>
          <li><b>Administrador:</b> maneja todo el panel, menos los usuarios.</li>
          <li><b>Vendedor:</b> solo ve Taquilla, Pagos y Validar entradas. Puede vender en la sala, confirmar o rechazar pagos y dar entrada en la puerta. No puede dar cortesías ni reembolsos.</li>
          <li>Al desactivar a alguien, pierde el acceso de inmediato aunque tenga la sesión abierta.</li>
        </ul>
      </Ayuda>
      <Resultado searchParams={searchParams} />

      <form action={accionCrearUsuario} className="panel">
        <h2>Nuevo usuario</h2>
        <div className="fila">
          <div className="campo"><label htmlFor="u-nombre">Nombre</label><input id="u-nombre" name="nombre" required autoComplete="off" /></div>
          <div className="campo"><label htmlFor="u-correo">Correo</label><input id="u-correo" name="correo" type="email" required autoComplete="off" /></div>
          <div className="campo"><label htmlFor="u-clave">Clave (mínimo 8 caracteres)</label><input id="u-clave" name="clave" type="password" required minLength={8} autoComplete="new-password" /></div>
          <div className="campo"><label htmlFor="u-rol">Rol</label><select id="u-rol" name="rol" defaultValue="vendedor"><option value="vendedor">Vendedor</option><option value="admin">Administrador</option></select></div>
        </div>
        <div><button className="btn">Crear usuario</button></div>
      </form>

      <section className="panel">
        <h2>Equipo</h2>
        <div className="tabla"><table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td><td>{u.correo}</td><td>{ROLES[u.rol] ?? u.rol}</td>
                <td><span className={`pastilla${u.activo ? " si" : ""}`}>{u.activo ? "Activo" : "Desactivado"}</span></td>
                <td>{u.rol !== "master" && (
                  <div className="acciones">
                    <form action={accionEditarUsuario}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="accion" value="alternar" /><button className="btn sec chico">{u.activo ? "Desactivar" : "Reactivar"}</button></form>
                    <form action={accionEditarUsuario} className="acciones"><input type="hidden" name="id" value={u.id} /><input name="clave" type="password" minLength={8} required placeholder="Clave nueva" aria-label={`Clave nueva para ${u.nombre}`} autoComplete="new-password" style={{ width: 150 }} /><button className="btn sec chico">Cambiar clave</button></form>
                  </div>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Usuarios {...props} /></Suspense>;
}
