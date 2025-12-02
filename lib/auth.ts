import type { NextAuthOptions, RequestInternal } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logInfo, logWarn, logError } from "@/lib/log";
import { captureException } from "@/lib/monitoring";

/**
 * Extract client IP from NextAuth request
 */
function getIpFromRequest(req: Pick<RequestInternal, "headers"> | undefined): string {
  if (!req?.headers) return "unknown";
  
  // Check common proxy headers
  const cfIp = req.headers.get?.("cf-connecting-ip") || req.headers["cf-connecting-ip"];
  if (cfIp) return String(cfIp);
  
  const realIp = req.headers.get?.("x-real-ip") || req.headers["x-real-ip"];
  if (realIp) return String(realIp);
  
  const forwardedFor = req.headers.get?.("x-forwarded-for") || req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const firstIp = String(forwardedFor).split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  
  return "unknown";
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Rate limiting for login attempts
        const clientIp = getIpFromRequest(req);
        const rateLimitResult = await rateLimit({
          key: `auth-${clientIp}`,
          limit: RATE_LIMITS.LOGIN.limit,
          windowMs: RATE_LIMITS.LOGIN.windowMs,
        });

        if (!rateLimitResult.ok) {
          logWarn("Login rate limit exceeded", { ip: clientIp.slice(0, 8) + "..." });
          // Return null to indicate auth failure
          // NextAuth will show generic error
          return null;
        }

        // Find user
        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.hashedPassword) {
          logWarn("Login failed: user not found or no password", { 
            email: credentials.email.slice(0, 3) + "***",
          });
          return null;
        }

        // Verify password
        const isPasswordValid = await verifyPassword(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          logWarn("Login failed: invalid password", { 
            userId: user.id,
            email: credentials.email.slice(0, 3) + "***",
          });
          return null;
        }

        // Update last login timestamp
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        logInfo("Login successful", { 
          userId: user.id,
          email: user.email,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    // Add OAuth providers here as needed:
    // GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),
    // GitHubProvider({ clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET! }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};
