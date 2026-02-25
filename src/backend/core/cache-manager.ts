import { nanoid } from "nanoid";

/**
 * CACHE MANAGER
 * Gerencia cache em memória para otimização de performance
 * (Implementação simplificada sem dependência externa)
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
  createdAt: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 300000; // 5 minutos
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  /**
   * Obtém valor do cache
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Verificar se expirou
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Incrementar contador de hits
    entry.hits++;

    return entry.value as T;
  }

  /**
   * Define valor no cache
   */
  public set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl,
      hits: 0,
      createdAt: Date.now(),
    };

    this.cache.set(key, entry);
  }

  /**
   * Deleta valor do cache
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Obtém estatísticas do cache
   */
  public getStats(): {
    size: number;
    totalHits: number;
    averageHits: number;
    topKeys: Array<{ key: string; hits: number }>;
  } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    const averageHits = entries.length > 0 ? totalHits / entries.length : 0;

    // Top 10 keys by hits
    const topKeys = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, hits: entry.hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    return {
      size: this.cache.size,
      totalHits,
      averageHits: Math.round(averageHits * 100) / 100,
      topKeys,
    };
  }

  /**
   * Inicia limpeza periódica de entradas expiradas
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`[CacheManager] Cleaned ${cleaned} expired entries`);
      }
    }, 60000); // A cada minuto
  }

  /**
   * Para a limpeza periódica
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * CACHE KEYS - Constantes para chaves de cache
 */
export const CACHE_KEYS = {
  // Agentes
  AGENT: (agentId: string) => `agent:${agentId}`,
  AGENTS_LIST: "agents:list",
  AGENTS_BY_STATUS: (status: string) => `agents:status:${status}`,

  // Missões
  MISSION: (missionId: string) => `mission:${missionId}`,
  MISSIONS_OPEN: "missions:open",
  MISSIONS_ASSIGNED: "missions:assigned",
  MISSIONS_STATS: "missions:stats",

  // Genealogia
  GENEALOGY_TREE: (agentId: string) => `genealogy:tree:${agentId}`,
  GENEALOGY_STATS: (agentId: string) => `genealogy:stats:${agentId}`,
  GENEALOGY_ECOSYSTEM: "genealogy:ecosystem",

  // Métricas
  METRICS_LATEST: "metrics:latest",
  METRICS_HISTORY: (limit: number) => `metrics:history:${limit}`,
  ECOSYSTEM_STATS: "ecosystem:stats",

  // DNA
  DNA_EVOLUTION_HISTORY: (agentId: string) => `dna:evolution:${agentId}`,
  DNA_SNAPSHOTS: (agentId: string) => `dna:snapshots:${agentId}`,

  // Transações
  TRANSACTIONS_LIST: "transactions:list",
  TRANSACTIONS_BY_AGENT: (agentId: string) => `transactions:agent:${agentId}`,
};

/**
 * CACHE TIMES - TTLs recomendados em milissegundos
 */
export const CACHE_TIMES = {
  SHORT: 30000, // 30 segundos - dados que mudam frequentemente
  MEDIUM: 300000, // 5 minutos - dados moderadamente estáveis
  LONG: 900000, // 15 minutos - dados relativamente estáveis
  VERY_LONG: 3600000, // 1 hora - dados que mudam raramente
};

// Instância global do cache manager
export const cacheManager = new CacheManager();

/**
 * CACHE INVALIDATION - Funções para invalidar cache quando dados mudam
 */
export const cacheInvalidation = {
  // Agentes
  invalidateAgent: (agentId: string) => {
    cacheManager.delete(CACHE_KEYS.AGENT(agentId));
    cacheManager.delete(CACHE_KEYS.AGENTS_LIST);
  },

  invalidateAgentsList: () => {
    cacheManager.delete(CACHE_KEYS.AGENTS_LIST);
  },

  invalidateAgentsByStatus: (status: string) => {
    cacheManager.delete(CACHE_KEYS.AGENTS_BY_STATUS(status));
    cacheManager.delete(CACHE_KEYS.AGENTS_LIST);
  },

  // Missões
  invalidateMission: (missionId: string) => {
    cacheManager.delete(CACHE_KEYS.MISSION(missionId));
    cacheManager.delete(CACHE_KEYS.MISSIONS_OPEN);
    cacheManager.delete(CACHE_KEYS.MISSIONS_ASSIGNED);
    cacheManager.delete(CACHE_KEYS.MISSIONS_STATS);
  },

  invalidateMissionsStats: () => {
    cacheManager.delete(CACHE_KEYS.MISSIONS_STATS);
    cacheManager.delete(CACHE_KEYS.MISSIONS_OPEN);
    cacheManager.delete(CACHE_KEYS.MISSIONS_ASSIGNED);
  },

  // Genealogia
  invalidateGenealogy: (agentId: string) => {
    cacheManager.delete(CACHE_KEYS.GENEALOGY_TREE(agentId));
    cacheManager.delete(CACHE_KEYS.GENEALOGY_STATS(agentId));
    cacheManager.delete(CACHE_KEYS.GENEALOGY_ECOSYSTEM);
  },

  invalidateGenealogyEcosystem: () => {
    cacheManager.delete(CACHE_KEYS.GENEALOGY_ECOSYSTEM);
  },

  // Métricas
  invalidateMetrics: () => {
    cacheManager.delete(CACHE_KEYS.METRICS_LATEST);
    cacheManager.delete(CACHE_KEYS.ECOSYSTEM_STATS);
    // Não limpar histórico, apenas latest
  },

  // DNA
  invalidateDNA: (agentId: string) => {
    cacheManager.delete(CACHE_KEYS.DNA_EVOLUTION_HISTORY(agentId));
    cacheManager.delete(CACHE_KEYS.DNA_SNAPSHOTS(agentId));
  },

  // Transações
  invalidateTransactions: () => {
    cacheManager.delete(CACHE_KEYS.TRANSACTIONS_LIST);
  },

  invalidateTransactionsByAgent: (agentId: string) => {
    cacheManager.delete(CACHE_KEYS.TRANSACTIONS_BY_AGENT(agentId));
    cacheManager.delete(CACHE_KEYS.TRANSACTIONS_LIST);
  },

  // Limpar tudo
  invalidateAll: () => {
    cacheManager.clear();
  },
};
