import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MetaResponse } from "@shared/schema";
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
  Radio,
  Activity,
  CheckCircle2,
  Clock,
  Zap,
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

// Neon palette for charts
const CHART_COLORS = [
  "hsl(145, 100%, 50%)",   // neon green
  "hsl(195, 100%, 60%)",   // neon cyan
  "hsl(38, 100%, 60%)",    // amber
  "hsl(280, 100%, 70%)",   // neon purple
  "hsl(0, 100%, 60%)",     // red
  "hsl(60, 100%, 55%)",    // yellow
  "hsl(320, 100%, 65%)",   // pink
  "hsl(170, 100%, 50%)",   // teal
];

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es-ES");
}

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

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="neon-green font-mono text-[10px] tracking-widest select-none">▶</span>
      <div>
        <h2 className="font-mono text-xs font-bold tracking-widest text-foreground uppercase">{label}</h2>
        {sub && <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-[hsl(145,100%,50%,0.3)] to-transparent ml-2" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="kpi-card animate-pulse">
      <div className="h-3 w-16 bg-muted rounded mb-3" />
      <div className="h-8 w-24 bg-muted rounded" />
    </div>
  );
}

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

  const tooltipStyle = {
    background: "hsl(220, 60%, 4%)",
    border: "1px solid hsl(145, 100%, 50%, 0.3)",
    borderRadius: "0px",
    fontSize: "11px",
    fontFamily: "'JetBrains Mono', monospace",
    color: "hsl(145, 100%, 50%)",
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">

      {/* ── Header: Sala de Operaciones ── */}
      <div className="border border-[hsl(145,100%,50%,0.25)] bg-[hsl(220,60%,2%)] p-5 relative overflow-hidden">
        <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="badge-classified">CLASIFICADO</span>
                <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
                  SISTEMA VIGILIA v2.0
                </span>
              </div>
              <h1
                className="font-mono text-2xl font-bold neon-green tracking-widest uppercase"
                data-testid="text-page-title"
              >
                SALA DE OPERACIONES
              </h1>
              <p className="font-mono text-xs text-muted-foreground mt-1 tracking-wide">
                Análisis de transparencia pública · Red de relaciones en tiempo real
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="status-dot-live" />
                <span className="font-mono text-xs neon-green tracking-wide">CONEXIÓN ACTIVA</span>
              </div>
              <div className="flex items-center gap-2">
                <Radio className="w-3 h-3 text-[hsl(38,100%,60%)]" />
                <span className="font-mono text-[10px] text-[hsl(38,100%,60%)] tracking-wide">
                  DATOS EN TIEMPO REAL
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div>
        <SectionHeader label="MÉTRICAS DEL GRAFO" sub="Conteo de nodos y relaciones indexadas" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : [
                {
                  label: "NODOS TOTALES",
                  value: data?.total_nodes,
                  icon: Database,
                  color: "neon-green",
                  accent: "hsl(145,100%,50%)",
                },
                {
                  label: "RELACIONES",
                  value: data?.total_relationships,
                  icon: Activity,
                  color: "text-[hsl(38,100%,60%)]",
                  accent: "hsl(38,100%,60%)",
                },
                {
                  label: "FUENTES ACTIVAS",
                  value: data?.sources.filter((s) => s.status === "ok").length,
                  icon: Globe,
                  color: "text-[hsl(195,100%,60%)]",
                  accent: "hsl(195,100%,60%)",
                },
                {
                  label: "EMPRESAS",
                  value: data?.node_counts.Company,
                  icon: Building2,
                  color: "text-[hsl(280,100%,70%)]",
                  accent: "hsl(280,100%,70%)",
                },
              ].map((kpi, i) => (
                <div
                  key={i}
                  className="kpi-card"
                  style={{ borderTopColor: kpi.accent }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
                      {kpi.label}
                    </span>
                    <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-70`} />
                  </div>
                  <p
                    className={`font-mono text-3xl font-bold tabular-nums ${kpi.color}`}
                    data-testid={`kpi-${i}`}
                    style={{ color: kpi.accent, textShadow: `0 0 20px ${kpi.accent}` }}
                  >
                    {kpi.value !== undefined ? formatNumber(kpi.value) : "—"}
                  </p>
                  <div
                    className="mt-3 h-px"
                    style={{ background: `linear-gradient(to right, ${kpi.accent}40, transparent)` }}
                  />
                </div>
              ))}
        </div>
      </div>

      {/* ── Charts ── */}
      <div>
        <SectionHeader label="ANÁLISIS DE DATOS" sub="Distribución visual del grafo de transparencia" />
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Bar chart */}
          <div className="card-tactical">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] tracking-widest text-foreground uppercase">
                Distribución por tipo de nodo
              </span>
              <span className="badge-operative">GRÁFICO</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-64 w-full bg-muted/30" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={nodeChartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid
                    strokeDasharray="2 4"
                    stroke="hsl(145, 100%, 50%, 0.08)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={formatNumber}
                    tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatNumber(value), "Registros"]}
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "hsl(145, 100%, 50%, 0.05)" }}
                  />
                  <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={20}>
                    {nodeChartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie chart */}
          <div className="card-tactical">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] tracking-widest text-foreground uppercase">
                Registros por categoría de fuente
              </span>
              <span className="badge-operative">ANÁLISIS</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-64 w-full bg-muted/30" />
            ) : (
              <div className="flex items-center">
                <ResponsiveContainer width="55%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={55}
                      strokeWidth={0}
                    >
                      {categoryData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                          opacity={0.85}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatNumber(value), "Registros"]}
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-[45%] space-y-2 pl-3">
                  {categoryData.map((cat, i) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 shrink-0"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="font-mono text-[10px] text-muted-foreground truncate">
                        {cat.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sources table ── */}
      <div>
        <SectionHeader label="ESTADO DE FUENTES" sub="Inventario de fuentes de datos oficiales" />
        <div className="card-tactical overflow-hidden p-0">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 border-b border-[hsl(145,100%,50%,0.15)] bg-[hsl(145,100%,50%,0.04)]">
            {["FUENTE", "CATEGORÍA", "REGISTROS", "ESTADO"].map((h) => (
              <span key={h} className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                {h}
              </span>
            ))}
          </div>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-[hsl(145,100%,50%,0.08)] animate-pulse">
                  <div className="h-3 w-32 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                  <div className="h-3 w-14 bg-muted rounded" />
                </div>
              ))
            : data?.sources.map((src, i) => (
                <div
                  key={src.id}
                  data-testid={`src-${src.id}`}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 border-b border-[hsl(145,100%,50%,0.06)] hover:bg-[hsl(145,100%,50%,0.04)] transition-colors"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-foreground truncate block">
                      {src.name}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {src.frequency}
                    </span>
                  </div>
                  <span
                    className="font-mono text-[10px] text-muted-foreground self-center"
                    style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                  >
                    {src.category}
                  </span>
                  <span className="font-mono text-[11px] neon-green self-center tabular-nums">
                    {formatNumber(src.record_count)}
                  </span>
                  <div className="self-center">
                    {src.status === "ok" ? (
                      <div className="flex items-center gap-1.5">
                        <span className="status-dot-live" />
                        <span className="font-mono text-[10px] neon-green">ACTIVO</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="status-dot-alert" />
                        <span className="font-mono text-[10px] text-[hsl(38,100%,60%)]">PENDIENTE</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* ── Bottom status bar ── */}
      <div className="border border-[hsl(145,100%,50%,0.15)] bg-[hsl(220,60%,2%)] px-4 py-2 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 neon-green" />
            <span className="font-mono text-[10px] text-muted-foreground">
              Sistema operativo al 100%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[hsl(38,100%,60%)]" />
            <span className="font-mono text-[10px] text-muted-foreground">
              Fuentes oficiales verificadas
            </span>
          </div>
        </div>
        <span className="font-mono text-[9px] text-muted-foreground tracking-widest">
          VIGILIA © 2024 · TRANSPARENCIA PÚBLICA ESPAÑOLA
        </span>
      </div>
    </div>
  );
}
