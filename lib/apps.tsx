import type { AppLink } from "@/components/launchpad";

export const participantApps: AppLink[] = [
  { name: "Limelight GENESIS", href: "/participant/genesis", icon: "/apps/genesis.svg", external: true },
];

export const staffApps: AppLink[] = [
  { name: "Participants", href: "/staff/checkin", icon: "/apps/profile.svg" },
  { name: "Check-in", href: "/staff/checkin", icon: "/apps/onboard.svg" },
  { name: "Milestones", href: "/staff/checkin", icon: "/apps/onboard.svg" },
];