import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Zap, Lightbulb, Target, TrendingUp, Play, RefreshCw } from "lucide-react";

export default function MissionAI() {
  const [stats, setStats] = useState<any>(null);
  const [openMissions, setOpenMissions] = useState<any[]>([]);
  const [assignedMissions, setAssignedMissions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch mission stats
  const { data: statsData, refetch: refetchStats } = trpc.missionAI.getMissionStats.useQuery();

  // Fetch open missions
  const { data: openData } = trpc.missionAI.getOpenMissions.useQuery();

  // Fetch assigned missions
  const { data: assignedData } = trpc.missionAI.getAssignedMissions.useQuery();

  // Mutations
  const generateMissions = trpc.missionAI.generateProactiveMissions.useMutation({
    onSuccess: () => {
      setIsGenerating(false);
      refetchStats();
    },
  });

  const assignMissions = trpc.missionAI.assignMissionsAutomatically.useMutation({
    onSuccess: () => {
      setIsAssigning(false);
      refetchStats();
    },
  });

  useEffect(() => {
    if (statsData) setStats(statsData);
  }, [statsData]);

  useEffect(() => {
    if (openData) setOpenMissions(openData);
  }, [openData]);

  useEffect(() => {
    if (assignedData) setAssignedMissions(assignedData);
  }, [assignedData]);

  const handleGenerateMissions = async () => {
    setIsGenerating(true);
    await generateMissions.mutateAsync();
  };

  const handleAssignMissions = async () => {
    setIsAssigning(true);
    await assignMissions.mutateAsync();
  };

  const priorityColors: Record<string, string> = {
    critical: "bg-red-900/50 text-red-300 border-red-700",
    high: "bg-orange-900/50 text-orange-300 border-orange-700",
    medium: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    low: "bg-green-900/50 text-green-300 border-green-700",
  };

  const typeColors: Record<string, string> = {
    medical_recovery: "#ef4444",
    productivity: "#3b82f6",
    harmony_sync: "#8b5cf6",
    economic_expansion: "#10b981",
    exploration: "#f59e0b",
  };

  return (
    <div className="space-y-6 p-6 bg-slate-950 min-h-screen text-slate-200 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-400">
            MOTOR DE IA PARA MISSÕES
          </h1>
          <p className="text-slate-500 font-mono text-sm mt-1 uppercase tracking-widest">
            Geração Proativa • Atribuição Inteligente • Otimização de Ecossistema
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleGenerateMissions}
          disabled={isGenerating}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 rounded-lg font-mono text-sm uppercase tracking-wider transition-all"
        >
          <Lightbulb className="w-4 h-4" />
          {isGenerating ? "Gerando..." : "Gerar Missões Proativas"}
        </button>

        <button
          onClick={handleAssignMissions}
          disabled={isAssigning}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50 rounded-lg font-mono text-sm uppercase tracking-wider transition-all"
        >
          <Target className="w-4 h-4" />
          {isAssigning ? "Atribuindo..." : "Atribuir Automaticamente"}
        </button>

        <button
          onClick={() => refetchStats()}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-mono text-sm uppercase tracking-wider transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-cyan-400 uppercase tracking-wider">Abertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.open || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-fuchsia-400 uppercase tracking-wider">Atribuídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.assigned || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Completadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completed || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-amber-400 uppercase tracking-wider">Falhadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.failed || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-orange-400 uppercase tracking-wider">Pool de Recompensas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalRewardPool || 0}</div>
              <p className="text-xs text-slate-500 mt-1">NEX</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Missões por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(stats.missionsByType || {}).map(([type, count]) => ({
                      name: type.replace(/_/g, " "),
                      value: count,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(stats.missionsByType || {}).map((type, index) => (
                      <Cell key={`cell-${index}`} fill={typeColors[type] || "#8884d8"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Distribuição de Prioridade
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(stats.missionsByPriority || {}).map(([priority, count]) => ({
                    priority,
                    count,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="priority" fontSize={12} tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
                  <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Open Missions */}
      {openMissions.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Missões Abertas</CardTitle>
            <CardDescription className="text-slate-500">Aguardando atribuição a agentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {openMissions.slice(0, 10).map((mission) => (
                <div
                  key={mission.missionId}
                  className={`p-4 rounded-lg border-2 ${
                    priorityColors[mission.priority as string] ||
                    "bg-slate-950/50 text-slate-300 border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono font-bold">{mission.title}</div>
                      <div className="text-sm mt-1">{mission.description}</div>
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="bg-slate-800 px-2 py-1 rounded">{mission.type}</span>
                        <span className="bg-slate-800 px-2 py-1 rounded">Dif: {mission.difficulty}</span>
                        <span className="bg-slate-800 px-2 py-1 rounded">Recompensa: {mission.reward} NEX</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assigned Missions */}
      {assignedMissions.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Missões Atribuídas</CardTitle>
            <CardDescription className="text-slate-500">Em progresso com agentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {assignedMissions.slice(0, 10).map((mission) => (
                <div key={mission.missionId} className="p-4 rounded-lg bg-slate-950/50 border border-slate-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono font-bold">{mission.title}</div>
                      {mission.assignedAgent && (
                        <div className="text-sm text-cyan-400 mt-1">
                          Agente: {mission.assignedAgent.name} ({mission.assignedAgent.specialization})
                        </div>
                      )}
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="bg-slate-800 px-2 py-1 rounded">{mission.type}</span>
                        <span className="bg-slate-800 px-2 py-1 rounded">Reputação: {mission.assignedAgent?.reputation || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
