/**
 * Demo Login API
 * 
 * POST /api/auth/demo
 * 
 * Logs the user in as the demo user and redirects to the demo agency dashboard.
 * This allows visitors to explore the product without signing up.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEMO_AGENCY_SLUG, DEMO_USER_EMAIL } from "@/modules/auth/demo-mode";
import { encode } from "next-auth/jwt";
import { cookies } from "next/headers";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

export async function POST(req: NextRequest) {
  try {
    // Find the demo user
    const demoUser = await db.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
      include: {
        memberships: {
          where: {
            agency: { slug: DEMO_AGENCY_SLUG },
          },
          include: { agency: true },
        },
      },
    });

    if (!demoUser || demoUser.memberships.length === 0) {
      return NextResponse.json(
        { error: "Demo mode is not configured. Please run the seed script." },
        { status: 503 }
      );
    }

    if (!NEXTAUTH_SECRET) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create a session token for the demo user
    const token = await encode({
      token: {
        id: demoUser.id,
        sub: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        picture: demoUser.image,
      },
      secret: NEXTAUTH_SECRET,
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Create a session in the database
    const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await db.session.create({
      data: {
        sessionToken: token,
        userId: demoUser.id,
        expires: sessionExpiry,
      },
    });

    // Get the base URL for redirect
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    
    // Construct the demo agency URL
    // For local dev: demo-agency.localhost:3000
    // For production: demo-agency.yourdomain.com
    let demoUrl: string;
    if (host.includes("localhost")) {
      demoUrl = `${protocol}://${DEMO_AGENCY_SLUG}.localhost:3000/dashboard`;
    } else {
      // Extract the base domain (e.g., questhire.com from www.questhire.com)
      const baseDomain = host.replace(/^www\./, "").split(":")[0];
      demoUrl = `${protocol}://${DEMO_AGENCY_SLUG}.${baseDomain}/dashboard`;
    }

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "next-auth.session-token",
      value: token,
      httpOnly: true,
      secure: protocol === "https",
      sameSite: "lax",
      path: "/",
      expires: sessionExpiry,
      // For subdomains to work, we need to set domain
      ...(host.includes("localhost") 
        ? {} 
        : { domain: `.${host.replace(/^www\./, "").split(":")[0]}` }
      ),
    });

    return NextResponse.json({
      success: true,
      redirectUrl: demoUrl,
    });
  } catch (error) {
    console.error("Demo login error:", error);
    
    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("Can't reach database") || errorMessage.includes("P1001")) {
      return NextResponse.json(
        { error: "Database is not available. Please ensure the database is running." },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to start demo session. Please try again later." },
      { status: 500 }
    );
  }
}
