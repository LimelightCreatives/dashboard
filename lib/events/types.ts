export type Milestone = {
  id: string;
  /** Display string, kept flexible since events show dates differently (e.g. "October 18" or "Oct 24–25"). */
  date: string;
  label: string;
  description?: string;
  completed?: boolean;
};

export type EventTheme = {
  /** Overrides the generic --accent token for everything inside this event's dashboard (not the topbar). */
  accent: string;
  accentSecondary?: string;
};

export type EventConfig = {
  id: string;
  name: string;
  tagline?: string;
  theme: EventTheme;
  teamSize?: number;
  milestones: Milestone[];
};
