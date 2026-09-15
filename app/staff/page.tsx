import { redirect } from "next/navigation";
import { getSession, hasRole } from "@/lib/auth";
import { staffApps } from "@/lib/apps";
import Launchpad from "@/components/launchpad";

export default async function StaffPage() {
  const session = await getSession();
  if (!hasRole(session, "staff")) redirect("/");
  return <Launchpad apps={staffApps} />;
}O", href