/**
 * Debug endpoint - REMOVE IN PRODUCTION
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? "SET (hidden)" : "NOT SET",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET (hidden)" : "NOT SET",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT SET",
      NODE_ENV: process.env.NODE_ENV,
    },
    database: {
      connected: false,
      userCount: 0,
      error: null as string | null,
    },
  };

  try {
    const userCount = await db.user.count();
    checks.database.connected = true;
    checks.database.userCount = userCount;
  } catch (error) {
    checks.database.error = error instanceof Error ? error.message : "Unknown error";
  }

  return NextResponse.json(checks);
}
