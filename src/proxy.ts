import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";

const publicRoutes = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }
  if (pathname.startsWith("/screens/")) {
    return true;
  }
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  let isValidToken = false;
  if (token) {
    try {
      const payload = await verifyToken(token);
      isValidToken = payload !== null;
    } catch {
      isValidToken = false;
    }
  }

  if (isValidToken && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/projects", req.url));
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (!isValidToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
