import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const MAX_TEAM_SIZE = 3;

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

export function generateJoinCode(len = 6) {
  return Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export function getUserId(req: NextRequest): string | null {
  const id = req.headers.get("x-user-id");
  return id ? id : null;
}

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export function teamsLocked() {
  return process.env.TEAMS_LOCKED === "true";
}

export function submissionsClosed() {
  const close = process.env.SUBMISSIONS_CLOSE_AT; // e.g. "2026-11-01T23:59:00+11:00"
  return close ? Date.now() > new Date(close).getTime() : false;
}