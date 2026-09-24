"use client";

import { useState } from "react";

import { Button } from "@/components/Button";
import { HardCard } from "@/components/dashboard/HardCard";

type Candidate = {
  id: string;
  team: string;
  title: string;
  logline: string;
};

// TODO: replace with a real fetch of submitted projects eligible for voting on this event
const MOCK_CANDIDATES: Candidate[] = [
  { id: "1", team: "Team Popcorn", title: "Last Light", logline: "A group of friends race the sunset to finish their film." },
  { id: "2", team: "Team Clapperboard", title: "Retake", logline: "One actor keeps flubbing the same line — until it means something." },
  { id: "3", team: "Team Reel Deal", title: "Static", logline: "A found-footage short about a haunted editing suite." },
];

export default function VotingPage() {
  const [votedId, setVotedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function handleVote(id: string) {
    setPendingId(id);
    // TODO: send the vote to the backend; the server should enforce one vote per participant
    setTimeout(() => {
      setVotedId(id);
      setPendingId(null);
    }, 350);
  }

  return (
    <div>
      <h1 className="font-display font-bold text-4xl md:text-5xl">Voting</h1>
      <p className="mt-2 max-w-xl font-body text-sm text-[var(--foreground)]/70">
        Watch the submissions and cast your vote for your favourite film. You can change your vote until voting closes.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_CANDIDATES.map((candidate) => {
          const isVoted = votedId === candidate.id;
          const isPending = pendingId === candidate.id;

          return (
            <HardCard key={candidate.id} className="flex h-full flex-col justify-between">
              <div>
                <p className="font-body text-xs uppercase tracking-[0.15em] text-[var(--foreground)]/50">
                  {candidate.team}
                </p>
                <p className="mt-2 font-display text-2xl">{candidate.title}</p>
                <p className="mt-2 font-body text-sm text-[var(--foreground)]/70">{candidate.logline}</p>
              </div>

              <Button
                className="mt-6 w-full"
                variant={isVoted ? "primary" : "secondary"}
                disabled={isPending}
                onClick={() => handleVote(candidate.id)}
              >
                {isVoted ? "Voted" : isPending ? "Voting…" : "Vote"}
              </Button>
            </HardCard>
          );
        })}
      </div>
    </div>
  );
}
