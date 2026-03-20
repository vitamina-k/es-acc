// ES-ACC Neo4j Schema — Constraints and Indexes
// Applied on database initialization

// ── Uniqueness Constraints ──────────────────────────────
CREATE CONSTRAINT person_nif IF NOT EXISTS
  FOR (p:Person) REQUIRE p.nif IS UNIQUE;

CREATE CONSTRAINT partner_id_unique IF NOT EXISTS
  FOR (p:Partner) REQUIRE p.partner_id IS UNIQUE;

CREATE CONSTRAINT company_nif IF NOT EXISTS
  FOR (c:Company) REQUIRE c.nif IS UNIQUE;

CREATE CONSTRAINT contract_contract_id_unique IF NOT EXISTS
  FOR (c:Contract) REQUIRE c.contract_id IS UNIQUE;

CREATE CONSTRAINT sanction_sanction_id_unique IF NOT EXISTS
  FOR (s:Sanction) REQUIRE s.sanction_id IS UNIQUE;

CREATE CONSTRAINT public_office_id_unique IF NOT EXISTS
  FOR (po:PublicOffice) REQUIRE po.office_id IS UNIQUE;

CREATE CONSTRAINT investigation_id_unique IF NOT EXISTS
  FOR (i:Investigation) REQUIRE i.id IS UNIQUE;

CREATE CONSTRAINT amendment_id_unique IF NOT EXISTS
  FOR (a:Amendment) REQUIRE a.amendment_id IS UNIQUE;

CREATE CONSTRAINT finance_id_unique IF NOT EXISTS
  FOR (f:Finance) REQUIRE f.finance_id IS UNIQUE;

CREATE CONSTRAINT embargo_id_unique IF NOT EXISTS
  FOR (e:Embargo) REQUIRE e.embargo_id IS UNIQUE;

CREATE CONSTRAINT education_school_id_unique IF NOT EXISTS
  FOR (e:Education) REQUIRE e.school_id IS UNIQUE;

CREATE CONSTRAINT convenio_id_unique IF NOT EXISTS
  FOR (c:Convenio) REQUIRE c.convenio_id IS UNIQUE;

CREATE CONSTRAINT laborstats_id_unique IF NOT EXISTS
  FOR (l:LaborStats) REQUIRE l.stats_id IS UNIQUE;

CREATE CONSTRAINT inquiry_id_unique IF NOT EXISTS
  FOR (i:Inquiry) REQUIRE i.inquiry_id IS UNIQUE;

CREATE CONSTRAINT inquiry_requirement_id_unique IF NOT EXISTS
  FOR (r:InquiryRequirement) REQUIRE r.requirement_id IS UNIQUE;

CREATE CONSTRAINT inquiry_session_id_unique IF NOT EXISTS
  FOR (s:InquirySession) REQUIRE s.session_id IS UNIQUE;

CREATE CONSTRAINT municipal_bid_id_unique IF NOT EXISTS
  FOR (b:MunicipalBid) REQUIRE b.municipal_bid_id IS UNIQUE;

CREATE CONSTRAINT municipal_contract_id_unique IF NOT EXISTS
  FOR (c:MunicipalContract) REQUIRE c.municipal_contract_id IS UNIQUE;

CREATE CONSTRAINT municipal_bid_item_id_unique IF NOT EXISTS
  FOR (i:MunicipalBidItem) REQUIRE i.municipal_item_id IS UNIQUE;

CREATE CONSTRAINT municipal_gazette_act_id_unique IF NOT EXISTS
  FOR (a:MunicipalGazetteAct) REQUIRE a.municipal_gazette_act_id IS UNIQUE;

CREATE CONSTRAINT judicial_case_id_unique IF NOT EXISTS
  FOR (j:JudicialCase) REQUIRE j.judicial_case_id IS UNIQUE;

CREATE CONSTRAINT source_document_id_unique IF NOT EXISTS
  FOR (s:SourceDocument) REQUIRE s.doc_id IS UNIQUE;

CREATE CONSTRAINT ingestion_run_id_unique IF NOT EXISTS
  FOR (r:IngestionRun) REQUIRE r.run_id IS UNIQUE;

CREATE CONSTRAINT temporal_violation_id_unique IF NOT EXISTS
  FOR (t:TemporalViolation) REQUIRE t.violation_id IS UNIQUE;

CREATE CONSTRAINT grant_id_unique IF NOT EXISTS
  FOR (g:Grant) REQUIRE g.id IS UNIQUE;

// ── Indexes ─────────────────────────────────────────────

CREATE INDEX grant_fecha_concesion IF NOT EXISTS
  FOR (g:Grant) ON (g.fecha_concesion);

CREATE INDEX grant_importe IF NOT EXISTS
  FOR (g:Grant) ON (g.importe);

CREATE INDEX grant_convocatoria IF NOT EXISTS
  FOR (g:Grant) ON (g.convocatoria);
CREATE INDEX person_name IF NOT EXISTS
  FOR (p:Person) ON (p.name);

CREATE INDEX person_author_key IF NOT EXISTS
  FOR (p:Person) ON (p.author_key);

CREATE INDEX person_sq_candidato IF NOT EXISTS
  FOR (p:Person) ON (p.sq_candidato);

CREATE INDEX person_nif IF NOT EXISTS
  FOR (p:Person) ON (p.nif);

CREATE INDEX partner_name IF NOT EXISTS
  FOR (p:Partner) ON (p.name);

CREATE INDEX partner_doc_partial IF NOT EXISTS
  FOR (p:Partner) ON (p.doc_partial);

CREATE INDEX partner_name_doc_partial IF NOT EXISTS
  FOR (p:Partner) ON (p.name, p.doc_partial);

CREATE INDEX company_razon_social IF NOT EXISTS
  FOR (c:Company) ON (c.razon_social);

CREATE INDEX contract_value IF NOT EXISTS
  FOR (c:Contract) ON (c.value);

CREATE INDEX contract_object IF NOT EXISTS
  FOR (c:Contract) ON (c.object);

CREATE INDEX sanction_type IF NOT EXISTS
  FOR (s:Sanction) ON (s.type);

CREATE INDEX election_year IF NOT EXISTS
  FOR (e:Election) ON (e.year);

CREATE INDEX election_composite IF NOT EXISTS
  FOR (e:Election) ON (e.year, e.cargo, e.uf, e.municipio);

CREATE INDEX amendment_function IF NOT EXISTS
  FOR (a:Amendment) ON (a.function);

CREATE INDEX company_sector_code IF NOT EXISTS
  FOR (c:Company) ON (c.sector_code);

CREATE INDEX company_nif IF NOT EXISTS
  FOR (c:Company) ON (c.nif);

CREATE INDEX contract_contracting_org IF NOT EXISTS
  FOR (c:Contract) ON (c.contracting_org);

CREATE INDEX contract_date IF NOT EXISTS
  FOR (c:Contract) ON (c.date);

CREATE INDEX sanction_date_start IF NOT EXISTS
  FOR (s:Sanction) ON (s.date_start);

CREATE INDEX amendment_value_committed IF NOT EXISTS
  FOR (a:Amendment) ON (a.value_committed);

// ── Finance Indexes ───────────────────────────────────
CREATE INDEX finance_type IF NOT EXISTS
  FOR (f:Finance) ON (f.type);

CREATE INDEX finance_value IF NOT EXISTS
  FOR (f:Finance) ON (f.value);

CREATE INDEX finance_date IF NOT EXISTS
  FOR (f:Finance) ON (f.date);

CREATE INDEX finance_source IF NOT EXISTS
  FOR (f:Finance) ON (f.source);

// ── Embargo Indexes ───────────────────────────────────
CREATE INDEX embargo_uf IF NOT EXISTS
  FOR (e:Embargo) ON (e.uf);

CREATE INDEX embargo_biome IF NOT EXISTS
  FOR (e:Embargo) ON (e.biome);

// ── Health Indexes ────────────────────────────────────
CREATE INDEX health_name IF NOT EXISTS
  FOR (h:Health) ON (h.name);

CREATE INDEX health_uf IF NOT EXISTS
  FOR (h:Health) ON (h.uf);

CREATE INDEX health_municipio IF NOT EXISTS
  FOR (h:Health) ON (h.municipio);

CREATE INDEX health_atende_sus IF NOT EXISTS
  FOR (h:Health) ON (h.atende_sus);

// ── Education Indexes ───────────────────────────────────
CREATE INDEX education_name IF NOT EXISTS
  FOR (e:Education) ON (e.name);

// ── Convenio Indexes ────────────────────────────────────
CREATE INDEX convenio_date_published IF NOT EXISTS
  FOR (c:Convenio) ON (c.date_published);

// ── LaborStats Indexes ──────────────────────────────────
CREATE INDEX laborstats_uf IF NOT EXISTS
  FOR (l:LaborStats) ON (l.uf);

CREATE INDEX laborstats_cnae_subclass IF NOT EXISTS
  FOR (l:LaborStats) ON (l.cnae_subclass);

// ── Person Servidor ID Index ────────────────────────────
CREATE INDEX person_servidor_id IF NOT EXISTS
  FOR (p:Person) ON (p.servidor_id);

// ── PublicOffice Indexes ────────────────────────────────
CREATE INDEX public_office_org IF NOT EXISTS
  FOR (po:PublicOffice) ON (po.org);

CREATE INDEX inquiry_name IF NOT EXISTS
  FOR (i:Inquiry) ON (i.name);

CREATE INDEX inquiry_kind_house IF NOT EXISTS
  FOR (i:Inquiry) ON (i.kind, i.house);

CREATE INDEX inquiry_requirement_date IF NOT EXISTS
  FOR (r:InquiryRequirement) ON (r.date);

CREATE INDEX inquiry_session_date IF NOT EXISTS
  FOR (s:InquirySession) ON (s.date);

CREATE INDEX municipal_bid_date IF NOT EXISTS
  FOR (b:MunicipalBid) ON (b.published_at);

CREATE INDEX municipal_contract_date IF NOT EXISTS
  FOR (c:MunicipalContract) ON (c.signed_at);

CREATE INDEX municipal_gazette_date IF NOT EXISTS
  FOR (a:MunicipalGazetteAct) ON (a.published_at);

CREATE INDEX judicial_case_number IF NOT EXISTS
  FOR (j:JudicialCase) ON (j.case_number);

CREATE INDEX source_document_source_id IF NOT EXISTS
  FOR (s:SourceDocument) ON (s.source_id);

CREATE INDEX source_document_published_at IF NOT EXISTS
  FOR (s:SourceDocument) ON (s.published_at);

CREATE INDEX source_document_retrieved_at IF NOT EXISTS
  FOR (s:SourceDocument) ON (s.retrieved_at);

CREATE INDEX ingestion_run_source_id IF NOT EXISTS
  FOR (r:IngestionRun) ON (r.source_id);

CREATE INDEX ingestion_run_status IF NOT EXISTS
  FOR (r:IngestionRun) ON (r.status);

CREATE INDEX ingestion_run_started_at IF NOT EXISTS
  FOR (r:IngestionRun) ON (r.started_at);

CREATE INDEX temporal_violation_source_id IF NOT EXISTS
  FOR (t:TemporalViolation) ON (t.source_id);

CREATE INDEX temporal_violation_event_date IF NOT EXISTS
  FOR (t:TemporalViolation) ON (t.event_date);

CREATE INDEX socio_snapshot_membership_id IF NOT EXISTS
  FOR ()-[r:SOCIO_DE_SNAPSHOT]-() ON (r.membership_id);

CREATE INDEX socio_snapshot_date IF NOT EXISTS
  FOR ()-[r:SOCIO_DE_SNAPSHOT]-() ON (r.snapshot_date);

// ── Fulltext Search Index ───────────────────────────────
CREATE FULLTEXT INDEX entity_search IF NOT EXISTS
  FOR (n:Person|Partner|Company|Health|Education|Contract|Amendment|Convenio|Embargo|PublicOffice|Inquiry|InquiryRequirement|MunicipalContract|MunicipalBid|MunicipalGazetteAct|JudicialCase|SourceDocument|PublicOrgan|GazetteEntry|Sanction|TaxDebt|PoliticalGroup|Grant)
  ON EACH [n.name, n.nombre, n.razon_social, n.nif, n.nie, n.cif, n.doc_partial, n.doc_raw, n.object, n.objeto, n.contracting_org, n.organo_nombre, n.infraction, n.org, n.function, n.subject, n.text, n.topic, n.case_number, n.url, n.foto_url, n.expediente, n.titulo, n.convocatoria, n.instrumento];

// ── User Constraints ────────────────────────────────────
CREATE CONSTRAINT user_email_unique IF NOT EXISTS
  FOR (u:User) REQUIRE u.email IS UNIQUE;
