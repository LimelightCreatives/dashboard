"use server";

import { logout } from "@/lib/auth"; // adjust path
import { redirect } from "next/navigation";

export async function logoutAction() {
  await logout();
  redirect("/");
}