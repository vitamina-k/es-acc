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
import { useToast } from "@/hooks/use-toast";
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
interface GraphNode {
  id: string;
  label: string;
  name: string;
  x: number;
  y: number;
  r: number;
  isCenter: boolean;
  properties: Record<string, unknown>;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
}

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

// ── Graph Visualization (zoomable, interactive) ──
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
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Transform state (zoom + pan)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    node: GraphNode;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Hovered node
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Current drill state
  const currentDrill = drillStack.length > 0 ? drillStack[drillStack.length - 1] : null;

  // Build node & edge lists from either drill data or company subgraph
  const { nodes, edges } = useMemo(() => {
    if (currentDrill) {
      const d = currentDrill.data;
      const allNodes = [
        { id: d.center.id, label: d.center.label, name: d.center.name, properties: d.center.properties },
        ...d.nodes.map((n) => ({ id: n.id, label: n.label, name: n.name, properties: n.properties })),
      ];
      return { nodes: allNodes, edges: d.edges };
    }
    if (!data) return { nodes: [], edges: [] };
    const allNodes = [
      { id: data.center.nif, label: "Company", name: data.center.name, properties: {} as Record<string, unknown> },
      ...data.nodes.map((n) => ({
        id: n.id as string,
        label: ((n.labels as string[]) || [])[0] || "Unknown",
        name: (n.name || n.title || n.debtor_name || n.role || "Sin nombre") as string,
        properties: n as Record<string, unknown>,
      })),
    ];
    const edgeList = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
      properties: e.properties,
    }));
    return { nodes: allNodes, edges: edgeList };
  }, [data, currentDrill]);

  // Compute positions (force-like radial layout)
  const positioned = useMemo<GraphNode[]>(() => {
    if (nodes.length === 0) return [];
    const cx = 450;
    const cy = 300;
    // Group by label for layered radial
    const groups = new Map<string, typeof nodes>();
    nodes.forEach((n, i) => {
      if (i === 0) return; // center
      const g = groups.get(n.label) || [];
      g.push(n);
      groups.set(n.label, g);
    });

    const result: GraphNode[] = [];
    // Center node
    result.push({ ...nodes[0], x: cx, y: cy, r: 30, isCenter: true, properties: nodes[0].properties || {} });

    // Distribute groups in concentric arcs
    let groupIdx = 0;
    const totalGroups = groups.size || 1;
    groups.forEach((members, _label) => {
      const baseAngle = (groupIdx / totalGroups) * 2 * Math.PI - Math.PI / 2;
      const spread = Math.min(((2 * Math.PI) / totalGroups) * 0.85, Math.PI);
      members.forEach((n, mi) => {
        const angleOffset =
          members.length === 1
            ? 0
            : ((mi / (members.length - 1)) - 0.5) * spread;
        const angle = baseAngle + angleOffset;
        const radius = 160 + (mi % 2) * 40; // stagger
        result.push({
          ...n,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          r: 22,
          isCenter: false,
          properties: n.properties || {},
        });
      });
      groupIdx++;
    });
    return result;
  }, [nodes]);

  const posMap = useMemo(() => new Map(positioned.map((p) => [p.id, p])), [positioned]);

  // Reset transform when drill changes
  useEffect(() => {
    setTransform({ x: 0, y: 0, k: 1 });
    setTooltip(null);
    setHoveredId(null);
  }, [currentDrill, data]);

  // ── Zoom with scroll wheel ──
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newK = Math.max(0.3, Math.min(5, transform.k * scaleFactor));

      // Zoom towards mouse
      const dx = mouseX - transform.x;
      const dy = mouseY - transform.y;
      setTransform({
        k: newK,
        x: mouseX - dx * (newK / transform.k),
        y: mouseY - dy * (newK / transform.k),
      });
      setTooltip(null);
    },
    [transform]
  );

  // ── Pan with mouse drag ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // left button only for pan
      // Check if clicking on a node — don't start pan
      const target = e.target as SVGElement;
      if (target.closest("[data-node-id]")) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    },
    [transform]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setTransform((prev) => ({
        ...prev,
        x: panStart.current.tx + dx,
        y: panStart.current.ty + dy,
      }));
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ── Right-click to go back ──
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (drillStack.length > 0) {
        onBack();
      }
    },
    [drillStack, onBack]
  );

  // ── Node hover: tooltip ──
  const handleNodeEnter = useCallback(
    (node: GraphNode, e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setHoveredId(node.id);
      setTooltip({
        node,
        screenX: e.clientX - rect.left,
        screenY: e.clientY - rect.top,
      });
    },
    []
  );

  const handleNodeLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
  }, []);

  // ── Double-click: drill down ──
  const handleNodeDblClick = useCallback(
    (node: GraphNode) => {
      if (!node.isCenter) {
        onDrillDown(node.id);
      }
    },
    [onDrillDown]
  );

  // ── Zoom controls ──
  const zoomIn = () =>
    setTransform((prev) => ({ ...prev, k: Math.min(5, prev.k * 1.3) }));
  const zoomOut = () =>
    setTransform((prev) => ({ ...prev, k: Math.max(0.3, prev.k / 1.3) }));
  const zoomReset = () => setTransform({ x: 0, y: 0, k: 1 });

  // ── Get edges connected to hovered node ──
  const hoveredEdges = useMemo(() => {
    if (!hoveredId) return new Set<number>();
    const s = new Set<number>();
    edges.forEach((e, i) => {
      if (e.source === hoveredId || e.target === hoveredId) s.add(i);
    });
    return s;
  }, [hoveredId, edges]);

  if (positioned.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center text-muted-foreground text-sm">
        <div className="text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No hay datos para visualizar</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: "520px" }}
      onContextMenu={handleContextMenu}
    >
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex gap-1">
        {drillStack.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-8 px-2.5 text-xs gap-1 bg-background/90 backdrop-blur"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Atrás
          </Button>
        )}
      </div>

      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={zoomIn}
          className="h-7 w-7 bg-background/90 backdrop-blur"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={zoomOut}
          className="h-7 w-7 bg-background/90 backdrop-blur"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={zoomReset}
          className="h-7 w-7 bg-background/90 backdrop-blur"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Breadcrumb / drill path */}
      {drillStack.length > 0 && (
        <div className="absolute bottom-3 left-3 right-3 z-20">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-background/90 backdrop-blur rounded-md px-2.5 py-1.5 overflow-x-auto">
            <span className="opacity-60">Raíz</span>
            {drillStack.map((d, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="opacity-40">›</span>
                <span
                  className="font-medium truncate max-w-[140px]"
                  style={{ color: NODE_COLORS[d.data.center.label] || "#666" }}
                >
                  {d.data.center.name}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      {drillStack.length === 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-[10px] text-muted-foreground bg-background/80 backdrop-blur rounded px-2 py-1 flex items-center gap-1.5">
          <MousePointerClick className="w-3 h-3" />
          Doble clic para explorar · Clic derecho para volver
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: isPanning ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <marker
            id="arrow"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill="hsl(var(--muted-foreground))"
              opacity="0.3"
            />
          </marker>
          <marker
            id="arrow-active"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              fill="hsl(var(--foreground))"
              opacity="0.6"
            />
          </marker>
          {/* Glow filter for hovered nodes */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
        >
          {/* Edges */}
          {edges.map((edge, i) => {
            const from = posMap.get(edge.source);
            const to = posMap.get(edge.target);
            if (!from || !to) return null;
            const isHighlighted = hoveredEdges.has(i);
            // Offset for edge label
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            // Perpendicular offset for label
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ox = (-dy / len) * 8;
            const oy = (dx / len) * 8;

            return (
              <g key={`e-${i}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isHighlighted ? "hsl(var(--foreground))" : "hsl(var(--border))"}
                  strokeWidth={isHighlighted ? 2 : 1.2}
                  strokeOpacity={hoveredId && !isHighlighted ? 0.15 : isHighlighted ? 0.7 : 0.4}
                  markerEnd={isHighlighted ? "url(#arrow-active)" : "url(#arrow)"}
                  style={{ transition: "stroke-opacity 0.15s, stroke-width 0.15s" }}
                />
                <text
                  x={mx + ox}
                  y={my + oy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="select-none pointer-events-none"
                  fill={isHighlighted ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                  fontSize={9}
                  fontWeight={isHighlighted ? 600 : 400}
                  opacity={hoveredId && !isHighlighted ? 0.1 : isHighlighted ? 0.9 : 0.5}
                  style={{ transition: "opacity 0.15s" }}
                >
                  {EDGE_LABELS_ES[edge.type] || edge.type.replace(/_/g, " ")}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {positioned.map((node) => {
            const color = NODE_COLORS[node.label] || "#666";
            const dimmed = hoveredId && hoveredId !== node.id && !hoveredEdges.size
              ? true
              : hoveredId && hoveredId !== node.id &&
                !edges.some(
                  (e) =>
                    (e.source === hoveredId && e.target === node.id) ||
                    (e.target === hoveredId && e.source === node.id)
                );
            const isHovered = hoveredId === node.id;

            return (
              <g
                key={node.id}
                data-node-id={node.id}
                style={{ cursor: node.isCenter ? "default" : "pointer" }}
                onMouseEnter={(e) => handleNodeEnter(node, e)}
                onMouseLeave={handleNodeLeave}
                onDoubleClick={() => handleNodeDblClick(node)}
              >
                {/* Hover ring */}
                {isHovered && !node.isCenter && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r + 6}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    opacity={0.6}
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="14"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {/* Shadow */}
                <circle
                  cx={node.x + 1}
                  cy={node.y + 2}
                  r={node.r}
                  fill="black"
                  opacity={0.12}
                />
                {/* Main circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  fill={color}
                  opacity={dimmed ? 0.25 : node.isCenter ? 1 : 0.85}
                  stroke={node.isCenter ? "white" : isHovered ? "white" : "none"}
                  strokeWidth={node.isCenter ? 3 : isHovered ? 2 : 0}
                  filter={isHovered ? "url(#glow)" : undefined}
                  style={{ transition: "opacity 0.15s" }}
                />
                {/* Label inside circle */}
                <text
                  x={node.x}
                  y={node.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={node.isCenter ? 10 : 8}
                  fontWeight={700}
                  className="select-none pointer-events-none"
                  opacity={dimmed ? 0.3 : 1}
                >
                  {node.label.slice(0, 3).toUpperCase()}
                </text>
                {/* Name below */}
                <text
                  x={node.x}
                  y={node.y + node.r + 13}
                  textAnchor="middle"
                  fill="hsl(var(--foreground))"
                  fontSize={10}
                  fontWeight={isHovered ? 600 : 500}
                  className="select-none pointer-events-none"
                  opacity={dimmed ? 0.2 : 1}
                  style={{ transition: "opacity 0.15s" }}
                >
                  {node.name.length > 26 ? node.name.slice(0, 24) + "…" : node.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: Math.min(tooltip.screenX + 14, (containerRef.current?.offsetWidth || 800) - 260),
            top: Math.max(tooltip.screenY - 10, 8),
          }}
        >
          <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[200px] max-w-[260px]">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: NODE_COLORS[tooltip.node.label] || "#666" }}
              />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {NODE_LABELS_ES[tooltip.node.label] || tooltip.node.label}
              </span>
            </div>
            <p className="text-sm font-semibold leading-snug">{tooltip.node.name}</p>
            {/* Properties */}
            {Object.entries(tooltip.node.properties).length > 0 && (
              <div className="mt-2 space-y-0.5">
                {Object.entries(tooltip.node.properties)
                  .filter(([k]) => !["labels", "_source", "id", "name", "title", "debtor_name"].includes(k))
                  .slice(0, 5)
                  .map(([key, val]) => {
                    const formatted = (key === "amount" || key === "importe") ? formatAmount(val) : null;
                    return (
                      <div key={key} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground capitalize">
                          {PROP_KEYS_ES[key] || key.replace(/_/g, " ")}
                        </span>
                        <span className="font-medium ml-2 truncate max-w-[120px]">
                          {formatted || String(val)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
            {!tooltip.node.isCenter && (
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <MousePointerClick className="w-2.5 h-2.5" />
                Doble clic para explorar
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

  const { toast } = useToast();

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
    // Node exists but has no further connections to explore
    toast({
      title: "Sin conexiones adicionales",
      description: `No hay más datos de subgrafo disponibles para este nodo.`,
      duration: 3000,
    });
  }, [toast]);

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
