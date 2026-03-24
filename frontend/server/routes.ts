import type { Express } from "express";
import type { Server } from "http";
import type { MetaResponse, SubgraphResponse, PatternResponse, SearchResultApi } from "@shared/schema";

// URL de la API FastAPI+Neo4j real. Por defecto apunta a localhost para desarrollo local.
// En producción (Render), si no hay API real, cae automáticamente al mock.
const REAL_API = process.env.NEO4J_API_URL || "http://localhost:8000";

// Intenta llamar a la API real. Si falla, devuelve null.
async function tryReal(path: string): Promise<unknown> {
  try {
    const res = await fetch(`${REAL_API}${path}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Convierte type de la API real (lowercase) al label del frontend (PascalCase)
function typeToLabel(type: string): string {
  const map: Record<string, string> = {
    person: "Person", company: "Company", contract: "Contract",
    grant: "Grant", sanction: "Sanction", taxdebt: "TaxDebt",
    publicorgan: "PublicOrgan", publicoffice: "PublicOffice",
    politicalgroup: "PoliticalGroup", investigation: "Investigation",
  };
  return map[type?.toLowerCase()] ?? (type ? type.charAt(0).toUpperCase() + type.slice(1) : "Entity");
}

// Transforma stats de la API real al formato MetaResponse del frontend
function transformStats(raw: Record<string, number>, sources: unknown[]): MetaResponse {
  return {
    total_nodes: raw.total_nodes ?? 0,
    total_relationships: raw.total_relationships ?? 0,
    node_counts: {
      Person: raw.person_count ?? 0,
      Company: raw.company_count ?? 0,
      Contract: raw.contract_count ?? 0,
      Grant: raw.fund_count ?? 0,
      Sanction: raw.sanction_count ?? 0,
      PublicOffice: 0,
      PoliticalGroup: 0,
      PublicOrgan: 0,
      GazetteEntry: 0,
      TaxDebt: 0,
      Investigation: 0,
      Partner: 0,
    },
    sources: Array.isArray(sources)
      ? sources.map((s: unknown) => {
          const src = s as Record<string, unknown>;
          const rawStatus = String(src.status ?? "");
          const status = rawStatus === "loaded" || rawStatus === "healthy" ? "ok"
            : rawStatus === "stale" ? "stale"
            : rawStatus === "blocked_external" ? "error"
            : rawStatus === "quality_fail" ? "error"
            : rawStatus === "ok" ? "ok"
            : "unknown";
          return { ...src, status };
        })
      : [],
  };
}

// Transforma resultados de búsqueda de la API real al formato del frontend
function transformSearch(raw: { results: Array<Record<string, unknown>> }): SearchResultApi[] {
  if (!raw?.results) return [];
  return raw.results.map((r) => {
    const props = (r.properties as Record<string, unknown>) ?? {};
    const snippetParts: string[] = [];
    if (props.provincia || props.province) snippetParts.push(String(props.provincia ?? props.province));
    if (props.fuente) snippetParts.push(String(props.fuente).toUpperCase());
    if (props.cargo) snippetParts.push(String(props.cargo));
    return {
      id: String(r.id),
      label: typeToLabel(String(r.type ?? "")),
      name: String(r.name ?? r.id),
      snippet: snippetParts.join(" — ") || String(r.document ?? ""),
      score: typeof r.score === "number" ? r.score / 10 : 0.5, // normalizar a 0-1
    };
  });
}

// Transforma nodo genérico de la API al formato NodeSubgraph del frontend (drill-down)
function transformNodeSubgraph(
  raw: { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>>; center_id?: string },
  requestedId: string,
): NodeSubgraph {
  const nodes = raw.nodes ?? [];
  const edges = raw.edges ?? [];
  const centerId = String(raw.center_id ?? requestedId);

  const centerNode = nodes.find((n) => String(n.id) === centerId) ?? nodes[0];
  const centerProps = (centerNode?.properties as Record<string, unknown>) ?? {};

  const center = {
    id: centerId,
    label: typeToLabel(String(centerNode?.type ?? "unknown")),
    name: String(centerNode?.label ?? centerProps.nombre ?? centerProps.name ?? centerId),
    properties: centerProps,
  };

  const otherNodes = nodes
    .filter((n) => String(n.id) !== centerId)
    .map((n) => {
      const p = (n.properties as Record<string, unknown>) ?? {};
      return {
        id: String(n.id),
        label: typeToLabel(String(n.type ?? "")),
        name: String(n.label ?? p.nombre ?? p.name ?? p.razon_social ?? n.id),
        properties: p,
      };
    });

  const mappedEdges = edges.map((e) => ({
    source: String(e.source),
    target: String(e.target),
    type: String(e.type),
    properties: (e.properties as Record<string, unknown>) ?? {},
  }));

  return { center, nodes: otherNodes, edges: mappedEdges };
}

// Transforma grafo de la API real al formato SubgraphResponse del frontend
function transformGraph(
  raw: { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> },
  centerNif: string,
): SubgraphResponse {
  const nodes = raw.nodes ?? [];
  const edges = raw.edges ?? [];

  // El centro es el nodo que coincide con el NIF/ID o el primero de la lista
  const centerNode = nodes.find((n) => {
    const props = (n.properties as Record<string, unknown>) ?? {};
    return props.nif === centerNif || n.id === centerNif || n.document_id === centerNif;
  }) ?? nodes[0];

  const centerProps = (centerNode?.properties as Record<string, unknown>) ?? {};

  const center: SubgraphResponse["center"] = {
    nif: String(centerProps.nif ?? centerNif),
    name: String(centerNode?.label ?? centerProps.razon_social ?? centerProps.nombre ?? centerNif),
    status: String(centerProps.estado ?? ""),
    province: String(centerProps.provincia ?? ""),
    labels: [typeToLabel(String(centerNode?.type ?? "company"))],
    properties: centerProps,
  };

  const otherNodes = nodes
    .filter((n) => n.id !== centerNode?.id)
    .map((n) => {
      const p = (n.properties as Record<string, unknown>) ?? {};
      return {
        id: String(n.id),
        labels: [typeToLabel(String(n.type ?? ""))],
        name: String(n.label ?? p.razon_social ?? p.nombre ?? p.name ?? n.id),
        ...p,
      };
    });

  const mappedEdges = edges.map((e) => ({
    source: String(e.source),
    target: String(e.target),
    type: String(e.type),
    properties: (e.properties as Record<string, unknown>) ?? {},
  }));

  return {
    center,
    nodes: otherNodes,
    edges: mappedEdges,
    total_nodes: nodes.length,
    total_edges: edges.length,
  };
}

// ── Generic node subgraph response (for drill-down into any entity) ──
interface NodeSubgraph {
  center: { id: string; label: string; name: string; properties: Record<string, unknown> };
  nodes: Array<{ id: string; label: string; name: string; properties: Record<string, unknown> }>;
  edges: Array<{ source: string; target: string; type: string; properties: Record<string, unknown> }>;
}

// Mock data for standalone frontend demo (when not connected to real FastAPI/Neo4j)
const MOCK_META: MetaResponse = {
  total_nodes: 219_472_831,
  total_relationships: 97_284_102,
  node_counts: {
    Person: 42_381_204,
    Company: 85_102_447,
    Contract: 52_891_233,
    Grant: 8_412_039,
    Sanction: 1_204_892,
    PublicOffice: 2_891,
    PoliticalGroup: 28,
    PublicOrgan: 14_302,
    GazetteEntry: 18_891_402,
    TaxDebt: 6_289,
    Investigation: 4_102,
    Partner: 10_549_002,
  },
  sources: [
    { id: "borme", name: "BORME — Registro Mercantil", category: "Identidad empresarial", frequency: "Diaria", last_run: "2026-03-19T06:00:00Z", record_count: 85_102_447, status: "ok" },
    { id: "contratos_estado", name: "PLACE — Contratación Pública", category: "Contratos", frequency: "Diaria", last_run: "2026-03-19T06:00:00Z", record_count: 52_891_233, status: "ok" },
    { id: "congreso", name: "Congreso de los Diputados", category: "Legislativo", frequency: "Diaria", last_run: "2026-03-19T06:00:00Z", record_count: 350, status: "ok" },
    { id: "senado_es", name: "Senado de España", category: "Legislativo", frequency: "Mensual", last_run: "2026-03-01T06:00:00Z", record_count: 266, status: "ok" },
    { id: "eurodiputados_es", name: "Eurodiputados españoles", category: "Legislativo", frequency: "Mensual", last_run: "2026-03-01T06:00:00Z", record_count: 61, status: "ok" },
    { id: "boe", name: "BOE — Boletín Oficial del Estado", category: "Gaceta oficial", frequency: "Diaria", last_run: "2026-03-19T06:00:00Z", record_count: 18_891_402, status: "ok" },
    { id: "boe_pep", name: "BOE PEP — Altos Cargos", category: "Integridad", frequency: "Mensual", last_run: "2026-03-01T06:00:00Z", record_count: 4_201, status: "ok" },
    { id: "aeat_deudores", name: "AEAT — Grandes deudores", category: "Fiscal", frequency: "Anual", last_run: "2026-01-15T06:00:00Z", record_count: 6_289, status: "ok" },
    { id: "rolece", name: "ROLECE — Licitadores inhabilitados", category: "Contratos", frequency: "Mensual", last_run: "2026-03-01T06:00:00Z", record_count: 892, status: "ok" },
    { id: "bdns", name: "BDNS — Subvenciones", category: "Subvenciones", frequency: "Diaria", last_run: "2026-03-19T06:00:00Z", record_count: 8_412_039, status: "ok" },
    { id: "miteco", name: "MITECO — Sanciones medioambientales", category: "Sanciones", frequency: "Mensual", last_run: "2026-03-01T06:00:00Z", record_count: 3_421, status: "ok" },
    { id: "tribunal_supremo", name: "Tribunal Supremo (CENDOJ)", category: "Integridad judicial", frequency: "Mensual", last_run: "2026-03-01T06:00:00Z", record_count: 4_102, status: "ok" },
    { id: "icij", name: "ICIJ Offshore Leaks", category: "Identidad offshore", frequency: "Anual", last_run: "2025-12-01T06:00:00Z", record_count: 1_102_301, status: "ok" },
    { id: "opensanctions", name: "OpenSanctions", category: "Sanciones", frequency: "Diaria", last_run: "2026-03-19T06:00:00Z", record_count: 892_102, status: "ok" },
    { id: "eu_sanctions", name: "Sanciones UE", category: "Sanciones", frequency: "Semanal", last_run: "2026-03-17T06:00:00Z", record_count: 12_402, status: "ok" },
    { id: "ofac", name: "OFAC SDN List", category: "Sanciones", frequency: "Semanal", last_run: "2026-03-17T06:00:00Z", record_count: 289_201, status: "ok" },
    { id: "un_sanctions", name: "Sanciones ONU", category: "Sanciones", frequency: "Semanal", last_run: "2026-03-17T06:00:00Z", record_count: 7_766, status: "ok" },
    { id: "world_bank", name: "World Bank — Inhabilitados", category: "Sanciones", frequency: "Mensual", last_run: "2026-03-01T06:00:00Z", record_count: 1_892, status: "ok" },
  ],
};

const MOCK_COMPANIES: Record<string, SubgraphResponse> = {
  "B12345678": {
    center: { nif: "B12345678", name: "Construcciones Ibéricas S.L.", status: "Activa", province: "Madrid", labels: ["Company"], properties: {} },
    nodes: [
      { id: "n1", labels: ["Person"], name: "Carlos Martínez López", _source: "congreso" },
      { id: "n2", labels: ["Person"], name: "José Navarro Díaz", _source: "borme" },
      { id: "n3", labels: ["Contract"], title: "Renovación infraestructuras A-3", amount: 4500000 },
      { id: "n4", labels: ["Contract"], title: "Obra civil terminal ferroviaria", amount: 12800000 },
      { id: "n5", labels: ["TaxDebt"], debtor_name: "Construcciones Ibéricas S.L.", amount: 234567.89 },
      { id: "n6", labels: ["PublicOrgan"], name: "Ministerio de Transportes" },
      { id: "n7", labels: ["PublicOrgan"], name: "ADIF Alta Velocidad" },
      { id: "n8", labels: ["PublicOffice"], role: "Diputado/a", institution: "Congreso" },
      { id: "n9", labels: ["PoliticalGroup"], name: "Grupo Parlamentario Popular" },
    ],
    edges: [
      { source: "n1", target: "B12345678", type: "ADMINISTRA", properties: { cargo: "Administrador Único" } },
      { source: "n2", target: "B12345678", type: "ADMINISTRA", properties: { cargo: "Administrador Solidario" } },
      { source: "n3", target: "B12345678", type: "ADJUDICADO_A", properties: {} },
      { source: "n4", target: "B12345678", type: "ADJUDICADO_A", properties: {} },
      { source: "B12345678", target: "n5", type: "TIENE_DEUDA", properties: {} },
      { source: "n6", target: "n3", type: "CONTRATA", properties: {} },
      { source: "n7", target: "n4", type: "CONTRATA", properties: {} },
      { source: "n1", target: "n8", type: "OCUPA_CARGO", properties: {} },
      { source: "n8", target: "n9", type: "PERTENECE_A", properties: {} },
    ],
    total_nodes: 9,
    total_edges: 9,
  },
};

const MOCK_PATTERNS: Record<string, PatternResponse> = {
  "B12345678": {
    nif: "B12345678",
    company_name: "Construcciones Ibéricas S.L.",
    risk_signals: [
      {
        signal_type: "tax_debt",
        severity: "high",
        description: "Construcciones Ibéricas S.L. figura en la lista de deudores de la Agencia Tributaria (AEAT) con una deuda de 234.567,89€ correspondiente al ejercicio 2024. Esta lista se publica anualmente e incluye a entidades con deudas superiores a 600.000€ con Hacienda que no han sido pagadas, aplazadas ni suspendidas. Aparecer en ella indica un incumplimiento fiscal significativo.",
        source: "AEAT — Lista de deudores",
        entity_id: null
      },
      {
        signal_type: "political_conflict",
        severity: "high",
        description: "Carlos Martínez López es simultáneamente Administrador Único de esta empresa y Diputado en el Congreso (Grupo Parlamentario Popular). Esta doble condición de cargo público y administrador de sociedad mercantil constituye un posible conflicto de interés según la Ley 3/2015 de incompatibilidades de altos cargos. Podría influir en la adjudicación de contratos públicos a la empresa que administra.",
        source: "BORME + Congreso",
        entity_id: "n1"
      },
      {
        signal_type: "public_contracts",
        severity: "medium",
        description: "La empresa tiene 2 contratos públicos adjudicados por valor total de 17.300.000€ (Renovación infraestructuras A-3: 4.500.000€ y Obra civil terminal ferroviaria: 12.800.000€), ambos con órganos del Ministerio de Transportes. Dado el conflicto de interés del administrador, estos contratos merecen escrutinio adicional para verificar que la adjudicación se hizo por procedimiento abierto y con competencia real.",
        source: "PLACE — Contratación Pública",
        entity_id: null
      },
    ],
    risk_score: 72,
    connections_summary: { ADMINISTRA: 2, ADJUDICADO_A: 2, TIENE_DEUDA: 1, OCUPA_CARGO: 1 },
  },
};

// ── Node-level subgraphs for drill-down navigation ──
const MOCK_NODE_SUBGRAPHS: Record<string, NodeSubgraph> = {
  // Pedro Sánchez → connections
  "congreso:pedro-sanchez-perez-castejon": {
    center: { id: "congreso:pedro-sanchez-perez-castejon", label: "Person", name: "Pedro Sánchez Pérez-Castejón", properties: { cargo: "Presidente del Gobierno", partido: "PSOE", fuente: "Congreso" } },
    nodes: [
      { id: "boe_pep:maria-jesus-montero", label: "Person", name: "María Jesús Montero Gil", properties: { cargo: "Vicepresidenta Primera" } },
      { id: "boe_pep:fernando-grande-marlaska", label: "Person", name: "Fernando Grande-Marlaska Gómez", properties: { cargo: "Ministro del Interior" } },
      { id: "boe_pep:margarita-robles-fernandez", label: "Person", name: "Margarita Robles Fernández", properties: { cargo: "Ministra de Defensa" } },
      { id: "congreso:yolanda-diaz-perez", label: "Person", name: "Yolanda Díaz Pérez", properties: { cargo: "Vicepresidenta Segunda" } },
      { id: "pg:psoe", label: "PoliticalGroup", name: "Grupo Parlamentario Socialista", properties: {} },
      { id: "org:moncloa", label: "PublicOrgan", name: "Presidencia del Gobierno (Moncloa)", properties: {} },
      { id: "off:presidente", label: "PublicOffice", name: "Presidente del Gobierno", properties: { institución: "Gobierno de España" } },
      { id: "A28015865", label: "Company", name: "Telefónica S.A.", properties: { nota: "Reunión oficial registrada" } },
      { id: "inv:caso-koldo", label: "Investigation", name: "Caso Koldo — Comisión Congreso", properties: { año: 2024 } },
    ],
    edges: [
      { source: "congreso:pedro-sanchez-perez-castejon", target: "off:presidente", type: "OCUPA_CARGO", properties: { desde: "2018-06-02" } },
      { source: "congreso:pedro-sanchez-perez-castejon", target: "pg:psoe", type: "PERTENECE_A", properties: { cargo: "Secretario General" } },
      { source: "congreso:pedro-sanchez-perez-castejon", target: "org:moncloa", type: "DIRIGE", properties: {} },
      { source: "boe_pep:maria-jesus-montero", target: "org:moncloa", type: "MIEMBRO_DE", properties: { cargo: "Vicepresidenta 1ª" } },
      { source: "boe_pep:fernando-grande-marlaska", target: "org:moncloa", type: "MIEMBRO_DE", properties: { cargo: "Ministro" } },
      { source: "boe_pep:margarita-robles-fernandez", target: "org:moncloa", type: "MIEMBRO_DE", properties: { cargo: "Ministra" } },
      { source: "congreso:yolanda-diaz-perez", target: "org:moncloa", type: "MIEMBRO_DE", properties: { cargo: "Vicepresidenta 2ª" } },
      { source: "congreso:pedro-sanchez-perez-castejon", target: "A28015865", type: "REUNIÓN_OFICIAL", properties: { fecha: "2025-11-14" } },
      { source: "congreso:pedro-sanchez-perez-castejon", target: "inv:caso-koldo", type: "INVESTIGADO_EN", properties: { estado: "testigo" } },
    ],
  },
  // María Jesús Montero → connections
  "boe_pep:maria-jesus-montero": {
    center: { id: "boe_pep:maria-jesus-montero", label: "Person", name: "María Jesús Montero Gil", properties: { cargo: "Vicepresidenta Primera y Ministra de Hacienda", fuente: "BOE PEP" } },
    nodes: [
      { id: "congreso:pedro-sanchez-perez-castejon", label: "Person", name: "Pedro Sánchez Pérez-Castejón", properties: { cargo: "Presidente" } },
      { id: "org:hacienda", label: "PublicOrgan", name: "Ministerio de Hacienda", properties: {} },
      { id: "pg:psoe", label: "PoliticalGroup", name: "Grupo Parlamentario Socialista", properties: {} },
      { id: "A28037224", label: "Company", name: "Indra Sistemas S.A.", properties: { nota: "Contrato tecnológico AEAT" } },
      { id: "contract:hacienda-indra-2025", label: "Contract", name: "Modernización sistemas AEAT", properties: { importe: 23400000 } },
    ],
    edges: [
      { source: "boe_pep:maria-jesus-montero", target: "org:hacienda", type: "DIRIGE", properties: {} },
      { source: "boe_pep:maria-jesus-montero", target: "pg:psoe", type: "PERTENECE_A", properties: {} },
      { source: "congreso:pedro-sanchez-perez-castejon", target: "boe_pep:maria-jesus-montero", type: "NOMBRA", properties: {} },
      { source: "org:hacienda", target: "contract:hacienda-indra-2025", type: "CONTRATA", properties: {} },
      { source: "contract:hacienda-indra-2025", target: "A28037224", type: "ADJUDICADO_A", properties: {} },
    ],
  },
  // Feijóo
  "congreso:alberto-nunez-feijoo": {
    center: { id: "congreso:alberto-nunez-feijoo", label: "Person", name: "Alberto Núñez Feijóo", properties: { cargo: "Líder de la oposición", partido: "PP" } },
    nodes: [
      { id: "congreso:cuca-gamarra-ruiz-clavijo", label: "Person", name: "Cuca Gamarra Ruiz-Clavijo", properties: { cargo: "Secretaria General PP" } },
      { id: "pg:gpp", label: "PoliticalGroup", name: "Grupo Parlamentario Popular", properties: {} },
      { id: "off:diputado-feijoo", label: "PublicOffice", name: "Diputado por Madrid", properties: { institución: "Congreso" } },
      { id: "org:xunta", label: "PublicOrgan", name: "Xunta de Galicia", properties: { nota: "Ex-presidente 2009-2022" } },
    ],
    edges: [
      { source: "congreso:alberto-nunez-feijoo", target: "pg:gpp", type: "PERTENECE_A", properties: { cargo: "Presidente PP" } },
      { source: "congreso:alberto-nunez-feijoo", target: "off:diputado-feijoo", type: "OCUPA_CARGO", properties: {} },
      { source: "congreso:cuca-gamarra-ruiz-clavijo", target: "pg:gpp", type: "PERTENECE_A", properties: { cargo: "Secretaria General" } },
      { source: "congreso:alberto-nunez-feijoo", target: "org:xunta", type: "DIRIGIÓ", properties: { desde: 2009, hasta: 2022 } },
    ],
  },
  // ACS
  "A28017895": {
    center: { id: "A28017895", label: "Company", name: "ACS, Actividades de Construcción y Servicios S.A.", properties: { nif: "A28017895", provincia: "Madrid", estado: "Activa" } },
    nodes: [
      { id: "person:florentino-perez", label: "Person", name: "Florentino Pérez", properties: { cargo: "Presidente" } },
      { id: "contract:acs-ave-1", label: "Contract", name: "AVE Madrid-Galicia tramo 4", properties: { importe: 892000000 } },
      { id: "contract:acs-ap7", label: "Contract", name: "Conservación AP-7 Cataluña", properties: { importe: 145000000 } },
      { id: "org:mitma", label: "PublicOrgan", name: "Ministerio de Transportes", properties: {} },
      { id: "org:adif", label: "PublicOrgan", name: "ADIF Alta Velocidad", properties: {} },
      { id: "A08015497", label: "Company", name: "Ferrovial S.E.", properties: { nota: "UTE conjunta" } },
      { id: "debt:acs-aeat", label: "TaxDebt", name: "Deuda AEAT 2024", properties: { importe: 1200000 } },
      { id: "grant:acs-prtr", label: "Grant", name: "Subvención PRTR Digitalización", properties: { importe: 34000000 } },
    ],
    edges: [
      { source: "person:florentino-perez", target: "A28017895", type: "ADMINISTRA", properties: { cargo: "Presidente" } },
      { source: "contract:acs-ave-1", target: "A28017895", type: "ADJUDICADO_A", properties: {} },
      { source: "contract:acs-ap7", target: "A28017895", type: "ADJUDICADO_A", properties: {} },
      { source: "org:adif", target: "contract:acs-ave-1", type: "CONTRATA", properties: {} },
      { source: "org:mitma", target: "contract:acs-ap7", type: "CONTRATA", properties: {} },
      { source: "A28017895", target: "A08015497", type: "SOCIO_UTE", properties: { proyecto: "AVE Tramo 4" } },
      { source: "A28017895", target: "debt:acs-aeat", type: "TIENE_DEUDA", properties: {} },
      { source: "grant:acs-prtr", target: "A28017895", type: "SUBVENCIONADO", properties: {} },
    ],
  },
  // Ferrovial
  "A08015497": {
    center: { id: "A08015497", label: "Company", name: "Ferrovial S.E.", properties: { nif: "A08015497", provincia: "Madrid", estado: "Activa" } },
    nodes: [
      { id: "person:rafael-del-pino", label: "Person", name: "Rafael del Pino", properties: { cargo: "Presidente" } },
      { id: "contract:ferrovial-407etr", label: "Contract", name: "Autopista ETR-407 Toronto", properties: { importe: 3200000000 } },
      { id: "contract:ferrovial-heathrow", label: "Contract", name: "Gestión Heathrow Airport", properties: { importe: 0, nota: "Participación 25%" } },
      { id: "A28017895", label: "Company", name: "ACS S.A.", properties: { nota: "UTE conjunta" } },
      { id: "org:mitma", label: "PublicOrgan", name: "Ministerio de Transportes", properties: {} },
      { id: "sanc:ferrovial-cnmc", label: "Sanction", name: "Sanción CNMC — Cártel asfalto", properties: { importe: 28500000, año: 2022 } },
    ],
    edges: [
      { source: "person:rafael-del-pino", target: "A08015497", type: "ADMINISTRA", properties: { cargo: "Presidente" } },
      { source: "contract:ferrovial-407etr", target: "A08015497", type: "ADJUDICADO_A", properties: {} },
      { source: "contract:ferrovial-heathrow", target: "A08015497", type: "ADJUDICADO_A", properties: {} },
      { source: "A08015497", target: "A28017895", type: "SOCIO_UTE", properties: {} },
      { source: "org:mitma", target: "contract:ferrovial-407etr", type: "CONTRATA", properties: {} },
      { source: "A08015497", target: "sanc:ferrovial-cnmc", type: "SANCIONADA", properties: {} },
    ],
  },
  // Iberdrola
  "A48010615": {
    center: { id: "A48010615", label: "Company", name: "Iberdrola S.A.", properties: { nif: "A48010615", provincia: "Bilbao", estado: "Activa" } },
    nodes: [
      { id: "person:galan", label: "Person", name: "Ignacio Sánchez Galán", properties: { cargo: "Presidente" } },
      { id: "contract:iber-renov", label: "Contract", name: "Parque eólico Burgos-Norte", properties: { importe: 245000000 } },
      { id: "org:miteco", label: "PublicOrgan", name: "MITECO", properties: {} },
      { id: "inv:villarejo-iber", label: "Investigation", name: "Caso Villarejo — Iberdrola", properties: { estado: "en curso" } },
      { id: "grant:iber-eu", label: "Grant", name: "Subvención UE Next Generation", properties: { importe: 120000000 } },
    ],
    edges: [
      { source: "person:galan", target: "A48010615", type: "ADMINISTRA", properties: { cargo: "Presidente" } },
      { source: "contract:iber-renov", target: "A48010615", type: "ADJUDICADO_A", properties: {} },
      { source: "org:miteco", target: "contract:iber-renov", type: "CONTRATA", properties: {} },
      { source: "A48010615", target: "inv:villarejo-iber", type: "INVESTIGADO_EN", properties: {} },
      { source: "grant:iber-eu", target: "A48010615", type: "SUBVENCIONADO", properties: {} },
    ],
  },
  // Carlos Martínez (from B12345678)
  "n1": {
    center: { id: "n1", label: "Person", name: "Carlos Martínez López", properties: { fuente: "Congreso", cargo: "Diputado" } },
    nodes: [
      { id: "B12345678", label: "Company", name: "Construcciones Ibéricas S.L.", properties: { nif: "B12345678" } },
      { id: "n8", label: "PublicOffice", name: "Diputado/a — Congreso", properties: { institución: "Congreso" } },
      { id: "n9", label: "PoliticalGroup", name: "Grupo Parlamentario Popular", properties: {} },
      { id: "contract:cm-asesoria", label: "Contract", name: "Asesoría técnica Ministerio", properties: { importe: 89000 } },
    ],
    edges: [
      { source: "n1", target: "B12345678", type: "ADMINISTRA", properties: { cargo: "Administrador Único" } },
      { source: "n1", target: "n8", type: "OCUPA_CARGO", properties: {} },
      { source: "n8", target: "n9", type: "PERTENECE_A", properties: {} },
      { source: "contract:cm-asesoria", target: "B12345678", type: "ADJUDICADO_A", properties: {} },
    ],
  },
  // Indra
  "A28037224": {
    center: { id: "A28037224", label: "Company", name: "Indra Sistemas S.A.", properties: { nif: "A28037224", provincia: "Madrid", estado: "Activa" } },
    nodes: [
      { id: "person:marc-murtra", label: "Person", name: "Marc Murtra", properties: { cargo: "Presidente" } },
      { id: "contract:indra-defensa", label: "Contract", name: "Sistema de combate F-110", properties: { importe: 340000000 } },
      { id: "contract:indra-elecciones", label: "Contract", name: "Recuento electoral 2023", properties: { importe: 12600000 } },
      { id: "org:defensa", label: "PublicOrgan", name: "Ministerio de Defensa", properties: {} },
      { id: "org:interior", label: "PublicOrgan", name: "Ministerio del Interior", properties: {} },
    ],
    edges: [
      { source: "person:marc-murtra", target: "A28037224", type: "ADMINISTRA", properties: { cargo: "Presidente" } },
      { source: "org:defensa", target: "contract:indra-defensa", type: "CONTRATA", properties: {} },
      { source: "contract:indra-defensa", target: "A28037224", type: "ADJUDICADO_A", properties: {} },
      { source: "org:interior", target: "contract:indra-elecciones", type: "CONTRATA", properties: {} },
      { source: "contract:indra-elecciones", target: "A28037224", type: "ADJUDICADO_A", properties: {} },
    ],
  },
  // Telefónica
  "A28015865": {
    center: { id: "A28015865", label: "Company", name: "Telefónica S.A.", properties: { nif: "A28015865", provincia: "Madrid", estado: "Activa" } },
    nodes: [
      { id: "person:alvarez-pallete", label: "Person", name: "José María Álvarez-Pallete", properties: { cargo: "Presidente" } },
      { id: "contract:tel-sepe", label: "Contract", name: "Infraestructura digital SEPE", properties: { importe: 78000000 } },
      { id: "org:trabajo", label: "PublicOrgan", name: "Ministerio de Trabajo", properties: {} },
      { id: "grant:tel-5g", label: "Grant", name: "Subvención 5G PRTR", properties: { importe: 200000000 } },
    ],
    edges: [
      { source: "person:alvarez-pallete", target: "A28015865", type: "ADMINISTRA", properties: { cargo: "Presidente" } },
      { source: "org:trabajo", target: "contract:tel-sepe", type: "CONTRATA", properties: {} },
      { source: "contract:tel-sepe", target: "A28015865", type: "ADJUDICADO_A", properties: {} },
      { source: "grant:tel-5g", target: "A28015865", type: "SUBVENCIONADO", properties: {} },
    ],
  },
};

const MOCK_SEARCH: SearchResultApi[] = [
  // --- Políticos reales (figuras públicas) ---
  { id: "congreso:pedro-sanchez-perez-castejon", label: "Person", name: "Pedro Sánchez Pérez-Castejón", snippet: "Presidente del Gobierno — Congreso de los Diputados — PSOE", score: 0.99 },
  { id: "congreso:alberto-nunez-feijoo", label: "Person", name: "Alberto Núñez Feijóo", snippet: "Diputado/a — Congreso de los Diputados — GPP (Líder de la oposición)", score: 0.98 },
  { id: "congreso:santiago-abascal-conde", label: "Person", name: "Santiago Abascal Conde", snippet: "Diputado/a — Congreso de los Diputados — GPVOX", score: 0.95 },
  { id: "congreso:yolanda-diaz-perez", label: "Person", name: "Yolanda Díaz Pérez", snippet: "Vicepresidenta Segunda — Congreso de los Diputados — Sumar", score: 0.94 },
  { id: "congreso:cuca-gamarra-ruiz-clavijo", label: "Person", name: "Cuca Gamarra Ruiz-Clavijo", snippet: "Diputado/a — Congreso de los Diputados — GPP (Secretaria General)", score: 0.90 },
  { id: "congreso:gabriel-rufian-romero", label: "Person", name: "Gabriel Rufián Romero", snippet: "Diputado/a — Congreso de los Diputados — ERC", score: 0.88 },
  { id: "congreso:ione-belarra-urteaga", label: "Person", name: "Ione Belarra Urteaga", snippet: "Diputado/a — Congreso de los Diputados — Podemos", score: 0.86 },
  { id: "congreso:aitor-esteban-bravo", label: "Person", name: "Aitor Esteban Bravo", snippet: "Diputado/a — Congreso de los Diputados — PNV", score: 0.84 },
  { id: "congreso:mertxe-aizpurua-arzallus", label: "Person", name: "Mertxe Aizpurua Arzallus", snippet: "Diputado/a — Congreso de los Diputados — EH Bildu", score: 0.82 },
  { id: "congreso:ines-arrimadas-garcia", label: "Person", name: "Inés Arrimadas García", snippet: "Ex-Diputado/a — Congreso de los Diputados — Ciudadanos", score: 0.80 },
  { id: "congreso:alvise-perez", label: "Person", name: "Luis Pérez Fernández (Alvise)", snippet: "Diputado/a — Congreso de los Diputados — Se Acabó la Fiesta", score: 0.78 },
  { id: "boe_pep:maria-jesus-montero", label: "Person", name: "María Jesús Montero Gil", snippet: "Vicepresidenta Primera y Ministra de Hacienda — Gobierno de España", score: 0.93 },
  { id: "boe_pep:fernando-grande-marlaska", label: "Person", name: "Fernando Grande-Marlaska Gómez", snippet: "Ministro del Interior — Gobierno de España", score: 0.91 },
  { id: "boe_pep:margarita-robles-fernandez", label: "Person", name: "Margarita Robles Fernández", snippet: "Ministra de Defensa — Gobierno de España", score: 0.90 },
  { id: "boe_pep:carlos-cuerpo-caballero", label: "Person", name: "Carlos Cuerpo Caballero", snippet: "Ministro de Economía — Gobierno de España", score: 0.89 },
  { id: "eurodiputados:dolors-montserrat", label: "Person", name: "Dolors Montserrat Montserrat", snippet: "Eurodiputada — Parlamento Europeo — PPE", score: 0.76 },
  { id: "eurodiputados:irene-montero", label: "Person", name: "Irene Montero Gil", snippet: "Eurodiputada — Parlamento Europeo — Podemos", score: 0.74 },

  // --- Empresas reales (contratistas públicos conocidos) ---
  { id: "A28017895", label: "Company", name: "ACS, Actividades de Construcción y Servicios S.A.", snippet: "Madrid — Activa — Mayor contratista público de España — 4.812 contratos", score: 0.97 },
  { id: "A08015497", label: "Company", name: "Ferrovial S.E.", snippet: "Madrid — Activa — Infraestructuras y servicios — 2.891 contratos públicos", score: 0.96 },
  { id: "A48010615", label: "Company", name: "Iberdrola S.A.", snippet: "Bilbao — Activa — Energía — 1.204 contratos públicos", score: 0.94 },
  { id: "A28023430", label: "Company", name: "Acciona S.A.", snippet: "Madrid — Activa — Infraestructuras y energía — 2.103 contratos públicos", score: 0.93 },
  { id: "A28004885", label: "Company", name: "FCC, Fomento de Construcciones y Contratas S.A.", snippet: "Madrid — Activa — Construcción y servicios — 3.456 contratos públicos", score: 0.92 },
  { id: "A28037224", label: "Company", name: "Indra Sistemas S.A.", snippet: "Madrid — Activa — Tecnología y defensa — 1.891 contratos públicos", score: 0.91 },
  { id: "A79354442", label: "Company", name: "Sacyr S.A.", snippet: "Madrid — Activa — Construcción e infraestructuras — 1.542 contratos públicos", score: 0.88 },
  { id: "A78374725", label: "Company", name: "OHL (OHLA Group) S.A.", snippet: "Madrid — Activa — Construcción — 891 contratos públicos", score: 0.85 },
  { id: "A28015865", label: "Company", name: "Telefónica S.A.", snippet: "Madrid — Activa — Telecomunicaciones — 2.340 contratos públicos", score: 0.90 },
  { id: "B12345678", label: "Company", name: "Construcciones Ibéricas S.L.", snippet: "Madrid — Activa — 2 contratos públicos, 1 deuda AEAT (demo)", score: 0.50 },
];

// ── Dynamic subgraph builder: reverse-searches all mock subgraphs for connections to a node ──
function inferNodeLabel(id: string): string {
  if (id.startsWith('congreso:') || id.startsWith('boe_pep:') || id.startsWith('person:') || id.startsWith('eurodiputados:')) return 'Person';
  if (id.startsWith('pg:')) return 'PoliticalGroup';
  if (id.startsWith('org:')) return 'PublicOrgan';
  if (id.startsWith('off:')) return 'PublicOffice';
  if (id.startsWith('contract:')) return 'Contract';
  if (id.startsWith('grant:')) return 'Grant';
  if (id.startsWith('debt:')) return 'TaxDebt';
  if (id.startsWith('sanc:')) return 'Sanction';
  if (id.startsWith('inv:')) return 'Investigation';
  if (/^[A-BN]\d{7,8}$/.test(id)) return 'Company';
  return 'Entity';
}

function buildDynamicNodeSubgraph(nodeId: string): NodeSubgraph | null {
  const connectedNodes = new Map<string, NodeSubgraph['nodes'][number]>();
  const connectedEdges: NodeSubgraph['edges'] = [];
  let centerInfo: { label: string; name: string; properties: Record<string, unknown> } | null = null;

  for (const sg of Object.values(MOCK_NODE_SUBGRAPHS)) {
    if (sg.center.id === nodeId) {
      centerInfo = { label: sg.center.label, name: sg.center.name, properties: sg.center.properties };
    }
    for (const n of sg.nodes) {
      if (n.id === nodeId && !centerInfo) {
        centerInfo = { label: n.label, name: n.name, properties: n.properties };
      }
    }
    for (const edge of sg.edges) {
      if (edge.source === nodeId || edge.target === nodeId) {
        const edgeKey = `${edge.source}-${edge.target}-${edge.type}`;
        if (!connectedEdges.some(e => `${e.source}-${e.target}-${e.type}` === edgeKey)) {
          connectedEdges.push(edge);
        }
        const otherId = edge.source === nodeId ? edge.target : edge.source;
        if (!connectedNodes.has(otherId)) {
          const otherSg = MOCK_NODE_SUBGRAPHS[otherId];
          if (otherSg) {
            connectedNodes.set(otherId, { id: otherId, label: otherSg.center.label, name: otherSg.center.name, properties: otherSg.center.properties });
          } else {
            for (const sg2 of Object.values(MOCK_NODE_SUBGRAPHS)) {
              if (sg2.center.id === otherId) { connectedNodes.set(otherId, { id: otherId, label: sg2.center.label, name: sg2.center.name, properties: sg2.center.properties }); break; }
              const found = sg2.nodes.find(n => n.id === otherId);
              if (found) { connectedNodes.set(otherId, found); break; }
            }
            if (!connectedNodes.has(otherId)) {
              const searchEntry = MOCK_SEARCH.find(s => s.id === otherId);
              connectedNodes.set(otherId, { id: otherId, label: searchEntry?.label || inferNodeLabel(otherId), name: searchEntry?.name || otherId, properties: {} });
            }
          }
        }
      }
    }
  }
  if (!centerInfo && connectedEdges.length === 0) return null;
  if (!centerInfo) {
    const searchEntry = MOCK_SEARCH.find(s => s.id === nodeId);
    centerInfo = { label: searchEntry?.label || inferNodeLabel(nodeId), name: searchEntry?.name || nodeId, properties: {} };
  }
  return { center: { id: nodeId, ...centerInfo }, nodes: Array.from(connectedNodes.values()), edges: connectedEdges };
}

export async function registerRoutes(server: Server, app: Express) {
  // Health
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", neo4j: REAL_API, timestamp: new Date().toISOString() });
  });

  // Meta / stats — usa API real, cae a mock si falla
  app.get("/api/v1/public/meta", async (_req, res) => {
    const [statsRaw, sourcesRaw] = await Promise.all([
      tryReal("/api/v1/meta/stats"),
      tryReal("/api/v1/meta/sources"),
    ]);
    if (statsRaw) {
      const sources = (sourcesRaw as { sources?: unknown[] } | null)?.sources ?? [];
      res.json(transformStats(statsRaw as Record<string, number>, sources));
    } else {
      res.json(MOCK_META);
    }
  });

  // Company subgraph — usa API real
  app.get("/api/v1/public/graph/company/:nif", async (req, res) => {
    const nif = req.params.nif;

    // Primero: intenta con mock hardcodeado (demos conocidas)
    const mockData = MOCK_COMPANIES[nif];

    // Luego: intenta API real
    // 1. Obtener entity por NIF
    const entityRaw = await tryReal(`/api/v1/entity/${encodeURIComponent(nif)}`);
    if (entityRaw && (entityRaw as Record<string, unknown>).id) {
      const entityId = (entityRaw as Record<string, unknown>).id as string;
      // 2. Obtener grafo por element_id
      const graphRaw = await tryReal(`/api/v1/graph/${encodeURIComponent(entityId)}`);
      if (graphRaw && (graphRaw as Record<string, unknown>).nodes) {
        res.json(transformGraph(graphRaw as { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> }, nif));
        return;
      }
    }

    // Fallback: mock o vacío
    if (mockData) {
      res.json(mockData);
    } else {
      res.json({
        center: { nif, name: "Empresa no encontrada", status: null, province: null, labels: ["Company"], properties: {} },
        nodes: [], edges: [], total_nodes: 0, total_edges: 0,
      });
    }
  });

  // Node subgraph (drill-down) — usa API real
  app.get("/api/v1/public/graph/node/:id", async (req, res) => {
    const id = req.params.id;

    // Intenta API real primero
    const graphRaw = await tryReal(`/api/v1/graph/${encodeURIComponent(id)}`);
    if (graphRaw && (graphRaw as Record<string, unknown>).nodes) {
      res.json(transformNodeSubgraph(graphRaw as { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>>; center_id?: string }, id));
      return;
    }

    // Fallback: mocks hardcodeados
    const data = MOCK_NODE_SUBGRAPHS[id];
    if (data) { res.json(data); return; }
    const dynamic = buildDynamicNodeSubgraph(id);
    if (dynamic) { res.json(dynamic); return; }

    // Último recurso: placeholder vacío
    const searchEntry = MOCK_SEARCH.find((s) => s.id === id);
    res.json({
      center: { id, label: searchEntry?.label || "Unknown", name: searchEntry?.name || id, properties: {} },
      nodes: [],
      edges: [],
    });
  });

  // Patterns — API real no disponible, devuelve vacío o mock
  app.get("/api/v1/public/patterns/company/:nif", (req, res) => {
    const nif = req.params.nif;
    const data = MOCK_PATTERNS[nif];
    if (data) {
      res.json(data);
    } else {
      res.json({ nif, company_name: null, risk_signals: [], risk_score: 0, connections_summary: {} });
    }
  });

  // Search — usa API real
  app.get("/api/v1/public/search", async (req, res) => {
    const q = (req.query.q as string || "").toLowerCase().trim();
    if (!q || q.length < 2) {
      res.json([]);
      return;
    }

    // Intenta API real
    const realRaw = await tryReal(`/api/v1/search?q=${encodeURIComponent(q)}`);
    if (realRaw && (realRaw as { results?: unknown[] }).results) {
      const transformed = transformSearch(realRaw as { results: Array<Record<string, unknown>> });
      if (transformed.length > 0) {
        res.json(transformed);
        return;
      }
    }

    // Fallback: búsqueda en mock
    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const qNorm = normalize(q);

    const scored = MOCK_SEARCH
      .map((r) => {
        const nameNorm = normalize(r.name);
        const snippetNorm = normalize(r.snippet || "");
        const idNorm = normalize(r.id);
        let matchScore = 0;
        if (nameNorm === qNorm) matchScore = 1.0;
        else if (nameNorm.startsWith(qNorm)) matchScore = 0.9;
        else if (nameNorm.includes(qNorm)) matchScore = 0.8;
        else if (nameNorm.split(/\s+/).some((w) => w.startsWith(qNorm))) matchScore = 0.75;
        else if (snippetNorm.includes(qNorm)) matchScore = 0.6;
        else if (idNorm.includes(qNorm)) matchScore = 0.5;
        else {
          const queryWords = qNorm.split(/\s+/);
          const allText = `${nameNorm} ${snippetNorm} ${idNorm}`;
          if (queryWords.length > 1 && queryWords.every((w) => allText.includes(w))) matchScore = 0.65;
        }
        return { ...r, matchScore };
      })
      .filter((r) => r.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore || b.score - a.score)
      .map(({ matchScore, ...r }) => r);

    res.json(scored);
  });
}
