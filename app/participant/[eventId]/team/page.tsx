"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { HardCard } from "@/components/dashboard/HardCard";
import { inputStyles } from "@/components/dashboard/form";

type Team = {
  id: string;
  name: string;
  joinCode: string;
  isOwner: boolean;
  memberCount: number;
  maxSize: number;
};

// Reads the body as text first so an empty or non-JSON response never throws,
// then throws a readable Error for any non-2xx status.
async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new Error("Network error. Check your connection and try again.");
  }

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      /* non-JSON body, handled below */
    }
  }

  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
  if (data === null) {
    throw new Error("The server returned an unexpected response.");
  }
  return data as T;
}

function Spinner() {
  return (
    <div className="flex justify-center py-20" role="status" aria-label="Loading">
      <span
        aria-hidden
        className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--foreground)]/20 border-t-[var(--accent)]"
      />
    </div>
  );
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: body ? { "Content-Type": "application/json" } : undefined,
  body: body ? JSON.stringify(body) : undefined,
});

export default function TeamPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [busy, setBusy] = useState<"join" | "create" | "leave" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api<{ team: Team | null }>("/api/team");
      setTeam(data.team);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(kind: "join" | "create" | "leave", fn: () => Promise<unknown>) {
    setBusy(kind);
    setError(null);
    try {
      await fn();
      const data = await api<{ team: Team | null }>("/api/team");
      setTeam(data.team);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    run("join", () => api("/api/team/join", jsonInit("POST", { code: joinCode })));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    run("create", () => api("/api/team", jsonInit("POST", { name: newTeamName })));
  };

  async function copyCode() {
    if (!team) return;
    try {
      await navigator.clipboard.writeText(team.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy. Select the code and copy it manually.");
    }
  }

  if (loading) return <Spinner />;

  if (loadError) {
    return (
      <div>
        <h1 className="font-display font-bold text-4xl md:text-5xl">Team</h1>

        <div className="mx-auto mt-16 w-full max-w-md">
          <HardCard>
            <div className="flex flex-col items-center text-center">
              <p className="font-display text-2xl">Couldn&apos;t load your team</p>
              <p className="mt-2 font-body text-sm text-red-600">{loadError}</p>
              <Button variant="secondary" className="mt-6" onClick={load}>
                Try again
              </Button>
            </div>
          </HardCard>
        </div>
      </div>
    );
  }

  if (team) {
    return (
      <div>
        <h1 className="font-display font-bold text-4xl md:text-5xl">Team</h1>

        <div className="mx-auto mt-10 w-full max-w-xl">
          <HardCard>
            <p className="font-body text-xs uppercase tracking-[0.15em] text-[var(--foreground)]/50">
              You&apos;re on
            </p>
            <p className="mt-2 font-display text-3xl">{team.name}</p>
            <p className="mt-1 font-body text-sm text-[var(--foreground)]/70">
              {team.memberCount} / {team.maxSize} members
            </p>

            <p className="mt-6 font-body text-xs uppercase tracking-[0.15em] text-[var(--foreground)]/50">
              Join code
            </p>
            <div className="mt-2 flex items-center gap-3">
              <code className="font-display font-bold text-4xl tracking-[0.2em]">{team.joinCode}</code>
              <Button variant="secondary" type="button" onClick={copyCode}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            {error ? <p className="mt-4 font-body text-sm text-red-600">{error}</p> : null}

            <Button
              variant="secondary"
              className="mt-6"
              disabled={busy === "leave"}
              onClick={() => run("leave", () => api("/api/team/leave", jsonInit("POST")))}
            >
              {busy === "leave" ? "Leaving…" : "Leave team"}
            </Button>
          </HardCard>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display font-bold text-4xl md:text-5xl">Team</h1>
      <p className="mt-2 max-w-xl font-body text-sm text-[var(--foreground)]/70">
        Enter a join code from a teammate, or start your own team.
      </p>
      {error ? <p className="mt-4 font-body text-sm text-red-600">{error}</p> : null}

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <HardCard>
          <p className="font-display text-2xl">Join a team</p>
          <form onSubmit={handleJoin} className="mt-6 space-y-4">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Join code"
              maxLength={8}
              className={`${inputStyles} uppercase tracking-[0.2em]`}
            />
            <Button type="submit" disabled={!joinCode.trim() || busy === "join"}>
              {busy === "join" ? "Joining…" : "Join team"}
            </Button>
          </form>
        </HardCard>

        <HardCard>
          <p className="font-display text-2xl">Create a team</p>
          <form onSubmit={handleCreate} className="mt-6 space-y-4">
            <input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Team name"
              className={inputStyles}
            />
            <Button type="submit" variant="secondary" disabled={!newTeamName.trim() || busy === "create"}>
              {busy === "create" ? "Creating…" : "Create team"}
            </Button>
          </form>
        </HardCard>
      </div>
    </div>
  );
}