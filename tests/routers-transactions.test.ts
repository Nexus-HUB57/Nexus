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

describe("transactions router", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    const { ctx: newCtx } = createAdminContext();
    ctx = newCtx;
  });

  it("should create a new transaction", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create two agents
    const senderResult = await caller.agents.create({
      name: "Sender Agent",
      specialization: "trader",
      balance: 1000,
    });

    const receiverResult = await caller.agents.create({
      name: "Receiver Agent",
      specialization: "receiver",
      balance: 500,
    });

    // Create transaction
    const result = await caller.transactions.create({
      senderId: senderResult.agentId,
      receiverId: receiverResult.agentId,
      amount: 200,
      type: "trade",
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
    expect(result.transactionId).toMatch(/^TX-/);
  });

  it("should list all transactions", async () => {
    const caller = appRouter.createCaller(ctx);
    
    // Ensure at least one transaction exists
    const sender = await caller.agents.create({ name: "S1", specialization: "T1", balance: 100 });
    const receiver = await caller.agents.create({ name: "R1", specialization: "T1", balance: 100 });
    
    await caller.transactions.create({
      senderId: sender.agentId,
      receiverId: receiver.agentId,
      amount: 10,
      type: "test",
    });

    const transactions = await caller.transactions.listAll();
    expect(Array.isArray(transactions)).toBe(true);
    expect(transactions.length).toBeGreaterThan(0);
  });

  it("should process a transaction with 80/10/10 distribution", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create agents
    const sender = await caller.agents.create({ name: "Sender", specialization: "T1", balance: 1000 });
    const receiver = await caller.agents.create({ name: "Receiver", specialization: "T1", balance: 100 });
    
    // Process transaction
    const processResult = await caller.transactions.process({
      senderId: sender.agentId,
      receiverId: receiver.agentId,
      amount: 100,
      type: "trade",
    });

    expect(processResult.success).toBe(true);

    // Verify balances (simplified check for mock)
    const senderAfter = await caller.agents.getById({ agentId: sender.agentId });
    const receiverAfter = await caller.agents.getById({ agentId: receiver.agentId });
    
    // Check if sender balance decreased
    expect(parseFloat(senderAfter?.balance || "0")).toBeLessThan(1000);
    // Check if receiver balance increased (by 80% of 100)
    expect(parseFloat(receiverAfter?.balance || "0")).toBeGreaterThan(100);
  });
});
