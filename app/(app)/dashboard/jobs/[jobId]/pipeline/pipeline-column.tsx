"use client";

import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PipelineColumnProps {
  status: string;
  label: string;
  color: string;
  count: number;
  icon?: ReactNode;
  children: ReactNode;
}

export function PipelineColumn({
  status,
  label,
  color,
  count,
  icon,
  children,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-80 rounded-xl bg-muted/30 border border-border transition-all duration-200 flex flex-col h-full shadow-sm",
        isOver && "bg-muted/60 ring-2 ring-primary ring-inset shadow-md"
      )}
    >
      {/* Column header */}
      <div className="p-4 border-b border-border bg-background/50 backdrop-blur-sm rounded-t-xl sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={cn("flex items-center justify-center w-6 h-6 rounded-md", color)}>
              {icon}
            </div>
            <h3 className="font-semibold text-sm text-foreground">{label}</h3>
          </div>
          <Badge variant="secondary" className="bg-background/80 font-mono text-xs">
            {count}
          </Badge>
        </div>
        {/* Progress bar for visual load */}
        <div className="mt-3 h-1 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", color.replace("/10", "").replace("text-", "bg-"))} 
            style={{ width: `${Math.min(100, (count / 10) * 100)}%` }}
          />
        </div>
      </div>

      {/* Column content */}
      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}
