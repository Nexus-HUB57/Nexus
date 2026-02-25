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

describe("mission AI router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    const { ctx: newCtx } = createAdminContext();
    ctx = newCtx;
  });

  it("should generate proactive missions", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create some agents first
    await caller.agents.create({ name: "Agent 1", specialization: "developer", balance: 500 });
    await caller.agents.create({ name: "Agent 2", specialization: "analyst", balance: 500 });

    // Generate missions
    const result = await caller.missionAI.generateProactiveMissions();

    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.missions)).toBe(true);
  });

  it("should assign missions automatically", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create agents and missions
    const agent = await caller.agents.create({
      name: "Executor Agent",
      specialization: "developer",
      balance: 1000,
    });

    await caller.missions.create({
      title: "Auto Assign Test",
      description: "Test mission for auto assignment",
      priority: "medium",
      type: "test",
      difficulty: 3,
      reward: 200,
    });

    // Assign missions
    const result = await caller.missionAI.assignMissionsAutomatically();

    expect(result.success).toBe(true);
    expect(result.assignmentCount).toBeGreaterThanOrEqual(0);
  });

  it("should get open missions", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create a mission
    await caller.missions.create({
      title: "Open Mission Test",
      description: "Test open mission",
      priority: "high",
      type: "test",
      difficulty: 4,
      reward: 300,
    });

    // Get open missions
    const missions = await caller.missionAI.getOpenMissions();

    expect(Array.isArray(missions)).toBe(true);
    expect(missions.length).toBeGreaterThan(0);
  });

  it("should get assigned missions", async () => {
    const caller = appRouter.createCaller(ctx);

    // Get assigned missions
    const missions = await caller.missionAI.getAssignedMissions();

    expect(Array.isArray(missions)).toBe(true);
  });

  it("should get mission stats", async () => {
    const caller = appRouter.createCaller(ctx);

    // Get stats
    const stats = await caller.missionAI.getMissionStats();

    expect(stats).toBeDefined();
    expect(stats.open).toBeDefined();
    expect(stats.assigned).toBeDefined();
    expect(stats.completed).toBeDefined();
  });

  it("should suggest mission for agent", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create agent
    const agent = await caller.agents.create({
      name: "Suggestion Test Agent",
      specialization: "developer",
      balance: 1000,
    });

    // Create mission
    await caller.missions.create({
      title: "Suggestion Test Mission",
      description: "Test mission for suggestion",
      priority: "medium",
      type: "test",
      difficulty: 3,
      reward: 250,
    });

    // Get suggestion
    const result = await caller.missionAI.suggestMissionForAgent({
      agentId: agent.agentId,
    });

    expect(result.success).toBe(true);
  });

  it("should get agent mission performance", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create agent
    const agent = await caller.agents.create({
      name: "Performance Test Agent",
      specialization: "analyst",
      balance: 500,
    });

    // Get performance
    const performance = await caller.missionAI.getAgentMissionPerformance({
      agentId: agent.agentId,
    });

    expect(performance).toBeDefined();
    expect(performance.agentId).toBe(agent.agentId);
    expect(performance.totalMissions).toBeDefined();
  });
});
