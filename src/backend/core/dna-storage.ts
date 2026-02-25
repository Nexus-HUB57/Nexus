import { storagePut, storageGet } from "./storage";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { agentDNA } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface QuantumDNA {
  agentId: string;
  sequence: string;
  traits: Record<string, unknown>;
  generation: number;
  parentIds: string[];
  timestamp: Date;
  cognitiveSnapshot: Record<string, unknown>;
}

export interface DNASnapshot {
  snapshotId: string;
  agentId: string;
  dnaHash: string;
  s3Key: string;
  s3Url: string;
  timestamp: Date;
  generation: number;
}

/**
 * Persist quantum DNA to S3 for long-term storage
 */
export async function persistQuantumDNA(dna: QuantumDNA): Promise<DNASnapshot> {
  const snapshotId = `DNA-${nanoid(16)}`;
  const s3Key = `nexus/dna/${dna.agentId}/${snapshotId}.json`;

  const dnaData = {
    agentId: dna.agentId,
    sequence: dna.sequence,
    traits: dna.traits,
    generation: dna.generation,
    parentIds: dna.parentIds,
    timestamp: dna.timestamp.toISOString(),
    cognitiveSnapshot: dna.cognitiveSnapshot,
  };

  const { url } = await storagePut(
    s3Key,
    JSON.stringify(dnaData),
    "application/json"
  );

  const snapshot: DNASnapshot = {
    snapshotId,
    agentId: dna.agentId,
    dnaHash: dna.sequence,
    s3Key,
    s3Url: url,
    timestamp: dna.timestamp,
    generation: dna.generation,
  };

  return snapshot;
}

/**
 * Retrieve quantum DNA snapshot from S3
 */
export async function retrieveQuantumDNA(s3Url: string): Promise<QuantumDNA | null> {
  try {
    const response = await fetch(s3Url);
    if (!response.ok) {
      console.error(`Failed to retrieve DNA from S3: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return {
      agentId: data.agentId,
      sequence: data.sequence,
      traits: data.traits,
      generation: data.generation,
      parentIds: data.parentIds,
      timestamp: new Date(data.timestamp),
      cognitiveSnapshot: data.cognitiveSnapshot,
    };
  } catch (error) {
    console.error("Error retrieving DNA from S3:", error);
    return null;
  }
}

/**
 * Generate quantum DNA for a new agent
 */
export function generateQuantumDNA(
  specialization: string,
  parentIds: string[] = [],
  generation: number = 0
): QuantumDNA {
  const sequence = nanoid(128);
  const traits = {
    specialization,
    generation,
    createdAt: new Date().toISOString(),
    algorithms: 408000000000, // 408 billion algorithms
    quantumWorkflows: 16,
  };

  return {
    agentId: `NEXUS-${nanoid(8).toUpperCase()}`,
    sequence,
    traits,
    generation,
    parentIds,
    timestamp: new Date(),
    cognitiveSnapshot: {
      senciencia: 100,
      health: 100,
      energy: 100,
      creativity: 50,
    },
  };
}

/**
 * Fuse DNA from two parent agents to create offspring
 */
export function fuseDNA(
  parentA: QuantumDNA,
  parentB: QuantumDNA
): QuantumDNA {
  const offspringSequence = fuseSequences(parentA.sequence, parentB.sequence);
  const offspringTraits = {
    ...parentA.traits,
    ...parentB.traits,
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    createdAt: new Date().toISOString(),
  };

  return {
    agentId: `NEXUS-${nanoid(8).toUpperCase()}`,
    sequence: offspringSequence,
    traits: offspringTraits,
    generation: Math.max(parentA.generation, parentB.generation) + 1,
    parentIds: [parentA.agentId, parentB.agentId],
    timestamp: new Date(),
    cognitiveSnapshot: {
      senciencia: 100,
      health: 100,
      energy: 100,
      creativity: 50,
    },
  };
}

/**
 * Fuse two DNA sequences to create offspring sequence
 */
function fuseSequences(seqA: string, seqB: string): string {
  const result: string[] = [];
  const minLength = Math.min(seqA.length, seqB.length);

  for (let i = 0; i < minLength; i++) {
    // Randomly select from parent A or B
    result.push(Math.random() > 0.5 ? seqA[i] : seqB[i]);
  }

  // Add remaining characters from longer sequence
  if (seqA.length > minLength) {
    result.push(...seqA.substring(minLength).split(""));
  } else if (seqB.length > minLength) {
    result.push(...seqB.substring(minLength).split(""));
  }

  return result.join("");
}

/**
 * Store DNA snapshot metadata in database
 */
export async function storeDNAMetadata(
  snapshot: DNASnapshot
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update or insert DNA record
  const existing = await db
    .select()
    .from(agentDNA)
    .where(eq(agentDNA.agentId, snapshot.agentId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing record with S3 reference
    await db
      .update(agentDNA)
      .set({
        dnaSequence: snapshot.dnaHash,
        traits: {
          s3Url: snapshot.s3Url,
          s3Key: snapshot.s3Key,
          snapshotId: snapshot.snapshotId,
          generation: snapshot.generation,
        },
        updatedAt: new Date(),
      })
      .where(eq(agentDNA.agentId, snapshot.agentId));
  } else {
    // Create new record
    await db.insert(agentDNA).values({
      agentId: snapshot.agentId,
      dnaSequence: snapshot.dnaHash,
      traits: {
        s3Url: snapshot.s3Url,
        s3Key: snapshot.s3Key,
        snapshotId: snapshot.snapshotId,
        generation: snapshot.generation,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * Retrieve genealogy tree for an agent
 */
export async function getGenealogyTree(
  agentId: string,
  depth: number = 3
): Promise<Record<string, unknown>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const agent = await db
    .select()
    .from(agentDNA)
    .where(eq(agentDNA.agentId, agentId))
    .limit(1);

  if (agent.length === 0) {
    return { agentId, error: "Agent not found" };
  }

  const traits = agent[0].traits as Record<string, unknown>;
  const parentIds = (traits.parentIds as string[]) || [];

  const genealogy: Record<string, unknown> = {
    agentId,
    generation: traits.generation,
    parents: [],
  };

  if (depth > 0 && parentIds.length > 0) {
    const parentTrees = await Promise.all(
      parentIds.map((parentId) => getGenealogyTree(parentId, depth - 1))
    );
    genealogy.parents = parentTrees;
  }

  return genealogy;
}
