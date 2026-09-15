import { redirect } from "next/navigation";
import { getSession, hasRole } from "@/lib/auth";
import { participantApps } from "@/lib/apps";
import Launchpad from "@/components/launchpad";

export default async function ParticipantPage() {
  const session = await getSession();
  if (!hasRole(session, "participant")) redirect("/");
  return <Launchpad apps={participantApps} />;
}