import { headers } from "next/headers";
import { staffApps } from "@/lib/apps";
import Launchpad from "@/components/launchpad";

export default async function StaffPage() {
  const headersList = await headers();
  const headersObj = Object.fromEntries(headersList.entries());
  console.log("Header Contents:", headersObj);

  return <Launchpad apps={staffApps} header={headersObj} />;
}