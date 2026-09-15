import { headers } from "next/headers";
import { staffApps } from "@/lib/apps";
import Launchpad from "@/components/launchpad";

export default async function StaffPage() {
  const headersList = await headers();
  const name = headersList.get("x-user-name");

  return <Launchpad apps={staffApps}/>;
}