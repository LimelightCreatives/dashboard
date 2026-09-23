"use client";

import { Topbar } from "@/components/dashboard/Topbar";
import { useRouter } from "next/navigation";

export function ClientTopbar({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();

  const handleLogout = () => {
    // TODO: Clear client-side session/cookies if needed
    router.push("/login");
  };

  return <Topbar user={user} onLogout={handleLogout} />;
}