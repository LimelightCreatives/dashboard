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
        // Server-to-server: forward the raw session cookie so the auth
        // server's NextAuth instance can verify it directly. No bearer
        // tokens in this system.
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

export function hasRole(session: Session, role: string) {
  return session.authenticated && session.role === role;
}