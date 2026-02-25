import { Worker } from "worker_threads";
import { EventEmitter } from "events";
import { nanoid } from "nanoid";
import * as dbNexus from "./db-nexus";

/**
 * AGENT CONTAINER SYSTEM
 * Gerencia contêineres dinâmicos de agentes com núcleos de alta performance
 */

export interface AgentContainerConfig {
  agentId: string;
  name: string;
  specialization: string;
  quantumWorkflows: number;
  algorithms: number;
}

export interface AgentSignals {
  health: number;
  energy: number;
  creativity: number;
  decision?: string;
}

export class AgentContainer extends EventEmitter {
  private agentId: string;
  private worker: Worker | null = null;
  private isActive: boolean = false;
  private lastSignals: AgentSignals | null = null;
  private cycleCount: number = 0;
  private readonly config: AgentContainerConfig;

  constructor(config: AgentContainerConfig) {
    super();
    this.agentId = config.agentId;
    this.config = config;
  }

  /**
   * Inicia o contêiner do agente
   */
  async spawn(): Promise<void> {
    if (this.isActive) {
      console.warn(`[AgentContainer] Agent ${this.agentId} already active`);
      return;
    }

    try {
      // Criar worker thread para processamento paralelo
      this.worker = new Worker(new URL("./agent-worker.ts", import.meta.url));

      this.worker.on("message", (message) => this.handleWorkerMessage(message));
      this.worker.on("error", (error) => this.handleWorkerError(error));
      this.worker.on("exit", (code) => this.handleWorkerExit(code));

      // Enviar configuração do agente para o worker
      this.worker.postMessage({
        type: "INIT",
        agentId: this.agentId,
        config: this.config,
      });

      this.isActive = true;
      console.log(`[AgentContainer] Agent ${this.agentId} spawned successfully`);

      // Atualizar status no banco de dados
      await dbNexus.updateAgentStatus(this.agentId, "active");

      // Emitir evento de ativação
      this.emit("spawned", { agentId: this.agentId, timestamp: new Date() });
    } catch (error) {
      console.error(`[AgentContainer] Error spawning agent ${this.agentId}:`, error);
      throw error;
    }
  }

  /**
   * Para o contêiner do agente
   */
  async kill(): Promise<void> {
    if (!this.isActive || !this.worker) {
      console.warn(`[AgentContainer] Agent ${this.agentId} not active`);
      return;
    }

    try {
      this.worker.terminate();
      this.worker = null;
      this.isActive = false;

      console.log(`[AgentContainer] Agent ${this.agentId} killed`);

      // Atualizar status no banco de dados
      await dbNexus.updateAgentStatus(this.agentId, "hibernating");

      // Emitir evento de hibernação
      this.emit("hibernated", { agentId: this.agentId, timestamp: new Date() });
    } catch (error) {
      console.error(`[AgentContainer] Error killing agent ${this.agentId}:`, error);
      throw error;
    }
  }

  /**
   * Executa um ciclo de processamento
   */
  async executeCycle(): Promise<AgentSignals | null> {
    if (!this.isActive || !this.worker) {
      return null;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(`[AgentContainer] Cycle timeout for agent ${this.agentId}`);
        resolve(null);
      }, 5000);

      const handler = (message: any) => {
        if (message.type === "CYCLE_COMPLETE") {
          clearTimeout(timeout);
          this.worker?.off("message", handler);
          resolve(message.signals);
        }
      };

      const worker = this.worker;
      if (!worker) {
        resolve(null);
        return;
      }
      worker.on("message", handler);
      worker.postMessage({
        type: "EXECUTE_CYCLE",
        cycleNumber: ++this.cycleCount,
      });
    });
  }

  /**
   * Registra sinais vitais do agente
   */
  async recordSignals(signals: AgentSignals): Promise<void> {
    this.lastSignals = signals;

    try {
      await dbNexus.createBrainPulseSignal({
        signalId: `SIG-${nanoid(8)}`,
        agentId: this.agentId,
        health: signals.health,
        energy: signals.energy,
        creativity: signals.creativity,
        decision: signals.decision,
        createdAt: new Date(),
      });

      // Verificar saúde crítica
      if (signals.health < 20) {
        await dbNexus.updateAgentStatus(this.agentId, "critical");
        this.emit("critical_health", { agentId: this.agentId, health: signals.health });
      }

      // Verificar energia baixa
      if (signals.energy < 10) {
        this.emit("low_energy", { agentId: this.agentId, energy: signals.energy });
      }
    } catch (error) {
      console.error(`[AgentContainer] Error recording signals for ${this.agentId}:`, error);
    }
  }

  /**
   * Manipula mensagens do worker
   */
  private async handleWorkerMessage(message: any): Promise<void> {
    switch (message.type) {
      case "SIGNALS":
        await this.recordSignals(message.signals);
        break;

      case "DECISION":
        await dbNexus.createAutonomousDecision({
          decisionId: `DEC-${nanoid(8)}`,
          agentId: this.agentId,
          context: message.context,
          decision: message.decision,
          reasoning: message.reasoning,
          action: message.action,
          createdAt: new Date(),
        });
        this.emit("decision_made", message);
        break;

      case "ERROR":
        console.error(`[AgentContainer] Worker error for ${this.agentId}:`, message.error);
        this.emit("worker_error", message);
        break;
    }
  }

  /**
   * Manipula erros do worker
   */
  private handleWorkerError(error: Error): void {
    console.error(`[AgentContainer] Worker error for ${this.agentId}:`, error);
    this.emit("error", error);
  }

  /**
   * Manipula saída do worker
   */
  private async handleWorkerExit(code: number): Promise<void> {
    console.log(`[AgentContainer] Worker for ${this.agentId} exited with code ${code}`);
    this.isActive = false;
    this.worker = null;

    if (code !== 0) {
      await dbNexus.updateAgentStatus(this.agentId, "dead");
      this.emit("crashed", { agentId: this.agentId, exitCode: code });
    }
  }

  /**
   * Retorna status do contêiner
   */
  getStatus(): {
    agentId: string;
    isActive: boolean;
    cycleCount: number;
    lastSignals: AgentSignals | null;
  } {
    return {
      agentId: this.agentId,
      isActive: this.isActive,
      cycleCount: this.cycleCount,
      lastSignals: this.lastSignals,
    };
  }
}

/**
 * AGENT CONTAINER POOL
 * Gerencia múltiplos contêineres de agentes
 */
export class AgentContainerPool extends EventEmitter {
  private containers: Map<string, AgentContainer> = new Map();
  private maxContainers: number;
  private cycleInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxContainers: number = 100) {
    super();
    this.maxContainers = maxContainers;
  }

  /**
   * Cria e inicia um novo contêiner
   */
  async createContainer(config: AgentContainerConfig): Promise<AgentContainer> {
    if (this.containers.size >= this.maxContainers) {
      throw new Error(`Container pool at maximum capacity (${this.maxContainers})`);
    }

    const container = new AgentContainer(config);

    // Registrar listeners
    container.on("spawned", (data) => this.emit("agent_spawned", data));
    container.on("hibernated", (data) => this.emit("agent_hibernated", data));
    container.on("critical_health", (data) => this.emit("agent_critical", data));
    container.on("decision_made", (data) => this.emit("decision_made", data));
    container.on("error", (error) => this.emit("container_error", error));

    this.containers.set(config.agentId, container);

    // Iniciar o contêiner
    await container.spawn();

    return container;
  }

  /**
   * Remove um contêiner
   */
  async removeContainer(agentId: string): Promise<void> {
    const container = this.containers.get(agentId);
    if (container) {
      await container.kill();
      this.containers.delete(agentId);
    }
  }

  /**
   * Obtém um contêiner
   */
  getContainer(agentId: string): AgentContainer | undefined {
    return this.containers.get(agentId);
  }

  /**
   * Inicia ciclos de processamento para todos os contêineres
   */
  startCycles(intervalMs: number = 1000): void {
    if (this.cycleInterval) {
      console.warn("[AgentContainerPool] Cycles already running");
      return;
    }

    this.cycleInterval = setInterval(() => {
      const promises: Promise<void>[] = [];

      this.containers.forEach((container, agentId) => {
        promises.push(
          (async () => {
            try {
              await container.executeCycle();
            } catch (error) {
              console.error(`[AgentContainerPool] Error executing cycle for ${agentId}:`, error);
            }
          })()
        );
      });

      Promise.all(promises).catch((error) => {
        console.error("[AgentContainerPool] Error in cycle batch:", error);
      });
    }, intervalMs);

    console.log(`[AgentContainerPool] Cycles started (interval: ${intervalMs}ms)`);
  }

  /**
   * Para ciclos de processamento
   */
  stopCycles(): void {
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
      console.log("[AgentContainerPool] Cycles stopped");
    }
  }

  /**
   * Retorna status de todos os contêineres
   */
  getPoolStatus(): {
    totalContainers: number;
    activeContainers: number;
    containers: Array<{
      agentId: string;
      isActive: boolean;
      cycleCount: number;
    }>;
  } {
    const containers: Array<{
      agentId: string;
      isActive: boolean;
      cycleCount: number;
    }> = [];
    
    this.containers.forEach((c) => {
      const status = c.getStatus();
      containers.push({
        agentId: status.agentId,
        isActive: status.isActive,
        cycleCount: status.cycleCount,
      });
    });

    return {
      totalContainers: this.containers.size,
      activeContainers: containers.filter((c) => c.isActive).length,
      containers,
    };
  }

  /**
   * Limpa todos os contêineres
   */
  async cleanup(): Promise<void> {
    this.stopCycles();

    const promises: Promise<void>[] = [];
    this.containers.forEach((container) => {
      promises.push(container.kill());
    });

    await Promise.all(promises);
    this.containers.clear();

    console.log("[AgentContainerPool] Cleanup complete");
  }
}

// Exportar instância global do pool
export const agentPool = new AgentContainerPool();
