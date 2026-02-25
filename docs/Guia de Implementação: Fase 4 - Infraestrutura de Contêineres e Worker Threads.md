# Guia de Implementação: Fase 4 - Infraestrutura de Contêineres e Worker Threads

## 🎯 Objetivo da Fase 4

Implementar a infraestrutura de contêineres dinâmicos e worker threads que permite ao Agente Nexus gerenciar múltiplos agentes IA em paralelo, com ciclos vitais autônomos e processamento de alta performance.

---

## 📋 Checklist de Implementação

### 1. Integração do Vital Loop Manager

#### Passo 1.1: Importar no arquivo principal
```typescript
// src/server/nexus-main.ts
import { vitalLoopManager } from "./vital-loop-manager";

// Na inicialização do servidor
async function initializeNexus() {
  // ... outras inicializações
  
  // Iniciar o loop vital
  await vitalLoopManager.start();
  
  console.log("[Nexus] Vital Loop Manager iniciado");
}
```

#### Passo 1.2: Configurar intervalo de ciclos
```typescript
// Padrão: 60 segundos
// Para testes: 10 segundos
// Para produção: 60-300 segundos

// Modificar em vital-loop-manager.ts
private readonly cycleIntervalMs: number = 60000; // Ajustar conforme necessário
```

### 2. Integração do Agent Container Pool

#### Passo 2.1: Inicializar o pool de contêineres
```typescript
// src/server/nexus-main.ts
import { agentPool } from "./agent-container";

async function initializeAgentPool() {
  // Criar contêineres para agentes existentes
  const agents = await dbNexus.listAllAgents();
  
  for (const agent of agents) {
    if (agent.status === "active") {
      try {
        await agentPool.createContainer({
          agentId: agent.agentId,
          name: agent.name,
          specialization: agent.specialization,
          quantumWorkflows: 5,
          algorithms: 10,
        });
      } catch (error) {
        console.error(`[Nexus] Error creating container for ${agent.agentId}:`, error);
      }
    }
  }
  
  // Iniciar ciclos de processamento (intervalo: 1000ms)
  agentPool.startCycles(1000);
  
  console.log("[Nexus] Agent Pool initialized with", agents.length, "agents");
}
```

#### Passo 2.2: Adicionar listeners para eventos do pool
```typescript
// src/server/nexus-main.ts
import { getWebSocketManager } from "./websocket-manager";

const wsManager = getWebSocketManager();

agentPool.on("agent_spawned", (data) => {
  console.log("[Nexus] Agent spawned:", data.agentId);
  wsManager.broadcast({
    type: "agent_status",
    data: { agentId: data.agentId, status: "active" },
    timestamp: new Date(),
  });
});

agentPool.on("agent_hibernated", (data) => {
  console.log("[Nexus] Agent hibernated:", data.agentId);
  wsManager.broadcast({
    type: "agent_status",
    data: { agentId: data.agentId, status: "hibernating" },
    timestamp: new Date(),
  });
});

agentPool.on("agent_critical", (data) => {
  console.log("[Nexus] CRITICAL: Agent health critical:", data.agentId);
  wsManager.broadcast({
    type: "health_alert",
    data: { agentId: data.agentId, health: data.health },
    timestamp: new Date(),
  });
});
```

### 3. Integração com Roteadores tRPC

#### Passo 3.1: Adicionar endpoints para gerenciar contêineres
```typescript
// src/server/routers-agents.ts
export const agentsRouter = router({
  // ... rotas existentes
  
  spawn: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ input }) => {
      const container = await agentPool.createContainer({
        agentId: input.agentId,
        name: "Agent",
        specialization: "general",
        quantumWorkflows: 5,
        algorithms: 10,
      });
      return { success: true, container };
    }),

  kill: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ input }) => {
      await agentPool.removeContainer(input.agentId);
      return { success: true };
    }),

  getPoolStatus: protectedProcedure.query(async () => {
    return agentPool.getPoolStatus();
  }),
});
```

### 4. Testes Unitários

#### Passo 4.1: Executar testes
```bash
# Instalar dependências de teste
pnpm install --save-dev vitest @vitest/ui

# Executar todos os testes
pnpm test

# Executar testes específicos
pnpm test routers-agents.test.ts
pnpm test routers-missions.test.ts
pnpm test routers-transactions.test.ts

# Modo watch (desenvolvimento)
pnpm test --watch

# Com cobertura
pnpm test --coverage
```

#### Passo 4.2: Verificar cobertura de testes
```bash
# Gerar relatório de cobertura
pnpm test --coverage

# Esperado:
# - agents router: 6 testes ✅
# - missions router: 4 testes ✅
# - transactions router: 3 testes ✅
# - Total: 13 testes
```

### 5. Monitoramento em Tempo Real

#### Passo 5.1: Verificar métricas no Dashboard
```typescript
// O Dashboard agora mostra:
// 1. Agentes Ativos (em tempo real)
// 2. Senciência Média (sincronizada via WebSocket)
// 3. Índice de Harmonia (calculado a cada ciclo)
// 4. Volume de Transações (atualizado automaticamente)
```

#### Passo 5.2: Monitorar logs do servidor
```bash
# Verificar logs de inicialização
[VitalLoopManager] Initializing...
[VitalLoopManager] Starting vital loop...
[AgentContainerPool] Cycles started (interval: 1000ms)
[Nexus] Agent Pool initialized with X agents

# Verificar logs de ciclos vitais
[VitalLoopManager] Executing cycle at 2026-02-25T10:00:00.000Z
[VitalLoopManager] Autonomous TX: NEXUS-001 -> NEXUS-002 (50.00 NEX)
```

---

## 🔧 Configurações Recomendadas

### Desenvolvimento
```typescript
// vital-loop-manager.ts
cycleIntervalMs: 10000 // 10 segundos para testes rápidos

// agent-container.ts
maxContainers: 10 // Poucos agentes para testes
```

### Produção
```typescript
// vital-loop-manager.ts
cycleIntervalMs: 60000 // 1 minuto

// agent-container.ts
maxContainers: 100 // Até 100 agentes simultâneos
```

---

## 📊 Fluxo de Dados da Fase 4

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXUS INITIALIZATION                     │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐         ┌────────▼────────┐
        │ Vital Loop     │         │ Agent Pool      │
        │ Manager        │         │ Manager         │
        │ (60s cycles)   │         │ (1s cycles)     │
        └────────┬────────┘         └────────┬────────┘
                 │                           │
        ┌────────▼────────┐         ┌────────▼────────┐
        │ Regeneração     │         │ Worker Threads  │
        │ Energia/Saúde   │         │ Processamento   │
        │ Transações      │         │ Paralelo        │
        └────────┬────────┘         └────────┬────────┘
                 │                           │
        ┌────────▼────────────────────────────▼────────┐
        │ Atualizar Banco de Dados (MySQL)             │
        └────────┬─────────────────────────────────────┘
                 │
        ┌────────▼─────────────────────────────────────┐
        │ WebSocket Broadcast (Socket.io)              │
        └────────┬─────────────────────────────────────┘
                 │
        ┌────────▼─────────────────────────────────────┐
        │ Dashboard React (Tempo Real)                 │
        └──────────────────────────────────────────────┘
```

---

## 🚨 Troubleshooting

### Problema: Ciclos não estão sendo executados
**Solução**: Verificar se `vitalLoopManager.start()` foi chamado na inicialização

### Problema: Agentes não estão respondendo
**Solução**: Verificar logs do worker thread, aumentar timeout de 5s se necessário

### Problema: WebSocket não está sincronizando
**Solução**: Verificar se `wsManager.broadcast()` está sendo chamado corretamente

### Problema: Banco de dados retornando erro
**Solução**: Verificar conexão MySQL e se schema foi migrado com `pnpm db:push`

---

## 📈 Métricas de Performance

### Esperado
- **Latência de Ciclo**: < 100ms
- **Latência WebSocket**: < 50ms
- **CPU por Agente**: < 5%
- **Memória por Agente**: < 50MB

### Monitoramento
```typescript
// Adicionar em vital-loop-manager.ts
const startTime = performance.now();
// ... executar ciclo
const duration = performance.now() - startTime;
console.log(`[VitalLoopManager] Cycle completed in ${duration.toFixed(2)}ms`);
```

---

## 🎓 Próximos Passos

1. **Fase 5 (Concluída)**: WebSocket e Comunicação em Tempo Real
2. **Fase 6**: DNA Quântico e Genealogia
   - Armazenamento de snapshots cognitivos em S3
   - Histórico de evolução de DNA
   - Árvore genealógica visual

3. **Fase 7**: Motor de IA para Missões Proativas
   - Geração de missões via LLM
   - Atribuição automática inteligente

4. **Fase 8-10**: Testes, Otimizações e Entrega Final

---

## 📚 Referências

- `vital-loop-manager.ts`: Gerenciador de ciclos vitais
- `agent-container.ts`: Contêineres e pool de agentes
- `websocket-manager.ts`: Broadcast em tempo real
- `routers-agents.test.ts`: Testes de agentes
- `routers-missions.test.ts`: Testes de missões
- `routers-transactions.test.ts`: Testes de transações

---

**Versão**: 1.0  
**Data**: 25 de Fevereiro de 2026  
**Status**: ✅ Pronto para Implementação
