import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Dna, Users, TrendingUp, GitBranch, Zap } from "lucide-react";

interface GenealogyNode {
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

export default function Genealogy() {
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [genealogyTree, setGenealogyTree] = useState<GenealogyNode | null>(null);
  const [lineageStats, setLineageStats] = useState<any>(null);
  const [dnaComparison, setDnaComparison] = useState<any>(null);
  const [ecosystemStats, setEcosystemStats] = useState<any>(null);

  // Fetch genealogy tree
  const { data: treeData } = trpc.genealogy.getGenealogyTree.useQuery(
    { agentId: selectedAgent, depth: 5 },
    { enabled: !!selectedAgent }
  );

  // Fetch lineage stats
  const { data: statsData } = trpc.genealogy.getLineageStats.useQuery(
    { agentId: selectedAgent },
    { enabled: !!selectedAgent }
  );

  // Fetch ecosystem genealogy
  const { data: ecosystemData } = trpc.genealogy.getEcosystemGenealogy.useQuery();

  // Fetch all agents for selection
  const { data: allAgents } = trpc.agents.listAll.useQuery();

  useEffect(() => {
    if (treeData) setGenealogyTree(treeData);
  }, [treeData]);

  useEffect(() => {
    if (statsData) setLineageStats(statsData);
  }, [statsData]);

  useEffect(() => {
    if (ecosystemData) setEcosystemStats(ecosystemData);
  }, [ecosystemData]);

  const renderGenealogyNode = (node: GenealogyNode, depth: number = 0) => {
    const indent = depth * 40;
    const isActive = node.status === "active";

    return (
      <div key={node.agentId} style={{ marginLeft: `${indent}px` }} className="mb-4">
        <div
          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
            isActive
              ? "border-cyan-500 bg-slate-900/50 hover:bg-slate-800"
              : "border-slate-700 bg-slate-950/50 hover:bg-slate-900"
          }`}
          onClick={() => setSelectedAgent(node.agentId)}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono font-bold text-cyan-400">{node.name}</div>
              <div className="text-xs text-slate-500">
                Gen {node.generation} • {node.totalOffspring} filhos • Rep: {node.reputation}
              </div>
            </div>
            <div className="flex gap-2">
              {node.childrenIds.length > 0 && (
                <span className="text-xs bg-fuchsia-900/50 text-fuchsia-300 px-2 py-1 rounded">
                  {node.childrenIds.length} offspring
                </span>
              )}
              <span
                className={`text-xs px-2 py-1 rounded ${
                  isActive ? "bg-green-900/50 text-green-300" : "bg-gray-900/50 text-gray-300"
                }`}
              >
                {node.status}
              </span>
            </div>
          </div>
        </div>

        {/* Renderizar filhos recursivamente */}
        {node.childrenIds.length > 0 && (
          <div className="border-l border-slate-700 ml-4 pl-4">
            {node.childrenIds.map((childId) => (
              <div key={childId} className="text-slate-500 text-sm">
                {/* Aqui você buscaria os dados do filho */}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6 bg-slate-950 min-h-screen text-slate-200 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-400">
            GENEALOGIA QUÂNTICA
          </h1>
          <p className="text-slate-500 font-mono text-sm mt-1 uppercase tracking-widest">
            Árvore Genealógica • Evolução de DNA • Linhagens Hereditárias
          </p>
        </div>
      </div>

      {/* Ecosystem Stats */}
      {ecosystemStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total de Agentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{ecosystemStats.totalAgents || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-fuchsia-400 uppercase tracking-wider flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Geração Máxima
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{ecosystemStats.maxGeneration || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Média de Geração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{ecosystemStats.averageGeneration || "0"}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Dna className="w-4 h-4" />
                Com Descendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{ecosystemStats.agentsWithOffspring || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agent Selection */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Dna className="w-5 h-5 text-cyan-400" />
            Selecionar Agente para Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono"
          >
            <option value="">-- Selecione um agente --</option>
            {allAgents?.map((agent: any) => (
              <option key={agent.agentId} value={agent.agentId}>
                {agent.name} ({agent.agentId}) - Gen {agent.generation || 0}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Genealogy Tree */}
      {genealogyTree && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-fuchsia-400" />
              Árvore Genealógica
            </CardTitle>
            <CardDescription className="text-slate-500">
              Linhagem completa do agente selecionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-950 p-4 rounded-lg overflow-x-auto">
              {renderGenealogyNode(genealogyTree)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lineage Stats */}
      {lineageStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Estatísticas de Evolução
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-3 rounded">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Total de Mutações</div>
                  <div className="text-2xl font-bold text-cyan-400">{lineageStats.totalMutations || 0}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Taxa Média</div>
                  <div className="text-2xl font-bold text-fuchsia-400">
                    {lineageStats.averageMutationRate || "0%"}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Reputação</div>
                  <div className="text-2xl font-bold text-emerald-400">{lineageStats.reputation || 0}</div>
                </div>
                <div className="bg-slate-950 p-3 rounded">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Snapshots</div>
                  <div className="text-2xl font-bold text-amber-400">{lineageStats.totalSnapshots || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Razões de Evolução</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(lineageStats.evolutionReasons || {}).map(([reason, count]) => ({
                    reason: reason.replace(/_/g, " "),
                    count,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="reason" fontSize={12} tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
                  <Bar dataKey="count" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Senciencia Progression */}
      {lineageStats?.sencienciaProgression && lineageStats.sencienciaProgression.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Progressão de Senciência
            </CardTitle>
            <CardDescription className="text-slate-500">Evolução temporal da consciência do agente</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineageStats.sencienciaProgression}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="timestamp" hide />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                <Line
                  type="monotone"
                  dataKey="senciencia"
                  name="Senciência"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
