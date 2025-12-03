#!/usr/bin/env npx tsx
/**
 * Smoke Test Script for QuestHire
 * 
 * Run before deployments to verify core functionality:
 *   npm run smoke
 * 
 * Prerequisites:
 *   - Database is running and seeded
 *   - Dev server is running on localhost:3000 (for API tests)
 * 
 * Exit codes:
 *   0 = All tests passed
 *   1 = Some tests failed
 */

import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_URL = process.env.SMOKE_TEST_URL || "http://localhost:3000";
const DEMO_TENANT = "demo-agency";
const ALPHA_TENANT = "alpha-staff";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  dim: "\x1b[2m",
};

// =============================================================================
// HELPERS
// =============================================================================

function log(message: string, type: "info" | "success" | "error" | "warn" = "info") {
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`,
  };
  console.log(`${prefix[type]} ${message}`);
}

function section(title: string) {
  console.log(`\n${colors.blue}━━━ ${title} ━━━${colors.reset}`);
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>): Promise<boolean> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    log(`${name} ${colors.dim}(${duration}ms)${colors.reset}`, "success");
    return true;
  } catch (error) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMessage, duration });
    log(`${name}: ${errorMessage}`, "error");
    return false;
  }
}

// =============================================================================
// DATABASE TESTS
// =============================================================================

async function testDatabase(prisma: PrismaClient) {
  section("Database Checks");

  await runTest("Database connection", async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  await runTest("Demo agency exists", async () => {
    const agency = await prisma.agency.findUnique({
      where: { slug: DEMO_TENANT },
    });
    if (!agency) throw new Error(`Agency '${DEMO_TENANT}' not found`);
  });

  await runTest("Alpha Staff agency exists", async () => {
    const agency = await prisma.agency.findUnique({
      where: { slug: ALPHA_TENANT },
    });
    if (!agency) throw new Error(`Agency '${ALPHA_TENANT}' not found`);
  });

  await runTest("At least one job exists", async () => {
    const jobCount = await prisma.job.count();
    if (jobCount === 0) throw new Error("No jobs found in database");
  });

  await runTest("At least one application exists", async () => {
    const appCount = await prisma.application.count();
    if (appCount === 0) throw new Error("No applications found in database");
  });

  await runTest("Jobs have applications attached", async () => {
    const jobWithApps = await prisma.job.findFirst({
      where: {
        applications: {
          some: {},
        },
      },
    });
    if (!jobWithApps) throw new Error("No jobs with applications found");
  });
}

// =============================================================================
// API TESTS
// =============================================================================

async function testApis() {
  section("API Endpoint Checks");

  await runTest("GET /api/health returns 200", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== "ok") throw new Error(`Status is '${data.status}', expected 'ok'`);
  });

  await runTest("GET /api/health/deep returns non-error status", async () => {
    const res = await fetch(`${BASE_URL}/api/health/deep`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status === "error") {
      throw new Error(`Deep health check failed: ${JSON.stringify(data.checks)}`);
    }
  });

  // Test analytics endpoint with tenant header
  await runTest("GET /api/analytics/summary works", async () => {
    const res = await fetch(`${BASE_URL}/api/analytics/summary`, {
      headers: {
        "x-tenant-slug": ALPHA_TENANT,
      },
    });
    // May return 401 if not authenticated, but shouldn't crash
    if (res.status === 500) {
      const data = await res.json();
      throw new Error(`Server error: ${data.error || "Unknown"}`);
    }
  });
}

// =============================================================================
// PUBLIC PAGE TESTS
// =============================================================================

async function testPublicPages(prisma: PrismaClient) {
  section("Public Page Checks");

  // Get a job ID for testing
  const job = await prisma.job.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  await runTest("Public jobs page loads (Agency Context)", async () => {
    const res = await fetch(`${BASE_URL}/jobs`, {
      headers: { Host: `${ALPHA_TENANT}.localhost:3000` },
    });
    // Should return HTML, not error
    if (res.status === 500) throw new Error("Server error on jobs page");
  });

  await runTest("Global job board loads (Main Domain)", async () => {
    const res = await fetch(`${BASE_URL}/jobs`, {
      headers: { Host: "localhost:3000" }, // Main domain
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const text = await res.text();
    if (!text.includes("Trouvez votre prochaine")) {
      throw new Error("Did not find global board title");
    }
  });

  await runTest("Agency Hub page loads", async () => {
    const res = await fetch(`${BASE_URL}/agencies/${DEMO_TENANT}`, {
      headers: { Host: "localhost:3000" },
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  if (job) {
    await runTest("Public job detail page loads (Agency Context)", async () => {
      const res = await fetch(`${BASE_URL}/jobs/${job.id}`, {
        headers: { Host: `${ALPHA_TENANT}.localhost:3000` },
      });
      if (res.status === 500) throw new Error("Server error on job detail page");
    });
  }
}

// =============================================================================
// CONTENT TESTS
// =============================================================================

async function testContent(prisma: PrismaClient) {
  section("Content & Channel Checks");

  // Get a job for content testing
  const job = await prisma.job.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true, agencyId: true },
  });

  if (!job) {
    log("No active jobs found, skipping content tests", "warn");
    return;
  }

  await runTest("Job content endpoint accessible", async () => {
    const res = await fetch(`${BASE_URL}/api/jobs/${job.id}/content`, {
      headers: { "x-tenant-slug": ALPHA_TENANT },
    });
    // May return 401/403 without auth, but shouldn't be 500
    if (res.status === 500) {
      const data = await res.json();
      throw new Error(`Server error: ${data.error || "Unknown"}`);
    }
  });

  await runTest("Job publications endpoint accessible", async () => {
    const res = await fetch(`${BASE_URL}/api/jobs/${job.id}/publications`, {
      headers: { "x-tenant-slug": ALPHA_TENANT },
    });
    if (res.status === 500) {
      const data = await res.json();
      throw new Error(`Server error: ${data.error || "Unknown"}`);
    }
  });
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log(`\n${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}     QuestHire Smoke Tests              ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nTarget: ${BASE_URL}`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(`${colors.red}✗ DATABASE_URL environment variable is not set${colors.reset}`);
    process.exit(1);
  }
  const adapter = new PrismaNeon({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    // Run all test suites
    await testDatabase(prisma);
    await testApis();
    await testPublicPages(prisma);
    await testContent(prisma);

    // Summary
    section("Summary");
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const total = results.length;

    console.log(`\nTotal: ${total} tests`);
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    if (failed > 0) {
      console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
      console.log(`\n${colors.red}Failed tests:${colors.reset}`);
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    // Exit with appropriate code
    if (failed > 0) {
      console.log(`\n${colors.red}✗ Smoke tests failed. Do not deploy.${colors.reset}\n`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}✓ All smoke tests passed. Ready to deploy.${colors.reset}\n`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
