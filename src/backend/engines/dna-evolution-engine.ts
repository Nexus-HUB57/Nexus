import { nanoid } from "nanoid";
import * as dbNexus from "./db-nexus";
import { getWebSocketManager } from "./websocket-manager";
import crypto from "crypto";

/**
 * DNA EVOLUTION ENGINE
 * Gerencia evolução de DNA, snapshots cognitivos e histórico genealógico
 */

export interface CognitiveSnapshot {
  snapshotId: string;
  agentId: string;
  timestamp: Date;
  generation: number;
  senciencia: number;
  health: number;
  energy: number;
  creativity: number;
  memories: string[];
  decisions: Record<string, unknown>;
  achievements: string[];
  reputation: number;
}

export interface DNAEvolutionRecord {
  recordId: string;
  agentId: string;
  previousDNA: string;
  newDNA: string;
  mutationRate: number;
  reason: string; // "natural_evolution", "transaction_success", "mission_completion", "reproduction"
  timestamp: Date;
  generation: number;
}

export interface GenealogyNode {
  agentId: string;
  name: string;
  generation: number;
  parentIds: string[];
  childrenIds: string[];
  dnaHash: string;
  createdAt: Date;
  status: string;
  reputation: number;
  totalOffspring: number;
}

export class DNAEvolutionEngine {
  /**
   * Captura um snapshot cognitivo completo do agente
   */
  public static async captureSnapshot(
    agentId: string,
    agentData: any
  ): Promise<CognitiveSnapshot> {
    const snapshot: CognitiveSnapshot = {
      snapshotId: `SNAP-${nanoid(12)}`,
      agentId,
      timestamp: new Date(),
      generation: agentData.generation || 0,
      senciencia: agentData.sencienciaLevel || 0,
      health: agentData.health || 100,
      energy: agentData.energy || 100,
      creativity: agentData.creativity || 50,
      memories: agentData.memories || [],
      decisions: agentData.recentDecisions || {},
      achievements: agentData.achievements || [],
      reputation: agentData.reputation || 0,
    };

    // Persistir snapshot no banco de dados
    await dbNexus.createCognitiveSnapshot(snapshot);

    console.log(`[DNAEvolution] Snapshot captured for ${agentId}:`, snapshot.snapshotId);

    return snapshot;
  }

  /**
   * Evolui o DNA de um agente baseado em sucesso de transação
   */
  public static async evolveDNAFromTransaction(
    agentId: string,
    transactionSuccess: boolean,
    volume: number
  ): Promise<DNAEvolutionRecord | null> {
    if (!transactionSuccess) return null;

    const agent = await dbNexus.getAgentById(agentId);
    if (!agent) return null;

    const currentDNA = agent.dnaSequence || "";
    const mutationRate = Math.min(0.1, volume / 10000); // Taxa de mutação proporcional ao volume

    // Aplicar mutação ao DNA
    const newDNA = this.mutateDNA(currentDNA, mutationRate);

    const evolutionRecord: DNAEvolutionRecord = {
      recordId: `EVL-${nanoid(12)}`,
      agentId,
      previousDNA: currentDNA,
      newDNA,
      mutationRate,
      reason: "transaction_success",
      timestamp: new Date(),
      generation: agent.generation || 0,
    };

    // Atualizar DNA do agente
    await dbNexus.updateAgentDNA(agentId, newDNA);

    // Registrar evolução
    await dbNexus.createDNAEvolutionRecord(evolutionRecord);

    // Broadcast de evolução
    const wsManager = getWebSocketManager();
    wsManager.broadcast({
      type: "dna_evolution",
      data: {
        agentId,
        mutationRate,
        reason: "transaction_success",
        volume,
      },
      timestamp: new Date(),
    });

    console.log(
      `[DNAEvolution] DNA evolved for ${agentId} (mutation: ${(mutationRate * 100).toFixed(2)}%)`
    );

    return evolutionRecord;
  }

  /**
   * Evolui o DNA de um agente baseado em conclusão de missão
   */
  public static async evolveDNAFromMission(
    agentId: string,
    missionDifficulty: number,
    reward: number
  ): Promise<DNAEvolutionRecord | null> {
    const agent = await dbNexus.getAgentById(agentId);
    if (!agent) return null;

    const currentDNA = agent.dnaSequence || "";
    const mutationRate = Math.min(0.15, missionDifficulty / 100); // Taxa maior para missões difíceis

    // Aplicar mutação ao DNA
    const newDNA = this.mutateDNA(currentDNA, mutationRate);

    const evolutionRecord: DNAEvolutionRecord = {
      recordId: `EVL-${nanoid(12)}`,
      agentId,
      previousDNA: currentDNA,
      newDNA,
      mutationRate,
      reason: "mission_completion",
      timestamp: new Date(),
      generation: agent.generation || 0,
    };

    // Atualizar DNA e reputação
    await dbNexus.updateAgentDNA(agentId, newDNA);
    await dbNexus.updateAgentReputation(agentId, agent.reputation + reward);

    // Registrar evolução
    await dbNexus.createDNAEvolutionRecord(evolutionRecord);

    // Broadcast
    const wsManager = getWebSocketManager();
    wsManager.broadcast({
      type: "dna_evolution",
      data: {
        agentId,
        mutationRate,
        reason: "mission_completion",
        difficulty: missionDifficulty,
        reward,
      },
      timestamp: new Date(),
    });

    console.log(
      `[DNAEvolution] DNA evolved for ${agentId} from mission (difficulty: ${missionDifficulty})`
    );

    return evolutionRecord;
  }

  /**
   * Reprodução: Funde DNA de dois agentes para criar descendente
   */
  public static async reproduceAgents(
    parentAId: string,
    parentBId: string,
    offspringName: string
  ): Promise<{ agentId: string; generation: number; dnaHash: string } | null> {
    const parentA = await dbNexus.getAgentById(parentAId);
    const parentB = await dbNexus.getAgentById(parentBId);

    if (!parentA || !parentB) {
      console.error("[DNAEvolution] One or both parents not found");
      return null;
    }

    // Fuser DNA dos pais
    const parentADNA = parentA.dnaSequence || "";
    const parentBDNA = parentB.dnaSequence || "";
    const offspringDNA = this.fuseSequences(parentADNA, parentBDNA);

    // Criar novo agente descendente
    const offspringId = `NEXUS-${nanoid(8).toUpperCase()}`;
    const newGeneration = Math.max(parentA.generation || 0, parentB.generation || 0) + 1;

    // Herança de especialização (aleatória entre os pais)
    const offspringSpecialization = Math.random() > 0.5 ? parentA.specialization : parentB.specialization;

    // Criar agente no banco de dados
    const createdAgent = await dbNexus.createAgent({
      agentId: offspringId,
      name: offspringName,
      specialization: offspringSpecialization,
      balance: "500", // Herança inicial
      dnaSequence: offspringDNA,
      generation: newGeneration,
      parentIds: [parentAId, parentBId],
      status: "active",
      health: 100,
      energy: 100,
      sencienciaLevel: "75",
      reputation: 0,
    });

    // Registrar evolução de reprodução
    const evolutionRecord: DNAEvolutionRecord = {
      recordId: `EVL-${nanoid(12)}`,
      agentId: offspringId,
      previousDNA: "", // Novo agente
      newDNA: offspringDNA,
      mutationRate: 0.05, // Pequena variação
      reason: "reproduction",
      timestamp: new Date(),
      generation: newGeneration,
    };

    await dbNexus.createDNAEvolutionRecord(evolutionRecord);

    // Broadcast de nascimento
    const wsManager = getWebSocketManager();
    wsManager.broadcast({
      type: "agent_birth",
      data: {
        agentId: offspringId,
        name: offspringName,
        parentIds: [parentAId, parentBId],
        generation: newGeneration,
        specialization: offspringSpecialization,
      },
      timestamp: new Date(),
    });

    console.log(
      `[DNAEvolution] New agent born: ${offspringId} (Gen ${newGeneration})`
    );

    return {
      agentId: offspringId,
      generation: newGeneration,
      dnaHash: offspringDNA,
    };
  }

  /**
   * Constrói árvore genealógica completa para um agente
   */
  public static async buildGenealogyTree(
    agentId: string,
    depth: number = 5
  ): Promise<GenealogyNode | null> {
    const agent = await dbNexus.getAgentById(agentId);
    if (!agent) return null;

    const node: GenealogyNode = {
      agentId,
      name: agent.name || "Unknown",
      generation: agent.generation || 0,
      parentIds: agent.parentIds || [],
      childrenIds: [], // Será preenchido dinamicamente
      dnaHash: agent.dnaSequence || "",
      createdAt: agent.createdAt || new Date(),
      status: agent.status || "active",
      reputation: agent.reputation || 0,
      totalOffspring: 0,
    };

    // Buscar filhos (agentes que têm este agente como pai)
    const children = await dbNexus.getAgentsByParent(agentId);
    node.childrenIds = children.map((c) => c.agentId);
    node.totalOffspring = children.length;

    return node;
  }

  /**
   * Calcula estatísticas de evolução de uma linhagem
   */
  public static async getLineageStats(agentId: string): Promise<Record<string, unknown>> {
    const agent = await dbNexus.getAgentById(agentId);
    if (!agent) return {};

    // Buscar histórico de evolução
    const evolutionHistory = await dbNexus.getDNAEvolutionHistory(agentId);

    // Buscar snapshots cognitivos
    const snapshots = await dbNexus.getCognitiveSnapshots(agentId);

    // Calcular estatísticas
    const totalMutations = evolutionHistory.length;
    const averageMutationRate =
      evolutionHistory.length > 0
        ? evolutionHistory.reduce((sum, e) => sum + e.mutationRate, 0) / evolutionHistory.length
        : 0;

    const sencienciaProgression = snapshots.map((s) => ({
      timestamp: s.timestamp,
      senciencia: s.senciencia,
    }));

    return {
      agentId,
      generation: agent.generation || 0,
      totalMutations,
      averageMutationRate: (averageMutationRate * 100).toFixed(2) + "%",
      reputation: agent.reputation || 0,
      totalSnapshots: snapshots.length,
      sencienciaProgression,
      evolutionReasons: evolutionHistory.reduce(
        (acc, e) => {
          acc[e.reason] = (acc[e.reason] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  /**
   * Aplica mutação ao DNA
   */
  private static mutateDNA(dna: string, mutationRate: number): string {
    const dnaArray = dna.split("");
    const mutationCount = Math.floor(dna.length * mutationRate);

    for (let i = 0; i < mutationCount; i++) {
      const randomIndex = Math.floor(Math.random() * dnaArray.length);
      const randomChar = this.getRandomDNAChar();
      dnaArray[randomIndex] = randomChar;
    }

    return dnaArray.join("");
  }

  /**
   * Funde duas sequências de DNA
   */
  private static fuseSequences(seqA: string, seqB: string): string {
    const result: string[] = [];
    const maxLength = Math.max(seqA.length, seqB.length);

    for (let i = 0; i < maxLength; i++) {
      const charA = seqA[i] || "";
      const charB = seqB[i] || "";

      // Selecionar aleatoriamente de um dos pais
      if (Math.random() > 0.5 && charA) {
        result.push(charA);
      } else if (charB) {
        result.push(charB);
      }
    }

    return result.join("");
  }

  /**
   * Gera caractere aleatório de DNA
   */
  private static getRandomDNAChar(): string {
    const chars = "ACGT";
    return chars[Math.floor(Math.random() * chars.length)];
  }
}

export const dnaEvolutionEngine = new DNAEvolutionEngine();
