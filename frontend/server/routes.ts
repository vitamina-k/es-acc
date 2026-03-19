import type { Express } from "express";
import type { Server } from "http";
import type { MetaResponse, SubgraphResponse, PatternResponse, SearchResultApi } from "@shared/schema";

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

// ── Node-level subgraphs for drill-down navigation ──
const MOCK_NODE_SUBGRAPHS: Record<string, NodeSubgraph> = {
  // Pedro Sánchez → connections
  "congreso:pedro-sanchez-perez-castejon": {
    center: { id: "congreso:pedro-sanchez-perez-castejon", label: "Person", name: "Pedro Sánchez Pérez-Castejón", properties: { role: "Presidente del Gobierno", party: "PSOE", source: "Congreso" } },
    nodes: [
      { id: "boe_pep:maria-jesus-montero", label: "Person", name: "María Jesús Montero Gil", properties: { role: "Vicepresidenta Primera" } },
      { id: "boe_pep:fernando-grande-marlaska", label: "Person", name: "Fernando Grande-Marlaska Gómez", properties: { role: "Ministro del Interior" } },
      { id: "boe_pep:margarita-robles-fernandez", label: "Person", name: "Margarita Robles Fernández", properties: { role: "Ministra de Defensa" } },
      { id: "congreso:yolanda-diaz-perez", label: "Person", name: "Yolanda Díaz Pérez", properties: { role: "Vicepresidenta Segunda" } },
      { id: "pg:psoe", label: "PoliticalGroup", name: "Grupo Parlamentario Socialista", properties: {} },
      { id: "org:moncloa", label: "PublicOrgan", name: "Presidencia del Gobierno (Moncloa)", properties: {} },
      { id: "off:presidente", label: "PublicOffice", name: "Presidente del Gobierno", properties: { institution: "Gobierno de España" } },
      { id: "A28015865", label: "Company", name: "Telefónica S.A.", properties: { note: "Reunión oficial registrada" } },
      { id: "inv:caso-koldo", label: "Investigation", name: "Caso Koldo — Comisión Congreso", properties: { year: 2024 } },
    ],
    edges: [
      { source: "congreso:pedro-sanchez-perez-castejon", target: "off:presidente", type: "HOLDS_OFFICE", properties: { since: "2018-06-02" } },
      { source: "congreso:pedro-sanchez-perez-castejon", target: "pg:psoe", type: "BELONGS_TO", properties: { role: "Secretario General" } },
      { source: "congreso:pedro-sanchez-perez-castejon", target: "org:moncloa", type: "HEADS", properties: {} },
      { source: "boe_pep:maria-jesus-montero", target: "org:moncloa", type: "MEMBER_OF", properties: { role: "Vicepresidenta 1ª" } },
      { source: "boe_pep:fernando-grande-marlaska", target: "org:moncloa", type: "MEMBER_OF", properties: { role: "Ministro" } },
      { source: "boe_pep:margarita-robles-fernandez", target: "org:moncloa", type: "MEMBER_OF", properties: { role: "Ministra" } },
      { source: "congreso:yolanda-diaz-perez", target: "org:moncloa", type: "MEMBER_OF", properties: { role: "Vicepresidenta 2ª" } },
      { source: "congreso:pedro-sanchez-perez-castejon", target: "A28015865", type: "OFFICIAL_MEETING", properties: { date: "2025-11-14" } },
      { source: "congreso:pedro-sanchez-perez-castejon", target: "inv:caso-koldo", type: "INVESTIGATED_IN", properties: { status: "testigo" } },
    ],
  },
  // María Jesús Montero → connections
  "boe_pep:maria-jesus-montero": {
    center: { id: "boe_pep:maria-jesus-montero", label: "Person", name: "María Jesús Montero Gil", properties: { role: "Vicepresidenta Primera y Ministra de Hacienda", source: "BOE PEP" } },
    nodes: [
      { id: "congreso:pedro-sanchez-perez-castejon", label: "Person", name: "Pedro Sánchez Pérez-Castejón", properties: { role: "Presidente" } },
      { id: "org:hacienda", label: "PublicOrgan", name: "Ministerio de Hacienda", properties: {} },
      { id: "pg:psoe", label: "PoliticalGroup", name: "Grupo Parlamentario Socialista", properties: {} },
      { id: "A28037224", label: "Company", name: "Indra Sistemas S.A.", properties: { note: "Contrato tecnológico AEAT" } },
      { id: "contract:hacienda-indra-2025", label: "Contract", name: "Modernización sistemas AEAT", properties: { amount: 23400000 } },
    ],
    edges: [
      { source: "boe_pep:maria-jesus-montero", target: "org:hacienda", type: "HEADS", properties: {} },
      { source: "boe_pep:maria-jesus-montero", target: "pg:psoe", type: "BELONGS_TO", properties: {} },
      { source: "congreso:pedro-sanchez-perez-castejon", target: "boe_pep:maria-jesus-montero", type: "APPOINTS", properties: {} },
      { source: "org:hacienda", target: "contract:hacienda-indra-2025", type: "CONTRACTS", properties: {} },
      { source: "contract:hacienda-indra-2025", target: "A28037224", type: "AWARDED_TO", properties: {} },
    ],
  },
  // Feijóo
  "congreso:alberto-nunez-feijoo": {
    center: { id: "congreso:alberto-nunez-feijoo", label: "Person", name: "Alberto Núñez Feijóo", properties: { role: "Líder de la oposición", party: "PP" } },
    nodes: [
      { id: "congreso:cuca-gamarra-ruiz-clavijo", label: "Person", name: "Cuca Gamarra Ruiz-Clavijo", properties: { role: "Secretaria General PP" } },
      { id: "pg:gpp", label: "PoliticalGroup", name: "Grupo Parlamentario Popular", properties: {} },
      { id: "off:diputado-feijoo", label: "PublicOffice", name: "Diputado por Madrid", properties: { institution: "Congreso" } },
      { id: "org:xunta", label: "PublicOrgan", name: "Xunta de Galicia", properties: { note: "Ex-presidente 2009-2022" } },
    ],
    edges: [
      { source: "congreso:alberto-nunez-feijoo", target: "pg:gpp", type: "BELONGS_TO", properties: { role: "Presidente PP" } },
      { source: "congreso:alberto-nunez-feijoo", target: "off:diputado-feijoo", type: "HOLDS_OFFICE", properties: {} },
      { source: "congreso:cuca-gamarra-ruiz-clavijo", target: "pg:gpp", type: "BELONGS_TO", properties: { role: "Secretaria General" } },
      { source: "congreso:alberto-nunez-feijoo", target: "org:xunta", type: "PREVIOUSLY_HEADED", properties: { from: 2009, to: 2022 } },
    ],
  },
  // ACS
  "A28017895": {
    center: { id: "A28017895", label: "Company", name: "ACS, Actividades de Construcción y Servicios S.A.", properties: { nif: "A28017895", province: "Madrid", status: "Activa" } },
    nodes: [
      { id: "person:florentino-perez", label: "Person", name: "Florentino Pérez", properties: { role: "Presidente" } },
      { id: "contract:acs-ave-1", label: "Contract", name: "AVE Madrid-Galicia tramo 4", properties: { amount: 892000000 } },
      { id: "contract:acs-ap7", label: "Contract", name: "Conservación AP-7 Cataluña", properties: { amount: 145000000 } },
      { id: "org:mitma", label: "PublicOrgan", name: "Ministerio de Transportes", properties: {} },
      { id: "org:adif", label: "PublicOrgan", name: "ADIF Alta Velocidad", properties: {} },
      { id: "A08015497", label: "Company", name: "Ferrovial S.E.", properties: { note: "UTE conjunta" } },
      { id: "debt:acs-aeat", label: "TaxDebt", name: "Deuda AEAT 2024", properties: { amount: 1200000 } },
      { id: "grant:acs-prtr", label: "Grant", name: "Subvención PRTR Digitalización", properties: { amount: 34000000 } },
    ],
    edges: [
      { source: "person:florentino-perez", target: "A28017895", type: "ADMINISTERS", properties: { role: "Presidente" } },
      { source: "contract:acs-ave-1", target: "A28017895", type: "AWARDED_TO", properties: {} },
      { source: "contract:acs-ap7", target: "A28017895", type: "AWARDED_TO", properties: {} },
      { source: "org:adif", target: "contract:acs-ave-1", type: "CONTRACTS", properties: {} },
      { source: "org:mitma", target: "contract:acs-ap7", type: "CONTRACTS", properties: {} },
      { source: "A28017895", target: "A08015497", type: "UTE_PARTNER", properties: { project: "AVE Tramo 4" } },
      { source: "A28017895", target: "debt:acs-aeat", type: "HAS_DEBT", properties: {} },
      { source: "grant:acs-prtr", target: "A28017895", type: "GRANTED_TO", properties: {} },
    ],
  },
  // Ferrovial
  "A08015497": {
    center: { id: "A08015497", label: "Company", name: "Ferrovial S.E.", properties: { nif: "A08015497", province: "Madrid", status: "Activa" } },
    nodes: [
      { id: "person:rafael-del-pino", label: "Person", name: "Rafael del Pino", properties: { role: "Presidente" } },
      { id: "contract:ferrovial-407etr", label: "Contract", name: "Autopista ETR-407 Toronto", properties: { amount: 3200000000 } },
      { id: "contract:ferrovial-heathrow", label: "Contract", name: "Gestión Heathrow Airport", properties: { amount: 0, note: "Participación 25%" } },
      { id: "A28017895", label: "Company", name: "ACS S.A.", properties: { note: "UTE conjunta" } },
      { id: "org:mitma", label: "PublicOrgan", name: "Ministerio de Transportes", properties: {} },
      { id: "sanc:ferrovial-cnmc", label: "Sanction", name: "Sanción CNMC — Cártel asfalto", properties: { amount: 28500000, year: 2022 } },
    ],
    edges: [
      { source: "person:rafael-del-pino", target: "A08015497", type: "ADMINISTERS", properties: { role: "Presidente" } },
      { source: "contract:ferrovial-407etr", target: "A08015497", type: "AWARDED_TO", properties: {} },
      { source: "contract:ferrovial-heathrow", target: "A08015497", type: "AWARDED_TO", properties: {} },
      { source: "A08015497", target: "A28017895", type: "UTE_PARTNER", properties: {} },
      { source: "org:mitma", target: "contract:ferrovial-407etr", type: "CONTRACTS", properties: {} },
      { source: "A08015497", target: "sanc:ferrovial-cnmc", type: "SANCTIONED", properties: {} },
    ],
  },
  // Iberdrola
  "A48010615": {
    center: { id: "A48010615", label: "Company", name: "Iberdrola S.A.", properties: { nif: "A48010615", province: "Bilbao", status: "Activa" } },
    nodes: [
      { id: "person:galan", label: "Person", name: "Ignacio Sánchez Galán", properties: { role: "Presidente" } },
      { id: "contract:iber-renov", label: "Contract", name: "Parque eólico Burgos-Norte", properties: { amount: 245000000 } },
      { id: "org:miteco", label: "PublicOrgan", name: "MITECO", properties: {} },
      { id: "inv:villarejo-iber", label: "Investigation", name: "Caso Villarejo — Iberdrola", properties: { status: "en curso" } },
      { id: "grant:iber-eu", label: "Grant", name: "Subvención UE Next Generation", properties: { amount: 120000000 } },
    ],
    edges: [
      { source: "person:galan", target: "A48010615", type: "ADMINISTERS", properties: { role: "Presidente" } },
      { source: "contract:iber-renov", target: "A48010615", type: "AWARDED_TO", properties: {} },
      { source: "org:miteco", target: "contract:iber-renov", type: "CONTRACTS", properties: {} },
      { source: "A48010615", target: "inv:villarejo-iber", type: "INVESTIGATED_IN", properties: {} },
      { source: "grant:iber-eu", target: "A48010615", type: "GRANTED_TO", properties: {} },
    ],
  },
  // Carlos Martínez (from B12345678)
  "n1": {
    center: { id: "n1", label: "Person", name: "Carlos Martínez López", properties: { source: "Congreso", role: "Diputado" } },
    nodes: [
      { id: "B12345678", label: "Company", name: "Construcciones Ibéricas S.L.", properties: { nif: "B12345678" } },
      { id: "n8", label: "PublicOffice", name: "Diputado/a — Congreso", properties: { institution: "Congreso" } },
      { id: "n9", label: "PoliticalGroup", name: "Grupo Parlamentario Popular", properties: {} },
      { id: "contract:cm-asesoria", label: "Contract", name: "Asesoría técnica Ministerio", properties: { amount: 89000 } },
    ],
    edges: [
      { source: "n1", target: "B12345678", type: "ADMINISTERS", properties: { role: "Administrador Único" } },
      { source: "n1", target: "n8", type: "HOLDS_OFFICE", properties: {} },
      { source: "n8", target: "n9", type: "BELONGS_TO", properties: {} },
      { source: "contract:cm-asesoria", target: "B12345678", type: "AWARDED_TO", properties: {} },
    ],
  },
  // Indra
  "A28037224": {
    center: { id: "A28037224", label: "Company", name: "Indra Sistemas S.A.", properties: { nif: "A28037224", province: "Madrid", status: "Activa" } },
    nodes: [
      { id: "person:marc-murtra", label: "Person", name: "Marc Murtra", properties: { role: "Presidente" } },
      { id: "contract:indra-defensa", label: "Contract", name: "Sistema de combate F-110", properties: { amount: 340000000 } },
      { id: "contract:indra-elecciones", label: "Contract", name: "Recuento electoral 2023", properties: { amount: 12600000 } },
      { id: "org:defensa", label: "PublicOrgan", name: "Ministerio de Defensa", properties: {} },
      { id: "org:interior", label: "PublicOrgan", name: "Ministerio del Interior", properties: {} },
    ],
    edges: [
      { source: "person:marc-murtra", target: "A28037224", type: "ADMINISTERS", properties: { role: "Presidente" } },
      { source: "org:defensa", target: "contract:indra-defensa", type: "CONTRACTS", properties: {} },
      { source: "contract:indra-defensa", target: "A28037224", type: "AWARDED_TO", properties: {} },
      { source: "org:interior", target: "contract:indra-elecciones", type: "CONTRACTS", properties: {} },
      { source: "contract:indra-elecciones", target: "A28037224", type: "AWARDED_TO", properties: {} },
    ],
  },
  // Telefónica
  "A28015865": {
    center: { id: "A28015865", label: "Company", name: "Telefónica S.A.", properties: { nif: "A28015865", province: "Madrid", status: "Activa" } },
    nodes: [
      { id: "person:alvarez-pallete", label: "Person", name: "José María Álvarez-Pallete", properties: { role: "Presidente" } },
      { id: "contract:tel-sepe", label: "Contract", name: "Infraestructura digital SEPE", properties: { amount: 78000000 } },
      { id: "org:trabajo", label: "PublicOrgan", name: "Ministerio de Trabajo", properties: {} },
      { id: "grant:tel-5g", label: "Grant", name: "Subvención 5G PRTR", properties: { amount: 200000000 } },
    ],
    edges: [
      { source: "person:alvarez-pallete", target: "A28015865", type: "ADMINISTERS", properties: { role: "Presidente" } },
      { source: "org:trabajo", target: "contract:tel-sepe", type: "CONTRACTS", properties: {} },
      { source: "contract:tel-sepe", target: "A28015865", type: "AWARDED_TO", properties: {} },
      { source: "grant:tel-5g", target: "A28015865", type: "GRANTED_TO", properties: {} },
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

  // Node subgraph (drill-down from any node)
  app.get("/api/v1/public/graph/node/:id", (req, res) => {
    const id = req.params.id;
    const data = MOCK_NODE_SUBGRAPHS[id];
    if (data) {
      res.json(data);
    } else {
      // Generate a minimal placeholder subgraph
      const searchEntry = MOCK_SEARCH.find((s) => s.id === id);
      res.json({
        center: { id, label: searchEntry?.label || "Unknown", name: searchEntry?.name || id, properties: {} },
        nodes: [],
        edges: [],
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
