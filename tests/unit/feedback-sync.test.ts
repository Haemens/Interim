import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapDecisionToStatus,
  isStatusTransitionAllowed,
  getBlockedTransitionReason,
  isFeedbackSyncEnabled,
} from "@/modules/shortlist/feedback-sync";

// =============================================================================
// UNIT TESTS FOR MAPPING FUNCTIONS
// =============================================================================

describe("Feedback Sync - Status Mapping", () => {
  describe("mapDecisionToStatus", () => {
    it("should map APPROVED to QUALIFIED", () => {
      expect(mapDecisionToStatus("APPROVED")).toBe("QUALIFIED");
    });

    it("should map REJECTED to REJECTED", () => {
      expect(mapDecisionToStatus("REJECTED")).toBe("REJECTED");
    });

    it("should return null for PENDING", () => {
      expect(mapDecisionToStatus("PENDING")).toBeNull();
    });
  });

  describe("isStatusTransitionAllowed", () => {
    // From NEW status
    describe("from NEW status", () => {
      it("should allow NEW → QUALIFIED (APPROVED)", () => {
        expect(isStatusTransitionAllowed("NEW", "QUALIFIED")).toBe(true);
      });

      it("should allow NEW → REJECTED", () => {
        expect(isStatusTransitionAllowed("NEW", "REJECTED")).toBe(true);
      });

      it("should allow NEW → CONTACTED", () => {
        expect(isStatusTransitionAllowed("NEW", "CONTACTED")).toBe(true);
      });

      it("should allow NEW → PLACED", () => {
        expect(isStatusTransitionAllowed("NEW", "PLACED")).toBe(true);
      });
    });

    // From CONTACTED status
    describe("from CONTACTED status", () => {
      it("should allow CONTACTED → QUALIFIED", () => {
        expect(isStatusTransitionAllowed("CONTACTED", "QUALIFIED")).toBe(true);
      });

      it("should allow CONTACTED → REJECTED", () => {
        expect(isStatusTransitionAllowed("CONTACTED", "REJECTED")).toBe(true);
      });

      it("should NOT allow CONTACTED → NEW (regression)", () => {
        expect(isStatusTransitionAllowed("CONTACTED", "NEW")).toBe(false);
      });
    });

    // From QUALIFIED status
    describe("from QUALIFIED status", () => {
      it("should allow QUALIFIED → PLACED", () => {
        expect(isStatusTransitionAllowed("QUALIFIED", "PLACED")).toBe(true);
      });

      it("should allow QUALIFIED → REJECTED", () => {
        expect(isStatusTransitionAllowed("QUALIFIED", "REJECTED")).toBe(true);
      });

      it("should NOT allow QUALIFIED → NEW (regression)", () => {
        expect(isStatusTransitionAllowed("QUALIFIED", "NEW")).toBe(false);
      });

      it("should NOT allow QUALIFIED → CONTACTED (regression)", () => {
        expect(isStatusTransitionAllowed("QUALIFIED", "CONTACTED")).toBe(false);
      });
    });

    // From terminal states
    describe("from terminal states", () => {
      it("should NOT allow any change from PLACED", () => {
        expect(isStatusTransitionAllowed("PLACED", "NEW")).toBe(false);
        expect(isStatusTransitionAllowed("PLACED", "CONTACTED")).toBe(false);
        expect(isStatusTransitionAllowed("PLACED", "QUALIFIED")).toBe(false);
        expect(isStatusTransitionAllowed("PLACED", "REJECTED")).toBe(false);
      });

      it("should NOT allow any change from REJECTED", () => {
        expect(isStatusTransitionAllowed("REJECTED", "NEW")).toBe(false);
        expect(isStatusTransitionAllowed("REJECTED", "CONTACTED")).toBe(false);
        expect(isStatusTransitionAllowed("REJECTED", "QUALIFIED")).toBe(false);
        expect(isStatusTransitionAllowed("REJECTED", "PLACED")).toBe(false);
      });
    });
  });

  describe("getBlockedTransitionReason", () => {
    it("should explain PLACED is terminal", () => {
      const reason = getBlockedTransitionReason("PLACED", "REJECTED");
      expect(reason).toContain("placed");
    });

    it("should explain REJECTED is terminal", () => {
      const reason = getBlockedTransitionReason("REJECTED", "QUALIFIED");
      expect(reason).toContain("rejected");
    });

    it("should explain regression is not allowed", () => {
      const reason = getBlockedTransitionReason("QUALIFIED", "NEW");
      expect(reason).toContain("regress");
    });
  });
});

// =============================================================================
// INTEGRATION-STYLE TESTS (with mocked DB)
// =============================================================================

// Mock the db module
vi.mock("@/lib/db", () => ({
  db: {
    application: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    eventLog: {
      create: vi.fn(),
    },
  },
}));

// Mock the env module
vi.mock("@/lib/env", () => ({
  FEATURES: {
    feedbackSync: true, // Default to enabled for tests
  },
}));

// Import after mocking
import { syncApplicationStatusFromFeedback } from "@/modules/shortlist/feedback-sync";
import { db } from "@/lib/db";
import { FEATURES } from "@/lib/env";

describe("Feedback Sync - syncApplicationStatusFromFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseSyncContext = {
    feedbackId: "feedback-123",
    applicationId: "app-123",
    shortlistId: "shortlist-123",
    shortlistName: "Test Shortlist",
    agencyId: "agency-123",
    decision: "APPROVED" as const,
    isDemo: false,
  };

  describe("when feature flag is enabled", () => {
    beforeEach(() => {
      // @ts-expect-error - mocking
      FEATURES.feedbackSync = true;
    });

    it("should sync APPROVED → QUALIFIED for NEW application", async () => {
      // Mock application lookup
      vi.mocked(db.application.findUnique)
        .mockResolvedValueOnce({
          id: "app-123",
          status: "NEW",
          agencyId: "agency-123",
        } as never)
        .mockResolvedValueOnce({
          id: "app-123",
          note: null,
        } as never);

      vi.mocked(db.application.update).mockResolvedValue({} as never);
      vi.mocked(db.eventLog.create).mockResolvedValue({} as never);

      const result = await syncApplicationStatusFromFeedback(baseSyncContext);

      expect(result.synced).toBe(true);
      expect(result.previousStatus).toBe("NEW");
      expect(result.newStatus).toBe("QUALIFIED");

      // Verify application was updated
      expect(db.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "app-123" },
          data: expect.objectContaining({
            status: "QUALIFIED",
          }),
        })
      );

      // Verify event was logged
      expect(db.eventLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "APPLICATION_STATUS_SYNCED_FROM_FEEDBACK",
          }),
        })
      );
    });

    it("should sync REJECTED → REJECTED for NEW application", async () => {
      vi.mocked(db.application.findUnique)
        .mockResolvedValueOnce({
          id: "app-123",
          status: "NEW",
          agencyId: "agency-123",
        } as never)
        .mockResolvedValueOnce({
          id: "app-123",
          note: null,
        } as never);

      vi.mocked(db.application.update).mockResolvedValue({} as never);
      vi.mocked(db.eventLog.create).mockResolvedValue({} as never);

      const result = await syncApplicationStatusFromFeedback({
        ...baseSyncContext,
        decision: "REJECTED",
      });

      expect(result.synced).toBe(true);
      expect(result.previousStatus).toBe("NEW");
      expect(result.newStatus).toBe("REJECTED");
    });

    it("should NOT change status for already PLACED application", async () => {
      vi.mocked(db.application.findUnique).mockResolvedValueOnce({
        id: "app-123",
        status: "PLACED",
        agencyId: "agency-123",
      } as never);

      const result = await syncApplicationStatusFromFeedback(baseSyncContext);

      expect(result.synced).toBe(false);
      expect(result.previousStatus).toBe("PLACED");
      expect(result.reason).toContain("placed");

      // Verify application was NOT updated
      expect(db.application.update).not.toHaveBeenCalled();
    });

    it("should NOT change status for already REJECTED application", async () => {
      vi.mocked(db.application.findUnique).mockResolvedValueOnce({
        id: "app-123",
        status: "REJECTED",
        agencyId: "agency-123",
      } as never);

      const result = await syncApplicationStatusFromFeedback({
        ...baseSyncContext,
        decision: "APPROVED",
      });

      expect(result.synced).toBe(false);
      expect(result.previousStatus).toBe("REJECTED");

      // Verify application was NOT updated
      expect(db.application.update).not.toHaveBeenCalled();
    });

    it("should enforce tenant isolation", async () => {
      vi.mocked(db.application.findUnique).mockResolvedValueOnce({
        id: "app-123",
        status: "NEW",
        agencyId: "different-agency", // Different agency!
      } as never);

      const result = await syncApplicationStatusFromFeedback(baseSyncContext);

      expect(result.synced).toBe(false);
      expect(result.reason).toContain("tenant isolation");

      // Verify application was NOT updated
      expect(db.application.update).not.toHaveBeenCalled();
    });
  });

  describe("when feature flag is disabled", () => {
    beforeEach(() => {
      // @ts-expect-error - mocking
      FEATURES.feedbackSync = false;
    });

    it("should NOT sync and return appropriate reason", async () => {
      const result = await syncApplicationStatusFromFeedback(baseSyncContext);

      expect(result.synced).toBe(false);
      expect(result.reason).toContain("disabled");

      // Verify no DB calls were made
      expect(db.application.findUnique).not.toHaveBeenCalled();
      expect(db.application.update).not.toHaveBeenCalled();
    });
  });

  describe("demo mode behavior", () => {
    beforeEach(() => {
      // @ts-expect-error - mocking
      FEATURES.feedbackSync = true;
    });

    it("should NOT persist changes in demo mode", async () => {
      vi.mocked(db.application.findUnique).mockResolvedValueOnce({
        id: "app-123",
        status: "NEW",
        agencyId: "agency-123",
      } as never);

      const result = await syncApplicationStatusFromFeedback({
        ...baseSyncContext,
        isDemo: true,
      });

      expect(result.synced).toBe(false);
      expect(result.previousStatus).toBe("NEW");
      expect(result.newStatus).toBe("QUALIFIED");
      expect(result.reason).toContain("Demo mode");

      // Verify application was NOT updated
      expect(db.application.update).not.toHaveBeenCalled();
      expect(db.eventLog.create).not.toHaveBeenCalled();
    });
  });
});
