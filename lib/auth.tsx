import { cookies } from "next/headers";

export type Session = {
  authenticated: boolean;
  id: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
  needsProfile: boolean;
};

const AUTH_API = "https://auth.limelightcreatives.org/api";

// NextAuth drops the __Secure- prefix when not served over HTTPS (local dev).
const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

// Must match the `domain` used when the cookie was set (see auth.ts
// cookies config) so the browser actually deletes it, e.g. ".limelightcreatives.org".
const ROOT_DOMAIN = process.env.AUTH_COOKIE_DOMAIN;

const EMPTY_SESSION: Session = {
  authenticated: false,
  id: null,
  email: null,
  name: null,
  role: null,
  needsProfile: false,
};

export async function getSession(): Promise<Session> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return EMPTY_SESSION;

  try {
    const res = await fetch(`${AUTH_API}/permission`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return EMPTY_SESSION;

    const data = await res.json();
    if (!data.authenticated) return EMPTY_SESSION;

    return {
      authenticated: true,
      id: data.id ?? null,
      email: data.email ?? null,
      name: data.name ?? null,
      role: data.role ?? null,
      needsProfile: Boolean(data.needsProfile),
    };
  } catch {
    return EMPTY_SESSION;
  }
}

// Deletes the shared session cookie. Must be called from a Server Action
// or Route Handler (next/headers cookies() is write-able only in those
// contexts, not in Server Components).
export async function logout(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    domain: ROOT_DOMAIN,
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
  });
}

export function hasRole(session: Session, role: string) {
  return session.authenticated && session.role === role;
}