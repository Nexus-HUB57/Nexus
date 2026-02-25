import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { missionAIEngine } from "./mission-ai-engine";
import * as dbNexus from "./db-nexus";

/**
 * MISSION AI ROUTER
 * Gerencia geração automática de missões e atribuição inteligente
 */

export const missionAIRouter = router({
  /**
   * Gera missões proativas baseadas no estado do ecossistema
   */
  generateProactiveMissions: protectedProcedure.mutation(async () => {
    try {
      const missions = await missionAIEngine.generateProactiveMissions();

      return {
        success: true,
        count: missions.length,
        missions: missions.map((m) => ({
          missionId: m.missionId,
          title: m.title,
          type: m.type,
          difficulty: m.difficulty,
          reward: m.reward,
          priority: m.priority,
          reasoning: m.reasoning,
        })),
      };
    } catch (error) {
      console.error("[missionAIRouter] Error generating missions:", error);
      return { success: false, error: String(error), count: 0, missions: [] };
    }
  }),

  /**
   * Atribui automaticamente missões a agentes apropriados
   */
  assignMissionsAutomatically: protectedProcedure.mutation(async () => {
    try {
      const assignments = await missionAIEngine.assignMissionsAutomatically();

      return {
        success: true,
        assignmentCount: Object.keys(assignments).length,
        assignments,
      };
    } catch (error) {
      console.error("[missionAIRouter] Error assigning missions:", error);
      return { success: false, error: String(error), assignmentCount: 0, assignments: {} };
    }
  }),

  /**
   * Obtém missões abertas com contexto de IA
   */
  getOpenMissions: protectedProcedure.query(async () => {
    try {
      const missions = await dbNexus.getMissionsByStatus("open");

      return missions.map((m) => ({
        missionId: m.missionId,
        title: m.title,
        description: m.description,
        type: m.type,
        difficulty: m.difficulty,
        reward: m.reward,
        priority: m.priority,
        createdAt: m.createdAt,
        expiresAt: m.expiresAt,
      }));
    } catch (error) {
      console.error("[missionAIRouter] Error getting open missions:", error);
      return [];
    }
  }),

  /**
   * Obtém missões atribuídas com detalhes do agente
   */
  getAssignedMissions: protectedProcedure.query(async () => {
    try {
      const missions = await dbNexus.getMissionsByStatus("assigned");

      const enriched = await Promise.all(
        missions.map(async (m) => {
          const agent = m.agentId ? await dbNexus.getAgentById(m.agentId) : null;
          return {
            missionId: m.missionId,
            title: m.title,
            type: m.type,
            difficulty: m.difficulty,
            reward: m.reward,
            priority: m.priority,
            assignedAgent: agent
              ? {
                  agentId: agent.agentId,
                  name: agent.name,
                  specialization: agent.specialization,
                  reputation: agent.reputation,
                }
              : null,
            assignedAt: m.updatedAt,
          };
        })
      );

      return enriched;
    } catch (error) {
      console.error("[missionAIRouter] Error getting assigned missions:", error);
      return [];
    }
  }),

  /**
   * Obtém estatísticas de missões
   */
  getMissionStats: protectedProcedure.query(async () => {
    try {
      const openMissions = await dbNexus.getMissionsByStatus("open");
      const assignedMissions = await dbNexus.getMissionsByStatus("assigned");
      const completedMissions = await dbNexus.getMissionsByStatus("completed");
      const failedMissions = await dbNexus.getMissionsByStatus("failed");

      const totalRewardPool = [
        ...openMissions,
        ...assignedMissions,
        ...completedMissions,
        ...failedMissions,
      ].reduce((sum, m) => sum + (m.reward || 0), 0);

      const averageDifficulty =
        openMissions.length > 0
          ? openMissions.reduce((sum, m) => sum + (m.difficulty || 0), 0) / openMissions.length
          : 0;

      // Contar missões por tipo
      const missionsByType: Record<string, number> = {};
      openMissions.forEach((m) => {
        const type = m.type || "unknown";
        missionsByType[type] = (missionsByType[type] || 0) + 1;
      });

      // Contar missões por prioridade
      const missionsByPriority: Record<string, number> = {};
      openMissions.forEach((m) => {
        const priority = m.priority || "medium";
        missionsByPriority[priority] = (missionsByPriority[priority] || 0) + 1;
      });

      return {
        open: openMissions.length,
        assigned: assignedMissions.length,
        completed: completedMissions.length,
        failed: failedMissions.length,
        totalRewardPool,
        averageDifficulty: averageDifficulty.toFixed(2),
        missionsByType,
        missionsByPriority,
      };
    } catch (error) {
      console.error("[missionAIRouter] Error getting mission stats:", error);
      return {};
    }
  }),

  /**
   * Simula atribuição de missão para um agente específico
   */
  suggestMissionForAgent: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ input }) => {
      try {
        const agent = await dbNexus.getAgentById(input.agentId);
        if (!agent) {
          return { success: false, error: "Agent not found" };
        }

        const openMissions = await dbNexus.getMissionsByStatus("open");

        // Filtrar missões apropriadas
        const suitableMissions = openMissions.filter((mission) => {
          const targetSpecs = (mission.targetSpecializations as string[]) || [];
          const isSpecialized = targetSpecs.length === 0 || targetSpecs.includes(agent.specialization);
          const hasEnergy = (agent.energy || 0) > 30;
          const notExpired = new Date() < new Date(mission.expiresAt || Date.now());

          return isSpecialized && hasEnergy && notExpired;
        });

        if (suitableMissions.length === 0) {
          return {
            success: true,
            suggestion: null,
            reason: "No suitable missions available for this agent",
          };
        }

        // Selecionar missão com melhor match
        const bestMission = suitableMissions.reduce((best, mission) => {
          const bestScore = (best.reward || 0) / Math.max(1, best.difficulty || 1);
          const missionScore = (mission.reward || 0) / Math.max(1, mission.difficulty || 1);
          return missionScore > bestScore ? mission : best;
        });

        return {
          success: true,
          suggestion: {
            missionId: bestMission.missionId,
            title: bestMission.title,
            type: bestMission.type,
            difficulty: bestMission.difficulty,
            reward: bestMission.reward,
            priority: bestMission.priority,
            matchScore: calculateMatchScore(agent, bestMission),
          },
          reason: "Mission recommended based on agent specialization and current status",
        };
      } catch (error) {
        console.error("[missionAIRouter] Error suggesting mission:", error);
        return { success: false, error: String(error) };
      }
    }),

  /**
   * Obtém análise de desempenho de missões por agente
   */
  getAgentMissionPerformance: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ input }) => {
      try {
        const completedMissions = await dbNexus.getMissionsByAgent(input.agentId);

        const totalMissions = completedMissions.length;
        const completedCount = completedMissions.filter((m) => m.status === "completed").length;
        const failedCount = completedMissions.filter((m) => m.status === "failed").length;

        const totalRewards = completedMissions.reduce((sum, m) => sum + (m.reward || 0), 0);
        const averageDifficulty =
          totalMissions > 0
            ? completedMissions.reduce((sum, m) => sum + (m.difficulty || 0), 0) / totalMissions
            : 0;

        const successRate = totalMissions > 0 ? (completedCount / totalMissions) * 100 : 0;

        return {
          agentId: input.agentId,
          totalMissions,
          completedMissions: completedCount,
          failedMissions: failedCount,
          successRate: successRate.toFixed(2) + "%",
          totalRewards,
          averageDifficulty: averageDifficulty.toFixed(2),
        };
      } catch (error) {
        console.error("[missionAIRouter] Error getting agent performance:", error);
        return {};
      }
    }),
});

/**
 * Calcula score de compatibilidade entre agente e missão
 */
function calculateMatchScore(agent: any, mission: any): number {
  let score = 0;

  // Compatibilidade de especialização (40%)
  const targetSpecs = (mission.targetSpecializations as string[]) || [];
  if (targetSpecs.length === 0 || targetSpecs.includes(agent.specialization)) {
    score += 40;
  }

  // Nível de energia (30%)
  const energyPercent = Math.min(100, (agent.energy || 0));
  score += (energyPercent / 100) * 30;

  // Reputação vs Dificuldade (20%)
  const difficultyFactor = Math.min(10, mission.difficulty || 1);
  const reputationFactor = Math.min(10, (agent.reputation || 0) / 100);
  if (reputationFactor >= difficultyFactor * 0.8) {
    score += 20;
  }

  // Bônus por saúde (10%)
  if ((agent.health || 0) > 70) {
    score += 10;
  }

  return Math.round(score);
}
