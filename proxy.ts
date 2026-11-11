// Redirección rápida: sin cookie de sesión no se entra al panel ni al portal.
// La verificación real (firma, usuario activo y rol) se hace en cada página y acción.
import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/portal/registro")) return NextResponse.next();
  if (!req.cookies.has("anelo_sesion")) return NextResponse.redirect(new URL("/ingresar", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/portal/:path*", "/portal", "/recibo/:path*"] };
