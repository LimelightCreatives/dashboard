"use client";

import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative overflow-hidden px-6 pb-6 pt-24 md:pt-32">
      {/* Footer details */}
      <div className="mx-auto max-w-7xl">
        <div className="border-t-2 border-[var(--border)]" />

        <div className="flex flex-col gap-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <Image
              src="../branding/wordmark.svg"
              alt="Limelight Creatives"
              height={64}
              width={256}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-body font-bold">
            <Link
              href="https://limelightcreatives.org/code-of-conduct"
              className="transition-opacity hover:opacity-50"
            >
              CODE OF CONDUCT
            </Link>

            <Link
              href="https://limelightcreatives.org/privacy"
              className="transition-opacity hover:opacity-50"
            >
              PRIVACY
            </Link>

            <Link
              href="https://limelightcreatives.org/safeguarding-policy"
              className="transition-opacity hover:opacity-50"
            >
              SAFEGUARDING POLICY
            </Link>
          </div>

          <p className="text-sm font-body font-bold">
            made with <span aria-label="love">♥</span> by LIMELIGHT CREATIVES
          </p>
        </div>
      </div>
    </footer>
  );
}