import { NextRequest, NextResponse } from "next/server";

import { SITE_AUTH_COOKIE } from "@/lib/site-auth";

function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/api/auth/login";
}

function isStaticPath(pathname: string): boolean {
  return pathname.startsWith("/_next/") || pathname === "/favicon.ico" || pathname.startsWith("/images/");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isStaticPath(pathname) || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasAccessCookie = request.cookies.get(SITE_AUTH_COOKIE)?.value === "1";
  if (hasAccessCookie) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Site password required." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
