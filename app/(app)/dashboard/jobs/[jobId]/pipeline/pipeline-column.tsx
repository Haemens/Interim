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
  children: ReactNode;
}

export function PipelineColumn({
  status,
  label,
  color,
  count,
  children,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-80 rounded-xl bg-secondary/30 border border-border transition-colors flex flex-col h-full",
        isOver && "bg-secondary ring-2 ring-primary ring-inset"
      )}
    >
      {/* Column header */}
      <div className="p-4 border-b border-border bg-background rounded-t-xl sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", color.split(" ")[0].replace("/10", ""))} />
            <h3 className="font-semibold text-sm">{label}</h3>
          </div>
          <Badge variant="secondary" className="bg-background">
            {count}
          </Badge>
        </div>
      </div>

      {/* Column content */}
      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );
}
