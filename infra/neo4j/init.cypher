// ============================================================
// VIGILIA — Neo4j Schema: Constraints, Indexes, and Seed Data
// es-acc (Spanish Accelerationism)
// ============================================================

// --- UNIQUENESS CONSTRAINTS ---

CREATE CONSTRAINT person_id_unique IF NOT EXISTS
FOR (p:Person) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT company_nif_unique IF NOT EXISTS
FOR (c:Company) REQUIRE c.nif IS UNIQUE;

CREATE CONSTRAINT contract_id_unique IF NOT EXISTS
FOR (ct:Contract) REQUIRE ct.id IS UNIQUE;

CREATE CONSTRAINT grant_id_unique IF NOT EXISTS
FOR (g:Grant) REQUIRE g.id IS UNIQUE;

CREATE CONSTRAINT sanction_id_unique IF NOT EXISTS
FOR (s:Sanction) REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT public_office_id_unique IF NOT EXISTS
FOR (po:PublicOffice) REQUIRE po.id IS UNIQUE;

CREATE CONSTRAINT political_group_id_unique IF NOT EXISTS
FOR (pg:PoliticalGroup) REQUIRE pg.id IS UNIQUE;

CREATE CONSTRAINT public_organ_id_unique IF NOT EXISTS
FOR (o:PublicOrgan) REQUIRE o.id IS UNIQUE;

CREATE CONSTRAINT gazette_entry_id_unique IF NOT EXISTS
FOR (ge:GazetteEntry) REQUIRE ge.id IS UNIQUE;

CREATE CONSTRAINT tax_debt_id_unique IF NOT EXISTS
FOR (td:TaxDebt) REQUIRE td.id IS UNIQUE;

CREATE CONSTRAINT investigation_id_unique IF NOT EXISTS
FOR (inv:Investigation) REQUIRE inv.id IS UNIQUE;

CREATE CONSTRAINT partner_id_unique IF NOT EXISTS
FOR (pa:Partner) REQUIRE pa.id IS UNIQUE;

// --- COMPOSITE INDEXES ---

CREATE INDEX person_name_idx IF NOT EXISTS
FOR (p:Person) ON (p.name);

CREATE INDEX company_name_idx IF NOT EXISTS
FOR (c:Company) ON (c.name);

CREATE INDEX contract_amount_idx IF NOT EXISTS
FOR (ct:Contract) ON (ct.amount);

CREATE INDEX contract_date_idx IF NOT EXISTS
FOR (ct:Contract) ON (ct.award_date);

CREATE INDEX grant_amount_idx IF NOT EXISTS
FOR (g:Grant) ON (g.amount);

CREATE INDEX sanction_type_idx IF NOT EXISTS
FOR (s:Sanction) ON (s.sanction_type);

CREATE INDEX public_office_role_idx IF NOT EXISTS
FOR (po:PublicOffice) ON (po.role);

CREATE INDEX gazette_entry_date_idx IF NOT EXISTS
FOR (ge:GazetteEntry) ON (ge.publication_date);

CREATE INDEX tax_debt_amount_idx IF NOT EXISTS
FOR (td:TaxDebt) ON (td.amount);

// --- FULLTEXT SEARCH INDEXES ---

CREATE FULLTEXT INDEX person_fulltext IF NOT EXISTS
FOR (p:Person) ON EACH [p.name, p.aliases];

CREATE FULLTEXT INDEX company_fulltext IF NOT EXISTS
FOR (c:Company) ON EACH [c.name, c.nif];

CREATE FULLTEXT INDEX contract_fulltext IF NOT EXISTS
FOR (ct:Contract) ON EACH [ct.title, ct.description];
