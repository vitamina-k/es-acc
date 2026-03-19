import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MetaResponse } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  Scale,
  Landmark,
  TrendingUp,
  Shield,
  Globe,
  Database,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = [
  "hsl(210, 80%, 42%)",
  "hsl(38, 90%, 50%)",
  "hsl(160, 50%, 40%)",
  "hsl(280, 55%, 52%)",
  "hsl(0, 72%, 48%)",
  "hsl(190, 60%, 45%)",
  "hsl(340, 60%, 50%)",
  "hsl(90, 45%, 42%)",
];

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es-ES");
}

const NODE_ICONS: Record<string, typeof Building2> = {
  Person: Users,
  Company: Building2,
  Contract: FileText,
  Grant: TrendingUp,
  Sanction: AlertTriangle,
  PublicOffice: Landmark,
  PoliticalGroup: Scale,
  PublicOrgan: Globe,
  TaxDebt: Shield,
};

const NODE_LABELS_ES: Record<string, string> = {
  Company: "Empresa",
  Person: "Persona",
  Contract: "Contrato",
  Grant: "Subvención",
  Sanction: "Sanción",
  PublicOffice: "Cargo Público",
  PoliticalGroup: "Grupo Político",
  PublicOrgan: "Órgano Público",
  TaxDebt: "Deuda Fiscal",
  Investigation: "Investigación",
  GazetteEntry: "Entrada BOE",
  Partner: "Socio",
};

export default function Dashboard() {
  const { data, isLoading } = useQuery<MetaResponse>({
    queryKey: ["/api/v1/public/meta"],
    queryFn: () => apiRequest("GET", "/api/v1/public/meta").then((r) => r.json()),
  });

  const nodeChartData = data
    ? Object.entries(data.node_counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, count]) => ({ name: NODE_LABELS_ES[label] || label, count }))
    : [];

  const categoryData = data
    ? data.sources.reduce(
        (acc, s) => {
          const existing = acc.find((a) => a.name === s.category);
          if (existing) {
            existing.count += s.record_count;
          } else {
            acc.push({ name: s.category, count: s.record_count });
          }
          return acc;
        },
        [] as { name: string; count: number }[]
      )
    : [];

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" data-testid="text-page-title">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Panorama del grafo de transparencia en tiempo real
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Nodos totales",
            value: data?.total_nodes,
            icon: Database,
            color: "text-primary",
          },
          {
            label: "Relaciones",
            value: data?.total_relationships,
            icon: TrendingUp,
            color: "text-amber-500",
          },
          {
            label: "Fuentes activas",
            value: data?.sources.filter((s) => s.status === "ok").length,
            icon: Globe,
            color: "text-emerald-500",
          },
          {
            label: "Empresas",
            value: data?.node_counts.Company,
            icon: Building2,
            color: "text-violet-500",
          },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-4 px-5">
              {isLoading ? (
                <Skeleton className="h-10 w-24" />
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {kpi.label}
                    </p>
                    <p className="text-2xl font-bold mt-1 tabular-nums" data-testid={`kpi-${i}`}>
                      {kpi.value !== undefined ? formatNumber(kpi.value) : "—"}
                    </p>
                  </div>
                  <kpi.icon className={`w-5 h-5 ${kpi.color} opacity-60`} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Node distribution bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Distribución de nodos por tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={nodeChartData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    tickFormatter={formatNumber}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    formatter={(value: number) => [formatNumber(value), "Registros"]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {nodeChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Registros por categoría de fuente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="flex items-center">
                <ResponsiveContainer width="60%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatNumber(value), "Registros"]}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-[40%] space-y-1.5 pl-2">
                  {categoryData.map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground truncate">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sources grid */}
      <div>
        <h2 className="text-sm font-semibold mb-4">Estado de fuentes de datos</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))
            : data?.sources.map((src) => (
                <Card key={src.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`src-${src.id}`}>
                          {src.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatNumber(src.record_count)} registros · {src.frequency}
                        </p>
                      </div>
                      <Badge
                        variant={src.status === "ok" ? "default" : "secondary"}
                        className={`shrink-0 text-[10px] ${
                          src.status === "ok"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {src.status === "ok" ? "Activo" : "Pendiente"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </div>
    </div>
  );
}
