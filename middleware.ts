import { NextRequest, NextResponse } from "next/server";

const AUTH_API = "https://auth.limelightcreatives.org/api";
const AUTH_LOGIN_URL = "https://auth.limelightcreatives.org/login";
const DASHBOARD_ORIGIN = "https://dashboard.limelightcreatives.org";

// Server-to-server endpoints that have no user session. Each one must
// authenticate itself (the Fillout webhook checks a shared secret).
const PUBLIC_API_PATHS = new Set(["/api/fillout/webhook"]);

const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

type PermissionResponse = {
  authenticated: boolean;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  needsProfile?: boolean;
};

async function fetchSession(token: string): Promise<PermissionResponse> {
  if (process.env.NODE_ENV === "development" && process.env.DEV_BYPASS_AUTH === "true") {
    console.log("dev mode");
    return {
      authenticated: true,
      id: "0",
      email: "supercooldeveloper@limelightcreatives.org",
      name: "Development User",
      role: process.env.DEV_ROLE,
      needsProfile: false,
    };
  }
  try {
    const res = await fetch(`${AUTH_API}/permission`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return { authenticated: false };
    return await res.json();
  } catch {
    return { authenticated: false };
  }
}

function loginRedirect(req: NextRequest, extraParams?: Record<string, string>) {
  const url = new URL(AUTH_LOGIN_URL);
  url.searchParams.set("next", DASHBOARD_ORIGIN + req.nextUrl.pathname);
  for (const [key, value] of Object.entries(extraParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let the Fillout webhook through without a session. Strip any x-user-*
  // headers a caller may have sent so they can't be mistaken for real identity.
  if (PUBLIC_API_PATHS.has(pathname)) {
    const publicHeaders = new Headers(req.headers);
    for (const h of ["x-user-id", "x-user-email", "x-user-name", "x-user-role"]) {
      publicHeaders.delete(h);
    }
    return NextResponse.next({ request: { headers: publicHeaders } });
  }

  const devBypass =
    process.env.NODE_ENV === "development" && process.env.DEV_BYPASS_AUTH === "true";

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token && !devBypass) {
    return loginRedirect(req);
  }

  const session = devBypass
    ? {
        authenticated: true,
        id: "0",
        email: "supercooldeveloper@limelightcreatives.org",
        name: "Development User",
        role: process.env.DEV_ROLE,
        needsProfile: false,
      }
    : await fetchSession(token!);

  if (!session.authenticated) {
    return loginRedirect(req);
  }

  if (session.needsProfile) {
    return loginRedirect(req, { step: "name" });
  }

  // Role gating per path prefix.
  if (pathname.startsWith("/staff") && session.role !== "ADMIN" && session.role !== "STAFF") {
    return NextResponse.redirect(new URL("/participant", req.url));
  }

  if (pathname.startsWith("/participant") && !session.role) {
    return loginRedirect(req);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", session.id ?? "");
  requestHeaders.set("x-user-email", session.email ?? "");
  requestHeaders.set("x-user-name", session.name ?? "");
  requestHeaders.set("x-user-role", session.role ?? "");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};