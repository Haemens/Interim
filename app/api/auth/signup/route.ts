import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { isValidTenantSlug } from "@/lib/tenant";
import { logInfo, logError } from "@/lib/log";
import { getClientIp } from "@/lib/client-ip";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const signupSchema = z.object({
  agencyName: z.string().min(2, "Agency name must be at least 2 characters").max(100),
  agencySlug: z.string().max(63).optional(),
  agencyEmail: z.string().email("Invalid agency email"),
  userName: z.string().min(2, "Name must be at least 2 characters").max(100),
  userEmail: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a slug from agency name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

/**
 * Check if slug is available
 */
async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await db.agency.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !existing;
}

/**
 * Generate a unique slug
 */
async function generateUniqueSlug(baseName: string): Promise<string> {
  let slug = generateSlug(baseName);
  let counter = 0;
  
  while (!(await isSlugAvailable(slug))) {
    counter++;
    slug = `${generateSlug(baseName)}-${counter}`;
  }
  
  return slug;
}

// =============================================================================
// POST /api/auth/signup - Create new agency + owner user
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for signups
    const clientIp = getClientIp(request);
    const rateLimitResponse = await applyRateLimit(
      `signup-${clientIp}`,
      RATE_LIMITS.SIGNUP
    );
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const data = signupSchema.parse(body);

    // Validate password strength
    const passwordError = validatePasswordStrength(data.password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // Normalize email
    const userEmail = data.userEmail.toLowerCase();
    const agencyEmail = data.agencyEmail.toLowerCase();

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: userEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Generate or validate slug
    let slug: string;
    if (data.agencySlug) {
      slug = data.agencySlug.toLowerCase();
      
      if (!isValidTenantSlug(slug)) {
        return NextResponse.json(
          { error: "Invalid slug format. Use lowercase letters, numbers, and hyphens only." },
          { status: 400 }
        );
      }
      
      if (!(await isSlugAvailable(slug))) {
        return NextResponse.json(
          { error: "This slug is already taken. Please choose another." },
          { status: 400 }
        );
      }
    } else {
      slug = await generateUniqueSlug(data.agencyName);
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create everything in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create agency
      const agency = await tx.agency.create({
        data: {
          name: data.agencyName,
          slug,
          email: agencyEmail,
          primaryColor: "#4F46E5",
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email: userEmail,
          name: data.userName,
          hashedPassword,
        },
      });

      // Create membership (OWNER)
      await tx.membership.create({
        data: {
          userId: user.id,
          agencyId: agency.id,
          role: "OWNER",
        },
      });

      // Create initial subscription (STARTER plan with trial)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

      await tx.subscription.create({
        data: {
          agencyId: agency.id,
          plan: "STARTER",
          status: "ACTIVE",
          trialEndsAt,
        },
      });

      // Create welcome event
      await tx.eventLog.create({
        data: {
          agencyId: agency.id,
          userId: user.id,
          type: "AGENCY_CREATED",
          payload: {
            agencyName: agency.name,
            agencySlug: agency.slug,
            ownerEmail: user.email,
          },
        },
      });

      return { agency, user };
    });

    logInfo("New agency created", {
      agencyId: result.agency.id,
      agencySlug: result.agency.slug,
      userId: result.user.id,
    });

    return NextResponse.json({
      success: true,
      agency: {
        id: result.agency.id,
        name: result.agency.name,
        slug: result.agency.slug,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    logError("Signup error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
