"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, FileText, User, CheckCircle2, GripVertical, Loader2, Phone, Mail, MessageSquare } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface ApplicationCardData {
  id: string;
  candidateName: string;
  candidateEmail: string | null;
  candidateLocation: string | null;
  candidatePhone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  notesPreview: string | null;
  cvUrl: string | null;
}

interface ApplicationCardProps {
  data: ApplicationCardData;
  isUpdating: boolean;
  isDraggable: boolean;
  isOverlay?: boolean;
  isSelected?: boolean;
  onSelectToggle?: (id: string) => void;
  selectionMode?: boolean;
  onQuickStatusChange?: (id: string, status: string) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `il y a ${diffMins}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)}sem`;
  return date.toLocaleDateString("fr-FR");
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ApplicationCard({
  data,
  isUpdating,
  isDraggable,
  isOverlay = false,
  isSelected = false,
  onSelectToggle,
  selectionMode = false,
  onQuickStatusChange,
}: ApplicationCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: data.id,
    disabled: !isDraggable || selectionMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode && onSelectToggle) {
      e.preventDefault();
      e.stopPropagation();
      onSelectToggle(data.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={cn(
        "touch-none",
        isDragging && "opacity-50",
        isOverlay && "rotate-2 scale-105 cursor-grabbing",
        isUpdating && "opacity-70 pointer-events-none"
      )}
      {...(isDraggable && !selectionMode ? attributes : {})}
    >
      <Card
        className={cn(
          "group relative transition-all duration-200 hover:shadow-md",
          isSelected && "border-primary ring-1 ring-primary bg-primary/5",
          selectionMode && "cursor-pointer"
        )}
      >
        <CardContent className="p-3 space-y-2.5">
          {/* Header */}
          <div className="flex items-start gap-3">
            {/* Selection or Drag Handle */}
            <div className="flex-shrink-0 pt-0.5">
              {selectionMode ? (
                <div
                  className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input group-hover:border-primary"
                  )}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
              ) : isDraggable ? (
                <div
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded-sm hover:bg-secondary text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  <GripVertical className="w-4 h-4" />
                </div>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-medium text-sm text-foreground truncate">
                  {data.candidateName || "Anonymous"}
                </h4>
                {isUpdating && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
              </div>
              {data.candidateEmail && (
                <p className="text-xs text-muted-foreground truncate">{data.candidateEmail}</p>
              )}
            </div>
          </div>

          {/* Location */}
          {data.candidateLocation && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{data.candidateLocation}</span>
            </div>
          )}

          {/* Tags */}
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 h-5 font-normal bg-secondary/50 text-secondary-foreground/80"
                >
                  {tag}
                </Badge>
              ))}
              {data.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">
                  +{data.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Notes preview */}
          {data.notesPreview && (
            <div className="relative pl-2 border-l-2 border-muted">
              <p className="text-xs text-muted-foreground italic truncate">
                {data.notesPreview}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
            <span className="text-[10px] text-muted-foreground">
              {formatTimeAgo(data.createdAt)}
            </span>
            <div className="flex items-center gap-0.5">
              {/* Quick contact actions */}
              {data.candidatePhone && (
                <a
                  href={`tel:${data.candidatePhone}`}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 dark:hover:text-green-400 transition-colors"
                  title={`Appeler ${data.candidatePhone}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}
              {data.candidateEmail && (
                <a
                  href={`mailto:${data.candidateEmail}`}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 dark:hover:text-blue-400 transition-colors"
                  title={`Email ${data.candidateEmail}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
              )}
              {/* Mark as contacted button - only show if status is NEW */}
              {data.status === "NEW" && onQuickStatusChange && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickStatusChange(data.id, "CONTACTED");
                  }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 dark:hover:text-amber-400 transition-colors"
                  title="Marquer comme contacté"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="w-px h-3 bg-border mx-0.5" />
              {data.cvUrl && (
                <a
                  href={data.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Voir le CV"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FileText className="w-3.5 h-3.5" />
                </a>
              )}
              <Link
                href={`/dashboard/candidates?email=${encodeURIComponent(data.candidateEmail || "")}`}
                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Voir le profil"
                onClick={(e) => e.stopPropagation()}
              >
                <User className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
