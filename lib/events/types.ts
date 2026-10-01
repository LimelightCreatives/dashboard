export type MilestoneStatus = "pending" | "submitted" | "approved";

export type Milestone = {
  id: string;
  label: string;
  description?: string;
  targetTime?: string; // e.g. "Day 1, after workshop 1"
  evidence?: string;   // what the team needs to show
  formUrl?: string;    // link to the submission form
  bonus?: boolean;
  status: MilestoneStatus;
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
  formUrl: string;
  theme: EventTheme;
  teamSize?: number;
  milestones: Milestone[];
};
