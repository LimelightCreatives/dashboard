import type { EventConfig } from "./types";

export const genesisEvent: EventConfig = {
  id: "genesis",
  name: "Limelight GENESIS",
  tagline: "Pilot event",
  locked: true,
  formUrl: "https://limelightcreatives.fillout.com/t/qyMeFhFzZuus",
  theme: {
    accent: "#01995C",
    accentSecondary: "#81D7D4", // --lc-mint
  },
  teamSize: 3,
  milestones: [
    {
      id: "production-ready",
      label: "Production Ready",
      targetTime: "Day 1, after workshop 1",
      description:
        "The team has completed pre-production and is ready to start filming. They have a complete storyboard/script, assigned roles, and have organised their locations, props and actors.",
      evidence: "Completed storyboard",
      status: "pending",
    },
    {
      id: "wrapped-filming",
      label: "Wrapped up with filming",
      targetTime: "Day 1, when they return from filming",
      description:
        "The team brings their phone/camera back and shows the footage they've captured. You don't need to watch everything, just verify they've shot the material needed to construct their film.",
      evidence: "Footage on their device / camera roll",
      status: "pending",
    },
    {
      id: "first-cut",
      label: "First Cut",
      targetTime: "Day 2, editing period",
      description:
        "A complete rough cut of the film. The whole film needs to exist from beginning to end, even if it's ugly. It should have the basic footage in the right order and tell the complete story.",
      evidence: "Playable rough cut",
      status: "pending",
    },
    {
      id: "polish",
      label: "Polish",
      description:
        "Quality check. The team has applied a consistent visual look across the entire project.",
      evidence: "A playable export of the film",
      status: "pending",
    },
    {
      id: "final-cut",
      label: "Submissions! Final cut",
      targetTime: "Before submissions close",
      description:
        "The film is completely finished, and the team has done one deliberate final review: it plays correctly from beginning to end, the audio works, there are no accidental clips or black frames, titles/credits are correct, it meets the required length and format, and everyone on the team is happy with it.",
      evidence: "Final exported film + completed final-check checklist",
      status: "pending",
    },
    {
      id: "team-player",
      label: "Team Player",
      bonus: true,
      targetTime: "Any time throughout the weekend",
      description:
        "Awarded for genuinely helping another team progress with their film. This could be helping with filming, acting, sound, editing, troubleshooting, or sharing a useful filmmaking skill.",
      evidence:
        "The other team confirms they received meaningful help, verified by a mentor or organiser",
      status: "pending",
    },
  ],
};