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
  
  // Get current path to check if we're on a job detail page
  const pathname = headersList.get("x-pathname") || headersList.get("x-invoke-path") || "";
  const isJobDetailPage = /\/jobs\/[^/]+$/.test(pathname);

  // Only show global QuestHire navigation on the main domain (no tenant subdomain)
  // and NOT on job detail pages (they have their own header/footer)
  const showGlobalNav = !tenantSlug && !isJobDetailPage;

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
