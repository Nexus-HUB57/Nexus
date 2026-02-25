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

describe("genealogy router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    const { ctx: newCtx } = createAdminContext();
    ctx = newCtx;
  });

  it("should capture cognitive snapshot", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create an agent first
    const agentResult = await caller.agents.create({
      name: "Snapshot Test Agent",
      specialization: "analyst",
      balance: 500,
    });

    // Capture snapshot
    const result = await caller.genealogy.captureSnapshot({
      agentId: agentResult.agentId,
    });

    expect(result.success).toBe(true);
    expect(result.snapshot).toBeDefined();
    expect(result.snapshot?.snapshotId).toMatch(/^SNAP-/);
  });

  it("should get cognitive snapshots", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create agent and capture snapshots
    const agentResult = await caller.agents.create({
      name: "Snapshot History Agent",
      specialization: "developer",
      balance: 1000,
    });

    await caller.genealogy.captureSnapshot({ agentId: agentResult.agentId });
    await caller.genealogy.captureSnapshot({ agentId: agentResult.agentId });

    // Get snapshots
    const snapshots = await caller.genealogy.getSnapshots({
      agentId: agentResult.agentId,
      limit: 10,
    });

    expect(Array.isArray(snapshots)).toBe(true);
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
  });

  it("should reproduce two agents", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create two parent agents
    const parentA = await caller.agents.create({
      name: "Parent A",
      specialization: "developer",
      balance: 1000,
    });

    const parentB = await caller.agents.create({
      name: "Parent B",
      specialization: "analyst",
      balance: 1000,
    });

    // Reproduce
    const result = await caller.genealogy.reproduce({
      parentAId: parentA.agentId,
      parentBId: parentB.agentId,
      offspringName: "Offspring Agent",
    });

    expect(result.success).toBe(true);
    expect(result.offspring).toBeDefined();
    expect(result.offspring?.agentId).toMatch(/^NEXUS-/);
    expect(result.offspring?.generation).toBe(1);
  });

  it("should get genealogy tree", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create an agent
    const agentResult = await caller.agents.create({
      name: "Tree Test Agent",
      specialization: "executor",
      balance: 500,
    });

    // Get genealogy tree
    const tree = await caller.genealogy.getGenealogyTree({
      agentId: agentResult.agentId,
      depth: 3,
    });

    expect(tree).toBeDefined();
    expect(tree?.agentId).toBe(agentResult.agentId);
    expect(tree?.generation).toBeDefined();
  });

  it("should get lineage stats", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create an agent
    const agentResult = await caller.agents.create({
      name: "Stats Test Agent",
      specialization: "researcher",
      balance: 1000,
    });

    // Get lineage stats
    const stats = await caller.genealogy.getLineageStats({
      agentId: agentResult.agentId,
    });

    expect(stats).toBeDefined();
    expect(stats.agentId).toBe(agentResult.agentId);
    expect(stats.totalMutations).toBeDefined();
  });

  it("should get DNA evolution history", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create an agent
    const agentResult = await caller.agents.create({
      name: "DNA History Agent",
      specialization: "developer",
      balance: 1000,
    });

    // Get DNA evolution history
    const history = await caller.genealogy.getDNAEvolutionHistory({
      agentId: agentResult.agentId,
      limit: 20,
    });

    expect(Array.isArray(history)).toBe(true);
  });

  it("should get offspring", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create parent and offspring
    const parent = await caller.agents.create({
      name: "Parent Agent",
      specialization: "leader",
      balance: 1000,
    });

    const child = await caller.agents.create({
      name: "Child Agent",
      specialization: "leader",
      balance: 500,
    });

    // Get offspring
    const offspring = await caller.genealogy.getOffspring({
      agentId: parent.agentId,
    });

    expect(Array.isArray(offspring)).toBe(true);
  });

  it("should compare DNA of two agents", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create two agents
    const agentA = await caller.agents.create({
      name: "DNA Compare A",
      specialization: "analyst",
      balance: 500,
    });

    const agentB = await caller.agents.create({
      name: "DNA Compare B",
      specialization: "analyst",
      balance: 500,
    });

    // Compare DNA
    const result = await caller.genealogy.compareDNA({
      agentAId: agentA.agentId,
      agentBId: agentB.agentId,
    });

    expect(result.success).toBe(true);
    expect(result.comparison).toBeDefined();
    expect(result.comparison?.similarity).toBeDefined();
  });

  it("should get ecosystem genealogy stats", async () => {
    const caller = appRouter.createCaller(ctx);

    // Get ecosystem genealogy
    const stats = await caller.genealogy.getEcosystemGenealogy();

    expect(stats).toBeDefined();
    expect(stats.totalAgents).toBeDefined();
    expect(stats.maxGeneration).toBeDefined();
  });
});
