import { headers } from "next/headers";
import { getTenantFromHost } from "@/lib/tenant-utils";
import { PublicHeader } from "@/components/public/header";
import { PublicFooter } from "@/components/public/footer";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const tenantSlug = getTenantFromHost(host);

  // Only show global QuestHire navigation on the main domain (no tenant subdomain)
  // Tenant pages usually have their own branding/navigation embedded in the page component
  const showGlobalNav = !tenantSlug;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {showGlobalNav && <PublicHeader />}
      
      {/* Main content */}
      <div className="flex-grow">
        {children}
      </div>

      {showGlobalNav && <PublicFooter />}
    </div>
  );
}
