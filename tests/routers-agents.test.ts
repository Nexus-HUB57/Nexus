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

describe("agents router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    const { ctx: newCtx } = createAdminContext();
    ctx = newCtx;
  });

  it("should list all agents", async () => {
    const caller = appRouter.createCaller(ctx);
    const agents = await caller.agents.listAll();

    expect(Array.isArray(agents)).toBe(true);
  });

  it("should create a new agent", async () => {
    const caller = appRouter.createCaller(ctx);

    const result = await caller.agents.create({
      name: "Test Agent",
      specialization: "developer",
      balance: 1000,
    });

    expect(result.success).toBe(true);
    expect(result.agentId).toBeDefined();
    expect(result.agentId).toMatch(/^NEXUS-/);
  });

  it("should get agent by ID", async () => {
    const caller = appRouter.createCaller(ctx);

    // First create an agent
    const createResult = await caller.agents.create({
      name: "Test Agent 2",
      specialization: "analyst",
      balance: 500,
    });

    // Then fetch it
    const agent = await caller.agents.getById({ agentId: createResult.agentId });

    expect(agent).toBeDefined();
    expect(agent?.name).toBe("Test Agent 2");
    expect(agent?.specialization).toBe("analyst");
  });

  it("should update agent status", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create an agent
    const createResult = await caller.agents.create({
      name: "Test Agent 3",
      specialization: "trader",
      balance: 2000,
    });

    // Update status
    const updateResult = await caller.agents.updateStatus({
      agentId: createResult.agentId,
      status: "active",
    });

    expect(updateResult.success).toBe(true);

    // Verify the update
    const agent = await caller.agents.getById({ agentId: createResult.agentId });
    expect(agent?.status).toBe("active");
  });

  it("should update agent senciencia level", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create an agent
    const createResult = await caller.agents.create({
      name: "Test Agent 4",
      specialization: "architect",
      balance: 1500,
    });

    // Update senciencia
    const updateResult = await caller.agents.updateSenciencia({
      agentId: createResult.agentId,
      level: 250,
    });

    expect(updateResult.success).toBe(true);

    // Verify the update
    const agent = await caller.agents.getById({ agentId: createResult.agentId });
    expect(parseFloat(agent?.sencienciaLevel || "0")).toBe(250);
  });

  it("should filter agents by status", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create agents with different statuses
    const agent1 = await caller.agents.create({
      name: "Active Agent",
      specialization: "developer",
      balance: 1000,
    });

    await caller.agents.updateStatus({
      agentId: agent1.agentId,
      status: "active",
    });

    // Get agents by status
    const activeAgents = await caller.agents.getByStatus({ status: "active" });

    expect(Array.isArray(activeAgents)).toBe(true);
    expect(activeAgents.length).toBeGreaterThan(0);
    expect(activeAgents.some((a: any) => a.agentId === agent1.agentId)).toBe(true);
  });
});
