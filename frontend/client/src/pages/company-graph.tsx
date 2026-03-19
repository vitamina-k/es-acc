import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams } from "wouter";
import type { SubgraphResponse, PatternResponse } from "@shared/schema";
import { getNodeSubgraph, type NodeSubgraph } from "@/lib/mock-graphs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import ForceGraph2D from "react-force-graph-2d";
import {
  Search,
  Building2,
  AlertTriangle,
  Shield,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  MousePointerClick,
} from "lucide-react";

// ── Node styling ──
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
  Investigation: "#dc2626",
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
};

const EDGE_LABELS_ES: Record<string, string> = {
  ADMINISTRA: "Administra",
  ADJUDICADO_A: "Adjudicado a",
  TIENE_DEUDA: "Tiene deuda",
  CONTRATA: "Contrata",
  OCUPA_CARGO: "Ocupa cargo",
  PERTENECE_A: "Pertenece a",
  MIEMBRO_DE: "Miembro de",
  DIRIGE: "Dirige",
  DIRIGIÓ: "Dirigió",
  NOMBRA: "Nombra",
  SOCIO_UTE: "Socio UTE",
  SUBVENCIONADO: "Subvencionado",
  SANCIONADA: "Sancionada",
  INVESTIGADO_EN: "Investigado en",
  REUNIÓN_OFICIAL: "Reunión oficial",
  PRESIDE: "Preside",
  // Fallbacks for any legacy English types that might still appear
  ADMINISTERS: "Administra",
  AWARDED_TO: "Adjudicado a",
  HAS_DEBT: "Tiene deuda",
  CONTRACTS: "Contrata",
  HOLDS_OFFICE: "Ocupa cargo",
  BELONGS_TO: "Pertenece a",
  MEMBER_OF: "Miembro de",
  HEADS: "Dirige",
  PREVIOUSLY_HEADED: "Dirigió",
  APPOINTS: "Nombra",
  UTE_PARTNER: "Socio UTE",
  GRANTED_TO: "Subvencionado",
  SANCTIONED: "Sancionada",
  INVESTIGATED_IN: "Investigado en",
  OFFICIAL_MEETING: "Reunión oficial",
};

const PROP_KEYS_ES: Record<string, string> = {
  role: "cargo",
  cargo: "cargo",
  source: "fuente",
  fuente: "fuente",
  amount: "importe",
  importe: "importe",
  note: "nota",
  nota: "nota",
  party: "partido",
  partido: "partido",
  institution: "institución",
  institución: "institución",
  status: "estado",
  estado: "estado",
  year: "año",
  año: "año",
  since: "desde",
  desde: "desde",
  until: "hasta",
  hasta: "hasta",
  date: "fecha",
  fecha: "fecha",
  from: "desde",
  to: "hasta",
  province: "provincia",
  provincia: "provincia",
  project: "proyecto",
  proyecto: "proyecto",
  nif: "NIF",
};

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
};

// ── Types ──
interface DrillState {
  nodeId: string;
  data: NodeSubgraph;
}

// ── Format money ──
function formatAmount(v: unknown): string | null {
  if (typeof v !== "number" || v === 0) return null;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} mil M€`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} M€`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)} k€`;
  return `${v.toLocaleString("es-ES")} €`;
}

// ── Graph Visualization — Force-directed (react-force-graph-2d) ──
function GraphVisualization({
  data,
  onDrillDown,
  drillStack,
  onBack,
}: {
  data: SubgraphResponse | null;
  onDrillDown: (nodeId: string) => void;
  drillStack: DrillState[];
  onBack: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 520 });
  const [tooltip, setTooltip] = useState<{ node: any; x: number; y: number } | null>(null);
  const fittedRef = useRef(false);
  const zoomRef = useRef(1);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentDrill = drillStack.length > 0 ? drillStack[drillStack.length - 1] : null;

  // Build ForceGraph data from drill state or main subgraph
  const graphData = useMemo(() => {
    if (currentDrill) {
      const d = currentDrill.data;
      return {
        nodes: [
          { id: d.center.id, label: d.center.label, name: d.center.name, isCenter: true, properties: d.center.properties },
          ...d.nodes.map((n) => ({ id: n.id, label: n.label, name: n.name, isCenter: false, properties: n.properties })),
        ],
        links: d.edges.map((e) => ({ source: e.source, target: e.target, type: e.type })),
      };
    }
    if (!data) return { nodes: [], links: [] };
    return {
      nodes: [
        { id: data.center.nif, label: "Company", name: data.center.name, isCenter: true, properties: {} },
        ...data.nodes.map((n) => ({
          id: n.id as string,
          label: ((n.labels as string[]) || [])[0] || "Unknown",
          name: (n.name || n.title || n.debtor_name || n.role || "Sin nombre") as string,
          isCenter: false,
          properties: n as Record<string, unknown>,
        })),
      ],
      links: data.edges.map((e) => ({ source: e.source, target: e.target, type: e.type })),
    };
  }, [data, currentDrill]);

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setDimensions({ width, height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset auto-fit when data changes
  useEffect(() => { fittedRef.current = false; }, [data, currentDrill]);

  // Configure D3 forces
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fg.d3Force("charge") as any)?.strength?.(-280);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fg.d3Force("link") as any)?.distance?.(120);
    fg.d3ReheatSimulation();
  }, [graphData]);

  const handleEngineStop = useCallback(() => {
    if (!fittedRef.current) {
      fittedRef.current = true;
      setTimeout(() => fgRef.current?.zoomToFit(400, 50), 100);
    }
  }, []);

  // Node rendering on canvas
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const { x, y, label, name, isCenter } = node;
    if (x == null || y == null) return;
    const color = NODE_COLORS[label as string] || "#666";
    const r = isCenter ? 14 : 9;

    // Shadow
    ctx.beginPath();
    ctx.arc(x + 1, y + 2, r, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fill();

    // Node circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.globalAlpha = isCenter ? 1 : 0.88;
    ctx.fill();
    ctx.globalAlpha = 1;

    if (isCenter) {
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2.5 / globalScale;
      ctx.stroke();
    }

    // Type abbreviation inside node
    const abbr = (label as string).slice(0, 3).toUpperCase();
    const innerSize = Math.max(6 / globalScale, 3);
    ctx.font = `bold ${innerSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText(abbr, x, y);

    // Name below node
    if (globalScale > 0.4) {
      const labelSize = Math.max(9 / globalScale, 4);
      ctx.font = `${isCenter ? "600 " : ""}${labelSize}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillStyle = "hsl(215 20% 65%)";
      const displayName = name && name.length > 22 ? name.slice(0, 20) + "…" : (name || node.id);
      ctx.fillText(displayName, x, y + r + 3 / globalScale);
    }
  }, []);

  const nodePointerAreaPaint = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    if (node.x == null || node.y == null) return;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.isCenter ? 16 : 11, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  const linkColor = useCallback(() => "rgba(148,163,184,0.35)", []);

  // Double-click detection
  const handleNodeClick = useCallback((node: any) => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      if (clickCountRef.current >= 2 && !node.isCenter) {
        onDrillDown(node.id);
      }
      clickCountRef.current = 0;
    }, 250);
  }, [onDrillDown]);

  const handleNodeHover = useCallback((node: any | null) => {
    if (node && node.x != null) {
      const screen = fgRef.current?.graph2ScreenCoords(node.x, node.y);
      const rect = containerRef.current?.getBoundingClientRect();
      if (screen && rect) {
        setTooltip({ node, x: screen.x - rect.left + 14, y: screen.y - rect.top - 10 });
      }
    } else {
      setTooltip(null);
    }
  }, []);

  const handleZoomIn = useCallback(() => fgRef.current?.zoom(zoomRef.current * 1.4, 300), []);
  const handleZoomOut = useCallback(() => fgRef.current?.zoom(zoomRef.current / 1.4, 300), []);
  const handleFit = useCallback(() => fgRef.current?.zoomToFit(300, 40), []);
  const handleZoom = useCallback((t: { k: number }) => { zoomRef.current = t.k; }, []);

  if (graphData.nodes.length === 0) {
    return (
      <div className="h-[520px] flex items-center justify-center text-muted-foreground text-sm">
        <div className="text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No hay datos para visualizar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: "520px" }}>
      {/* Back button */}
      {drillStack.length > 0 && (
        <div className="absolute top-3 left-3 z-20">
          <Button variant="outline" size="sm" onClick={onBack} className="h-8 px-2.5 text-xs gap-1 bg-background/90 backdrop-blur">
            <ChevronLeft className="w-3.5 h-3.5" /> Atrás
          </Button>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <Button variant="outline" size="icon" onClick={handleZoomIn} className="h-7 w-7 bg-background/90 backdrop-blur">
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut} className="h-7 w-7 bg-background/90 backdrop-blur">
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleFit} className="h-7 w-7 bg-background/90 backdrop-blur">
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Hint */}
      {drillStack.length === 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-[10px] text-muted-foreground bg-background/80 backdrop-blur rounded px-2 py-1 flex items-center gap-1.5">
          <MousePointerClick className="w-3 h-3" /> Doble clic para explorar · Rueda para zoom
        </div>
      )}

      {/* Breadcrumb */}
      {drillStack.length > 0 && (
        <div className="absolute bottom-3 left-3 right-12 z-20">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/90 backdrop-blur rounded-md px-2.5 py-1.5 overflow-x-auto">
            <span className="opacity-60">Raíz</span>
            {drillStack.map((d, i) => (
              <span key={i} className="flex items-center gap-1.5 shrink-0">
                <span className="opacity-40">›</span>
                <span className="font-medium" style={{ color: NODE_COLORS[d.data.center.label] || "#666" }}>
                  {d.data.center.name}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ForceGraph canvas */}
      <div ref={containerRef} className="w-full h-full">
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel=""
          nodeCanvasObject={nodeCanvasObject}
          nodeCanvasObjectMode={() => "replace"}
          nodePointerAreaPaint={nodePointerAreaPaint}
          linkColor={linkColor}
          linkWidth={1.5}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={0.85}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onZoom={handleZoom}
          backgroundColor="rgba(0,0,0,0)"
          cooldownTime={3000}
          d3AlphaDecay={0.03}
          d3VelocityDecay={0.4}
          warmupTicks={20}
          onEngineStop={handleEngineStop}
        />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: Math.min(tooltip.x, dimensions.width - 260),
            top: Math.max(tooltip.y, 8),
          }}
        >
          <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[200px] max-w-[260px]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: NODE_COLORS[tooltip.node.label] || "#666" }} />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {NODE_LABELS_ES[tooltip.node.label] || tooltip.node.label}
              </span>
            </div>
            <p className="text-sm font-semibold leading-snug">{tooltip.node.name}</p>
            {!tooltip.node.isCenter && (
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <MousePointerClick className="w-2.5 h-2.5" /> Doble clic para explorar
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// ── Main Page Component ──
export default function CompanyGraph() {
  const params = useParams<{ nif?: string; drillId?: string }>();
  // drillId is base64-encoded to avoid URL issues with colons
  const drillParam = params.drillId ? (() => { try { return atob(params.drillId!); } catch { return null; } })() : null;
  const hasRealNif = !!params.nif;
  const [nifInput, setNifInput] = useState(params.nif || "B12345678");
  const [activeNif, setActiveNif] = useState(params.nif || "B12345678");
  const [drillStack, setDrillStack] = useState<DrillState[]>([]);
  const [initialDrillDone, setInitialDrillDone] = useState(false);

  const { data: graph, isLoading: graphLoading } = useQuery<SubgraphResponse>({
    queryKey: ["/api/v1/public/graph/company", activeNif],
    queryFn: () =>
      apiRequest("GET", `/api/v1/public/graph/company/${activeNif}`).then((r) =>
        r.json()
      ),
    enabled: !!activeNif,
  });

  const { data: patterns, isLoading: patternsLoading } = useQuery<PatternResponse>({
    queryKey: ["/api/v1/public/patterns/company", activeNif],
    queryFn: () =>
      apiRequest("GET", `/api/v1/public/patterns/company/${activeNif}`).then(
        (r) => r.json()
      ),
    // Don't fetch patterns for the default NIF when in drill mode (no real NIF)
    enabled: !!activeNif && (hasRealNif || drillStack.length === 0),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (nifInput.trim()) {
      setActiveNif(nifInput.trim().toUpperCase());
      setDrillStack([]);
    }
  };

  // Auto-drill from search page link (runs once on mount)
  useEffect(() => {
    if (drillParam && !initialDrillDone) {
      setInitialDrillDone(true);
      const localData = getNodeSubgraph(drillParam);
      if (localData && localData.nodes.length > 0) {
        setDrillStack([{ nodeId: drillParam, data: localData }]);
      }
    }
  }, [drillParam, initialDrillDone]);

  // Drill down into a node (uses client-side data, works on static deploy)
  const handleDrillDown = useCallback(async (nodeId: string) => {
    // Try client-side mock data first (works on static deploy)
    const localData = getNodeSubgraph(nodeId);
    if (localData && localData.nodes.length > 0) {
      setDrillStack((prev) => [...prev, { nodeId, data: localData }]);
      return;
    }
    // Fallback to API (works when Express server is running)
    try {
      const resp = await apiRequest("GET", `/api/v1/public/graph/node/${encodeURIComponent(nodeId)}`);
      const data: NodeSubgraph = await resp.json();
      if (data.nodes && data.nodes.length > 0) {
        setDrillStack((prev) => [...prev, { nodeId, data }]);
        return;
      }
    } catch {
      // API unavailable (static deploy) — already tried client-side above
    }
  }, []);

  // Go back one level
  const handleBack = useCallback(() => {
    setDrillStack((prev) => prev.slice(0, -1));
  }, []);

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
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Subgrafo
                {graph && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {drillStack.length > 0
                      ? `${drillStack[drillStack.length - 1].data.nodes.length + 1} nodos · ${drillStack[drillStack.length - 1].data.edges.length} aristas`
                      : `${graph.total_nodes} nodos · ${graph.total_edges} aristas`}
                  </Badge>
                )}
                {drillStack.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    Nivel {drillStack.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {graphLoading ? (
                <Skeleton className="h-[520px] w-full" />
              ) : graph && graph.total_nodes > 0 ? (
                <GraphVisualization
                  data={graph}
                  onDrillDown={handleDrillDown}
                  drillStack={drillStack}
                  onBack={handleBack}
                />
              ) : (
                <div className="h-[520px] flex items-center justify-center text-muted-foreground text-sm">
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
              <div
                key={label}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: color }}
                />
                {NODE_LABELS_ES[label] || label}
              </div>
            ))}
          </div>
        </div>

        {/* Risk analysis panel */}
        <div className="space-y-4">
          {/* Drill info card */}
          {drillStack.length > 0 && (
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: NODE_COLORS[drillStack[drillStack.length - 1].data.center.label] || "#666" }}
                  />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {NODE_LABELS_ES[drillStack[drillStack.length - 1].data.center.label] || drillStack[drillStack.length - 1].data.center.label}
                  </span>
                </div>
                <p className="text-sm font-semibold">
                  {drillStack[drillStack.length - 1].data.center.name}
                </p>
                {Object.entries(drillStack[drillStack.length - 1].data.center.properties)
                  .filter(([k]) => !["id", "labels"].includes(k))
                  .slice(0, 4)
                  .map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-xs mt-1">
                      <span className="text-muted-foreground capitalize">{PROP_KEYS_ES[key] || key.replace(/_/g, " ")}</span>
                      <span className="font-medium">{(key === "amount" || key === "importe") ? (formatAmount(val) || String(val)) : String(val)}</span>
                    </div>
                  ))}
                <div className="mt-2 flex gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {drillStack[drillStack.length - 1].data.nodes.length} conexiones
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    Nivel {drillStack.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Company info */}
          {graph?.center && drillStack.length === 0 && (
            <Card>
              <CardContent className="p-4">
                <p
                  className="text-sm font-semibold"
                  data-testid="text-company-name"
                >
                  {graph.center.name}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  NIF: {graph.center.nif}
                </p>
                <div className="flex gap-2 mt-2">
                  {graph.center.status && (
                    <Badge variant="outline" className="text-[10px]">
                      {graph.center.status}
                    </Badge>
                  )}
                  {graph.center.province && (
                    <Badge variant="outline" className="text-[10px]">
                      {graph.center.province}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk score — hide when in drill mode without a real NIF to avoid showing unrelated data */}
          {(hasRealNif || drillStack.length === 0) && <Card>
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
                      <span className="text-muted-foreground">
                        Puntuación de riesgo
                      </span>
                      <span
                        className="font-bold tabular-nums"
                        data-testid="text-risk-score"
                      >
                        {patterns.risk_score}/100
                      </span>
                    </div>
                    <Progress value={patterns.risk_score} className="h-2" />
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
                            {{ tax_debt: "Deuda tributaria", sanction: "Sanción", offshore: "Conexión offshore", no_bid_contract: "Contrato sin concurso", political_conflict: "Conflicto de interés político", public_contracts: "Contratos públicos bajo sospecha" }[signal.signal_type] || signal.signal_type}
                          </div>
                          <p className="leading-relaxed">
                            {signal.description}
                          </p>
                          <p className="text-[10px] opacity-70 mt-1">
                            Fuente: {signal.source}
                          </p>
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
                        {Object.entries(patterns.connections_summary).map(
                          ([type, count]) => (
                            <div
                              key={type}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-muted-foreground">
                                {EDGE_LABELS_ES[type] || type.replace(/_/g, " ")}
                              </span>
                              <span className="font-mono font-medium">
                                {count}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>}
        </div>
      </div>
    </div>
  );
}
