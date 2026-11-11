// Redirección rápida: sin cookie de sesión no se entra al panel.
// La verificación real (firma y rol) se hace en cada página y acción con exigirAdmin().
import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  if (!req.cookies.has("anelo_sesion")) return NextResponse.redirect(new URL("/ingresar", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
