import { nanoid } from "nanoid";

/**
 * LOGGER - Sistema de logging estruturado para Nexus
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number; // em ms
}

export interface LoggerConfig {
  minLevel?: LogLevel;
  enableConsole?: boolean;
  enableFile?: boolean;
  maxLogs?: number;
}

export class Logger {
  private logs: LogEntry[] = [];
  private readonly config: LoggerConfig;
  private readonly module: string;
  private readonly levelPriority: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4,
  };

  constructor(module: string, config: LoggerConfig = {}) {
    this.module = module;
    this.config = {
      minLevel: "INFO",
      enableConsole: true,
      enableFile: false,
      maxLogs: 10000,
      ...config,
    };
  }

  /**
   * Log de debug
   */
  public debug(message: string, data?: Record<string, unknown>): void {
    this.log("DEBUG", message, data);
  }

  /**
   * Log de informação
   */
  public info(message: string, data?: Record<string, unknown>): void {
    this.log("INFO", message, data);
  }

  /**
   * Log de aviso
   */
  public warn(message: string, data?: Record<string, unknown>): void {
    this.log("WARN", message, data);
  }

  /**
   * Log de erro
   */
  public error(message: string, error?: Error, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      id: `LOG-${nanoid(8)}`,
      timestamp: new Date(),
      level: "ERROR",
      module: this.module,
      message,
      data,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    this.addLog(entry);
  }

  /**
   * Log de erro crítico
   */
  public critical(message: string, error?: Error, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      id: `LOG-${nanoid(8)}`,
      timestamp: new Date(),
      level: "CRITICAL",
      module: this.module,
      message,
      data,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    this.addLog(entry);
    // Alertar sobre erro crítico
    console.error(`[CRITICAL] ${this.module}: ${message}`, data);
  }

  /**
   * Log com medição de tempo
   */
  public async timed<T>(
    message: string,
    fn: () => Promise<T>,
    data?: Record<string, unknown>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.log("INFO", `${message} (${duration.toFixed(2)}ms)`, {
        ...data,
        duration: Math.round(duration),
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.error(`${message} failed (${duration.toFixed(2)}ms)`, error as Error, {
        ...data,
        duration: Math.round(duration),
      });
      throw error;
    }
  }

  /**
   * Log genérico
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      id: `LOG-${nanoid(8)}`,
      timestamp: new Date(),
      level,
      module: this.module,
      message,
      data,
    };

    this.addLog(entry);
  }

  /**
   * Adiciona entrada ao log
   */
  private addLog(entry: LogEntry): void {
    // Verificar nível mínimo
    if (
      this.levelPriority[entry.level] < this.levelPriority[this.config.minLevel || "INFO"]
    ) {
      return;
    }

    // Adicionar ao array
    this.logs.push(entry);

    // Limitar tamanho
    if (this.logs.length > (this.config.maxLogs || 10000)) {
      this.logs = this.logs.slice(-5000);
    }

    // Log no console
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }
  }

  /**
   * Log no console
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${entry.level}] [${entry.module}] ${timestamp}`;

    const colors: Record<LogLevel, string> = {
      DEBUG: "\x1b[36m", // Cyan
      INFO: "\x1b[32m", // Green
      WARN: "\x1b[33m", // Yellow
      ERROR: "\x1b[31m", // Red
      CRITICAL: "\x1b[35m", // Magenta
    };

    const reset = "\x1b[0m";
    const color = colors[entry.level];

    console.log(`${color}${prefix}${reset} ${entry.message}`);

    if (entry.data) {
      console.log("  Data:", entry.data);
    }

    if (entry.error) {
      console.log("  Error:", entry.error.name, "-", entry.error.message);
      if (entry.error.stack) {
        console.log("  Stack:", entry.error.stack);
      }
    }
  }

  /**
   * Obtém logs com filtros
   */
  public getLogs(filters?: {
    level?: LogLevel;
    module?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): LogEntry[] {
    let result = [...this.logs];

    if (filters?.level) {
      result = result.filter((log) => log.level === filters.level);
    }

    if (filters?.module) {
      result = result.filter((log) => log.module === filters.module);
    }

    if (filters?.startTime) {
      result = result.filter((log) => log.timestamp >= filters.startTime!);
    }

    if (filters?.endTime) {
      result = result.filter((log) => log.timestamp <= filters.endTime!);
    }

    // Retornar últimos N logs
    const limit = filters?.limit || 100;
    return result.slice(-limit);
  }

  /**
   * Obtém estatísticas de logs
   */
  public getStats(): {
    totalLogs: number;
    byLevel: Record<LogLevel, number>;
    lastLog: LogEntry | null;
  } {
    const byLevel: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      CRITICAL: 0,
    };

    this.logs.forEach((log) => {
      byLevel[log.level]++;
    });

    return {
      totalLogs: this.logs.length,
      byLevel,
      lastLog: this.logs[this.logs.length - 1] || null,
    };
  }

  /**
   * Limpa todos os logs
   */
  public clear(): void {
    this.logs = [];
  }

  /**
   * Exporta logs em JSON
   */
  public export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

/**
 * GLOBAL LOGGER FACTORY - Cria loggers para diferentes módulos
 */
export class LoggerFactory {
  private loggers: Map<string, Logger> = new Map();
  private globalConfig: LoggerConfig;

  constructor(globalConfig: LoggerConfig = {}) {
    this.globalConfig = globalConfig;
  }

  /**
   * Obtém ou cria logger para um módulo
   */
  public getLogger(module: string): Logger {
    if (!this.loggers.has(module)) {
      this.loggers.set(module, new Logger(module, this.globalConfig));
    }
    return this.loggers.get(module)!;
  }

  /**
   * Obtém todos os logs de todos os módulos
   */
  public getAllLogs(filters?: {
    level?: LogLevel;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): LogEntry[] {
    const allLogs: LogEntry[] = [];

    for (const logger of this.loggers.values()) {
      allLogs.push(...logger.getLogs(filters));
    }

    // Ordenar por timestamp
    allLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Aplicar limite
    const limit = filters?.limit || 1000;
    return allLogs.slice(-limit);
  }

  /**
   * Obtém estatísticas globais
   */
  public getGlobalStats(): {
    modules: number;
    totalLogs: number;
    byLevel: Record<LogLevel, number>;
  } {
    const byLevel: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
      CRITICAL: 0,
    };

    let totalLogs = 0;

    for (const logger of this.loggers.values()) {
      const stats = logger.getStats();
      totalLogs += stats.totalLogs;

      for (const [level, count] of Object.entries(stats.byLevel)) {
        byLevel[level as LogLevel] += count;
      }
    }

    return {
      modules: this.loggers.size,
      totalLogs,
      byLevel,
    };
  }

  /**
   * Limpa todos os logs
   */
  public clearAll(): void {
    for (const logger of this.loggers.values()) {
      logger.clear();
    }
  }
}

// Instância global
export const loggerFactory = new LoggerFactory({
  minLevel: "DEBUG",
  enableConsole: true,
});

// Loggers pré-configurados
export const logger = {
  nexus: loggerFactory.getLogger("Nexus"),
  agents: loggerFactory.getLogger("Agents"),
  missions: loggerFactory.getLogger("Missions"),
  genealogy: loggerFactory.getLogger("Genealogy"),
  dna: loggerFactory.getLogger("DNA"),
  transactions: loggerFactory.getLogger("Transactions"),
  websocket: loggerFactory.getLogger("WebSocket"),
  cache: loggerFactory.getLogger("Cache"),
  rateLimit: loggerFactory.getLogger("RateLimit"),
};
