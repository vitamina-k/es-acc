// Client-side mock subgraph data for drill-down navigation
// Used as fallback when API is unavailable (static deploy)

export interface NodeSubgraph {
  center: { id: string; label: string; name: string; properties: Record<string, unknown> };
  nodes: Array<{ id: string; label: string; name: string; properties: Record<string, unknown> }>;
  edges: Array<{ source: string; target: string; type: string; properties: Record<string, unknown> }>;
}

export const NODE_SUBGRAPHS: Record<string, NodeSubgraph> = {
  // Pedro Sánchez
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
  // María Jesús Montero
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
  // Yolanda Díaz
  "congreso:yolanda-diaz-perez": {
    center: { id: "congreso:yolanda-diaz-perez", label: "Person", name: "Yolanda Díaz Pérez", properties: { cargo: "Vicepresidenta Segunda", partido: "Sumar", fuente: "Congreso" } },
    nodes: [
      { id: "congreso:pedro-sanchez-perez-castejon", label: "Person", name: "Pedro Sánchez Pérez-Castejón", properties: { cargo: "Presidente" } },
      { id: "pg:sumar", label: "PoliticalGroup", name: "Grupo Parlamentario Sumar", properties: {} },
      { id: "org:trabajo", label: "PublicOrgan", name: "Ministerio de Trabajo", properties: {} },
      { id: "off:vicepresidenta2", label: "PublicOffice", name: "Vicepresidenta Segunda", properties: { institución: "Gobierno de España" } },
    ],
    edges: [
      { source: "congreso:yolanda-diaz-perez", target: "pg:sumar", type: "PERTENECE_A", properties: { cargo: "Líder" } },
      { source: "congreso:yolanda-diaz-perez", target: "off:vicepresidenta2", type: "OCUPA_CARGO", properties: {} },
      { source: "congreso:yolanda-diaz-perez", target: "org:trabajo", type: "DIRIGE", properties: {} },
      { source: "congreso:pedro-sanchez-perez-castejon", target: "congreso:yolanda-diaz-perez", type: "NOMBRA", properties: {} },
    ],
  },
  // Santiago Abascal
  "congreso:santiago-abascal-conde": {
    center: { id: "congreso:santiago-abascal-conde", label: "Person", name: "Santiago Abascal Conde", properties: { cargo: "Presidente de Vox", partido: "Vox", fuente: "Congreso" } },
    nodes: [
      { id: "pg:gpvox", label: "PoliticalGroup", name: "Grupo Parlamentario VOX", properties: {} },
      { id: "off:diputado-abascal", label: "PublicOffice", name: "Diputado por Madrid", properties: { institución: "Congreso" } },
    ],
    edges: [
      { source: "congreso:santiago-abascal-conde", target: "pg:gpvox", type: "PERTENECE_A", properties: { cargo: "Presidente" } },
      { source: "congreso:santiago-abascal-conde", target: "off:diputado-abascal", type: "OCUPA_CARGO", properties: {} },
    ],
  },
  // Florentino Pérez
  "person:florentino-perez": {
    center: { id: "person:florentino-perez", label: "Person", name: "Florentino Pérez", properties: { cargo: "Presidente ACS y Real Madrid" } },
    nodes: [
      { id: "A28017895", label: "Company", name: "ACS S.A.", properties: { nif: "A28017895" } },
      { id: "org:real-madrid", label: "PublicOrgan", name: "Real Madrid C.F.", properties: { nota: "Presidente desde 2009" } },
      { id: "contract:acs-ave-1", label: "Contract", name: "AVE Madrid-Galicia tramo 4", properties: { importe: 892000000 } },
    ],
    edges: [
      { source: "person:florentino-perez", target: "A28017895", type: "ADMINISTRA", properties: { cargo: "Presidente" } },
      { source: "person:florentino-perez", target: "org:real-madrid", type: "PRESIDE", properties: { desde: 2009 } },
      { source: "contract:acs-ave-1", target: "A28017895", type: "ADJUDICADO_A", properties: {} },
    ],
  },
};

// Look up subgraph for a node (client-side, no API needed)
export function getNodeSubgraph(nodeId: string): NodeSubgraph | null {
  return NODE_SUBGRAPHS[nodeId] || null;
}
