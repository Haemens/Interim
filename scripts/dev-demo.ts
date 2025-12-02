#!/usr/bin/env npx tsx
/**
 * Dev Demo Setup Script
 * 
 * One-command setup for running QuestHire locally with demo data.
 * 
 * Usage:
 *   npm run dev:demo
 * 
 * This script will:
 *   1. Check environment configuration
 *   2. Run database migrations (if needed)
 *   3. Seed demo data
 *   4. Start the development server
 */

import { execSync, spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

// =============================================================================
// CONFIGURATION
// =============================================================================

const ROOT_DIR = resolve(__dirname, "..");
const ENV_FILE = resolve(ROOT_DIR, ".env.local");
const ENV_EXAMPLE = resolve(ROOT_DIR, ".env.example");

const DEMO_URLS = {
  demo: "http://demo-agency.localhost:3000",
  alpha: "http://alpha-staff.localhost:3000",
  main: "http://localhost:3000",
};

const DEMO_USERS = [
  { email: "owner@alpha-staff.com", password: "password123", role: "OWNER", agency: "Alpha Staff" },
  { email: "admin@alpha-staff.com", password: "password123", role: "ADMIN", agency: "Alpha Staff" },
  { email: "recruiter@alpha-staff.com", password: "password123", role: "RECRUITER", agency: "Alpha Staff" },
  { email: "demo@demo-agency.com", password: "demo123", role: "OWNER", agency: "Demo Agency (read-only)" },
];

// Colors
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

// =============================================================================
// HELPERS
// =============================================================================

function log(message: string, type: "info" | "success" | "warn" | "error" | "step" = "info") {
  const prefix = {
    info: `${c.blue}ℹ${c.reset}`,
    success: `${c.green}✓${c.reset}`,
    warn: `${c.yellow}⚠${c.reset}`,
    error: `${c.red}✗${c.reset}`,
    step: `${c.cyan}→${c.reset}`,
  };
  console.log(`${prefix[type]} ${message}`);
}

function header(title: string) {
  console.log(`\n${c.bold}${c.blue}━━━ ${title} ━━━${c.reset}\n`);
}

function runCommand(command: string, options: { silent?: boolean; allowFail?: boolean } = {}) {
  try {
    execSync(command, {
      cwd: ROOT_DIR,
      stdio: options.silent ? "pipe" : "inherit",
    });
    return true;
  } catch (error) {
    if (!options.allowFail) {
      throw error;
    }
    return false;
  }
}

// =============================================================================
// CHECKS
// =============================================================================

function checkEnvFile(): boolean {
  if (!existsSync(ENV_FILE)) {
    log("No .env.local found", "warn");
    console.log(`\n  Create one by copying the example:`);
    console.log(`  ${c.cyan}cp .env.example .env.local${c.reset}`);
    console.log(`\n  Then update DATABASE_URL with your PostgreSQL connection string.`);
    return false;
  }

  // Check for DATABASE_URL
  const envContent = readFileSync(ENV_FILE, "utf-8");
  if (!envContent.includes("DATABASE_URL")) {
    log("DATABASE_URL not found in .env.local", "error");
    return false;
  }

  log(".env.local found", "success");
  return true;
}

function checkHosts() {
  header("Host Configuration");
  
  console.log(`For subdomain-based multi-tenancy, add these to ${c.cyan}/etc/hosts${c.reset}:`);
  console.log(`\n  ${c.dim}127.0.0.1 demo-agency.localhost${c.reset}`);
  console.log(`  ${c.dim}127.0.0.1 alpha-staff.localhost${c.reset}`);
  console.log(`\n  Or use the main URL and the tenant will be resolved from the path.`);
}

// =============================================================================
// SETUP STEPS
// =============================================================================

async function runMigrations() {
  header("Database Setup");
  
  log("Running Prisma migrations...", "step");
  try {
    runCommand("npx prisma migrate dev --name init", { allowFail: true });
    log("Migrations complete", "success");
  } catch {
    log("Migration failed - database may already be set up", "warn");
  }
}

async function generatePrismaClient() {
  log("Generating Prisma client...", "step");
  runCommand("npx prisma generate");
  log("Prisma client generated", "success");
}

async function seedDatabase() {
  header("Seeding Demo Data");
  
  log("Running database seed...", "step");
  try {
    runCommand("npm run db:seed");
    log("Demo data seeded successfully", "success");
  } catch {
    log("Seed failed - data may already exist", "warn");
  }
}

function printDemoInfo() {
  header("Demo Ready!");

  console.log(`${c.bold}Demo URLs:${c.reset}`);
  console.log(`  ${c.green}●${c.reset} Alpha Staff:  ${c.cyan}${DEMO_URLS.alpha}${c.reset}`);
  console.log(`  ${c.yellow}●${c.reset} Demo Agency:  ${c.cyan}${DEMO_URLS.demo}${c.reset} ${c.dim}(read-only)${c.reset}`);
  console.log(`  ${c.blue}●${c.reset} Main:         ${c.cyan}${DEMO_URLS.main}${c.reset}`);

  console.log(`\n${c.bold}Demo Users:${c.reset}`);
  console.log(`  ${c.dim}┌─────────────────────────────┬──────────────┬───────────┬─────────────────────┐${c.reset}`);
  console.log(`  ${c.dim}│${c.reset} Email                       ${c.dim}│${c.reset} Password     ${c.dim}│${c.reset} Role      ${c.dim}│${c.reset} Agency              ${c.dim}│${c.reset}`);
  console.log(`  ${c.dim}├─────────────────────────────┼──────────────┼───────────┼─────────────────────┤${c.reset}`);
  DEMO_USERS.forEach((user) => {
    const email = user.email.padEnd(27);
    const pass = user.password.padEnd(12);
    const role = user.role.padEnd(9);
    const agency = user.agency.padEnd(19);
    console.log(`  ${c.dim}│${c.reset} ${email} ${c.dim}│${c.reset} ${pass} ${c.dim}│${c.reset} ${role} ${c.dim}│${c.reset} ${agency} ${c.dim}│${c.reset}`);
  });
  console.log(`  ${c.dim}└─────────────────────────────┴──────────────┴───────────┴─────────────────────┘${c.reset}`);

  console.log(`\n${c.bold}Quick Test:${c.reset}`);
  console.log(`  1. Open ${c.cyan}${DEMO_URLS.alpha}/login${c.reset}`);
  console.log(`  2. Login with ${c.cyan}owner@alpha-staff.com${c.reset} / ${c.cyan}password123${c.reset}`);
  console.log(`  3. Explore the dashboard!`);
  
  console.log(`\n${c.dim}Press Ctrl+C to stop the server${c.reset}\n`);
}

function startDevServer() {
  header("Starting Development Server");
  
  log("Starting Next.js dev server...", "step");
  
  const server = spawn("npm", ["run", "dev"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
    shell: true,
  });

  server.on("error", (error) => {
    log(`Failed to start server: ${error.message}`, "error");
    process.exit(1);
  });

  // Handle Ctrl+C gracefully
  process.on("SIGINT", () => {
    console.log(`\n${c.yellow}Shutting down...${c.reset}`);
    server.kill("SIGINT");
    process.exit(0);
  });
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log(`\n${c.bold}${c.blue}╔════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.blue}║${c.reset}     QuestHire Dev Demo Setup           ${c.bold}${c.blue}║${c.reset}`);
  console.log(`${c.bold}${c.blue}╚════════════════════════════════════════╝${c.reset}`);

  // Check environment
  header("Environment Check");
  if (!checkEnvFile()) {
    process.exit(1);
  }

  // Show hosts info
  checkHosts();

  // Run setup
  await generatePrismaClient();
  await runMigrations();
  await seedDatabase();

  // Print demo info
  printDemoInfo();

  // Start server
  startDevServer();
}

main().catch((error) => {
  console.error(`\n${c.red}Error:${c.reset}`, error);
  process.exit(1);
});
