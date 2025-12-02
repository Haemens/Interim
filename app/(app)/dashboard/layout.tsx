import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { TENANT_HEADER } from "@/lib/tenant";
import { getCurrentUser } from "@/modules/auth";
import { DEMO_AGENCY_SLUG } from "@/modules/auth/demo-mode";
import { canCreateActiveJob } from "@/modules/billing";
import { DashboardProviders } from "./components/dashboard-providers";
import { DashboardShell } from "./components/dashboard-shell";

interface LayoutData {
  agency: {
    name: string;
    slug: string;
    subscriptions: { plan: string }[];
  } | null;
  memberships: {
    role: string;
    agency: { name: string; slug: string };
  }[];
  jobLimitWarning: boolean;
}

async function getLayoutData(tenantSlug: string | null, userId: string | null): Promise<LayoutData> {
  if (!tenantSlug || !userId) {
    return { agency: null, memberships: [], jobLimitWarning: false };
  }

  const [agency, memberships] = await Promise.all([
    db.agency.findUnique({
      where: { slug: tenantSlug },
      include: {
        subscriptions: {
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
    }),
    db.membership.findMany({
      where: { userId },
      include: {
        agency: {
          select: { name: true, slug: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Check job limit warning
  let jobLimitWarning = false;
  if (agency) {
    const jobCheck = await canCreateActiveJob(agency.id);
    if (jobCheck.maxAllowed !== null) {
      const usagePercent = jobCheck.currentCount / jobCheck.maxAllowed;
      jobLimitWarning = usagePercent >= 0.8; // 80% or more
    }
  }

  return { agency, memberships, jobLimitWarning };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const tenantSlug = headersList.get(TENANT_HEADER);
  const user = await getCurrentUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect("/login");
  }

  const { agency, memberships, jobLimitWarning } = await getLayoutData(tenantSlug, user.id);

  // Redirect if user is not a member of this agency
  if (!agency || !memberships.some((m) => m.agency.slug === tenantSlug)) {
    redirect("/login");
  }

  const isDemo = agency.slug === DEMO_AGENCY_SLUG;
  const activePlan = agency.subscriptions[0]?.plan || "STARTER";

  return (
    <DashboardShell
      agency={{
        name: agency.name,
        slug: agency.slug,
        plan: activePlan,
      }}
      memberships={memberships.map((m) => ({
        name: m.agency.name,
        slug: m.agency.slug,
        role: m.role,
      }))}
      user={{
        name: user.name || "Guest",
        email: user.email || "",
        initial: (user.name?.[0] || user.email?.[0] || "?").toUpperCase(),
      }}
      jobLimitWarning={jobLimitWarning}
      isDemo={isDemo}
    >
      <DashboardProviders>{children}</DashboardProviders>
    </DashboardShell>
  );
}

