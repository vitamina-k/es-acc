import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams } from "wouter";
import type { SubgraphResponse, PatternResponse } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Building2,
  User,
  FileText,
  AlertTriangle,
  Shield,
  Landmark,
  Scale,
  Globe,
  Banknote,
  Eye,
  ArrowRight,
} from "lucide-react";

const NODE_COLORS: Record<string, string> = {
  Company: "#3b82f6",
  Person: "#f59e0b",
  Contract: "#10b981",
  Grant: "#8b5cf6",
  Sanction: "#ef4444",
  PublicOffice: "#06b6d4",
  PoliticalGroup: "#ec4899",
  PublicOrgan: "#6366f1",
  TaxDebt: "#f97316",
};

const NODE_ICONS: Record<string, typeof Building2> = {
  Company: Building2,
  Person: User,
  Contract: FileText,
  Grant: Banknote,
  Sanction: AlertTriangle,
  PublicOffice: Landmark,
  PoliticalGroup: Scale,
  PublicOrgan: Globe,
  TaxDebt: Shield,
};

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
};

function GraphVisualization({ data }: { data: SubgraphResponse }) {
  // Canvas-based simple force-directed graph visualization
  const allNodes = [
    { id: data.center.nif, label: "Company", name: data.center.name },
    ...data.nodes.map((n) => ({
      id: n.id as string,
      label: ((n.labels as string[]) || [])[0] || "Unknown",
      name: (n.name || n.title || n.debtor_name || n.role || "Sin nombre") as string,
    })),
  ];

  // Position nodes in a radial layout
  const cx = 400;
  const cy = 250;
  const radius = 180;

  const positions = allNodes.map((n, i) => {
    if (i === 0) return { ...n, x: cx, y: cy };
    const angle = ((i - 1) / (allNodes.length - 1)) * 2 * Math.PI;
    return {
      ...n,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  const posMap = new Map(positions.map((p) => [p.id, p]));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox="0 0 800 500" className="w-full h-auto min-h-[400px]" style={{ maxHeight: "500px" }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--muted-foreground))" opacity="0.4" />
          </marker>
        </defs>

        {/* Edges */}
        {data.edges.map((edge, i) => {
          const from = posMap.get(edge.source) || posMap.get(data.center.nif);
          const to = posMap.get(edge.target) || posMap.get(data.center.nif);
          if (!from || !to) return null;
          return (
            <g key={`e-${i}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="hsl(var(--border))"
                strokeWidth="1.5"
                markerEnd="url(#arrow)"
              />
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 6}
                textAnchor="middle"
                className="text-[9px] fill-muted-foreground"
              >
                {edge.type}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {positions.map((node) => {
          const color = NODE_COLORS[node.label] || "#666";
          const isCenter = node.id === data.center.nif;
          const r = isCenter ? 28 : 20;
          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={color}
                opacity={isCenter ? 1 : 0.8}
                stroke={isCenter ? "white" : "none"}
                strokeWidth={isCenter ? 2 : 0}
              />
              <text
                x={node.x}
                y={node.y + r + 14}
                textAnchor="middle"
                className="text-[10px] fill-foreground font-medium"
              >
                {node.name.length > 24 ? node.name.slice(0, 22) + "..." : node.name}
              </text>
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                className="text-[9px] fill-white font-bold"
              >
                {node.label.slice(0, 3).toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function CompanyGraph() {
  const params = useParams<{ nif?: string }>();
  const [nifInput, setNifInput] = useState(params.nif || "B12345678");
  const [activeNif, setActiveNif] = useState(params.nif || "B12345678");

  const { data: graph, isLoading: graphLoading } = useQuery<SubgraphResponse>({
    queryKey: ["/api/v1/public/graph/company", activeNif],
    queryFn: () =>
      apiRequest("GET", `/api/v1/public/graph/company/${activeNif}`).then((r) => r.json()),
    enabled: !!activeNif,
  });

  const { data: patterns, isLoading: patternsLoading } = useQuery<PatternResponse>({
    queryKey: ["/api/v1/public/patterns/company", activeNif],
    queryFn: () =>
      apiRequest("GET", `/api/v1/public/patterns/company/${activeNif}`).then((r) => r.json()),
    enabled: !!activeNif,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (nifInput.trim()) setActiveNif(nifInput.trim().toUpperCase());
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-page-title">
          Explorador de grafos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualiza las conexiones de una empresa por su NIF/CIF
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-nif"
            type="text"
            placeholder="Introduce NIF/CIF (ej: B12345678)"
            className="pl-9 h-10 text-sm font-mono"
            value={nifInput}
            onChange={(e) => setNifInput(e.target.value)}
          />
        </div>
        <Button type="submit" data-testid="btn-search-nif" className="h-10">
          <Eye className="w-4 h-4 mr-1.5" />
          Explorar
        </Button>
      </form>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Graph visualization */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Subgrafo
                {graph && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {graph.total_nodes} nodos · {graph.total_edges} aristas
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {graphLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : graph && graph.total_nodes > 0 ? (
                <GraphVisualization data={graph} />
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center">
                    <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>No se encontraron datos para {activeNif}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Node legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {Object.entries(NODE_COLORS).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Risk analysis panel */}
        <div className="space-y-4">
          {/* Company info */}
          {graph?.center && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold" data-testid="text-company-name">
                  {graph.center.name}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  NIF: {graph.center.nif}
                </p>
                <div className="flex gap-2 mt-2">
                  {graph.center.status && (
                    <Badge variant="outline" className="text-[10px]">{graph.center.status}</Badge>
                  )}
                  {graph.center.province && (
                    <Badge variant="outline" className="text-[10px]">{graph.center.province}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Análisis de riesgo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {patternsLoading ? (
                <Skeleton className="h-32" />
              ) : patterns ? (
                <>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Puntuación de riesgo</span>
                      <span className="font-bold tabular-nums" data-testid="text-risk-score">
                        {patterns.risk_score}/100
                      </span>
                    </div>
                    <Progress
                      value={patterns.risk_score}
                      className="h-2"
                    />
                  </div>

                  {/* Risk signals */}
                  <div className="space-y-2 mt-3">
                    {patterns.risk_signals.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No se detectaron señales de riesgo
                      </p>
                    ) : (
                      patterns.risk_signals.map((signal, i) => (
                        <div
                          key={i}
                          data-testid={`signal-${i}`}
                          className={`p-2.5 rounded-lg border text-xs ${SEVERITY_STYLES[signal.severity] || SEVERITY_STYLES.low}`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            {signal.signal_type === "tax_debt"
                              ? "Deuda tributaria"
                              : signal.signal_type === "sanction"
                              ? "Sanción"
                              : signal.signal_type === "offshore"
                              ? "Conexión offshore"
                              : signal.signal_type === "no_bid_contract"
                              ? "Contrato sin concurso"
                              : signal.signal_type}
                          </div>
                          <p className="leading-relaxed">{signal.description}</p>
                          <p className="text-[10px] opacity-70 mt-1">Fuente: {signal.source}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Connections summary */}
                  {Object.keys(patterns.connections_summary).length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Conexiones
                      </p>
                      <div className="space-y-1">
                        {Object.entries(patterns.connections_summary).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{type}</span>
                            <span className="font-mono font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
