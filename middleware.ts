import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const hasLocalSession = Boolean(request.cookies.get("oneday_admin_session")?.value);
    const hasAuthSession = request.cookies.getAll().some((cookie) => cookie.name.includes("authjs.session-token"));
    if (!hasLocalSession && !hasAuthSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
