import type { Metadata } from "next";
import { headers } from "next/headers";
import { Topbar } from "@/components/dashboard/Topbar";
import { logoutAction } from "@/app/actions/auth";
import localFont from "next/font/local";
import "./globals.css";

const wordmark = localFont({
  src: "../fonts/display/Autolova.woff2",
  variable: "--font-wordmark",
  preload: false
});

const display = localFont({
  src: [
    {
      path: "../fonts/display/Classica-Book.woff2",
      weight: "400",
    },
    {
      path: "../fonts/display/Classica-Bold.woff2",
      weight: "700",
    },
  ],
  variable: "--font-display",
  preload: true
});

const body = localFont({
  src: [
    {
      path: "../fonts/body/hanken_grotesk/HankenGrotesk-Regular.woff2",
      weight: "400",
    },
    {
      path: "../fonts/body/hanken_grotesk/HankenGrotesk-SemiBold.woff2",
      weight: "700",
    },
    {
      path: "../fonts/body/hanken_grotesk/HankenGrotesk-Bold.woff2",
      weight: "900",
    },
  ],
  variable: "--font-body",
  preload: true
});


export const metadata: Metadata = {
  title: "Dashboard - Limelight Creatives",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const h = await headers();
  const user = {
    name: h.get("x-user-name") || "User Unavailable",
    email: h.get("x-user-email") || "unavailable",
  };

  async function logout() {
    "use server";
    await logoutAction();
  }

  return (
    <html
      lang="en"
      className={`${wordmark.variable} ${display.variable} ${body.variable} min-h-screen font-body antialiased`}
    >
      <body className="flex h-dvh flex-col overflow-hidden">
        <Topbar user={user} onLogout={logout} />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
