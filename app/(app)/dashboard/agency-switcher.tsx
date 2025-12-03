"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronsUpDown, Check, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AgencySwitcherProps {
  currentAgency: {
    name: string;
    slug: string;
  };
  memberships: {
    name: string;
    slug: string;
    role: string;
  }[];
}

export function AgencySwitcher({ currentAgency, memberships }: AgencySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSwitch(slug: string) {
    if (slug === currentAgency.slug) {
      setIsOpen(false);
      return;
    }

    const protocol = window.location.protocol;
    const host = window.location.host;

    let newUrl: string;
    if (host.includes("localhost")) {
      newUrl = `${protocol}//${slug}.localhost:3000/dashboard`;
    } else {
      const parts = host.split(".");
      if (parts.length >= 3) {
          const domain = parts.slice(-2).join(".");
          newUrl = `${protocol}//${slug}.${domain}/dashboard`;
      } else {
          newUrl = `${protocol}//${slug}.${host}/dashboard`;
      }
    }

    window.location.href = newUrl;
  }

  const currentInitials = currentAgency.name.substring(0, 2).toUpperCase();

  if (memberships.length <= 1) {
    return (
      <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-accent/50 transition-colors">
        <Avatar className="h-8 w-8 rounded-lg">
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-medium">
                {currentInitials}
            </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">{currentAgency.name}</span>
          <span className="truncate text-xs text-muted-foreground">{currentAgency.slug}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between h-12 px-3 border-border/50 bg-background hover:bg-accent hover:text-accent-foreground"
      >
          <div className="flex items-center gap-3 text-left">
              <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-medium">
                      {currentInitials}
                  </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{currentAgency.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{currentAgency.slug}</span>
              </div>
          </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-80">
            <div className="p-1">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Espaces de travail
                </div>
                {memberships.map((agency) => (
                    <div
                        key={agency.slug}
                        onClick={() => handleSwitch(agency.slug)}
                        className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                            currentAgency.slug === agency.slug && "bg-accent/50"
                        )}
                    >
                        <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{agency.name}</span>
                        {currentAgency.slug === agency.slug && (
                            <Check className="ml-auto h-4 w-4 opacity-100" />
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
