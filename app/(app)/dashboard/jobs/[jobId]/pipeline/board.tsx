"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApplicationCard, ApplicationCardData } from "./application-card";
import { PipelineColumn } from "./pipeline-column";
import { CreateShortlistModal } from "./create-shortlist-modal";
import { AlertCircle, CheckCircle2, X, Sparkles, MessageSquare, UserCheck, Trophy, XCircle, Inbox } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

type ApplicationStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PLACED" | "REJECTED";

interface Column {
  status: ApplicationStatus;
  label: string;
  applications: ApplicationCardData[];
}

interface PipelineData {
  job: {
    id: string;
    title: string;
    location: string | null;
    status: string;
  };
  columns: Column[];
  totalApplications: number;
}

interface PipelineBoardProps {
  jobId: string;
  canEdit: boolean;
  canUseShortlists?: boolean;
  isDemo?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  NEW: "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800",
  CONTACTED: "bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-800",
  QUALIFIED: "bg-purple-500/10 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-800",
  PLACED: "bg-green-500/10 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-800",
  REJECTED: "bg-red-500/10 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-800",
};

const STATUS_ICONS: Record<ApplicationStatus, React.ReactNode> = {
  NEW: <Sparkles className="w-4 h-4" />,
  CONTACTED: <MessageSquare className="w-4 h-4" />,
  QUALIFIED: <UserCheck className="w-4 h-4" />,
  PLACED: <Trophy className="w-4 h-4" />,
  REJECTED: <XCircle className="w-4 h-4" />,
};

// =============================================================================
// COMPONENT
// =============================================================================

// Helper to translate column labels
const translateColumnLabel = (status: ApplicationStatus, label: string): string => {
  const map: Record<ApplicationStatus, string> = {
    NEW: "Nouveau",
    CONTACTED: "Contacté",
    QUALIFIED: "Qualifié",
    PLACED: "Recruté",
    REJECTED: "Refusé",
  };
  return map[status] || label;
};

export function PipelineBoard({ jobId, canEdit, canUseShortlists = true, isDemo = false }: PipelineBoardProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<ApplicationCardData | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Fetch pipeline data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/jobs/${jobId}/applications`);
        
        if (!response.ok) {
          throw new Error("Impossible de charger le pipeline");
        }

        const data: PipelineData = await response.json();
        setColumns(data.columns);
        setJobTitle(data.job?.title || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Échec du chargement");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [jobId]);

  // Selection handlers
  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleShortlistSuccess = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
    setShowCreateModal(false);
  };

  // Handle drag start
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const cardId = active.id as string;

    // Find the card being dragged
    for (const column of columns) {
      const card = column.applications.find((app) => app.id === cardId);
      if (card) {
        setActiveCard(card);
        break;
      }
    }
  }

  // Handle drag end
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !canEdit) return;

    const cardId = active.id as string;
    const targetStatus = over.id as ApplicationStatus;

    // Find current card and its column
    let sourceColumn: Column | null = null;
    let card: ApplicationCardData | null = null;

    for (const column of columns) {
      const found = column.applications.find((app) => app.id === cardId);
      if (found) {
        sourceColumn = column;
        card = found;
        break;
      }
    }

    if (!card || !sourceColumn || sourceColumn.status === targetStatus) {
      return;
    }

    // Optimistic update
    const previousColumns = [...columns];
    setColumns((prev) =>
      prev.map((col) => {
        if (col.status === sourceColumn!.status) {
          return {
            ...col,
            applications: col.applications.filter((app) => app.id !== cardId),
          };
        }
        if (col.status === targetStatus) {
          return {
            ...col,
            applications: [{ ...card!, status: targetStatus }, ...col.applications],
          };
        }
        return col;
      })
    );

    // Update on server
    setUpdating(cardId);
    try {
      const response = await fetch(`/api/applications/${cardId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!response.ok) {
        throw new Error("Impossible de mettre à jour le statut");
      }
    } catch {
      // Rollback on error
      setColumns(previousColumns);
      setError("Impossible de mettre à jour le statut. Veuillez réessayer.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement du pipeline...</div>
      </div>
    );
  }

  if (error && columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection Toolbar */}
      {canEdit && (
        <Card className="p-4 sticky top-20 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectionMode ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-primary">
                    {selectedIds.size} sélectionné(s)
                  </span>
                  <span className="text-muted-foreground">
                    Sélectionnez des candidats pour créer une shortlist
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Glissez les candidats pour changer leur statut ou sélectionnez-les pour créer une shortlist
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                    disabled={selectedIds.size === 0}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Créer une shortlist ({selectedIds.size})
                  </Button>
                </>
              ) : canUseShortlists ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                >
                  Sélectionner pour shortlist
                </Button>
              ) : (
                <Button asChild variant="secondary" size="sm">
                  <Link href="/dashboard/billing">
                    Passer Pro pour les shortlists
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4 min-h-[calc(100vh-300px)]">
          {columns.map((column) => (
            <PipelineColumn
              key={column.status}
              >
                Sélectionner pour shortlist
              </Button>
            ) : (
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard/billing">
                  Passer Pro pour les shortlists
                </Link>
              </Button>
            )}
          </div>
        </div>
      </Card>
    )}

    {/* Error toast */}
    {error && (
      <div className="fixed bottom-4 right-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    )}

    {/* Board */}
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4 min-h-[calc(100vh-300px)]">
        {columns.map((column) => (
          <PipelineColumn
            key={column.status}
            status={column.status}
            label={translateColumnLabel(column.status, column.label)}
            color={STATUS_COLORS[column.status]}
            count={column.applications.length}
            icon={STATUS_ICONS[column.status]}
          >
            <SortableContext
              items={column.applications.map((app) => app.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 min-h-[150px]">
                {column.applications.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    data={app}
                    isUpdating={updating === app.id}
                    isDraggable={canEdit}
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(app.id)}
                    onSelectToggle={handleSelectToggle}
                  />
                ))}
                {column.applications.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-muted/50 rounded-xl bg-muted/10 text-muted-foreground transition-colors hover:bg-muted/20 hover:border-muted">
                    <div className="bg-background p-3 rounded-full mb-3 shadow-sm">
                      {STATUS_ICONS[column.status]}
                    </div>
                    <p className="text-sm font-medium">Vide</p>
                    <p className="text-xs opacity-70 text-center mt-1">
                      {column.status === "NEW" 
                        ? "En attente de candidats" 
                        : "Glissez des candidats ici"}
                    </p>
                  </div>
                )}
              </div>
            </SortableContext>
          </PipelineColumn>
        ))}
      </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeCard && (
            <ApplicationCard
              data={activeCard}
              isUpdating={false}
              isDraggable={false}
              isOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Create Shortlist Modal */}
      <CreateShortlistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        jobId={jobId}
        jobTitle={jobTitle}
        selectedApplicationIds={Array.from(selectedIds)}
        isDemo={isDemo}
        onSuccess={handleShortlistSuccess}
      />
    </div>
  );
}
