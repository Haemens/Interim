import { db } from "@/lib/db";
import { ActivityTargetType, ActivityAction, Prisma } from "@prisma/client";
import { logInfo, logError } from "@/lib/log";

export { ActivityTargetType, ActivityAction };

interface LogActivityParams {
  agencyId: string;
  actorUserId?: string | null;
  targetType: ActivityTargetType;
  targetId: string;
  action: ActivityAction;
  summary: string;
  metadata?: Record<string, any>;
}

export async function logActivityEvent(params: LogActivityParams) {
  try {
    await db.activityEvent.create({
      data: {
        agencyId: params.agencyId,
        actorUserId: params.actorUserId,
        targetType: params.targetType,
        targetId: params.targetId,
        action: params.action,
        summary: params.summary,
        metadata: params.metadata ? (params.metadata as any) : Prisma.JsonNull,
      },
    });
    
    // Log to system log as well for debugging
    logInfo(`Activity: ${params.summary}`, { 
      agencyId: params.agencyId, 
      targetType: params.targetType, 
      targetId: params.targetId 
    });

    // If contact type, update candidate profile
    if (params.action === "CONTACT_LOGGED" || params.action === "EMAIL_SENT") {
      if (params.targetType === "CANDIDATE" && params.actorUserId) {
        await db.candidateProfile.update({
          where: { id: params.targetId },
          data: {
            lastContactedAt: new Date(),
            lastContactedById: params.actorUserId
          }
        }).catch(err => logError("Failed to update lastContactedAt", { 
          error: err instanceof Error ? err.message : "Unknown" 
        }));
      }
    }

  } catch (error) {
    logError("Failed to log activity event", {
      error: error instanceof Error ? error.message : "Unknown",
      params
    });
    // Don't throw, as logging failure shouldn't block business logic
  }
}

export async function getRecentActivityForAgency(
  agencyId: string, 
  limit = 50, 
  filters?: { targetType?: ActivityTargetType; userId?: string }
) {
  return db.activityEvent.findMany({
    where: {
      agencyId,
      ...(filters?.targetType ? { targetType: filters.targetType } : {}),
      ...(filters?.userId ? { actorUserId: filters.userId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: {
        select: { id: true, name: true, firstName: true, lastName: true, image: true }
      }
    }
  });
}

export async function getActivityForTarget(
  agencyId: string,
  targetType: ActivityTargetType,
  targetId: string,
  limit = 20
) {
  return db.activityEvent.findMany({
    where: {
      agencyId,
      targetType,
      targetId
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: {
        select: { id: true, name: true, firstName: true, lastName: true, image: true }
      }
    }
  });
}
