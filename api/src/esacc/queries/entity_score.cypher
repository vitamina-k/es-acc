// Gather exposure metrics for a given entity
// Aggregates across SAME_AS equivalent nodes
// ES-ACC: Uses Spanish relationship types and properties
MATCH (e)
WHERE elementId(e) = $entity_id
  AND (e:Person OR e:Company OR e:Contract OR e:Sanction OR e:Grant
       OR e:PublicOffice OR e:PublicOrgan OR e:TaxDebt OR e:GazetteEntry
       OR e:PoliticalGroup)
WITH e, labels(e) AS lbls
// Collect equivalent nodes: self + SAME_AS neighbors (up to 2 hops)
OPTIONAL MATCH (e)-[:SAME_AS*1..2]-(other)
WITH e, lbls, collect(DISTINCT other) AS others
WITH e, lbls, [e] + others AS equivs
// Count all connections from all equivalents (exclude SAME_AS)
UNWIND equivs AS eq
OPTIONAL MATCH (eq)-[r]-(connected) WHERE type(r) <> 'SAME_AS'
WITH e, lbls, equivs,
     count(r) AS connection_count,
     collect(DISTINCT
       CASE
         // Fuentes españolas
         WHEN connected:Contract      THEN 'contratos_estado'
         WHEN connected:TaxDebt       THEN 'aeat_deudores'
         WHEN connected:Sanction      THEN 'rolece'
         WHEN connected:GazetteEntry  THEN 'boe'
         WHEN connected:PublicOrgan   THEN 'pep_transparencia'
         WHEN connected:PoliticalGroup THEN 'congreso'
         WHEN connected:Grant         THEN 'bdns'
         WHEN connected:Company       THEN 'borme'
         WHEN connected:Person        THEN 'borme'
         ELSE 'other'
       END
     ) AS source_list
// Contract volume (Spain: ADJUDICATARIA_DE)
UNWIND equivs AS eq2
OPTIONAL MATCH (eq2)-[:ADJUDICATARIA_DE]->(c:Contract)
WITH e, lbls, equivs, connection_count, source_list,
     COALESCE(sum(coalesce(c.importe_adjudicacion, c.value, 0)), 0) AS contract_volume
// Tax debt volume (Spain: TIENE_DEUDA_TRIBUTARIA)
UNWIND equivs AS eq3
OPTIONAL MATCH (eq3)-[:TIENE_DEUDA_TRIBUTARIA]->(d:TaxDebt)
WITH e, lbls, equivs, connection_count, source_list, contract_volume,
     COALESCE(sum(d.importe), 0) AS debt_loan_volume
RETURN
  elementId(e) AS entity_id,
  lbls AS entity_labels,
  connection_count,
  size(source_list) AS source_count,
  contract_volume + debt_loan_volume AS financial_volume,
  coalesce(e.cnae, e.cnae_principal) AS cnae_principal,
  e.role AS role
