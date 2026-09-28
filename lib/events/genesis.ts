import type { EventConfig } from "./types";

export const genesisEvent: EventConfig = {
  id: "genesis",
  name: "Limelight GENESIS",
  tagline: "A two-day film-a-thon",
  theme: {
    accent: "#01995C",
    accentSecondary: "#81D7D4", // --lc-mint
  },
  teamSize: 3,
  milestones: [
    {
      id: "test",
      date: "00:00",
      label: "Test",
      completed: true,
    },
    {
      id: "incomplete milestone",
      date: "00:00",
      label: "incomplete milestone",
      completed: false,
    },
    {
      id: "really really really long milestone name",
      date: "00:00",
      label: "really really really long milestone name",
      completed: false,
    },
    
  ],
};
