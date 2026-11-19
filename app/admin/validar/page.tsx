import { Suspense } from "react";
import Cargando from "@/app/admin/loading";
import { Ayuda, Encabezado } from "@/components/Ayuda";
import Puerta from "@/components/panel/Puerta";
import { consultar } from "@/lib/puerta";
import { exigirEquipo } from "@/lib/sesion";

export const metadata = { title: "Validar entradas" };
type Props = { searchParams: Promise<Record<string, string>> };

async function Validar({ searchParams }: Props) {
  const s = await exigirEquipo();
  const q = await searchParams;
  // Si el QR se abrió con la cámara del teléfono, llega aquí con ?c=CODIGO y se muestra de una vez.
  const inicial = q.c ? await consultar(q.c) : null;

  return (
    <>
      <Encabezado titulo="Validar entradas" descripcion="Control de la puerta: escanea el QR, da entrada, registra salidas temporales y regresos." />
      <Ayuda>
        <ol>
          <li>Pulsa <b>Abrir cámara</b> y apunta al QR de la entrada (impresa o en el teléfono del cliente). La primera vez el navegador pide permiso para usar la cámara.</li>
          <li>Elige el modo de la puerta:
            <ul>
              <li><b>Preguntar:</b> muestra la entrada y tú decides: Dar entrada, Registrar salida temporal o Volver a entrar.</li>
              <li><b>Entrada rápida:</b> para la fila de la apertura. Da entrada sola y la cámara sigue leyendo.</li>
              <li><b>Salida:</b> para el intermedio. Registra la salida temporal; al volver, la misma entrada sirve con Entrada rápida o Volver a entrar.</li>
            </ul>
          </li>
          <li>Verde y pitido agudo: adelante. Rojo y pitido grave: no puede pasar (ya está adentro, anulada o no existe).</li>
          <li>Si una familia trae varias entradas de la misma compra, <b>Dar entrada a todas</b> las pasa de una vez.</li>
          <li>Si el QR no se lee, escribe el código de letras impreso debajo del QR.</li>
        </ol>
      </Ayuda>
      <Puerta key={q.c ?? "puerta"} inicial={inicial} puedeDeshacer={s.rol !== "vendedor"} />
    </>
  );
}

export default function Pagina(props: Props) {
  return <Suspense fallback={<Cargando />}><Validar {...props} /></Suspense>;
}
