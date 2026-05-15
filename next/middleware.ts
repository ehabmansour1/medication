import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/share",
  "/api/share",
  "/api/cron",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value;
  const userId = await verifySession(sessionCookie);

  // Logged-in users hitting /login → bounce home (or to ?redirect=)
  if (pathname === "/login") {
    if (userId) {
      const redirect = req.nextUrl.searchParams.get("redirect") || "/";
      return NextResponse.redirect(new URL(redirect, req.url));
    }
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (userId) {
    return NextResponse.next();
  }

  // API callers expect JSON; HTML pages get a redirect to /login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL("/login", req.url);
  if (pathname !== "/") {
    url.searchParams.set("redirect", pathname);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     *  - Next.js internals (_next/...)
     *  - public folder assets identified by extension or known names
     */
    "/((?!_next/|favicon\\.ico|sw\\.js|manifest\\.json|images/).*)",
  ],
};
