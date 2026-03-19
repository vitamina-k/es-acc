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
    const q = (req.query.q as string || "").toLowerCase().trim();
    if (!q || q.length < 2) {
      res.json([]);
      return;
    }

    // Normalize search: remove accents for fuzzy matching
    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const qNorm = normalize(q);

    const scored = MOCK_SEARCH
      .map((r) => {
        const nameNorm = normalize(r.name);
        const snippetNorm = normalize(r.snippet || "");
        const idNorm = normalize(r.id);
        let matchScore = 0;

        // Exact name match
        if (nameNorm === qNorm) matchScore = 1.0;
        // Name starts with query
        else if (nameNorm.startsWith(qNorm)) matchScore = 0.9;
        // Name contains query
        else if (nameNorm.includes(qNorm)) matchScore = 0.8;
        // Any word in name starts with query
        else if (nameNorm.split(/\s+/).some((w) => w.startsWith(qNorm))) matchScore = 0.75;
        // Snippet contains query
        else if (snippetNorm.includes(qNorm)) matchScore = 0.6;
        // ID contains query
        else if (idNorm.includes(qNorm)) matchScore = 0.5;
        // Multi-word: all query words appear somewhere
        else {
          const queryWords = qNorm.split(/\s+/);
          const allText = `${nameNorm} ${snippetNorm} ${idNorm}`;
          if (queryWords.length > 1 && queryWords.every((w) => allText.includes(w))) {
            matchScore = 0.65;
          }
        }

        return { ...r, matchScore };
      })
      .filter((r) => r.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore || b.score - a.score)
      .map(({ matchScore, ...r }) => r);

    res.json(scored);
  });
}
