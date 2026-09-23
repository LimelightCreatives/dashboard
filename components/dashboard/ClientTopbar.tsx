"use client";

import { Topbar } from "@/components/dashboard/Topbar";
import { useRouter } from "next/navigation";

interface ClientTopbarProps {
  user: { name: string; email: string };
  label: string;
}

export function ClientTopbar({ user, label }: ClientTopbarProps) {
  const router = useRouter();

  const handleLogout = () => {
    // TODO: Clear client-side session/cookies if needed
    router.push("/login");
  };

  return <Topbar user={user} label={label} onLogout={handleLogout} />;
}