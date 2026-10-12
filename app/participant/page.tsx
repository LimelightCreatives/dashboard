import { redirect } from "next/navigation";
import { participantApps } from "@/lib/apps";
import Launchpad from "@/components/launchpad";

export default async function ParticipantPage() {

  return <Launchpad apps={participantApps} />;
}

// genesis event
// export default function ParticipantPage() {
//   redirect("/participant/genesis/project");
// }