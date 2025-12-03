# QuestHire

A production-grade, multi-tenant SaaS platform for staffing agencies. Built with Next.js 15, Prisma, and PostgreSQL.

## Overview

QuestHire enables staffing agencies to:
- Create and publish job offers
- Manage candidates and applications
- Track hiring analytics
- Collaborate with team members

Each agency operates as an isolated tenant, identified by their subdomain (e.g., `acme-staffing.questhire.com`).

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS (shadcn/ui ready)
- **ORM**: Prisma with PostgreSQL
- **Auth**: NextAuth.js (credentials + OAuth ready)
- **Payments**: Stripe
- **Deployment**: Vercel

## Domain Model

### Core Entities

| Entity | Description |
|--------|-------------|
| **Agency** | A tenant (staffing agency). Identified by unique `slug` used in subdomains. |
| **User** | A person who can log in. Can belong to multiple agencies via memberships. |
| **Membership** | Links a User to an Agency with a specific role (OWNER, ADMIN, RECRUITER, VIEWER). |
| **Job** | A job posting belonging to an agency. Has status (DRAFT, ACTIVE, PAUSED, ARCHIVED). |
| **Application** | A candidate application for a job. Tracks status through hiring pipeline. |
| **JobAsset** | Media files attached to jobs (PDFs, images, videos for social). |
| **Subscription** | Billing subscription linking agency to a plan via Stripe. |
| **EventLog** | Audit trail of actions (job created, status changed, etc.). |
| **Shortlist** | Collection of candidates to share with clients via public link. |
| **ShortlistItem** | Links an Application to a Shortlist with ordering. |
| **CandidateProfile** | Reusable candidate profile per agency. One per (agency, email). |
| **Client** | External client company with 360° view. Links to Jobs, Shortlists, JobRequests, and Feedback. |
| **JobRequest** | Job request submitted by a client via the client portal. Can be converted to a Job. |
| **ClientFeedback** | Client's approval/rejection decision on shortlisted candidates. |

### RBAC Roles

| Role | Permissions |
|------|-------------|
| **OWNER** | Full access. Can manage billing, delete agency. |
| **ADMIN** | Can create/edit jobs, manage team members. |
| **RECRUITER** | Can view/edit jobs and applications. |
| **VIEWER** | Read-only access to jobs and applications. |

## Architecture

### Multi-Tenancy

Single database with per-row tenant isolation via `agencyId`. Tenants are resolved from subdomains:
- `alpha-staff.localhost:3000` (development)
- `alpha-staff.questhire.com` (production)

**Flow:**
1. Middleware extracts tenant slug from `Host` header
2. Slug is passed via `x-tenant-slug` header to all routes
3. Server helpers resolve `Agency` from slug
4. `Membership` is loaded to verify user belongs to agency
5. All queries filter by `agencyId` for isolation

### Folder Structure

```
questhire/
├── app/
│   ├── (public)/          # Public marketing pages
│   ├── (app)/dashboard/   # Authenticated app shell
│   └── api/               # API route handlers
├── modules/               # Domain-driven modules
│   ├── agency/            # Tenant context & management
│   ├── auth/              # Authentication helpers
│   ├── job/               # Job posting CRUD
│   ├── application/       # Candidate applications
│   ├── billing/           # Stripe subscriptions
│   ├── assets/            # File uploads
│   └── analytics/         # Reporting & metrics
├── lib/                   # Shared utilities
│   ├── db.ts              # Prisma client singleton
│   ├── auth.ts            # NextAuth configuration
│   ├── tenant.ts          # Multi-tenant helpers
│   └── stripe.ts          # Stripe client
├── config/                # App configuration
│   ├── plans.ts           # Billing plans
│   └── constants.ts       # App-wide constants
├── prisma/                # Database schema
├── types/                 # Shared TypeScript types
└── tests/                 # Test files
```

### Adding New Modules

1. Create a new folder under `modules/`
2. Add an `index.ts` barrel export
3. Keep business logic, components, and types co-located
4. Use `@/modules/[name]` for imports

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or Neon for serverless)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd questhire

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | App URL (http://localhost:3000) |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_PRO` | Stripe Price ID for Pro plan |
| `STRIPE_PRICE_AGENCY_PLUS` | Stripe Price ID for Agency Plus plan |

### Quick Start (Demo Mode)

The fastest way to get started with a fully seeded demo:

```bash
# One command to set up and run everything
npm run dev:demo
```

This will:
1. Check your environment configuration
2. Run database migrations
3. Seed demo data (agencies, jobs, applications)
4. Start the development server

**Demo URLs:**
- Alpha Staff: `http://alpha-staff.localhost:3000`
- Demo Agency: `http://demo-agency.localhost:3000` (read-only)

**Demo Users:**
| Email | Password | Role | Agency |
|-------|----------|------|--------|
| `owner@alpha-staff.com` | `password123` | OWNER | Alpha Staff |
| `admin@alpha-staff.com` | `password123` | ADMIN | Alpha Staff |
| `recruiter@alpha-staff.com` | `password123` | RECRUITER | Alpha Staff |
| `demo@demo-agency.com` | `demo123` | OWNER | Demo Agency |

> **Note:** Add these lines to `/etc/hosts` for subdomain routing:
> ```
> 127.0.0.1 alpha-staff.localhost
> 127.0.0.1 demo-agency.localhost
> ```

### Manual Development Setup

```bash
# Run database migrations
npx prisma migrate dev

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

### Database Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Create a migration
npm run db:migrate

# Push schema without migration (dev only)
npm run db:push

# Seed the database
npm run db:seed

# Reset database (development only)
npm run db:reset

# Open Prisma Studio
npm run db:studio
```

### Seeding the Database

The seed script creates test data:

```bash
npm run db:seed
```

**Seeded accounts:**
| Email | Role | Agency |
|-------|------|--------|
| `owner@alpha-staff.com` | OWNER | alpha-staff |
| `admin@alpha-staff.com` | ADMIN | alpha-staff |
| `recruiter@alpha-staff.com` | RECRUITER | alpha-staff |
| `owner@beta-interim.com` | OWNER | beta-interim |

**Access via subdomains:**
- http://alpha-staff.localhost:3000/dashboard
- http://beta-interim.localhost:3000/dashboard

> **Note:** Add `127.0.0.1 alpha-staff.localhost` and `127.0.0.1 beta-interim.localhost` to `/etc/hosts` for local subdomain testing.

## Features

### Email Notifications

Emails are handled via `lib/email.ts`:

- **Development**: Emails are logged to the console with `[EMAIL DEV]` prefix
- **Production**: Pluggable provider architecture (Resend, SendGrid, SES ready)

**Notification triggers:**
- New application → Email to agency contact + confirmation to candidate
- Team invitation → Email to invited user with login link

### Shortlists

Share candidate selections with clients via public links:

1. Create a shortlist for a job with selected candidates
2. Get a unique share URL (e.g., `/shortlist/abc123xyz`)
3. Share with client - no login required
4. Client sees candidate names, status, and tags (no contact info)

**API:**
- `GET /api/shortlists` - List shortlists (RECRUITER+)
- `POST /api/shortlists` - Create shortlist (RECRUITER+)
- `GET /api/shortlists/[shareToken]` - Public view (no auth)

### GDPR Basics

Two endpoints for data subject requests:

**Export** (`POST /api/applications/[id]/export`):
- Returns JSON with all candidate data
- Includes job info, consent timestamps
- Logged in EventLog for audit

**Anonymize** (`POST /api/applications/[id]/anonymize`):
- Replaces personal data with "Anonymized"
- Clears email, phone, cvUrl
- Sets `anonymizedAt` timestamp
- Requires ADMIN+ role

### Team Management

Invite and manage team members:

**API:**
- `GET /api/team` - List members (ADMIN+)
- `POST /api/team` - Invite member (ADMIN+)
- `PATCH /api/team/[id]` - Update role (ADMIN+)
- `DELETE /api/team/[id]` - Remove member (ADMIN+)

**Rules:**
- Cannot demote/remove the last OWNER
- Only OWNER can change OWNER roles
- Invitation creates User if not exists

### Search & Filters

**Jobs API** (`GET /api/jobs`):
- `status` - Filter by status (comma-separated)
- `q` - Search in title, location, sector, tags

**Applications API** (`GET /api/applications`):
- `jobId` - Filter by job
- `status` - Filter by status
- `q` - Search in name, email, note, tags

### Public Career Pages

Each agency has public job pages accessible via their subdomain:

- **Job Listing**: `/jobs` - Shows all ACTIVE jobs for the agency
- **Job Detail**: `/jobs/[jobId]` - Full job description with application form

**Application Flow:**
1. Candidate visits job page via agency subdomain
2. Fills out application form (name, email, phone, CV URL)
3. Accepts consent checkbox
4. Application is created with `source: "job_page"`
5. Email notifications sent to agency and candidate

### Public Job Portal

QuestHire now features a public-facing job portal for candidates to find jobs across all agencies.

- **Global Job Board**: `/jobs` - Aggregates all ACTIVE jobs from all agencies.
  - Accessible from the main domain (e.g., `questhire.com/jobs`).
  - Features search, filters (location, contract type, sector).
  - Each job links to its respective agency's public job detail page.
- **Agency Hub Pages**: `/agencies/[slug]` - Dedicated page for each agency on the main domain.
  - Accessible via `questhire.com/agencies/[slug]`.
  - Displays agency branding and a list of its ACTIVE jobs.
  - Jobs link to the agency's public job detail page.

**Source Tracking:**
Applications originating from the Public Job Portal are tagged with:
- `source=portal`
- `sourceDetail=global_jobs_page` (for global board) or `sourceDetail=agency_hub_page` (for agency hub)

### Analytics

Dashboard analytics available at `/dashboard/analytics`:

**Summary API** (`GET /api/analytics/summary`):
```json
{
  "jobCounts": { "total": 10, "active": 5, "draft": 3, "archived": 2 },
  "applicationCounts": { "total": 50, "byStatus": { "NEW": 20, ... } },
  "recentActivity": { "last7DaysApplications": 12, "last30DaysApplications": 45 },
  "topJobsByApplications": [{ "jobId": "...", "title": "...", "applicationsCount": 15 }]
}
```

### Plan-Based Feature Gating

Features are gated by subscription plan:

| Feature | Starter | Pro | Agency+ |
|---------|---------|-----|---------|
| Max Active Jobs | 10 | Unlimited | Unlimited |
| Shortlists | ❌ | ✅ | ✅ |
| Analytics | ✅ | ✅ | ✅ |
| Team Management | ✅ | ✅ | ✅ |

**Enforcement:**
- Backend validates plan limits before creating resources
- API returns `403` with `code: "PLAN_LIMIT"` or `"JOB_LIMIT_REACHED"`
- UI should check plan and show upgrade prompts

### Logging

Structured logging via `lib/log.ts`:

```typescript
import { logInfo, logWarn, logError, logEvent } from "@/lib/log";

// Console logging with timestamps
logInfo("Job created", { jobId: "123" });
logError("Failed to process", { error: "..." });

// Persistent event logging to database
await logEvent({
  type: "JOB_CREATED",
  agencyId: "...",
  userId: "...",
  payload: { title: "..." }
});
```

**Log Levels:**
- `logInfo` - General information
- `logWarn` - Warnings
- `logError` - Errors

**Event Types:** `JOB_CREATED`, `APPLICATION_CREATED`, `SHORTLIST_CREATED`, `TEAM_MEMBER_INVITED`, `GDPR_DATA_EXPORT`, etc.

### Candidate Profiles (Talent Pool)

Each agency has a reusable talent pool of candidate profiles:

**How it works:**
- When someone applies with an email, a `CandidateProfile` is created/updated
- Profile stores: name, email, phone, CV URL, skills, sectors, location
- Applications are linked to profiles via `candidateId`
- Agencies can search and filter their talent pool

**CandidateProfile fields:**
- `email` - Unique per agency
- `skills[]` - Free-form tags (CACES, night shift, etc.)
- `sectors[]` - Industry sectors (Logistics, Manufacturing, etc.)
- `status` - ACTIVE, DO_NOT_CONTACT, BLACKLISTED
- `consentToContact` - GDPR consent flag

**API:**
- `GET /api/candidates` - List candidates with search/filters
- `GET /api/candidates/[id]` - Get candidate with applications
- `PATCH /api/candidates/[id]` - Update profile (status, notes, skills, etc.)

### Talent Pool Mobilization

When a new ACTIVE job is created with `notifyCandidates: true`:

1. System finds matching candidates based on:
   - Job sector matches candidate sectors
   - Job tags match candidate skills
   - Candidate status is ACTIVE
   - Candidate has consent to contact

2. Sends email notification (up to 50 candidates) with job details and link

**Usage:**
```json
POST /api/jobs
{
  "title": "Warehouse Operator",
  "sector": "Logistics",
  "tags": ["CACES", "forklift"],
  "status": "ACTIVE",
  "notifyCandidates": true
}
```

### Quick Apply UX

The job application form uses localStorage for faster re-applications:

**Stored data:**
- `fullName`, `email`, `phone`, `cvUrl`
- Key: `questhire_candidate_profile`

**Behavior:**
- On successful application, profile is saved to localStorage
- On form load, saved values are prefilled
- User sees "We've prefilled your details" notice
- Data is browser-local only, respects consent

**Note:** Server-side profile reuse happens via `CandidateProfile` regardless of localStorage.

## Authentication & Onboarding

### Sign Up Flow

New agencies are created via `/signup`:

1. User fills out agency details (name, slug, email)
2. User creates their account (name, email, password)
3. System creates:
   - New `Agency` with slug and branding defaults
   - New `User` with hashed password
   - `Membership` linking user to agency as OWNER
   - `Subscription` with STARTER plan (14-day trial)
4. User is signed in and redirected to `[slug].domain.com/dashboard`

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Login Flow

Users sign in via `/login`:

1. Enter email and password
2. System verifies credentials via NextAuth
3. On success, fetches user's memberships
4. Redirects to first agency's dashboard

### Agency Switching

Users with multiple memberships can switch agencies:

- Agency switcher in dashboard sidebar
- Shows all agencies user belongs to
- Click to redirect to that agency's subdomain

### Session Management

- JWT-based sessions via NextAuth
- Session stored in HTTP-only cookie
- `getCurrentUser()` helper for server components
- Protected routes redirect to `/login` if unauthenticated

### Test Accounts (Development)

After running `npm run db:seed`:

| Email | Password | Agency | Role |
|-------|----------|--------|------|
| owner@alpha-staff.com | Password123 | alpha-staff | OWNER |
| admin@alpha-staff.com | Password123 | alpha-staff | ADMIN |
| recruiter@alpha-staff.com | Password123 | alpha-staff | RECRUITER |
| owner@beta-interim.com | Password123 | beta-interim | OWNER |

## Billing & Stripe Integration

### Billing Page

Located at `/dashboard/billing` (OWNER/ADMIN only):

- Shows current plan and features
- Plan comparison (Starter, Pro, Agency Plus)
- Upgrade buttons redirect to Stripe Checkout
- "Manage Billing" opens Stripe Customer Portal

### Plan Features

| Feature | Starter | Pro | Agency+ |
|---------|---------|-----|---------|
| Active Jobs | 10 | Unlimited | Unlimited |
| Applications | Unlimited | Unlimited | Unlimited |
| Shortlists | ❌ | ✅ | ✅ |
| Analytics | ✅ | ✅ | ✅ |
| Team Management | ✅ | ✅ | ✅ |

### Stripe Setup

1. Create products and prices in Stripe Dashboard
2. Set environment variables:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_PRICE_AGENCY_PLUS=price_...
   ```

3. Configure webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### Upgrade Flow

1. User clicks "Upgrade to Pro" on billing page
2. Frontend calls `POST /api/billing/checkout` with target plan
3. Backend creates Stripe Checkout session
4. User is redirected to Stripe Checkout
5. On success, Stripe webhook updates subscription in database
6. User returns to billing page with success message

**Note:** Webhooks are required for production. In development, subscription updates happen via the checkout success callback.

## CV File Uploads

### Storage Configuration

CV uploads use S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.).

**Environment Variables:**
```
STORAGE_BUCKET=questhire-uploads
STORAGE_ACCESS_KEY_ID=your-access-key
STORAGE_SECRET_ACCESS_KEY=your-secret-key
STORAGE_REGION=auto
STORAGE_ENDPOINT=https://your-account.r2.cloudflarestorage.com  # Optional
STORAGE_PUBLIC_BASE_URL=https://cdn.yourdomain.com              # Optional
```

**File Restrictions:**
- **Max size:** 5 MB
- **Allowed types:** PDF, DOC, DOCX, RTF, TXT
- **Storage path:** `cvs/{agencyId}/{year}/{month}/{uuid}-{filename}`

### Upload Flow

1. Candidate selects file in application form
2. File is uploaded to `POST /api/upload/cv` (multipart/form-data)
3. Server validates type, size, and agency context
4. File is stored in S3 bucket with agency-scoped key
5. URL is returned and saved with application/candidate profile

### API Endpoint

**`POST /api/upload/cv`**
- Accepts: `multipart/form-data` with `file`, `jobId`, optional `email`
- Returns: `{ url, key }`
- Rate limited: 5 uploads per 10 minutes per IP

**`GET /api/upload/cv`**
- Returns upload configuration (max size, allowed types)

### Fallback

If storage is not configured:
- File upload UI shows error message
- Candidates can still paste a URL to their CV (Google Drive, Dropbox, etc.)

## Rate Limiting

Basic rate limiting protects public endpoints from abuse.

### Protected Endpoints

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/applications` | 10 requests | 10 minutes |
| `POST /api/upload/cv` | 5 uploads | 10 minutes |
| Login (credentials) | 5 attempts | 10 minutes |
| `POST /api/auth/signup` | 3 signups | 10 minutes |

### Implementation

Current implementation uses **in-memory storage** (Map-based):
- Simple fixed-window algorithm
- Automatic cleanup of expired entries
- Keys based on client IP

**Rate limit response:**
```json
{
  "error": "Too many requests",
  "retryAfter": 300
}
```

HTTP headers included:
- `Retry-After`: Seconds until reset
- `X-RateLimit-Limit`: Max requests
- `X-RateLimit-Remaining`: Requests left
- `X-RateLimit-Reset`: Reset timestamp

### Production Considerations

⚠️ **Warning:** In-memory rate limiting does NOT work correctly with multiple server instances (e.g., Vercel serverless). Each instance maintains its own state.

**For production, replace with:**
- Redis (recommended)
- Upstash Redis (serverless-friendly)
- Vercel KV

The API in `lib/rate-limit.ts` is designed for easy migration to a shared store.

## Job Pipelines (Kanban)

### Overview

Each job has a dedicated pipeline view at `/dashboard/jobs/[jobId]/pipeline` that displays candidates in a Kanban-style board.

### Pipeline Columns

Applications flow through these stages:
1. **New** - Fresh applications
2. **Contacted** - Candidate has been reached out to
3. **Qualified** - Candidate meets requirements
4. **Placed** - Successfully hired
5. **Rejected** - Not moving forward

### Features

**Drag & Drop:**
- RECRUITER+ roles can drag application cards between columns
- Status changes are saved automatically with optimistic UI updates
- Failed updates roll back with error notification

**Application Cards:**
- Candidate name and email
- Location (if provided)
- Tags/skills (truncated)
- Time since application
- Quick links to CV and candidate profile

**Activity Timeline:**
- Side panel showing recent job activity
- Events: applications, status changes, notifications
- Includes user attribution and timestamps

### API Endpoints

**`GET /api/jobs/[jobId]/applications`**
- Returns applications grouped by status
- RBAC: RECRUITER+

**`PATCH /api/applications/[id]/status`**
- Update application status
- Optionally add a note (appended with timestamp)
- Logs `APPLICATION_STATUS_CHANGED` event
- RBAC: RECRUITER+

**`GET /api/jobs/[jobId]/activity`**
- Returns recent EventLog entries for the job
- RBAC: RECRUITER+

### Navigation

- Job list → Job detail → Pipeline
- Job detail page includes "Open Pipeline" CTA
- Pipeline page has breadcrumb navigation back to job

## Deployment

### Vercel

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

For production multi-tenancy, configure:
- Wildcard domain: `*.questhire.com`
- SSL certificate for wildcard

## Billing Plans

| Plan | Price | Jobs | Users |
|------|-------|------|-------|
| Starter | $29/mo | 5 | 3 |
| Pro | $79/mo | 25 | 10 |
| Agency Plus | $199/mo | Unlimited | Unlimited |

## Error Handling

### API Errors

All API routes return consistent error responses:

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "details": {}  // Optional additional info
}
```

**Error Codes:**
- `BAD_REQUEST` (400) - Invalid request data
- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Access denied
- `NOT_FOUND` (404) - Resource not found
- `RATE_LIMITED` (429) - Too many requests
- `VALIDATION_FAILED` (422) - Input validation failed
- `PLAN_LIMIT_REACHED` (403) - Plan feature limit
- `INTERNAL_ERROR` (500) - Server error

**Implementation:**
- Error helpers: `lib/api-error.ts`
- Route wrapper: `lib/api-handler.ts`

### Error Pages

- `/not-found.tsx` - Global 404 page
- `/error.tsx` - Global error boundary
- `/dashboard/not-found.tsx` - Dashboard 404
- `/dashboard/error.tsx` - Dashboard error boundary

## Toast Notifications

Dashboard uses a global toast system for user feedback.

### Usage

```tsx
import { useToast } from "@/hooks/use-toast";

function MyComponent() {
  const { toast } = useToast();

  function handleSuccess() {
    toast({
      title: "Success!",
      description: "Your changes have been saved.",
      variant: "success",
    });
  }

  function handleError() {
    toast({
      title: "Error",
      description: "Something went wrong.",
      variant: "error",
    });
  }
}
```

**Variants:** `success`, `error`, `warning`, `info`

**Options:**
- `title` - Required toast title
- `description` - Optional description
- `variant` - Toast type (default: "info")
- `duration` - Auto-dismiss time in ms (default: 5000)

## Monitoring

### Sentry Integration

Error tracking is Sentry-ready. Set `SENTRY_DSN` to enable:

```env
SENTRY_DSN="https://your-key@sentry.io/project-id"
```

**Features:**
- Automatic exception capture for 500 errors
- User context tracking
- Breadcrumbs for debugging
- Performance monitoring (10% sample rate in production)

**Implementation:** `lib/monitoring.ts`

When `SENTRY_DSN` is not set:
- Errors are logged to console in development
- No external calls are made

## Testing

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage
```

### Test Structure

```
tests/
├── setup.ts           # Test configuration
├── unit/              # Unit tests
│   ├── api-error.test.ts
│   ├── rate-limit.test.ts
│   ├── plan-features.test.ts
│   ├── client-ip.test.ts
│   └── storage.test.ts
└── integration/       # Integration tests (future)
```

### What's Tested

**API Error Handling:**
- Error class creation and serialization
- Factory helpers (badRequest, unauthorized, etc.)
- Type guards

**Rate Limiting:**
- Request counting and blocking
- Window reset behavior
- Multiple key isolation
- Preset configurations

**Plan Features:**
- Feature configuration by plan
- Error classes
- Display name helpers

**Client IP Extraction:**
- Header parsing (CF, nginx, standard)
- Priority order
- Hash function

**Storage:**
- Error classes
- Configuration helpers

## Marketing Site & Demo Mode

### Landing Page

The marketing landing page at `/` is designed for staffing agencies:

- **Hero section** - "Faster placements. Social-first job ads."
- **Benefits pillars** - Publish offers, talent pool, pipelines, billing
- **Product highlights** - Job creation, pipelines, talent pool, analytics
- **Pricing teaser** - Starter/Pro/Agency+ plans
- **Social proof** - Placeholder agency logos

### Demo Mode

Visitors can explore QuestHire without signing up:

1. Click "View live demo" on the landing page
2. Automatically logged in as `demo@questhire.com`
3. Redirected to `demo-agency.localhost:3000/dashboard`

**Demo Agency:**
- Slug: `demo-agency`
- Pre-seeded with jobs, applications, and candidates
- PRO plan features enabled

**Read-Only Restrictions:**

Demo mode blocks ALL write operations across the application:

| Domain | Blocked Operations |
|--------|-------------------|
| **Jobs** | Create, Edit, Delete/Archive |
| **Applications** | Update status, Anonymize |
| **Candidates** | Update profile |
| **Shortlists** | Create |
| **Team** | Invite members, Change roles, Remove members |
| **Billing** | Checkout, Portal access |

Error response for blocked actions:
```json
{
  "error": "Cannot create jobs in demo mode. Sign up for a free trial to get started!",
  "code": "DEMO_READ_ONLY"
}
```

**Implementation:**
- Demo auth: `app/api/auth/demo/route.ts`
- Demo helpers: `modules/auth/demo-mode.ts`
  - `isDemoAgency(agency)` - Check if agency is demo
  - `assertNotDemoAgency(agency, action)` - Throws `DemoReadOnlyError` if demo
  - `DemoReadOnlyError` - Error class for demo restrictions
- Demo banner: `app/(app)/dashboard/components/demo-banner.tsx`

**Adding Demo Checks to New Routes:**

```typescript
import { assertNotDemoAgency } from "@/modules/auth/demo-mode";

// In your route handler, after getting membership:
const { agency, membership } = await getCurrentMembershipOrThrow(tenantSlug);
assertMinimumRole(membership, "ADMIN");
assertNotDemoAgency(agency, "perform this action"); // Add this line
```

## Job Editing

Jobs can be edited after creation via the dashboard.

### API: `PATCH /api/jobs/[jobId]`

**Authentication:** Required (ADMIN+ role)

**Request Body (all fields optional):**
```json
{
  "title": "Senior Developer",
  "location": "Paris, France",
  "contractType": "CDI",
  "salaryMin": 50000,
  "salaryMax": 70000,
  "currency": "EUR",
  "sector": "IT",
  "description": "Job description...",
  "profile": "Ideal candidate profile...",
  "benefits": "Benefits list...",
  "tags": ["JavaScript", "React"],
  "status": "ACTIVE"
}
```

**Status Transitions:**
- `DRAFT` → `ACTIVE` (publishes job, checks plan limits)
- `ACTIVE` → `PAUSED` (hides from public)
- Any → `ARCHIVED` (soft delete)

**Plan Limit Check:**
When setting status to `ACTIVE`, the API checks if the agency has reached their plan's active job limit. If exceeded, returns:
```json
{
  "error": "You have reached the maximum of 10 active jobs on the STARTER plan",
  "code": "JOB_LIMIT_REACHED",
  "currentCount": 10,
  "maxAllowed": 10,
  "currentPlan": "STARTER"
}
```

**Demo Mode:**
Job editing is blocked in demo mode with `DEMO_READ_ONLY` error.

### UI: Edit Job Modal

The job detail page (`/dashboard/jobs/[jobId]`) includes an "Edit Job" button for users with ADMIN+ role.

- Opens a modal with all editable fields
- Shows demo warning if in demo mode
- Displays toast notifications for success/error
- Refreshes page data after successful edit

**Implementation:**
- API: `app/api/jobs/[jobId]/route.ts`
- UI: `app/(app)/dashboard/jobs/[jobId]/edit-job-form.tsx`

## GDPR Compliance

QuestHire supports GDPR compliance through data anonymization.

### Current: Anonymization (Soft Delete)

Applications can be anonymized via `POST /api/applications/[id]/anonymize`:
- Replaces PII with "Anonymized" placeholder
- Clears email, phone, CV URL
- Preserves record for statistics
- Logs anonymization event

### Future: Hard Delete

Placeholder helpers exist for future hard delete implementation:

```typescript
// modules/gdpr/delete-helpers.ts
import { hardDeleteApplication, hardDeleteCandidate } from "@/modules/gdpr";

// These currently throw HardDeleteNotImplementedError
await hardDeleteApplication(applicationId, agencyId);
await hardDeleteCandidate(candidateId, agencyId);
```

**Hard Delete vs Anonymization:**
| Aspect | Anonymization | Hard Delete |
|--------|---------------|-------------|
| Record preserved | Yes | No |
| Statistics intact | Yes | No |
| Audit trail | Yes | Logged before delete |
| Implementation | ✅ Done | 🔜 Planned |

**Implementation Notes:**
When implementing hard delete, consider:
1. Cascade deletion order (shortlist items → applications → candidates)
2. File storage cleanup (CV files in S3/R2)
3. Event log handling
4. Data retention policies

## Social Content & Channels

QuestHire allows agencies to generate and manage social media content for job postings.

### Data Models

**Channel** - Social media accounts per agency:
- `type`: TIKTOK, INSTAGRAM, LINKEDIN, FACEBOOK, OTHER
- `name`: Display name (e.g., "TikTok Toulouse")
- `handle`: Username (e.g., "@questhire_toulouse")
- `region`: Geographic region
- `isActive`: Soft delete flag

**JobPostContent** - Generated content variants for a job:
- `variant`: TIKTOK_SCRIPT, INSTAGRAM_CAPTION, LINKEDIN_POST, WHATSAPP_MESSAGE, GENERIC_SNIPPET
- `body`: The actual content text
- `suggestedHashtags`: Recommended hashtags
- `status`: DRAFT, APPROVED, ARCHIVED
- `generatedAt`: When AI/template generated it
- `approvedAt`: When content was approved
- `lastEditedById` / `lastEditedAt`: Edit audit trail

**Publication** - Tracks planned/published posts:
- Links a `JobPostContent` to a `Channel`
- `status`: PLANNED, PUBLISHED, FAILED
- `scheduledAt`: When to publish
- `publishedAt`: When actually published
- `externalUrl`: Link to the live post

### Content Generation

The content generator (`modules/content/generator.ts`) creates 4 variants per job:

| Variant | Style | Use Case |
|---------|-------|----------|
| TIKTOK_SCRIPT | Short, hooks + CTA | TikTok videos |
| INSTAGRAM_CAPTION | Bullet points + hashtags | Instagram posts |
| LINKEDIN_POST | Formal, structured | LinkedIn articles |
| WHATSAPP_MESSAGE | Direct, conversational | Candidate outreach |

**Current Implementation:** Deterministic templates using job fields.
**Future Enhancement:** Plug in Gemini/OpenAI for AI-generated content.

### API Endpoints

**Channels:**
- `GET /api/channels` - List channels (RECRUITER+)
- `POST /api/channels` - Create channel (ADMIN+)
- `PATCH /api/channels/[id]` - Update channel (ADMIN+)
- `DELETE /api/channels/[id]` - Deactivate channel (ADMIN+)

**Job Content:**
- `GET /api/jobs/[jobId]/content` - List content (RECRUITER+)
- `POST /api/jobs/[jobId]/content/generate` - Generate pack (RECRUITER+)
- `PATCH /api/jobs/[jobId]/content` - Update content (RECRUITER+)

**Publications:**
- `GET /api/jobs/[jobId]/publications` - List publications (RECRUITER+)
- `POST /api/jobs/[jobId]/publications` - Plan publication (RECRUITER+)
- `PATCH /api/jobs/[jobId]/publications` - Update status (RECRUITER+)

### Dashboard UI

**Channels Page** (`/dashboard/channels`):
- List all channels with type icons
- Add/edit/deactivate channels
- Filter by active/inactive status

**Job Detail Page** (`/dashboard/jobs/[jobId]`):
- Social Content section below job details
- "Generate Social Pack" button
- Content cards with copy-to-clipboard
- Full content editing modal with title, body, hashtags
- Status workflow (Draft → Approved → Archived)
- "Plan Publication" modal
- Campaign matrix view

### Content Editing & Approval Workflow

Content follows a simple approval workflow:

| Status | Description | Allowed Transitions |
|--------|-------------|---------------------|
| DRAFT | Initial state, editable | → APPROVED, ARCHIVED |
| APPROVED | Ready for publication | → ARCHIVED, DRAFT (for re-editing) |
| ARCHIVED | No longer in use | → DRAFT (un-archive) |

**Editing Features:**
- Inline editing of title, body, and hashtags
- Status transitions with validation
- Audit trail: who edited, when
- `approvedAt` timestamp when content is approved

**PATCH `/api/jobs/[jobId]/content`:**
```json
{
  "id": "content_id",
  "title": "Custom title",
  "body": "Updated content...",
  "suggestedHashtags": "#new #hashtags",
  "status": "APPROVED"
}
```

### Campaign Matrix

The job-level campaign view shows a matrix of:
- **Rows**: Content variants (TikTok Script, Instagram Caption, etc.)
- **Columns**: Channels (TikTok Toulouse, Instagram Paris, etc.)
- **Cells**: Publication status (Planned/Published/Failed) or "+" to plan

This gives recruiters a visual overview of:
- Which content exists for the job
- Which channels have planned/published posts
- Where gaps exist (content not yet planned on a channel)

Click a status pill to edit the publication (change status, add external URL).
Click "+" to plan a new publication for that content/channel combination.

### Plan Gating

Social content features are available on PRO and AGENCY_PLUS plans:

| Feature | STARTER | PRO | AGENCY_PLUS |
|---------|---------|-----|-------------|
| Channels | ❌ | ✅ | ✅ |
| Social Pack | ❌ | ✅ | ✅ |

### Demo Mode

Demo mode is read-only for social content:
- ✅ Can view: Channels, content, publications, campaign matrix
- ❌ Cannot: Create/edit channels, generate content, edit content, plan/update publications

Error response:
```json
{
  "error": "This is the live demo. Create your own agency to try this.",
  "code": "DEMO_READ_ONLY"
}
```

UI behavior in demo mode:
- Edit buttons are visible but show a toast when clicked
- Forms display a warning banner
- All write operations are blocked server-side

### Channel-Specific Apply Links

Each channel in the campaign matrix exposes a "Copy apply link" button that generates a trackable URL:

```
https://agency.questhire.com/jobs/{jobId}?source=channel&sourceDetail=tiktok_paris&channelId={channelId}
```

**URL Parameters:**
- `source`: Type of source (e.g., "channel", "direct", "email", "qr_code")
- `sourceDetail`: Specific identifier (e.g., "tiktok_paris", "linkedin_company")
- `channelId`: The channel's database ID for direct linking

When a candidate applies via this link, the source information is automatically captured and stored.

### Application Source Tracking

The `Application` model includes source tracking fields:

```prisma
model Application {
  source          String?   // "channel", "direct", "email", "qr_code", etc.
  sourceDetail    String?   // "tiktok_paris", "newsletter_campaign", etc.
  sourceChannelId String?   // Link to Channel if from a channel
  sourceChannel   Channel?  @relation(...)
}
```

**How it works:**
1. Recruiter copies apply link from campaign matrix
2. Link is shared on social media / QR code / email
3. Candidate clicks link and applies
4. Source params are captured and stored with the application
5. Analytics show breakdown by source and channel

### Channel Performance Analytics

**Global Analytics** (`/api/analytics/summary`):
```json
{
  "applicationSources": {
    "bySource": [
      { "source": "channel", "count": 35 },
      { "source": "direct", "count": 18 },
      { "source": "email", "count": 10 }
    ],
    "byChannel": [
      { "channelId": "...", "channelName": "TikTok Paris", "type": "TIKTOK", "count": 20 },
      { "channelId": "...", "channelName": "LinkedIn Company", "type": "LINKEDIN", "count": 15 }
    ]
  }
}
```

**Job-Level Analytics** (`/api/jobs/[jobId]/analytics`):
```json
{
  "jobId": "...",
  "jobTitle": "Warehouse Operator",
  "totalApplications": 25,
  "byStatus": { "NEW": 10, "CONTACTED": 8, "QUALIFIED": 5, "PLACED": 2 },
  "bySource": [{ "source": "channel", "count": 15 }],
  "byChannel": [{ "channelId": "...", "channelName": "TikTok Paris", "type": "TIKTOK", "count": 12 }]
}
```

### Implementation Files

- Schema: `prisma/schema.prisma` (Channel, JobPostContent, Publication, Application source fields)
- Generator: `modules/content/generator.ts`
- APIs: `app/api/channels/`, `app/api/jobs/[jobId]/content/`, `app/api/jobs/[jobId]/publications/`, `app/api/jobs/[jobId]/analytics/`
- UI: `app/(app)/dashboard/channels/`, `app/(app)/dashboard/jobs/[jobId]/social-content.tsx`, `app/(app)/dashboard/analytics/page.tsx`

### Future Enhancements

- UTM tag support for deeper marketing integration
- Integration with social platform APIs for automatic posting
- QR code generation for offline campaigns
- A/B testing of different content variants per channel

## Onboarding Tour

New users see a guided tour on first login.

### Tour Steps

1. **Welcome** - Introduction to QuestHire
2. **Jobs** - Create your first job posting
3. **Pipeline** - Visual Kanban for candidates
4. **Candidates** - Your reusable talent pool
5. **Analytics** - Track hiring performance
6. **Billing** - Plans and subscription

### How It Works

- `hasSeenOnboardingTour` flag on User model
- Tour auto-starts for new users (not in demo mode)
- Users can skip or complete the tour
- State persisted via `/api/onboarding/state` and `/api/onboarding/complete`

### Testing the Tour

To reset and replay the tour:

```sql
UPDATE "User" SET "hasSeenOnboardingTour" = false WHERE email = 'your@email.com';
```

Or use the "Replay tour" button in the dashboard (if implemented).

**Implementation:**
- Hook: `modules/onboarding/use-onboarding-tour.tsx`
- UI: `app/(app)/dashboard/components/onboarding-tour.tsx`
- API: `app/api/onboarding/state/route.ts`, `app/api/onboarding/complete/route.ts`

## Production Deployment

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Always | PostgreSQL connection string (Neon recommended) |
| `NEXTAUTH_URL` | Always | Full URL of your app (e.g., `https://app.questhire.com`) |
| `NEXTAUTH_SECRET` | Production | Generate with `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` | Production | Stripe secret key for billing |
| `STRIPE_WEBHOOK_SECRET` | Production | Stripe webhook signing secret |

### Recommended Services

| Service | Provider | Purpose |
|---------|----------|---------|
| **Hosting** | Vercel | Next.js hosting with edge functions |
| **Database** | Neon | Serverless PostgreSQL |
| **Redis** | Upstash | Serverless Redis for rate limiting |
| **Email** | Resend | Transactional emails |
| **Storage** | Cloudflare R2 | S3-compatible file storage |
| **Monitoring** | Sentry | Error tracking |

### Deployment Steps

1. **Database Setup (Neon)**
   ```bash
   # Create database and get connection string
   # Set DATABASE_URL in Vercel environment variables
   
   # Run migrations
   npx prisma migrate deploy
   
   # Seed demo data (optional)
   npx prisma db seed
   ```

2. **Redis Setup (Upstash)**
   ```bash
   # Create Redis database at upstash.com
   # Set REDIS_URL and REDIS_TOKEN in environment variables
   ```

3. **Email Setup (Resend)**
   ```bash
   # Create account at resend.com
   # Verify your domain
   # Set EMAIL_PROVIDER=resend and RESEND_API_KEY
   ```

4. **Stripe Setup**
   ```bash
   # Create products/prices in Stripe Dashboard
   # Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
   # Set STRIPE_PRICE_PRO, STRIPE_PRICE_AGENCY_PLUS
   # Configure webhook endpoint: https://yourdomain.com/api/webhooks/stripe
   ```

5. **Deploy to Vercel**
   ```bash
   # Connect repository to Vercel
   # Set all environment variables
   # Deploy
   ```

### Domain Configuration

For multi-tenant subdomains:
1. Add wildcard domain `*.questhire.com` to Vercel
2. Configure DNS with wildcard CNAME record
3. Demo agency accessible at `demo-agency.questhire.com`

### Email Configuration

In development, emails are logged to console. In production:

```env
EMAIL_PROVIDER=resend          # or sendgrid
EMAIL_FROM_DEFAULT="QuestHire <noreply@yourdomain.com>"
RESEND_API_KEY=re_...
```

Supported providers:
- **Resend** (recommended): Simple API, good deliverability
- **SendGrid**: Enterprise-grade, more features
- **Console**: Development only, logs to stdout

### Rate Limiting

Rate limiting uses Redis in production for distributed state:

```env
REDIS_URL=https://xxx.upstash.io
REDIS_TOKEN=your-token
```

Without Redis, falls back to in-memory (not suitable for multi-instance deployments).

### Healthcheck Endpoints

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `GET /api/health` | Basic liveness check | None |
| `GET /api/health/deep` | DB + Redis connectivity | None |

**Basic healthcheck response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-01-01T12:00:00Z",
  "environment": "production"
}
```

**Deep healthcheck response:**
```json
{
  "status": "ok",
  "checks": {
    "db": { "status": "ok", "latencyMs": 15 },
    "redis": { "status": "ok", "latencyMs": 8 }
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

Status values:
- `ok`: All checks passed
- `degraded`: Non-critical checks failed (e.g., Redis)
- `error`: Critical checks failed (e.g., Database)

Use these endpoints with uptime monitoring services (e.g., Better Uptime, Pingdom).

### Monitoring

Enable Sentry for error tracking:

```env
SENTRY_DSN=https://xxx@sentry.io/project-id
```

Critical flows are logged with structured metadata:
- Authentication (login success/failure)
- Billing (Stripe webhooks, payment failures)
- Applications (creation, errors)

### Pre-Deploy Checklist

Before deploying to production, run these checks:

```bash
# 1. Run linting
npm run lint

# 2. Run tests
npm run test:run

# 3. Run smoke tests (requires dev server running)
npm run smoke

# Or run all checks at once:
npm run precheck
```

**Manual Verification:**

| Check | URL | Expected |
|-------|-----|----------|
| Demo login | `/login` | Can login with `owner@alpha-staff.com` |
| Public jobs | `/jobs` | Shows list of active jobs |
| Application form | `/jobs/[id]` | Can submit application |
| Pipeline view | `/dashboard/jobs/[id]/pipeline` | Shows Kanban board with selection mode |
| Pipeline shortlist | `/dashboard/jobs/[id]/pipeline` | Can select candidates and create shortlist |
| Campaign view | `/dashboard/jobs/[id]/campaign` | Shows campaign overview |
| Shortlists list | `/dashboard/shortlists` | Shows all shortlists with filters |
| Shortlist detail | `/dashboard/shortlists/[id]` | Shows candidates, feedback, links to job/client |
| Analytics | `/dashboard/analytics` | Shows charts and stats |
| Healthcheck | `/api/health` | Returns `{"status": "ok"}` |

**Smoke Test Script:**

The `npm run smoke` command validates:
- Database connectivity and seed data presence
- Health endpoints responding correctly
- API endpoints not returning 500 errors
- Public pages loading without crashes

### Known Limitations (v1)

These are intentional limitations for the initial release:

- **No real-time updates**: Dashboard requires manual refresh
- **No file preview**: CV files are stored but not previewed
- **No email verification**: Users can sign up without email confirmation
- **Single currency**: Salaries displayed in agency's default currency only
- **No mobile app**: Web-only for now

## Job Campaign Overview

The Campaign Overview at `/dashboard/jobs/[jobId]/campaign` is a unified control center for each job:

### What It Shows

- **Pipeline Summary** - Visual breakdown of candidates by status (New, Contacted, Qualified, Placed, Rejected)
- **KPI Cards** - Total applications, recent activity (last 7 days), qualified count, placements with conversion rate
- **Source Performance** - Applications by source (job page, social channels, email, QR code)
- **Channel Performance** - Top-performing social channels with application counts
- **Shortlists & Feedback** - All shortlists shared for this job with client feedback summary

### Quick Actions

From the campaign page, recruiters can:
- Open the full Kanban pipeline
- Access social content management
- View the public job page
- Open client shortlist links

### Recruiter Workflow

The complete recruiting loop:
1. **Create Job** → Define position details
2. **Generate Social Content** → Create posts for multiple channels
3. **Share Links** → Distribute via social, email, QR codes
4. **Manage Pipeline** → Track candidates through stages
5. **Create Shortlist** → Select candidates from pipeline, create shortlist
6. **Share with Client** → Send shortlist link to client for review
7. **Collect Feedback** → Client approves/rejects candidates via public link
8. **Review Internally** → Open `/dashboard/shortlists/[id]` to see feedback
9. **Review Campaign** → Analyze source/channel performance in campaign view

## Shortlists

Shortlists allow recruiters to share curated candidate selections with clients via a public link.

### Creating Shortlists

1. Go to `/dashboard/jobs/[jobId]/pipeline`
2. Click "Select for Shortlist" to enter selection mode
3. Click on candidate cards to select them (checkbox appears)
4. Click "Create Shortlist" when ready
5. Fill in name, optionally select a client, add notes
6. Share link is automatically copied to clipboard

### Managing Shortlists

The `/dashboard/shortlists` page shows all shortlists with:
- **Filters** - By job, client, or search
- **Table view** - Name, job, client, candidates count, created date
- **Actions** - View details, copy link, open public view

### Internal Shortlist View

The `/dashboard/shortlists/[id]` page provides a detailed internal view:

**Header Section:**
- Shortlist name and creation date
- Job pill with status (links to campaign page)
- Client pill (links to client 360° page)
- Quick actions: Copy link, Open public link, Open pipeline
- Stats: Total candidates, approved, rejected, pending

**Candidates Table:**
- Candidate name with profile link
- Contact info (email, phone)
- Application status badge
- Client decision (APPROVED/REJECTED/PENDING) with comment
- Actions: View CV, candidate profile, pipeline

**Navigation:**
- From job campaign page → shortlist detail
- From client 360° page → shortlist detail
- From shortlists list → shortlist detail

### Plan Gating

Shortlists require **Pro** or **Agency Plus** plan:
- Starter plan: "Select for Shortlist" button shows upgrade prompt
- Pro/Agency Plus: Full shortlist creation and management

### Demo Mode

In demo agencies:
- Shortlist creation is simulated but **not persisted**
- A warning banner appears in the create modal
- Success toast shows but no data is saved

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/shortlists` | GET | List shortlists with filters (RECRUITER+) |
| `/api/shortlists` | POST | Create shortlist from applications (RECRUITER+, Pro plan) |
| `/api/shortlists/[id]` | GET | Get shortlist detail with candidates (RECRUITER+) |
| `/api/shortlists/[id]` | PATCH | Update shortlist metadata (RECRUITER+, no demo) |
| `/api/jobs/[jobId]/shortlists` | GET | List shortlists for a specific job |
| `/api/jobs/[jobId]/analytics` | GET | Get job campaign analytics (RECRUITER+) |
| `/shortlist/[shareToken]` | GET | Public shortlist view for clients |

**Response Structure:**
```json
{
  "job": { "id": "...", "title": "...", "status": "ACTIVE", "location": "..." },
  "pipeline": {
    "total": 34,
    "recentCount": 8,
    "byStatus": { "NEW": 10, "CONTACTED": 8, "QUALIFIED": 6, "PLACED": 3, "REJECTED": 7 }
  },
  "sources": {
    "bySource": [{ "source": "job_page", "count": 18 }],
    "byChannel": [{ "channelId": "...", "name": "TikTok - Main", "type": "TIKTOK", "count": 7 }]
  },
  "shortlists": {
    "total": 2,
    "items": [{
      "id": "...", "name": "Logistics Day Shift", "shareToken": "...",
      "candidatesCount": 5,
      "feedback": { "approved": 2, "rejected": 1, "pending": 2 }
    }]
  }
}
```

## Client 360° & Portal

QuestHire includes a comprehensive client management system with:
1. **Client 360° View** - Internal dashboard showing all client activity
2. **Unified Client Portal** - External portal for clients to manage their requests and review candidates

### Client 360° (Internal)

The Client 360° view at `/dashboard/clients/[id]` aggregates:
- **Job Requests** - All requests submitted by the client with status tracking
- **Jobs** - Jobs linked to this client with application counts
- **Shortlists** - Candidate shortlists shared with the client and their feedback
- **KPIs** - Active jobs, pending requests, placements, approval/rejection rates

**Linking Jobs & Shortlists to Clients:**
- Jobs can be linked to a client via the job detail page sidebar
- Shortlists inherit the client from their linked job by default
- All linked items appear in the Client 360° view

### Unified Client Portal (Public)

Each client has a unique `requestToken` that grants access to their portal at `/client/[requestToken]`:

**Portal Features:**
- **Dashboard** - Overview of all requests and shortlists
- **New Request** - Submit job requests via branded form
- **Request History** - View status of submitted requests
- **Shortlists** - Review candidates and provide feedback

### Demo Client Links

After seeding, these client portal links are available:

| Client | Agency | Portal URL |
|--------|--------|------------|
| LogiTrans | Alpha Staff | `/client/clnt_logitrans_alpha_001` |
| RetailCorp | Alpha Staff | `/client/clnt_retailcorp_alpha_002` |
| Demo Client | Demo Agency | `/client/clnt_demo_001` |

### Plan Gating

The Client CRM feature requires **Pro** or **Agency Plus** plan:
- Starter plan: Cannot create clients or access Client 360° view
- Pro/Agency Plus: Full access to client management

### Demo Mode Behavior

For demo agencies (`demo-agency`):
- Job request submissions return success but are **not persisted**
- Shortlist feedback returns success but is **not persisted**
- Client creation is blocked
- This prevents demo data pollution while allowing users to test the flow

### Feedback Sync (Optional)

When enabled, client feedback on shortlists can automatically update the underlying application status.

**Feature Flag:**
```bash
# Enable feedback-to-application status sync
ENABLE_FEEDBACK_SYNC=true
```

**Decision → Status Mapping:**

| Client Decision | Target Application Status | Notes |
|-----------------|---------------------------|-------|
| APPROVED | QUALIFIED | Indicates client interest, but not yet placed |
| REJECTED | REJECTED | Client rejection terminates the application |
| PENDING | (no change) | No sync for pending decisions |

**Transition Rules:**
- **Terminal states are protected**: Cannot change status of PLACED or REJECTED applications
- **Forward progression only**: Cannot regress status (e.g., QUALIFIED → NEW)
- **Rejection always allowed**: Client rejection can override any non-terminal status
- **Tenant isolation enforced**: Only syncs within the same agency

**Behavior:**
- When disabled (default): Feedback is stored but application status is unchanged
- When enabled: Application status is updated according to mapping rules
- In demo mode: Sync is simulated but not persisted (even if enabled)

**Event Logging:**
When sync occurs, an `APPLICATION_STATUS_SYNCED_FROM_FEEDBACK` event is logged with:
- Previous and new status
- Shortlist ID and name
- Client feedback ID

**Application Notes:**
A note is appended to the application when synced:
```
Status auto-updated from client feedback on shortlist "Logistics Day Shift" at 2024-01-15T10:30:00.000Z
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clients` | GET | List clients (authenticated, RECRUITER+) |
| `/api/clients` | POST | Create client (authenticated, ADMIN+, Pro plan) |
| `/api/clients/[id]` | GET | Get client 360° detail |
| `/api/clients/[id]` | PATCH | Update client info |
| `/api/client/[requestToken]` | GET | Get client portal data (public) |
| `/api/client/[requestToken]/job-requests` | POST | Submit a job request |
| `/api/job-requests` | GET | List job requests (authenticated) |
| `/api/job-requests` | PATCH | Update job request status |
| `/api/shortlists/[shareToken]/feedback` | GET | Get existing feedback |
| `/api/shortlists/[shareToken]/feedback` | POST | Submit candidate feedback |

## AI Content Generation & Social Publishing

QuestHire includes AI-powered content generation and one-click social publishing capabilities.

### AI Content Generation

Generate engaging social media content using AI (OpenAI or Anthropic):

**Features:**
- **Full Pack Generation** - Generate content for all 4 channels (TikTok, Instagram, LinkedIn, WhatsApp) in one click
- **Single Variant Regeneration** - Regenerate individual content variants with different tones
- **Tone Selection** - Choose from Default, Friendly, Formal, or Punchy tones
- **Multi-language** - Generate content in French, English, Spanish, or German
- **Template Fallback** - Falls back to template-based generation if AI is not configured

**Plan Gating:**
- Starter plan: Template-based generation only
- Pro/Agency Plus: AI-powered generation with tone and language options

### Social Publishing

Publish content directly to social platforms or schedule for later:

**Publication Statuses:**
- `DRAFT` - Initial state, not yet scheduled
- `SCHEDULED` - Scheduled for future publishing
- `PUBLISHING` - Currently being processed
- `PUBLISHED` - Successfully published
- `FAILED` - Publishing failed (with error message)

**Features:**
- **Publish Now** - Immediately publish to the selected channel
- **Schedule** - Set a future date/time for automatic publishing
- **Retry** - Failed publications can be retried (up to 5 attempts)
- **External Links** - Published posts include links to the external platform

**Cron Processing:**
The `/api/cron/publications` endpoint processes scheduled publications:
- Call periodically (e.g., every minute) via Vercel Cron or external scheduler
- Protected by `CRON_SECRET` environment variable
- Processes up to 10 publications per batch
- Automatically retries failed publications

### Environment Variables

Add these to your `.env.local` for AI and social features:

```bash
# AI Provider (choose one)
AI_PROVIDER=openai                    # or "anthropic"
OPENAI_API_KEY=sk-...                 # OpenAI API key
OPENAI_MODEL=gpt-4o                   # Optional, defaults to gpt-4o
ANTHROPIC_API_KEY=sk-ant-...          # Anthropic API key
ANTHROPIC_MODEL=claude-sonnet-4-20250514  # Optional

# Social Providers - OAuth Credentials
TIKTOK_CLIENT_KEY=...                 # TikTok OAuth client key
TIKTOK_CLIENT_SECRET=...              # TikTok OAuth client secret
TIKTOK_API_BASE_URL=https://open.tiktokapis.com/v2  # Optional
TIKTOK_ACCESS_TOKEN=...               # User access token (after OAuth)

INSTAGRAM_APP_ID=...                  # Facebook App ID
INSTAGRAM_APP_SECRET=...              # Facebook App Secret
INSTAGRAM_API_BASE_URL=https://graph.instagram.com/v18.0  # Optional
INSTAGRAM_ACCESS_TOKEN=...            # Page access token (after OAuth)

LINKEDIN_CLIENT_ID=...                # LinkedIn OAuth client ID
LINKEDIN_CLIENT_SECRET=...            # LinkedIn OAuth client secret
LINKEDIN_API_BASE_URL=https://api.linkedin.com/v2  # Optional
LINKEDIN_ACCESS_TOKEN=...             # User access token (after OAuth)

# Cron Security
CRON_SECRET=your-secure-random-string
```

### Social Provider Status

The social providers are implemented as **structured HTTP clients** ready for full API integration:

| Provider | Text Posts | Image Posts | Video Posts | Status |
|----------|------------|-------------|-------------|--------|
| TikTok | ❌ | ❌ | 🔧 Placeholder | Requires video URL |
| Instagram | ❌ | 🔧 Placeholder | ❌ | Requires image URL |
| LinkedIn | 🔧 Placeholder | 🔧 Placeholder | ❌ | Supports text-only |

**Notes:**
- TikTok and Instagram require media (video/image) for posts - text-only is not supported
- LinkedIn supports text-only posts
- All providers return demo/stub results when `ACCESS_TOKEN` is not configured
- Demo agencies always receive simulated success responses

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs/[jobId]/content/generate/ai` | POST | Generate full content pack with AI |
| `/api/jobs/[jobId]/content/[contentId]/regenerate/ai` | POST | Regenerate single variant with AI |
| `/api/publications/[id]/publish` | POST | Publish content to social platform |
| `/api/cron/publications` | POST | Process scheduled publications (cron) |
| `/api/cron/publications` | GET | Health check with pending count |

**AI Generation Request:**
```json
{
  "tone": "friendly",   // default, friendly, formal, punchy
  "language": "fr"      // fr, en, es, de
}
```

**AI Generation Response:**
```json
{
  "contents": [
    {
      "id": "...",
      "variant": "TIKTOK_SCRIPT",
      "title": "...",
      "body": "...",
      "suggestedHashtags": "#hiring #jobs"
    }
  ],
  "usedAi": true,
  "message": "Generated 4 content variants with AI"
}
```

### Demo Mode

In demo agencies:
- AI generation uses template fallback (simulated)
- Social publishing returns fake success with demo URLs
- No actual API calls are made to external services

### Manual Verification

1. **AI Content Generation:**
   - Navigate to `/dashboard/jobs/[jobId]` → Social Content tab
   - Click "Generate with AI" button
   - Select tone and language
   - Verify content is generated for all 4 channels

2. **Single Variant Regeneration:**
   - Click regenerate button on any content variant
   - Verify new content is generated with selected tone

3. **Publication Scheduling:**
   - Create a publication with a future scheduled date
   - Verify status shows as "Scheduled"
   - Call cron endpoint to process (or wait for scheduled time)

4. **Publish Now:**
   - Click "Publish Now" on a publication
   - Verify status changes to "Publishing" then "Published" or "Failed"

---

## Launch Checklist

### Pre-deployment Commands

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Run database migrations
npx prisma migrate deploy  # Production
# or
npx prisma migrate dev     # Development

# 4. Run tests
npm run test:run

# 5. Build the application
npm run build

# 6. (Optional) Run smoke tests
npm run smoke
```

### Required Environment Variables

**Minimum for local development:**
```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
```

**Required for production:**
```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="secure-random-string"
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

**Optional providers:**
```bash
# Email (defaults to console in dev)
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_..."

# AI Content Generation
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."

# Social Publishing (stubbed without tokens)
TIKTOK_ACCESS_TOKEN="..."
INSTAGRAM_ACCESS_TOKEN="..."
LINKEDIN_ACCESS_TOKEN="..."

# Feature Flags
ENABLE_FEEDBACK_SYNC="true"

# Cron Security
CRON_SECRET="secure-random-string"
```

### Known Limitations

1. **Social Providers**: TikTok, Instagram, and LinkedIn providers are implemented as HTTP clients but return stub/demo responses without valid access tokens. Full OAuth integration is pending.

2. **Media Publishing**: TikTok requires video, Instagram requires images. Text-only posts are only supported on LinkedIn.

3. **Cron Jobs**: The `/api/cron/publications` endpoint must be called externally (e.g., Vercel Cron, external scheduler) to process scheduled publications.

### Manual Verification Before Go-Live

1. **Authentication Flow**
   - [ ] Login with email/password works
   - [ ] Session persists across page refreshes
   - [ ] Logout clears session

2. **Multi-tenancy**
   - [ ] Users can only see their agency's data
   - [ ] Demo agency shows demo data
   - [ ] Alpha-staff shows seeded test data

3. **Core Features**
   - [ ] Create/edit jobs
   - [ ] View applications pipeline
   - [ ] Create shortlists from applications
   - [ ] Share shortlist with client (public link)
   - [ ] Client can submit feedback on shortlist

4. **Plan Gating**
   - [ ] Starter plan: Limited to 10 jobs, 3 channels, no shortlists
   - [ ] Pro plan: Unlimited jobs, all features enabled
   - [ ] Upgrade flow works (Stripe checkout)

5. **Demo Mode**
   - [ ] Demo agency cannot persist changes
   - [ ] Demo mode banner appears where appropriate
   - [ ] All flows return success but don't mutate data

## Missions / Assignment Tracking

Track candidate placements and ongoing assignments.

### Data Model

**Mission** - A candidate placement:
- `status`: PLANNED, ACTIVE, COMPLETED, CANCELLED, NO_SHOW, SUSPENDED
- `dates`: startDate, endDatePlanned, endDateActual
- `financials`: hourlyRate (pay), billingRate (bill)
- `relations`: 1-1 with Application, linked to Candidate, Job, Client

### Workflow

1. **Creation**: Automatically created when an Application status is set to `PLACED`.
2. **Tracking**: Recruiters monitor active missions via `/dashboard/missions`.
3. **Updates**: Status changes (e.g., ACTIVE → COMPLETED) are tracked.

### API Endpoints

**`GET /api/missions`**
- List missions with filters (status, date range, client, candidate).
- RBAC: RECRUITER+

**`GET /api/missions/[id]`**
- Get mission details.

**`PATCH /api/missions/[id]`**
- Update mission status, dates, or notes.
- Logs `MISSION_STATUS_CHANGED`.

## License

Private - All rights reserved.
