"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  BarChart3,
  Users2,
  CreditCard,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  Plus,
  LogOut,
  ChevronsUpDown
} from "lucide-react";
import { APP_NAME } from "@/config/constants";
import { cn } from "@/lib/utils";
import { AgencySwitcher } from "../agency-switcher";
import { SignOutButton } from "../sign-out-button";
import { DemoBanner } from "./demo-banner";
import { OnboardingTour } from "./onboarding-tour";

interface DashboardShellProps {
  children: React.ReactNode;
  agency: {
    name: string;
    slug: string;
    plan: string;
  };
  memberships: {
    name: string;
    slug: string;
    role: string;
  }[];
  user: {
    name: string;
    email: string;
    initial: string;
  };
  jobLimitWarning: boolean;
  isDemo: boolean;
}

const navigation = [
  { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, tourId: "dashboard" },
  { name: "Offres", href: "/dashboard/jobs", icon: Briefcase, tourId: "jobs" },
  { name: "Candidats", href: "/dashboard/candidates", icon: Users, tourId: "candidates" },
  { name: "Statistiques", href: "/dashboard/analytics", icon: BarChart3, tourId: "analytics" },
  { name: "Équipe", href: "/dashboard/team", icon: Users2, tourId: "team" },
  { name: "Facturation", href: "/dashboard/billing", icon: CreditCard, tourId: "billing" },
  { name: "Paramètres", href: "/dashboard/settings", icon: Settings, tourId: "settings" },
];

export function DashboardShell({
  children,
  agency,
  memberships,
  user,
  jobLimitWarning,
  isDemo,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Demo Banner - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <DemoBanner isDemo={isDemo} />
      </div>

      {/* Mobile Header */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b border-border h-16 flex items-center justify-between px-4",
        isDemo && "top-[40px]" // Adjust for demo banner
      )}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <span className="font-bold text-lg">{APP_NAME}</span>
        </div>
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-sm">
          {user.initial}
        </div>
      </div>

      {/* Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        isDemo && "top-[40px]" // Adjust for demo banner height
      )}>
        {/* Logo (Desktop) */}
        <div className="h-16 flex items-center px-6 border-b border-border hidden lg:flex">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">Q</span>
            </div>
            <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
          </Link>
        </div>

        {/* Agency Switcher */}
        <div className="p-4 border-b border-border">
          <AgencySwitcher
            currentAgency={{ name: agency.name, slug: agency.slug }}
            memberships={memberships}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Area */}
        <div className="p-4 border-t border-border space-y-4 bg-background">
          {/* Job Limit Warning */}
          {jobLimitWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-xs text-amber-800">
                Vous approchez de la limite d&apos;offres.{" "}
                <Link href="/dashboard/billing" className="font-medium underline hover:text-amber-900">
                  Passer en Pro
                </Link>
              </p>
            </div>
          )}

          {/* Plan Badge */}
          <div className="bg-secondary/50 rounded-md p-3 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">
                Forfait {agency.plan}
              </span>
              <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
                Actif
              </span>
            </div>
            <Link
              href="/dashboard/billing"
              className="text-xs text-primary hover:underline"
            >
              Gérer l&apos;abonnement
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3 pt-2">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-sm">
              {user.initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn(
        "lg:pl-64 min-h-screen flex flex-col transition-all duration-200",
        isDemo && "pt-[40px]" // Offset for demo banner
      )}>
        {/* Desktop Header */}
        <header className="h-16 bg-background border-b border-border items-center justify-between px-8 hidden lg:flex sticky top-0 z-20">
          <div className="flex items-center gap-4 w-1/3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Rechercher..."
                className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <Link 
              href="/dashboard/jobs?action=new" 
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle offre</span>
            </Link>
          </div>
        </header>

        {/* Mobile Spacer */}
        <div className="h-16 lg:hidden" />

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
      
      <OnboardingTour isDemo={isDemo} />
    </div>
  );
}
