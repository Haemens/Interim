import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { TenantProvider } from "@/modules/agency";
import { getTenantFromHeaders, TENANT_HEADER } from "@/lib/tenant";
import { APP_NAME, APP_DESCRIPTION } from "@/config/constants";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: ["staffing", "recruitment", "hiring", "jobs", "candidates", "agency"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const tenantSlug = headersList.get(TENANT_HEADER);

  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <TenantProvider slug={tenantSlug}>{children}</TenantProvider>
      </body>
    </html>
  );
}
