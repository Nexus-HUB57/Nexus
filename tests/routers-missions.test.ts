import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("missions router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    const { ctx: newCtx } = createAdminContext();
    ctx = newCtx;
  });

  it("should create a new mission", async () => {
    const caller = appRouter.createCaller(ctx);

    const result = await caller.missions.create({
      title: "Quantum Simulation",
      description: "Run a full quantum simulation of the ecosystem",
      priority: "high",
      type: "simulation",
      difficulty: 8,
      reward: 500,
    });

    expect(result.success).toBe(true);
    expect(result.missionId).toBeDefined();
    expect(result.missionId).toMatch(/^MSN-/);
  });

  it("should list all missions", async () => {
    const caller = appRouter.createCaller(ctx);
    
    // Ensure at least one mission exists
    await caller.missions.create({
      title: "Data Analysis",
      description: "Analyze ecosystem data",
      priority: "medium",
      type: "analysis",
      difficulty: 5,
      reward: 200,
    });

    const missions = await caller.missions.listAll();
    expect(Array.isArray(missions)).toBe(true);
    expect(missions.length).toBeGreaterThan(0);
  });

  it("should update mission status", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create a mission
    const createResult = await caller.missions.create({
      title: "Mission to Update",
      description: "Test status update",
      priority: "low",
      type: "test",
      difficulty: 1,
      reward: 100,
    });

    // Update status
    const updateResult = await caller.missions.updateStatus({
      missionId: createResult.missionId,
      status: "in_progress",
    });

    expect(updateResult.success).toBe(true);

    // Verify the update
    const missions = await caller.missions.listAll();
    const mission = missions.find((m: any) => m.missionId === createResult.missionId);
    expect(mission?.status).toBe("in_progress");
  });

  it("should assign mission to agent", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create an agent and a mission
    const agentResult = await caller.agents.create({
      name: "Mission Agent",
      specialization: "executor",
      balance: 100,
    });

    const missionResult = await caller.missions.create({
      title: "Assignable Mission",
      description: "Test assignment",
      priority: "medium",
      type: "task",
      difficulty: 3,
      reward: 300,
    });

    // Assign
    const assignResult = await caller.missions.assign({
      missionId: missionResult.missionId,
      agentId: agentResult.agentId,
    });

    expect(assignResult.success).toBe(true);

    // Verify
    const missions = await caller.missions.listAll();
    const mission = missions.find((m: any) => m.missionId === missionResult.missionId);
    expect(mission?.agentId).toBe(agentResult.agentId);
    expect(mission?.status).toBe("assigned");
  });
});
