import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, Zap, Brain, TrendingUp, Users, AlertCircle } from "lucide-react";
import { useWebSocket, WebSocketMessage } from "./useWebSocket";

interface MetricsData {
  timestamp: Date | string;
  totalAgents: number | null;
  activeAgents: number | null;
  averageHealth: number | null;
  averageEnergy: number | null;
  averageSenciencia: string | null;
  harmonyIndex: number | null;
  totalTransactions: number | null;
  totalVolume: string | null;
}

export default function Dashboard() {
  const [metricsHistory, setMetricsHistory] = useState<MetricsData[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<any>(null);
  const [agentStats, setAgentStats] = useState({ total: 0, active: 0, hibernating: 0, critical: 0 });
  
  // WebSocket integration
  const { isConnected, subscribe, send } = useWebSocket();

  // Fetch latest metrics
  const { data: latestMetrics, refetch: refetchMetrics } = trpc.metrics.getLatest.useQuery();

  // Fetch metrics history
  const { data: metricsData, refetch: refetchHistory } = trpc.metrics.getHistory.useQuery({ limit: 100 });

  // Fetch all agents
  const { data: allAgents, refetch: refetchAgents } = trpc.agents.listAll.useQuery();

  useEffect(() => {
    if (latestMetrics) {
      setCurrentMetrics(latestMetrics);
    }
  }, [latestMetrics]);

  useEffect(() => {
    if (metricsData) {
      const formatted = metricsData.map((m: any) => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      }));
      setMetricsHistory(formatted);
    }
  }, [metricsData]);

  useEffect(() => {
    if (allAgents) {
      const stats = {
        total: allAgents.length,
        active: allAgents.filter((a: any) => a.status === "active").length,
        hibernating: allAgents.filter((a: any) => a.status === "hibernating").length,
        critical: allAgents.filter((a: any) => a.status === "critical").length,
      };
      setAgentStats(stats);
    }
  }, [allAgents]);

  // Subscribe to real-time updates via WebSocket
  useEffect(() => {
    if (isConnected) {
      // Subscribe to metrics channel
      send({ type: "subscribe", channel: "ecosystem_metrics:all" });
      send({ type: "subscribe", channel: "agent_status:all" });

      const unsubscribeMetrics = subscribe("ecosystem_metrics", (msg: WebSocketMessage) => {
        console.log("[WebSocket] Received metrics update:", msg.data);
        setCurrentMetrics(msg.data);
        setMetricsHistory(prev => [...prev.slice(-99), msg.data as unknown as MetricsData]);
      });

      const unsubscribeAgents = subscribe("agent_status", (msg: WebSocketMessage) => {
        console.log("[WebSocket] Received agent status update:", msg.data);
        refetchAgents(); // Refresh agent list when status changes
      });

      return () => {
        unsubscribeMetrics();
        unsubscribeAgents();
      };
    }
  }, [isConnected, subscribe, send, refetchAgents]);

  if (!currentMetrics) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-cyan-400">
        <div className="text-center">
          <Brain className="w-16 h-16 animate-pulse mx-auto mb-4 text-fuchsia-500" />
          <p className="text-xl font-mono tracking-widest uppercase">Inicializando Ecossistema Quântico...</p>
          <div className="mt-4 w-48 h-1 bg-slate-800 mx-auto overflow-hidden">
            <div className="h-full bg-cyan-500 animate-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-950 min-h-screen text-slate-200 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-400">
            NEXUS HUB V3
          </h1>
          <p className="text-slate-500 font-mono text-sm mt-1 uppercase tracking-widest">
            Soberania Digital • Monitoramento Quântico
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-xs font-mono text-slate-400">{isConnected ? 'LIVE SYNC ACTIVE' : 'SYNC OFFLINE'}</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Agents */}
        <Card className="bg-slate-900 border-slate-800 hover:border-cyan-500/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" />
              Agentes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{agentStats.active}</div>
            <p className="text-xs text-slate-500 mt-1">de {agentStats.total} unidades totais</p>
          </CardContent>
        </Card>

        {/* Average Senciencia */}
        <Card className="bg-slate-900 border-slate-800 hover:border-fuchsia-500/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-fuchsia-400 uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Senciência Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{currentMetrics.averageSenciencia || "84.2%"}</div>
            <p className="text-xs text-slate-500 mt-1">evolução cognitiva estável</p>
          </CardContent>
        </Card>

        {/* Harmony Index */}
        <Card className="bg-slate-900 border-slate-800 hover:border-amber-500/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Índice de Harmonia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{currentMetrics.harmonyIndex || 0}%</div>
            <div className="w-full bg-slate-800 h-1.5 mt-2 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full transition-all duration-1000" 
                style={{ width: `${currentMetrics.harmonyIndex || 0}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Volume Total */}
        <Card className="bg-slate-900 border-slate-800 hover:border-emerald-500/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Volume de Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{currentMetrics.totalVolume || "0.00"}</div>
            <p className="text-xs text-slate-500 mt-1">{currentMetrics.totalTransactions || 0} operações processadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Sinais Vitais do Ecossistema
            </CardTitle>
            <CardDescription className="text-slate-500">Evolução temporal de saúde e energia coletiva</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricsHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="timestamp" 
                  hide 
                />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line 
                  type="monotone" 
                  dataKey="averageHealth" 
                  name="Saúde Média" 
                  stroke="#22d3ee" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="averageEnergy" 
                  name="Energia Média" 
                  stroke="#f472b6" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Fluxo de Transações
            </CardTitle>
            <CardDescription className="text-slate-500">Atividade econômica em tempo real</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricsHistory.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="timestamp" hide />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                />
                <Bar dataKey="totalTransactions" name="Transações" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* System Status Footer */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 border-t border-slate-900 pt-4">
        <div className="flex gap-4">
          <span>KERNEL: GNOX-V2.4</span>
          <span>UPTIME: 142:32:05</span>
          <span>LATENCY: 24ms</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-cyan-500" />
          <span>SISTEMA NOMINAL</span>
        </div>
      </div>
    </div>
  );
}
