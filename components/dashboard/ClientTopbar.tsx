"use client";

import { Topbar } from "@/components/dashboard/Topbar";
import { logoutAction } from "@/app/actions/auth";

interface ClientTopbarProps {
  user: { name: string; email: string };
  label: string;
}

export function ClientTopbar({ user, label }: ClientTopbarProps) {
  return <Topbar user={user} label={label} onLogout={() => logoutAction()} />;
}