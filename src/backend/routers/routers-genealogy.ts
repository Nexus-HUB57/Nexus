import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { dnaEvolutionEngine } from "./dna-evolution-engine";
import * as dbNexus from "./db-nexus";

/**
 * GENEALOGY ROUTER
 * Gerencia genealogia, evolução de DNA e snapshots cognitivos
 */

export const genealogyRouter = router({
  /**
   * Captura um snapshot cognitivo do agente
   */
  captureSnapshot: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const agent = await dbNexus.getAgentById(input.agentId);
        if (!agent) {
          return { success: false, error: "Agent not found" };
        }

        const snapshot = await dnaEvolutionEngine.captureSnapshot(input.agentId, agent);

        return {
          success: true,
          snapshot: {
            snapshotId: snapshot.snapshotId,
            timestamp: snapshot.timestamp,
            senciencia: snapshot.senciencia,
            health: snapshot.health,
            energy: snapshot.energy,
            creativity: snapshot.creativity,
          },
        };
      } catch (error) {
        console.error("[genealogyRouter] Error capturing snapshot:", error);
        return { success: false, error: String(error) };
      }
    }),

  /**
   * Obtém histórico de snapshots de um agente
   */
  getSnapshots: protectedProcedure
    .input(z.object({ agentId: z.string(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      try {
        const snapshots = await dbNexus.getCognitiveSnapshots(input.agentId, input.limit);
        return snapshots.map((s) => ({
          snapshotId: s.snapshotId,
          timestamp: s.timestamp,
          generation: s.generation,
          senciencia: s.senciencia,
          health: s.health,
          energy: s.energy,
          creativity: s.creativity,
        }));
      } catch (error) {
        console.error("[genealogyRouter] Error getting snapshots:", error);
        return [];
      }
    }),

  /**
   * Reproduz dois agentes para criar descendente
   */
  reproduce: protectedProcedure
    .input(
      z.object({
        parentAId: z.string(),
        parentBId: z.string(),
        offspringName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await dnaEvolutionEngine.reproduceAgents(
          input.parentAId,
          input.parentBId,
          input.offspringName
        );

        if (!result) {
          return { success: false, error: "Reproduction failed" };
        }

        return {
          success: true,
          offspring: {
            agentId: result.agentId,
            generation: result.generation,
            dnaHash: result.dnaHash,
          },
        };
      } catch (error) {
        console.error("[genealogyRouter] Error reproducing:", error);
        return { success: false, error: String(error) };
      }
    }),

  /**
   * Obtém árvore genealógica de um agente
   */
  getGenealogyTree: protectedProcedure
    .input(z.object({ agentId: z.string(), depth: z.number().default(3) }))
    .query(async ({ input }) => {
      try {
        const tree = await dnaEvolutionEngine.buildGenealogyTree(input.agentId, input.depth);
        return tree;
      } catch (error) {
        console.error("[genealogyRouter] Error getting genealogy tree:", error);
        return null;
      }
    }),

  /**
   * Obtém estatísticas de evolução de uma linhagem
   */
  getLineageStats: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ input }) => {
      try {
        const stats = await dnaEvolutionEngine.getLineageStats(input.agentId);
        return stats;
      } catch (error) {
        console.error("[genealogyRouter] Error getting lineage stats:", error);
        return {};
      }
    }),

  /**
   * Obtém histórico de evolução de DNA
   */
  getDNAEvolutionHistory: protectedProcedure
    .input(z.object({ agentId: z.string(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      try {
        const history = await dbNexus.getDNAEvolutionHistory(input.agentId, input.limit);
        return history.map((record) => ({
          recordId: record.recordId,
          timestamp: record.timestamp,
          mutationRate: (record.mutationRate * 100).toFixed(2) + "%",
          reason: record.reason,
          generation: record.generation,
        }));
      } catch (error) {
        console.error("[genealogyRouter] Error getting DNA evolution history:", error);
        return [];
      }
    }),

  /**
   * Obtém todos os descendentes de um agente
   */
  getOffspring: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ input }) => {
      try {
        const offspring = await dbNexus.getAgentsByParent(input.agentId);
        return offspring.map((agent) => ({
          agentId: agent.agentId,
          name: agent.name,
          generation: agent.generation,
          status: agent.status,
          specialization: agent.specialization,
        }));
      } catch (error) {
        console.error("[genealogyRouter] Error getting offspring:", error);
        return [];
      }
    }),

  /**
   * Compara DNA de dois agentes
   */
  compareDNA: protectedProcedure
    .input(z.object({ agentAId: z.string(), agentBId: z.string() }))
    .query(async ({ input }) => {
      try {
        const agentA = await dbNexus.getAgentById(input.agentAId);
        const agentB = await dbNexus.getAgentById(input.agentBId);

        if (!agentA || !agentB) {
          return { success: false, error: "One or both agents not found" };
        }

        const dnaA = agentA.dnaSequence || "";
        const dnaB = agentB.dnaSequence || "";

        // Calcular similaridade de DNA (Hamming distance)
        const similarity = calculateDNASimilarity(dnaA, dnaB);

        return {
          success: true,
          comparison: {
            agentAId: input.agentAId,
            agentBId: input.agentBId,
            similarity: (similarity * 100).toFixed(2) + "%",
            dnaLengthA: dnaA.length,
            dnaLengthB: dnaB.length,
            generationA: agentA.generation || 0,
            generationB: agentB.generation || 0,
          },
        };
      } catch (error) {
        console.error("[genealogyRouter] Error comparing DNA:", error);
        return { success: false, error: String(error) };
      }
    }),

  /**
   * Obtém estatísticas gerais de genealogia do ecossistema
   */
  getEcosystemGenealogy: protectedProcedure.query(async () => {
    try {
      const agents = await dbNexus.listAllAgents();

      // Calcular estatísticas
      const totalAgents = agents.length;
      const maxGeneration = Math.max(...agents.map((a) => a.generation || 0), 0);
      const averageGeneration =
        agents.length > 0
          ? agents.reduce((sum, a) => sum + (a.generation || 0), 0) / agents.length
          : 0;

      // Contar agentes por geração
      const generationDistribution: Record<number, number> = {};
      agents.forEach((agent) => {
        const gen = agent.generation || 0;
        generationDistribution[gen] = (generationDistribution[gen] || 0) + 1;
      });

      // Contar agentes com filhos
      const agentsWithOffspring = agents.filter((a) => (a.childrenIds || []).length > 0).length;

      return {
        totalAgents,
        maxGeneration,
        averageGeneration: averageGeneration.toFixed(2),
        agentsWithOffspring,
        generationDistribution,
      };
    } catch (error) {
      console.error("[genealogyRouter] Error getting ecosystem genealogy:", error);
      return {};
    }
  }),
});

/**
 * Calcula similaridade entre duas sequências de DNA
 */
function calculateDNASimilarity(dnaA: string, dnaB: string): number {
  const minLength = Math.min(dnaA.length, dnaB.length);
  if (minLength === 0) return 0;

  let matches = 0;
  for (let i = 0; i < minLength; i++) {
    if (dnaA[i] === dnaB[i]) matches++;
  }

  return matches / minLength;
}
