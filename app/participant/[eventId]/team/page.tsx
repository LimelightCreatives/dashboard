"use client";

import { useState } from "react";

import { Button } from "@/components/Button";
import { HardCard } from "@/components/dashboard/HardCard";
import { inputStyles } from "@/components/dashboard/form";

// TODO: replace with a real fetch of teams for this event that still have space
const MOCK_TEAMS = ["Team Popcorn", "Team Clapperboard", "Team Reel Deal", "Team Wide Shot"];

export default function TeamPage() {
  const [currentTeam, setCurrentTeam] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [busy, setBusy] = useState<"join" | "create" | null>(null);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeam) return;
    setBusy("join");
    // TODO: call the backend to join `selectedTeam`
    setTimeout(() => {
      setCurrentTeam(selectedTeam);
      setBusy(null);
    }, 400);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setBusy("create");
    // TODO: call the backend to create a team named `newTeamName` and join it
    setTimeout(() => {
      setCurrentTeam(newTeamName.trim());
      setBusy(null);
    }, 400);
  }

  if (currentTeam) {
    return (
      <div>
        <h1 className="font-display text-4xl md:text-5xl">Team</h1>

        <HardCard className="mt-10 max-w-xl">
          <p className="font-body text-xs uppercase tracking-[0.15em] text-[var(--foreground)]/50">You&apos;re on</p>
          <p className="mt-2 font-display text-3xl">{currentTeam}</p>
          <Button
            variant="secondary"
            className="mt-6"
            onClick={() => {
              // TODO: call the backend to leave the team
              setCurrentTeam(null);
            }}
          >
            Leave team
          </Button>
        </HardCard>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display font-bold text-4xl md:text-5xl">Team</h1>
      <p className="mt-2 max-w-xl font-body text-sm text-[var(--foreground)]/70">
        Join an existing team or start your own.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <HardCard>
          <p className="font-display text-2xl">Join a team</p>
          <form onSubmit={handleJoin} className="mt-6 space-y-4">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className={inputStyles}
            >
              <option value="">Select a team…</option>
              {MOCK_TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={!selectedTeam || busy === "join"}>
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
