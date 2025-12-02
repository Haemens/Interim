"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

export interface TenantContextValue {
  slug: string | null;
  isMainDomain: boolean;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
  slug: string | null;
}

export function TenantProvider({ children, slug }: TenantProviderProps) {
  const value: TenantContextValue = {
    slug,
    isMainDomain: slug === null,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

/**
 * Hook to get tenant slug, throws if not in tenant context
 */
export function useTenantSlug(): string {
  const { slug } = useTenant();
  if (!slug) {
    throw new Error("useTenantSlug must be used within a tenant subdomain");
  }
  return slug;
}
