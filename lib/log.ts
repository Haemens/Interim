import { db } from "@/lib/db";

type LogLevel = "INFO" | "WARN" | "ERROR";

interface LogMeta {
  [key: string]: unknown;
}

const PREFIX = "[QuestHire]";

function formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? " " + JSON.stringify(meta) : "";
  return PREFIX + " " + level + " [" + timestamp + "] " + message + metaStr;
}

export function logInfo(message: string, meta?: LogMeta): void {
  console.log(formatMessage("INFO", message, meta));
}

export function logWarn(message: string, meta?: LogMeta): void {
  console.warn(formatMessage("WARN", message, meta));
}

export function logError(message: string, meta?: LogMeta): void {
  console.error(formatMessage("ERROR", message, meta));
}

export type EventType =
  | "JOB_CREATED"
  | "JOB_PUBLISHED"
  | "JOB_UPDATED"
  | "JOB_ARCHIVED"
  | "APPLICATION_CREATED"
  | "APPLICATION_STATUS_CHANGED"
  | "SHORTLIST_CREATED"
  | "TEAM_MEMBER_INVITED"
  | "TEAM_MEMBER_REMOVED"
  | "TEAM_ROLE_CHANGED"
  | "GDPR_DATA_EXPORT"
  | "GDPR_DATA_ANONYMIZED"
  | "PLAN_LIMIT_REACHED";

interface EventLogParams {
  type: EventType;
  agencyId?: string;
  userId?: string;
  jobId?: string;
  payload?: Record<string, unknown>;
}

export async function logEvent(params: EventLogParams): Promise<void> {
  try {
    await db.eventLog.create({
      data: {
        type: params.type,
        agencyId: params.agencyId,
        userId: params.userId,
        jobId: params.jobId,
        payload: params.payload as object | undefined,
      },
    });
    logInfo("Event logged: " + params.type, { agencyId: params.agencyId });
  } catch (error) {
    logError("Failed to log event: " + params.type, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export function createEventLogger(agencyId: string, userId?: string) {
  return {
    log: (type: EventType, payload?: Record<string, unknown>, jobId?: string) =>
      logEvent({ type, agencyId, userId, jobId, payload }),
  };
}
