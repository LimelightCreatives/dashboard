"use client";

import { Topbar } from "@/components/dashboard/Topbar";
import { signOut } from "next-auth/react";

interface ClientTopbarProps {
  user: { name: string; email: string };
  label: string;
}

export function ClientTopbar({ user, label }: ClientTopbarProps) {
  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return <Topbar user={user} label={label} onLogout={handleLogout} />;
}