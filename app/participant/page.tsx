import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { participantApps } from "@/lib/apps";
import Launchpad from "@/components/launchpad";

// export default async function ParticipantPage() {
//   const headersList = await headers();
//   const name = headersList.get("x-user-name");

//   return <Launchpad apps={participantApps} />;
// }

// genesis event
export default function ParticipantPage() {
  redirect("/participant/genesis/milestones");
}