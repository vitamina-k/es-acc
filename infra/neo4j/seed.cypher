// ============================================================
// VIGILIA — Seed data for development / demo
// Run after init.cypher to populate the dev graph
// ============================================================

// --- Political Groups ---
CREATE (gp1:PoliticalGroup {id: 'gp:pp', name: 'Grupo Parlamentario Popular', abbreviation: 'GPP', _source: 'seed'})
CREATE (gp2:PoliticalGroup {id: 'gp:psoe', name: 'Grupo Parlamentario Socialista', abbreviation: 'GPS', _source: 'seed'})
CREATE (gp3:PoliticalGroup {id: 'gp:vox', name: 'Grupo Parlamentario VOX', abbreviation: 'GPVOX', _source: 'seed'})
CREATE (gp4:PoliticalGroup {id: 'gp:sumar', name: 'Grupo Parlamentario Sumar', abbreviation: 'GPSUM', _source: 'seed'})
CREATE (gp5:PoliticalGroup {id: 'gp:mixto', name: 'Grupo Parlamentario Mixto', abbreviation: 'GPMIX', _source: 'seed'})

// --- Persons (public figures — fictional for demo) ---
CREATE (p1:Person {id: 'demo:carlos-martinez', name: 'Carlos Martínez López', _source: 'seed'})
CREATE (p2:Person {id: 'demo:maria-garcia', name: 'María García Fernández', _source: 'seed'})
CREATE (p3:Person {id: 'demo:antonio-ruiz', name: 'Antonio Ruiz Sánchez', _source: 'seed'})
CREATE (p4:Person {id: 'demo:elena-torres', name: 'Elena Torres Moreno', _source: 'seed'})
CREATE (p5:Person {id: 'demo:jose-navarro', name: 'José Navarro Díaz', _source: 'seed'})
CREATE (p6:Person {id: 'demo:lucia-herrero', name: 'Lucía Herrero Blanco', _source: 'seed'})
CREATE (p7:Person {id: 'demo:pablo-vega', name: 'Pablo Vega Romero', _source: 'seed'})
CREATE (p8:Person {id: 'demo:ana-molina', name: 'Ana Molina Jiménez', _source: 'seed'})

// --- Public Offices ---
CREATE (o1:PublicOffice {id: 'off:carlos-diputado', role: 'Diputado/a', institution: 'Congreso de los Diputados', _source: 'seed'})
CREATE (o2:PublicOffice {id: 'off:maria-senadora', role: 'Senador/a', institution: 'Senado de España', _source: 'seed'})
CREATE (o3:PublicOffice {id: 'off:antonio-diputado', role: 'Diputado/a', institution: 'Congreso de los Diputados', _source: 'seed'})
CREATE (o4:PublicOffice {id: 'off:elena-alto-cargo', role: 'Secretaria de Estado', institution: 'Ministerio de Industria', _source: 'seed'})

// --- Companies ---
CREATE (c1:Company {nif: 'B12345678', name: 'Construcciones Ibéricas S.L.', status: 'Activa', province: 'Madrid', _source: 'seed'})
CREATE (c2:Company {nif: 'A87654321', name: 'Tecnologías Avanzadas S.A.', status: 'Activa', province: 'Barcelona', _source: 'seed'})
CREATE (c3:Company {nif: 'B11223344', name: 'Servicios Globales del Levante S.L.', status: 'Activa', province: 'Valencia', _source: 'seed'})
CREATE (c4:Company {nif: 'A44332211', name: 'Infraestructuras Mediterráneo S.A.', status: 'Activa', province: 'Málaga', _source: 'seed'})
CREATE (c5:Company {nif: 'B99887766', name: 'Consultora Estratégica Nacional S.L.', status: 'Activa', province: 'Sevilla', _source: 'seed'})
CREATE (c6:Company {nif: 'A55667788', name: 'Grupo Energías Renovables S.A.', status: 'Activa', province: 'Zaragoza', _source: 'seed'})

// --- Public Organs ---
CREATE (org1:PublicOrgan {id: 'organ:ministerio-transportes', name: 'Ministerio de Transportes y Movilidad Sostenible', level: 'estatal', _source: 'seed'})
CREATE (org2:PublicOrgan {id: 'organ:ministerio-industria', name: 'Ministerio de Industria y Turismo', level: 'estatal', _source: 'seed'})
CREATE (org3:PublicOrgan {id: 'organ:adif', name: 'ADIF Alta Velocidad', level: 'estatal', _source: 'seed'})
CREATE (org4:PublicOrgan {id: 'organ:aena', name: 'AENA S.M.E., S.A.', level: 'estatal', _source: 'seed'})

// --- Contracts ---
CREATE (ct1:Contract {id: 'ct:demo-001', title: 'Renovación de infraestructuras viarias A-3', amount: 4500000.00, award_date: date('2025-06-15'), procedure_type: 'Abierto', _source: 'seed'})
CREATE (ct2:Contract {id: 'ct:demo-002', title: 'Desarrollo plataforma digital ciudadana', amount: 890000.00, award_date: date('2025-08-22'), procedure_type: 'Abierto', _source: 'seed'})
CREATE (ct3:Contract {id: 'ct:demo-003', title: 'Servicio de consultoría estratégica', amount: 320000.00, award_date: date('2025-11-03'), procedure_type: 'Negociado sin publicidad', _source: 'seed'})
CREATE (ct4:Contract {id: 'ct:demo-004', title: 'Mantenimiento instalaciones aeroportuarias', amount: 2100000.00, award_date: date('2025-09-10'), procedure_type: 'Abierto', _source: 'seed'})
CREATE (ct5:Contract {id: 'ct:demo-005', title: 'Suministro de equipos de telecomunicaciones', amount: 567000.00, award_date: date('2026-01-15'), procedure_type: 'Contrato menor', _source: 'seed'})
CREATE (ct6:Contract {id: 'ct:demo-006', title: 'Obra civil terminal ferroviaria', amount: 12800000.00, award_date: date('2025-04-20'), procedure_type: 'Abierto', _source: 'seed'})

// --- Grants ---
CREATE (g1:Grant {id: 'gr:demo-001', title: 'Subvención I+D energías limpias', amount: 450000.00, grant_date: date('2025-07-01'), _source: 'seed'})
CREATE (g2:Grant {id: 'gr:demo-002', title: 'Ayuda digitalización PYME', amount: 75000.00, grant_date: date('2025-10-15'), _source: 'seed'})

// --- Tax Debts ---
CREATE (td1:TaxDebt {id: 'td:demo-001', debtor_name: 'Construcciones Ibéricas S.L.', nif: 'B12345678', amount: 234567.89, year: 2024, _source: 'seed'})
CREATE (td2:TaxDebt {id: 'td:demo-002', debtor_name: 'José Navarro Díaz', nif: null, amount: 156000.00, year: 2024, _source: 'seed'})

// --- Sanctions ---
CREATE (s1:Sanction {id: 'san:demo-001', sanction_type: 'Medioambiental', source: 'MITECO', entity_name: 'Infraestructuras Mediterráneo S.A.', reason: 'Vertido ilegal en cauce fluvial', _source: 'seed'})
CREATE (s2:Sanction {id: 'san:demo-002', sanction_type: 'Internacional', source: 'OpenSanctions', entity_name: 'Offshore Holdings Ltd.', reason: 'PEP — persona políticamente expuesta vinculada', _source: 'seed'})

// --- BOE entries ---
CREATE (boe1:GazetteEntry {id: 'boe:demo-001', publication_date: date('2025-03-15'), type: 'Nombramiento', summary: 'Nombramiento como Secretaria de Estado de Industria', _source: 'seed'})

// --- RELATIONSHIPS ---

// Person → Office
CREATE (p1)-[:HOLDS_OFFICE]->(o1)
CREATE (p2)-[:HOLDS_OFFICE]->(o2)
CREATE (p3)-[:HOLDS_OFFICE]->(o3)
CREATE (p4)-[:HOLDS_OFFICE]->(o4)

// Office → PoliticalGroup
CREATE (o1)-[:BELONGS_TO]->(gp1)
CREATE (o2)-[:BELONGS_TO]->(gp2)
CREATE (o3)-[:BELONGS_TO]->(gp3)
CREATE (o4)-[:BELONGS_TO]->(gp2)

// Person → Company (administrador)
MERGE (p1)-[:ADMINISTERS {role: 'Administrador Único', since: '2018'}]->(c1)
MERGE (p3)-[:ADMINISTERS {role: 'Consejero', since: '2020'}]->(c4)
MERGE (p5)-[:ADMINISTERS {role: 'Administrador Solidario', since: '2019'}]->(c1)
MERGE (p5)-[:ADMINISTERS {role: 'Apoderado', since: '2021'}]->(c5)
MERGE (p6)-[:ADMINISTERS {role: 'Consejera Delegada', since: '2017'}]->(c2)
MERGE (p7)-[:ADMINISTERS {role: 'Director General', since: '2022'}]->(c6)
MERGE (p8)-[:ADMINISTERS {role: 'Apoderada', since: '2023'}]->(c3)

// Organ → Contract
CREATE (org1)-[:CONTRACTS]->(ct1)
CREATE (org2)-[:CONTRACTS]->(ct2)
CREATE (org2)-[:CONTRACTS]->(ct3)
CREATE (org4)-[:CONTRACTS]->(ct4)
CREATE (org3)-[:CONTRACTS]->(ct5)
CREATE (org3)-[:CONTRACTS]->(ct6)

// Contract → Company (awarded)
CREATE (ct1)-[:AWARDED_TO]->(c1)
CREATE (ct2)-[:AWARDED_TO]->(c2)
CREATE (ct3)-[:AWARDED_TO]->(c5)
CREATE (ct4)-[:AWARDED_TO]->(c4)
CREATE (ct5)-[:AWARDED_TO]->(c2)
CREATE (ct6)-[:AWARDED_TO]->(c1)

// Grant → Company
CREATE (g1)-[:GRANTED_TO]->(c6)
CREATE (g2)-[:GRANTED_TO]->(c3)

// Company → TaxDebt
CREATE (c1)-[:HAS_DEBT]->(td1)

// Person → TaxDebt (indirect through admin)
CREATE (p5)-[:HAS_DEBT]->(td2)

// Company → Sanction
CREATE (c4)-[:SANCTIONED]->(s1)

// BOE → Person
CREATE (boe1)-[:REFERS_TO]->(p4)

// Offshore connection (demo)
CREATE (offshore1:Company {nif: 'OFFSHORE-001', name: 'Offshore Holdings Ltd.', status: 'Activa', province: null, _source: 'icij'})
CREATE (c5)-[:LINKED_TO {via: 'Papeles de Panamá'}]->(offshore1)
CREATE (offshore1)-[:SANCTIONED]->(s2)

;
