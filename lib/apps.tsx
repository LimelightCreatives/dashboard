import type { AppLink } from "@/components/launchpad";

export const participantApps: AppLink[] = [
  { name: "Limelight GENESIS", href: "/participant/genesis", icon: "/apps/genesis.svg" },
];

export const staffApps: AppLink[] = [
  { name: "Schedule", href: "/staff/schedule", icon: "/apps/schedule.svg" },
  { name: "Check-in", href: "/staff/checkin", icon: "/apps/onboard.svg" },
  { name: "Milestones", href: "/staff/milestones", icon: "/apps/milestones.svg" },
  { name: "Participants", href: "/staff/participants", icon: "/apps/profile.svg" },
  { name: "Submissions", href: "/staff/theatre", icon: "/apps/theatre.svg" },
];