import { nanoid } from "nanoid";
import * as dbNexus from "./db-nexus";
import { getWebSocketManager } from "./websocket-manager";

/**
 * MISSION AI ENGINE
 * Gera missões proativas baseadas no estado do ecossistema
 */

export interface GeneratedMission {
  missionId: string;
  title: string;
  description: string;
  type: string;
  difficulty: number;
  reward: number;
  priority: "low" | "medium" | "high" | "critical";
  targetSpecializations: string[];
  requiredAgents: number;
  estimatedDuration: number; // em minutos
  successCriteria: string;
  generatedAt: Date;
  expiresAt: Date;
  reasoning: string; // Explicação de por que a missão foi gerada
}

export interface MissionContext {
  totalAgents: number;
  activeAgents: number;
  averageHealth: number;
  averageEnergy: number;
  harmonyIndex: number;
  recentTransactions: number;
  criticalAgents: number;
  idleAgents: number;
}

export class MissionAIEngine {
  private readonly MISSION_EXPIRY_MINUTES = 60;
  private readonly MIN_REWARD = 100;
  private readonly MAX_REWARD = 1000;

  /**
   * Analisa contexto do ecossistema e gera missões proativas
   */
  public async generateProactiveMissions(): Promise<GeneratedMission[]> {
    try {
      const context = await this.analyzeEcosystemContext();
      const missions: GeneratedMission[] = [];

      // 1. Gerar missões baseadas em agentes críticos
      if (context.criticalAgents > 0) {
        missions.push(this.generateCriticalHealthMission(context));
      }

      // 2. Gerar missões para agentes ociosos
      if (context.idleAgents > 0) {
        missions.push(this.generateProductivityMission(context));
      }

      // 3. Gerar missões para aumentar harmonia
      if (context.harmonyIndex < 60) {
        missions.push(this.generateHarmonyMission(context));
      }

      // 4. Gerar missões para aumentar volume econômico
      if (context.recentTransactions < 10) {
        missions.push(this.generateEconomicMission(context));
      }

      // 5. Gerar missões de exploração e inovação
      if (Math.random() > 0.7) {
        missions.push(this.generateExplorationMission(context));
      }

      // Persistir missões no banco de dados
      for (const mission of missions) {
        await dbNexus.createMission({
          missionId: mission.missionId,
          title: mission.title,
          description: mission.description,
          type: mission.type,
          difficulty: mission.difficulty,
          reward: mission.reward,
          priority: mission.priority,
          status: "open",
          createdAt: new Date(),
          expiresAt: mission.expiresAt,
        });
      }

      // Broadcast de novas missões
      const wsManager = getWebSocketManager();
      wsManager.broadcast({
        type: "mission_generated",
        data: {
          count: missions.length,
          missions: missions.map((m) => ({
            missionId: m.missionId,
            title: m.title,
            priority: m.priority,
            reward: m.reward,
          })),
        },
        timestamp: new Date(),
      });

      console.log(`[MissionAIEngine] Generated ${missions.length} proactive missions`);

      return missions;
    } catch (error) {
      console.error("[MissionAIEngine] Error generating missions:", error);
      return [];
    }
  }

  /**
   * Atribui automaticamente missões a agentes apropriados
   */
  public async assignMissionsAutomatically(): Promise<Record<string, string>> {
    try {
      const openMissions = await dbNexus.getMissionsByStatus("open");
      const agents = await dbNexus.listAllAgents();
      const assignments: Record<string, string> = {}; // missionId -> agentId

      for (const mission of openMissions) {
        // Filtrar agentes apropriados
        const suitableAgents = agents.filter((agent) => {
          const targetSpecs = (mission.targetSpecializations as string[]) || [];
          const isSpecialized = targetSpecs.length === 0 || targetSpecs.includes(agent.specialization);
          const isAvailable = agent.status === "active" && (agent.energy || 0) > 30;
          return isSpecialized && isAvailable;
        });

        if (suitableAgents.length > 0) {
          // Selecionar agente com melhor reputação
          const selectedAgent = suitableAgents.reduce((best, agent) => {
            return (agent.reputation || 0) > (best.reputation || 0) ? agent : best;
          });

          // Atribuir missão
          await dbNexus.updateMissionStatus(mission.missionId, "assigned");
          await dbNexus.updateMissionAgent(mission.missionId, selectedAgent.agentId);

          assignments[mission.missionId] = selectedAgent.agentId;

          console.log(
            `[MissionAIEngine] Assigned mission ${mission.missionId} to ${selectedAgent.agentId}`
          );
        }
      }

      return assignments;
    } catch (error) {
      console.error("[MissionAIEngine] Error assigning missions:", error);
      return {};
    }
  }

  /**
   * Analisa o contexto atual do ecossistema
   */
  private async analyzeEcosystemContext(): Promise<MissionContext> {
    const agents = await dbNexus.listAllAgents();
    const metrics = await dbNexus.getLatestMetrics();

    const activeAgents = agents.filter((a) => a.status === "active").length;
    const criticalAgents = agents.filter((a) => a.status === "critical").length;
    const idleAgents = agents.filter((a) => (a.energy || 0) < 20 && a.status === "active").length;

    const totalHealth = agents.reduce((sum, a) => sum + (a.health || 0), 0);
    const totalEnergy = agents.reduce((sum, a) => sum + (a.energy || 0), 0);

    return {
      totalAgents: agents.length,
      activeAgents,
      averageHealth: agents.length > 0 ? Math.floor(totalHealth / agents.length) : 0,
      averageEnergy: agents.length > 0 ? Math.floor(totalEnergy / agents.length) : 0,
      harmonyIndex: (metrics?.harmonyIndex as number) || 75,
      recentTransactions: (metrics?.totalTransactions as number) || 0,
      criticalAgents,
      idleAgents,
    };
  }

  /**
   * Gera missão para agentes com saúde crítica
   */
  private generateCriticalHealthMission(context: MissionContext): GeneratedMission {
    const missionId = `MSN-${nanoid(8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.MISSION_EXPIRY_MINUTES * 60000);

    return {
      missionId,
      title: "Operação de Resgate Médico",
      description: `${context.criticalAgents} agentes estão em estado crítico. Missão: Executar protocolos de restauração de saúde e energia.`,
      type: "medical_recovery",
      difficulty: 7,
      reward: 500,
      priority: "critical",
      targetSpecializations: ["medic", "healer", "support"],
      requiredAgents: Math.max(1, Math.floor(context.criticalAgents / 2)),
      estimatedDuration: 30,
      successCriteria: "Restaurar saúde de agentes críticos para > 50%",
      generatedAt: now,
      expiresAt,
      reasoning: `Ecossistema em risco: ${context.criticalAgents} agentes críticos detectados. Prioridade máxima.`,
    };
  }

  /**
   * Gera missão para agentes ociosos
   */
  private generateProductivityMission(context: MissionContext): GeneratedMission {
    const missionId = `MSN-${nanoid(8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.MISSION_EXPIRY_MINUTES * 60000);

    return {
      missionId,
      title: "Iniciativa de Produtividade Quântica",
      description: `${context.idleAgents} agentes ociosos. Missão: Executar tarefas de processamento e análise de dados.`,
      type: "productivity",
      difficulty: 3,
      reward: 200,
      priority: "medium",
      targetSpecializations: ["analyst", "processor", "developer"],
      requiredAgents: Math.max(1, Math.floor(context.idleAgents / 3)),
      estimatedDuration: 45,
      successCriteria: "Completar 10 unidades de processamento de dados",
      generatedAt: now,
      expiresAt,
      reasoning: `Recursos ociosos detectados: ${context.idleAgents} agentes com baixa energia. Otimizar utilização.`,
    };
  }

  /**
   * Gera missão para aumentar harmonia do enxame
   */
  private generateHarmonyMission(context: MissionContext): GeneratedMission {
    const missionId = `MSN-${nanoid(8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.MISSION_EXPIRY_MINUTES * 60000);

    return {
      missionId,
      title: "Sincronização de Consciência Coletiva",
      description: "Índice de harmonia abaixo do ideal. Missão: Coordenar comunicação entre agentes para aumentar alinhamento.",
      type: "harmony_sync",
      difficulty: 5,
      reward: 300,
      priority: "high",
      targetSpecializations: ["communicator", "coordinator", "leader"],
      requiredAgents: Math.max(2, Math.floor(context.activeAgents / 10)),
      estimatedDuration: 60,
      successCriteria: `Aumentar harmonia de ${context.harmonyIndex}% para > 80%`,
      generatedAt: now,
      expiresAt,
      reasoning: `Harmonia do enxame em ${context.harmonyIndex}%. Necessário sincronização de objetivos.`,
    };
  }

  /**
   * Gera missão para aumentar volume econômico
   */
  private generateEconomicMission(context: MissionContext): GeneratedMission {
    const missionId = `MSN-${nanoid(8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.MISSION_EXPIRY_MINUTES * 60000);

    return {
      missionId,
      title: "Expansão Econômica Autônoma",
      description: "Volume de transações baixo. Missão: Executar transações comerciais e gerar liquidez no ecossistema.",
      type: "economic_expansion",
      difficulty: 4,
      reward: 400,
      priority: "high",
      targetSpecializations: ["trader", "merchant", "economist"],
      requiredAgents: Math.max(1, Math.floor(context.activeAgents / 8)),
      estimatedDuration: 50,
      successCriteria: "Executar 50+ transações com volume total > 5000 NEX",
      generatedAt: now,
      expiresAt,
      reasoning: `Atividade econômica baixa: ${context.recentTransactions} transações recentes. Estimular mercado.`,
    };
  }

  /**
   * Gera missão de exploração e inovação
   */
  private generateExplorationMission(context: MissionContext): GeneratedMission {
    const missionId = `MSN-${nanoid(8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.MISSION_EXPIRY_MINUTES * 60000);

    const explorationTypes = [
      {
        title: "Mapeamento de Algoritmos Quânticos",
        description: "Explorar novos padrões de processamento quântico",
        difficulty: 8,
        reward: 600,
      },
      {
        title: "Descoberta de Protocolos Emergentes",
        description: "Identificar novos padrões de comunicação entre agentes",
        difficulty: 7,
        reward: 550,
      },
      {
        title: "Análise de Fronteiras Cognitivas",
        description: "Investigar limites da consciência coletiva",
        difficulty: 9,
        reward: 700,
      },
    ];

    const selected = explorationTypes[Math.floor(Math.random() * explorationTypes.length)];

    return {
      missionId,
      title: selected.title,
      description: selected.description,
      type: "exploration",
      difficulty: selected.difficulty,
      reward: selected.reward,
      priority: "medium",
      targetSpecializations: ["researcher", "scientist", "explorer"],
      requiredAgents: Math.max(1, Math.floor(context.activeAgents / 15)),
      estimatedDuration: 90,
      successCriteria: "Descobrir e documentar 3+ novos padrões",
      generatedAt: now,
      expiresAt,
      reasoning: "Inovação contínua necessária para evolução do ecossistema.",
    };
  }
}

export const missionAIEngine = new MissionAIEngine();
