import { asc, eq } from "drizzle-orm";
import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Encabezado, Resultado } from "@/components/Ayuda";
import Cajon from "@/components/panel/Cajon";
import { db, schema } from "@/db";
import { accionCrearUsuario, accionEditarUsuario } from "@/lib/acciones-taquilla";
import { exigirMaster } from "@/lib/sesion";

export const metadata = { title: "Usuarios" };
type Props = { searchParams: Promise<Record<string, string>> };
const ROLES: Record<string, string> = { master: "Master", admin: "Administrador", vendedor: "Vendedor" };

async function Usuarios({ searchParams }: Props) {
  const q = await searchParams;
  const sesion = await exigirMaster();
  const yoSoporte = (await db().select({ s: schema.usuarios.soporte }).from(schema.usuarios).where(eq(schema.usuarios.id, sesion.id)))[0]?.s ?? false;
  const usuarios = await db().select().from(schema.usuarios).orderBy(asc(schema.usuarios.id));
  return (
    <>
      <Encabezado titulo="Usuarios" descripcion="Las personas del equipo que entran al panel.">
        <Cajon key={q.ok ?? "nuevo"} titulo="Nuevo usuario" boton="Nuevo usuario">
      <form action={accionCrearUsuario} className="formulario-cajon">
          <div className="fila">
            <div className="campo"><label htmlFor="u-nombre">Nombre</label><input id="u-nombre" name="nombre" required autoComplete="off" /></div>
            <div className="campo"><label htmlFor="u-correo">Usuario</label><input id="u-correo" name="correo" required autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" placeholder="hgonzalez" /><small>Con esto entra al panel. Un nombre corto sin espacios, o un correo.</small></div>
            <div className="campo"><label htmlFor="u-clave">Clave (mínimo 8 caracteres)</label><input id="u-clave" name="clave" type="password" required minLength={8} autoComplete="new-password" /></div>
            <div className="campo"><label htmlFor="u-rol">Rol</label><select id="u-rol" name="rol" defaultValue="vendedor"><option value="vendedor">Vendedor</option><option value="admin">Administrador</option></select></div>
          </div>
          <div className="cajon-pie"><button className="btn">Crear usuario</button></div>
        </form>
        </Cajon>
      </Encabezado>
      <Ayuda>
        <ul>
          <li><b>Administrador:</b> maneja todo el panel, menos los usuarios.</li>
          <li><b>Vendedor:</b> solo ve Taquilla, Pagos y Validar entradas. Puede vender en la sala, confirmar o rechazar pagos y dar entrada en la puerta. No puede dar cortesías ni reembolsos.</li>
          <li><b>Principal:</b> la cuenta de la escuela, la única que maneja los usuarios. Su usuario y su clave se cambian en <b>Mi cuenta</b>.</li>
          <li><b>Soporte técnico:</b> el acceso del desarrollador, para ayudarte si algo falla o si pierdes tu clave. Su clave no se guarda aquí; el desarrollador la administra.</li>
          <li>Al desactivar a alguien, pierde el acceso de inmediato aunque tenga la sesión abierta.</li>
        </ul>
      </Ayuda>
      <Resultado searchParams={searchParams} />


      <section className="panel" style={{ paddingTop: 6 }}>
        <div className="tabla"><table>
          <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td><td>{u.correo}</td><td>{u.soporte ? <span className="pastilla azul">Soporte técnico</span> : u.rol === "master" ? <span className="pastilla oro">Principal</span> : ROLES[u.rol] ?? u.rol}</td>
                <td><span className={`pastilla${u.activo ? " si" : ""}`}>{u.activo ? "Activo" : "Desactivado"}</span></td>
                <td style={{ textAlign: "right" }}>{(u.rol !== "master" || (yoSoporte && !u.soporte)) && (
                  <div className="acciones" style={{ justifyContent: "flex-end" }}>
                    <Cajon key={`${u.id}-${q.ok ?? ""}`} titulo={`Cambiar la clave de ${u.nombre}`} boton="Cambiar clave" botonClase="btn sec chico">
                      <form action={accionEditarUsuario} className="formulario-cajon">
                        <input type="hidden" name="id" value={u.id} />
                        <div className="campo"><label htmlFor={`uc-${u.id}`}>Clave nueva</label><input id={`uc-${u.id}`} name="clave" type="password" minLength={8} required autoComplete="new-password" /><small>Mínimo 8 caracteres.</small></div>
                        <div className="cajon-pie"><button className="btn">Guardar clave</button></div>
                      </form>
                    </Cajon>
                    {u.rol !== "master" && <form action={accionEditarUsuario}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="accion" value="alternar" /><button className={`btn chico ${u.activo ? "peligro" : "sec"}`}>{u.activo ? "Desactivar" : "Reactivar"}</button></form>}
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
