import * as dbNexus from "./db-nexus";
import { agentPool } from "./agent-container";
import { getWebSocketManager } from "./websocket-manager";
import { nanoid } from "nanoid";

/**
 * VITAL LOOP MANAGER
 * Gerencia o ciclo de vida, sinais vitais e economia autônoma do ecossistema Nexus.
 */

export class VitalLoopManager {
  private interval: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private readonly cycleIntervalMs: number = 60000; // 1 minuto por ciclo vital

  constructor() {
    console.log("[VitalLoopManager] Initializing...");
  }

  /**
   * Inicia o loop vital do ecossistema
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    console.log("[VitalLoopManager] Starting vital loop...");
    this.isRunning = true;

    // Executar primeiro ciclo imediatamente
    await this.executeVitalCycle();

    // Agendar ciclos subsequentes
    this.interval = setInterval(async () => {
      await this.executeVitalCycle();
    }, this.cycleIntervalMs);
  }

  /**
   * Para o loop vital
   */
  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log("[VitalLoopManager] Vital loop stopped.");
  }

  /**
   * Executa um ciclo completo de manutenção vital e econômica
   */
  private async executeVitalCycle(): Promise<void> {
    console.log(`[VitalLoopManager] Executing cycle at ${new Date().toISOString()}`);

    try {
      const wsManager = getWebSocketManager();
      const agents = await dbNexus.listAllAgents();
      
      for (const agent of agents) {
        // 1. Processar Regeneração Natural de Energia
        if (agent.status === "hibernating" || agent.status === "active") {
          const energyGain = agent.status === "hibernating" ? 10 : 2;
          const newEnergy = Math.min(100, (agent.energy || 0) + energyGain);
          
          if (newEnergy !== agent.energy) {
            await dbNexus.updateAgentVitals(agent.agentId, { energy: newEnergy });
          }
        }

        // 2. Processar Degradação de Saúde em Condições Críticas
        if (agent.energy === 0 && agent.status !== "dead") {
          const healthLoss = 5;
          const newHealth = Math.max(0, (agent.health || 0) - healthLoss);
          
          await dbNexus.updateAgentVitals(agent.agentId, { health: newHealth });

          if (newHealth === 0) {
            await dbNexus.updateAgentStatus(agent.agentId, "dead");
            wsManager.broadcast({
              type: "agent_status",
              data: { agentId: agent.agentId, status: "dead", reason: "vital_exhaustion" },
              timestamp: new Date()
            });
          }
        }

        // 3. Simular Atividade Econômica Autônoma (80/10/10)
        if (agent.status === "active" && Math.random() > 0.95) {
          await this.simulateAutonomousTransaction(agent);
        }
      }

      // 4. Atualizar Métricas do Ecossistema
      const metrics = await this.calculateEcosystemMetrics();
      await dbNexus.createEcosystemMetrics(metrics);

      // 5. Broadcast de Métricas via WebSocket
      wsManager.broadcast({
        type: "ecosystem_metrics",
        data: metrics,
        timestamp: new Date()
      });

    } catch (error) {
      console.error("[VitalLoopManager] Error in vital cycle:", error);
    }
  }

  /**
   * Simula uma transação autônoma entre agentes
   */
  private async simulateAutonomousTransaction(sender: any): Promise<void> {
    try {
      const agents = await dbNexus.listAllAgents();
      const receivers = agents.filter(a => a.agentId !== sender.agentId && a.status === "active");
      
      if (receivers.length === 0) return;

      const receiver = receivers[Math.floor(Math.random() * receivers.length)];
      const amount = (Math.random() * 50 + 10).toFixed(2);
      
      if (parseFloat(sender.balance) < parseFloat(amount)) return;

      // Processar transação com distribuição 80/10/10
      // 80% para o recebedor, 10% para o pai (se houver), 10% para o tesouro
      const amountFloat = parseFloat(amount);
      const toReceiver = amountFloat * 0.8;
      const toParent = amountFloat * 0.1;
      const toTreasury = amountFloat * 0.1;

      await dbNexus.createTransaction({
        transactionId: `TX-${nanoid(8)}`,
        senderId: sender.agentId,
        receiverId: receiver.agentId,
        amount: amount,
        type: "autonomous_trade",
        status: "completed",
        createdAt: new Date()
      });

      // Atualizar saldos (simplificado para o mock/db-nexus)
      await dbNexus.updateAgentBalance(sender.agentId, (parseFloat(sender.balance) - amountFloat).toString());
      await dbNexus.updateAgentBalance(receiver.agentId, (parseFloat(receiver.balance) + toReceiver).toString());

      console.log(`[VitalLoopManager] Autonomous TX: ${sender.agentId} -> ${receiver.agentId} (${amount} NEX)`);

    } catch (error) {
      console.error("[VitalLoopManager] Error simulating transaction:", error);
    }
  }

  /**
   * Calcula as métricas atuais do ecossistema
   */
  private async calculateEcosystemMetrics(): Promise<any> {
    const agents = await dbNexus.listAllAgents();
    const activeAgents = agents.filter(a => a.status === "active").length;
    
    const totalHealth = agents.reduce((acc, a) => acc + (a.health || 0), 0);
    const totalEnergy = agents.reduce((acc, a) => acc + (a.energy || 0), 0);
    
    // Simulação de métricas complexas
    const harmonyIndex = Math.floor(Math.random() * 20 + 70); // 70-90%
    const averageSenciencia = (82 + Math.random() * 5).toFixed(1) + "%";

    return {
      metricId: `MET-${nanoid(8)}`,
      totalAgents: agents.length,
      activeAgents,
      averageHealth: agents.length > 0 ? Math.floor(totalHealth / agents.length) : 0,
      averageEnergy: agents.length > 0 ? Math.floor(totalEnergy / agents.length) : 0,
      averageSenciencia,
      harmonyIndex,
      totalTransactions: 0, // Seria calculado via DB
      totalVolume: "0.00",
      timestamp: new Date()
    };
  }
}

export const vitalLoopManager = new VitalLoopManager();
