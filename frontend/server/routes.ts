import type { Express } from "express";
import type { Server } from "http";
import type { MetaResponse, SubgraphResponse, PatternResponse, SearchResultApi } from "@shared/schema";

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
      { source: "n1", target: "B12345678", type: "ADMINISTERS", properties: { role: "Administrador Único" } },
      { source: "n2", target: "B12345678", type: "ADMINISTERS", properties: { role: "Administrador Solidario" } },
      { source: "n3", target: "B12345678", type: "AWARDED_TO", properties: {} },
      { source: "n4", target: "B12345678", type: "AWARDED_TO", properties: {} },
      { source: "B12345678", target: "n5", type: "HAS_DEBT", properties: {} },
      { source: "n6", target: "n3", type: "CONTRACTS", properties: {} },
      { source: "n7", target: "n4", type: "CONTRACTS", properties: {} },
      { source: "n1", target: "n8", type: "HOLDS_OFFICE", properties: {} },
      { source: "n8", target: "n9", type: "BELONGS_TO", properties: {} },
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
      { signal_type: "tax_debt", severity: "high", description: "Deuda tributaria: 234.567,89€ (AEAT 2024)", source: "AEAT", entity_id: null },
      { signal_type: "no_bid_contract", severity: "medium", description: "Administrador con cargo político activo (Diputado/a — Congreso)", source: "BORME + Congreso", entity_id: null },
    ],
    risk_score: 45,
    connections_summary: { ADMINISTERS: 2, AWARDED_TO: 2, HAS_DEBT: 1, HOLDS_OFFICE: 1 },
  },
};

const MOCK_SEARCH: SearchResultApi[] = [
  { id: "B12345678", label: "Company", name: "Construcciones Ibéricas S.L.", snippet: "Madrid — Activa — 2 contratos públicos, 1 deuda AEAT", score: 0.95 },
  { id: "A87654321", label: "Company", name: "Tecnologías Avanzadas S.A.", snippet: "Barcelona — Activa — 2 contratos públicos", score: 0.82 },
  { id: "demo:carlos-martinez", label: "Person", name: "Carlos Martínez López", snippet: "Diputado/a — Congreso de los Diputados — GPP", score: 0.78 },
  { id: "B11223344", label: "Company", name: "Servicios Globales del Levante S.L.", snippet: "Valencia — Activa — 1 subvención", score: 0.65 },
  { id: "A44332211", label: "Company", name: "Infraestructuras Mediterráneo S.A.", snippet: "Málaga — Activa — Sanción medioambiental MITECO", score: 0.60 },
  { id: "demo:maria-garcia", label: "Person", name: "María García Fernández", snippet: "Senador/a — Senado de España — GPS", score: 0.55 },
];

export async function registerRoutes(server: Server, app: Express) {
  // Health
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", neo4j: "mock", timestamp: new Date().toISOString() });
  });

  // Meta / stats
  app.get("/api/v1/public/meta", (_req, res) => {
    res.json(MOCK_META);
  });

  // Company subgraph
  app.get("/api/v1/public/graph/company/:nif", (req, res) => {
    const nif = req.params.nif;
    const data = MOCK_COMPANIES[nif];
    if (data) {
      res.json(data);
    } else {
      res.json({
        center: { nif, name: "Empresa no encontrada", status: null, province: null, labels: ["Company"], properties: {} },
        nodes: [], edges: [], total_nodes: 0, total_edges: 0,
      });
    }
  });

  // Patterns
  app.get("/api/v1/public/patterns/company/:nif", (req, res) => {
    const nif = req.params.nif;
    const data = MOCK_PATTERNS[nif];
    if (data) {
      res.json(data);
    } else {
      res.json({ nif, company_name: null, risk_signals: [], risk_score: 0, connections_summary: {} });
    }
  });

  // Search
  app.get("/api/v1/public/search", (req, res) => {
    const q = (req.query.q as string || "").toLowerCase();
    const filtered = MOCK_SEARCH.filter(
      (r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
    res.json(filtered.length > 0 ? filtered : MOCK_SEARCH);
  });
}
