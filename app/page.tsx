import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function RootPage() {
  const headersList = await headers();
  const role = headersList.get("x-user-role");

  redirect(role === "ADMIN" ? "/staff" : "/participant");
}