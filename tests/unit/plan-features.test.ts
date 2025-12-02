import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PLAN_FEATURES,
  DEFAULT_PLAN,
  PlanLimitError,
  JobLimitError,
  getPlanDisplayName,
} from "@/modules/billing/plan-features";

// Mock the db module
vi.mock("@/lib/db", () => ({
  db: {
    subscription: {
      findFirst: vi.fn(),
    },
    job: {
      count: vi.fn(),
    },
  },
}));

describe("Plan Features", () => {
  describe("PLAN_FEATURES configuration", () => {
    it("should have STARTER plan with limited jobs", () => {
      expect(PLAN_FEATURES.STARTER).toEqual({
        maxActiveJobs: 10,
        maxChannels: 3,
        canUseShortlists: false,
        canSeeAnalytics: true,
        canManageTeam: true,
        canUseSocialContent: true,
        canUseAiGeneration: false,
        canAutoPublish: false,
        canUseClientCRM: false,
      });
    });

    it("should have PRO plan with unlimited jobs", () => {
      expect(PLAN_FEATURES.PRO).toEqual({
        maxActiveJobs: null,
        maxChannels: null,
        canUseShortlists: true,
        canSeeAnalytics: true,
        canManageTeam: true,
        canUseSocialContent: true,
        canUseAiGeneration: true,
        canAutoPublish: true,
        canUseClientCRM: true,
      });
    });

    it("should have AGENCY_PLUS plan with all features", () => {
      expect(PLAN_FEATURES.AGENCY_PLUS).toEqual({
        maxActiveJobs: null,
        maxChannels: null,
        canUseShortlists: true,
        canSeeAnalytics: true,
        canManageTeam: true,
        canUseSocialContent: true,
        canUseAiGeneration: true,
        canAutoPublish: true,
        canUseClientCRM: true,
      });
    });

    it("should have STARTER as default plan", () => {
      expect(DEFAULT_PLAN).toBe("STARTER");
    });
  });

  describe("PlanLimitError", () => {
    it("should create error with correct properties", () => {
      const error = new PlanLimitError("shortlists", "STARTER", "PRO");

      expect(error.name).toBe("PlanLimitError");
      expect(error.feature).toBe("shortlists");
      expect(error.currentPlan).toBe("STARTER");
      expect(error.requiredPlan).toBe("PRO");
      expect(error.message).toContain("shortlists");
      expect(error.message).toContain("STARTER");
    });

    it("should work without required plan", () => {
      const error = new PlanLimitError("analytics", "STARTER");

      expect(error.requiredPlan).toBeUndefined();
    });
  });

  describe("JobLimitError", () => {
    it("should create error with correct properties", () => {
      const error = new JobLimitError(10, 10, "STARTER");

      expect(error.name).toBe("JobLimitError");
      expect(error.currentCount).toBe(10);
      expect(error.maxAllowed).toBe(10);
      expect(error.currentPlan).toBe("STARTER");
      expect(error.message).toContain("10");
      expect(error.message).toContain("STARTER");
    });
  });

  describe("getPlanDisplayName", () => {
    it("should return correct display names", () => {
      expect(getPlanDisplayName("STARTER")).toBe("Starter");
      expect(getPlanDisplayName("PRO")).toBe("Pro");
      expect(getPlanDisplayName("AGENCY_PLUS")).toBe("Agency Plus");
    });
  });

  describe("Feature access by plan", () => {
    it("STARTER should not have shortlists", () => {
      expect(PLAN_FEATURES.STARTER.canUseShortlists).toBe(false);
    });

    it("PRO should have shortlists", () => {
      expect(PLAN_FEATURES.PRO.canUseShortlists).toBe(true);
    });

    it("AGENCY_PLUS should have shortlists", () => {
      expect(PLAN_FEATURES.AGENCY_PLUS.canUseShortlists).toBe(true);
    });

    it("all plans should have analytics", () => {
      expect(PLAN_FEATURES.STARTER.canSeeAnalytics).toBe(true);
      expect(PLAN_FEATURES.PRO.canSeeAnalytics).toBe(true);
      expect(PLAN_FEATURES.AGENCY_PLUS.canSeeAnalytics).toBe(true);
    });

    it("all plans should have team management", () => {
      expect(PLAN_FEATURES.STARTER.canManageTeam).toBe(true);
      expect(PLAN_FEATURES.PRO.canManageTeam).toBe(true);
      expect(PLAN_FEATURES.AGENCY_PLUS.canManageTeam).toBe(true);
    });
  });

  describe("Job limits by plan", () => {
    it("STARTER should have 10 job limit", () => {
      expect(PLAN_FEATURES.STARTER.maxActiveJobs).toBe(10);
    });

    it("PRO should have unlimited jobs", () => {
      expect(PLAN_FEATURES.PRO.maxActiveJobs).toBeNull();
    });

    it("AGENCY_PLUS should have unlimited jobs", () => {
      expect(PLAN_FEATURES.AGENCY_PLUS.maxActiveJobs).toBeNull();
    });
  });
});
