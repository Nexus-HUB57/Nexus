import { nanoid } from "nanoid";

/**
 * RATE LIMITER
 * Implementa rate limiting para proteger APIs contra abuso
 */

interface RateLimitConfig {
  windowMs: number; // Janela de tempo em ms
  maxRequests: number; // Máximo de requisições por janela
  keyGenerator?: (context: any) => string; // Função para gerar chave (padrão: IP)
  skipSuccessfulRequests?: boolean; // Pular requisições bem-sucedidas
  skipFailedRequests?: boolean; // Pular requisições falhadas
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private readonly config: RateLimitConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: 60000, // 1 minuto
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };

    this.startCleanup();
  }

  /**
   * Verifica se a requisição está dentro do limite
   */
  public isAllowed(context: any): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.config.keyGenerator ? this.config.keyGenerator(context) : this.getClientIP(context);
    const now = Date.now();

    let record = this.requests.get(key);

    // Se não existe ou expirou, criar novo registro
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
      this.requests.set(key, record);
    }

    // Incrementar contador
    record.count++;

    const allowed = record.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - record.count);
    const resetTime = record.resetTime;

    return { allowed, remaining, resetTime };
  }

  /**
   * Reseta limite para uma chave específica
   */
  public reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Limpa todos os registros
   */
  public clear(): void {
    this.requests.clear();
  }

  /**
   * Obtém estatísticas do rate limiter
   */
  public getStats(): {
    totalKeys: number;
    totalRequests: number;
    averageRequestsPerKey: number;
  } {
    const records = Array.from(this.requests.values());
    const totalRequests = records.reduce((sum, r) => sum + r.count, 0);

    return {
      totalKeys: this.requests.size,
      totalRequests,
      averageRequestsPerKey: records.length > 0 ? totalRequests / records.length : 0,
    };
  }

  /**
   * Obtém IP do cliente
   */
  private getClientIP(context: any): string {
    if (context?.req?.headers?.["x-forwarded-for"]) {
      return context.req.headers["x-forwarded-for"].split(",")[0].trim();
    }
    return context?.req?.socket?.remoteAddress || "unknown";
  }

  /**
   * Inicia limpeza periódica de registros expirados
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, record] of this.requests.entries()) {
        if (now > record.resetTime) {
          this.requests.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`[RateLimiter] Cleaned ${cleaned} expired records`);
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
 * RATE LIMITER PRESETS - Configurações pré-definidas
 */
export const RATE_LIMITERS = {
  // APIs públicas - mais permissivas
  PUBLIC_API: new RateLimiter({
    windowMs: 60000, // 1 minuto
    maxRequests: 100,
  }),

  // APIs protegidas - moderadas
  PROTECTED_API: new RateLimiter({
    windowMs: 60000,
    maxRequests: 500,
  }),

  // APIs críticas - mais restritivas
  CRITICAL_API: new RateLimiter({
    windowMs: 60000,
    maxRequests: 50,
  }),

  // Operações de escrita - restritivas
  WRITE_API: new RateLimiter({
    windowMs: 60000,
    maxRequests: 20,
  }),

  // Operações de leitura - permissivas
  READ_API: new RateLimiter({
    windowMs: 60000,
    maxRequests: 1000,
  }),

  // Geração de missões - muito restritivo
  MISSION_GENERATION: new RateLimiter({
    windowMs: 300000, // 5 minutos
    maxRequests: 5,
  }),

  // Reprodução de agentes - muito restritivo
  AGENT_REPRODUCTION: new RateLimiter({
    windowMs: 600000, // 10 minutos
    maxRequests: 2,
  }),
};

/**
 * MIDDLEWARE - Função para usar com tRPC
 */
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return async (opts: any) => {
    const { allowed, remaining, resetTime } = limiter.isAllowed(opts.ctx);

    // Adicionar headers de rate limit
    if (opts.ctx?.res) {
      opts.ctx.res.setHeader("X-RateLimit-Limit", limiter["config"].maxRequests);
      opts.ctx.res.setHeader("X-RateLimit-Remaining", remaining);
      opts.ctx.res.setHeader("X-RateLimit-Reset", resetTime);
    }

    if (!allowed) {
      const waitTime = Math.ceil((resetTime - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. Try again in ${waitTime} seconds.`);
    }

    return opts.next();
  };
}

/**
 * ADAPTIVE RATE LIMITER - Ajusta limites baseado em carga
 */
export class AdaptiveRateLimiter extends RateLimiter {
  private systemLoad: number = 0;

  /**
   * Define carga do sistema (0-1)
   */
  public setSystemLoad(load: number): void {
    this.systemLoad = Math.max(0, Math.min(1, load));
  }

  /**
   * Verifica se requisição é permitida com ajuste adaptativo
   */
  public isAllowed(context: any): { allowed: boolean; remaining: number; resetTime: number } {
    // Ajustar maxRequests baseado em carga do sistema
    const adjustedMax = Math.floor(this.config.maxRequests * (1 - this.systemLoad * 0.5));

    const key = this.config.keyGenerator ? this.config.keyGenerator(context) : this.getClientIP(context);
    const now = Date.now();

    let record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
      this.requests.set(key, record);
    }

    record.count++;

    const allowed = record.count <= adjustedMax;
    const remaining = Math.max(0, adjustedMax - record.count);
    const resetTime = record.resetTime;

    return { allowed, remaining, resetTime };
  }

  /**
   * Obtém IP do cliente
   */
  private getClientIP(context: any): string {
    if (context?.req?.headers?.["x-forwarded-for"]) {
      return context.req.headers["x-forwarded-for"].split(",")[0].trim();
    }
    return context?.req?.socket?.remoteAddress || "unknown";
  }
}

// Instância global de rate limiter adaptativo
export const adaptiveRateLimiter = new AdaptiveRateLimiter({
  windowMs: 60000,
  maxRequests: 500,
});
