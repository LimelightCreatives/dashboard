import { redirect } from "next/navigation";
import { getSession, hasRole } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();

  if (!session.authenticated) {
    redirect(
      "https://auth.limelightcreatives.org/login?next=" +
        encodeURIComponent("https://dashboard.limelightcreatives.org/")
    );
  }

  if (session.needsProfile) {
    redirect("https://auth.limelightcreatives.org/login?step=name");
  }

  if (hasRole(session, "STAFF") || hasRole(session, "ADMIN")) redirect("/staff");
  if (hasRole(session, "PARTICIPANT")) redirect("/participant");

  // Authenticated, profile complete, but role matched neither branch —
  // shouldn't normally happen with only two roles, but fail safe rather
  // than silently falling through with no redirect at all.
  redirect("https://auth.limelightcreatives.org/login");
}