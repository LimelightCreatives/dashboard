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
      id: "rsvp",
      date: "August 30",
      label: "RSVPs open",
      completed: true,
    },
    {
      id: "registration",
      date: "October 18",
      label: "Registration form sent",
    },
    {
      id: "opening",
      date: "October 24–25",
      label: "Event opening day",
      description: "Doors open 8:30am on both days.",
    },
  ],
};
