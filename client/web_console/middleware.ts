import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    // Next.js middleware cannot access sessionStorage (it runs on the edge).
    // We use a lightweight cookie `admin_authed=1` set on login to gate access.
    const authed = req.cookies.get("admin_authed")?.value;

    if (!authed) {
      const loginUrl = req.nextUrl.clone();

      loginUrl.pathname = "/login";

      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
