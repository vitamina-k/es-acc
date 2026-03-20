MATCH (c:Company)
WHERE elementId(c) = $company_id
   OR c.nif = $company_identifier
   OR c.nif = $company_identifier_formatted
CALL {
  WITH c
  MATCH (c)-[:INHABILITADA_PARA_CONTRATAR]->(emb:Embargo)
  WHERE emb.date IS NOT NULL
    AND trim(emb.date) <> ''
  RETURN collect(DISTINCT emb.embargo_id) AS embargo_ids,
         min(emb.date) AS embargo_start,
         max(emb.date) AS embargo_end
}
WITH c, embargo_ids, embargo_start, embargo_end
WHERE size(embargo_ids) > 0
  AND embargo_start IS NOT NULL
CALL {
  WITH c, embargo_start
  OPTIONAL MATCH (c)-[:ADJUDICATARIA_DE]->(ct:Contract)
  WHERE coalesce(ct.fecha_adjudicacion, ct.date, "") IS NOT NULL
    AND trim(coalesce(ct.fecha_adjudicacion, ct.date, "")) <> ''
    AND coalesce(ct.fecha_adjudicacion, ct.date, "") >= embargo_start
  RETURN collect(DISTINCT ct.contract_id) AS contract_ids,
         sum(coalesce(coalesce(ct.importe_adjudicacion, ct.value, 0), 0.0)) AS contract_total,
         min(coalesce(ct.fecha_adjudicacion, ct.date, "")) AS contract_start,
         max(coalesce(ct.fecha_adjudicacion, ct.date, "")) AS contract_end
}
CALL {
  WITH c, embargo_start
  OPTIONAL MATCH (c)-[:BENEFICIARIA_DE]->(loan:Grant)
  WHERE coalesce(loan.fecha_concesion, "") IS NOT NULL
    AND trim(coalesce(loan.fecha_concesion, "")) <> ''
    AND coalesce(loan.fecha_concesion, "") >= embargo_start
  RETURN collect(DISTINCT loan.id) AS loan_ids,
         sum(coalesce(loan.importe, 0.0)) AS loan_total,
         min(coalesce(loan.fecha_concesion, "")) AS loan_start,
         max(coalesce(loan.fecha_concesion, "")) AS loan_end
}
WITH c,
     [x IN embargo_ids WHERE x IS NOT NULL AND x <> ''] AS embargo_ids,
     [x IN contract_ids WHERE x IS NOT NULL AND x <> ''] AS contract_ids,
     [x IN loan_ids WHERE x IS NOT NULL AND x <> ''] AS loan_ids,
     coalesce(contract_total, 0.0) + coalesce(loan_total, 0.0) AS amount_total,
     [d IN [embargo_start, contract_start, loan_start] WHERE d IS NOT NULL AND d <> ''] AS starts,
     [d IN [embargo_end, contract_end, loan_end] WHERE d IS NOT NULL AND d <> ''] AS ends
WITH c,
     embargo_ids,
     contract_ids,
     loan_ids,
     amount_total,
     CASE
       WHEN size(starts) = 0 THEN NULL
       ELSE reduce(min_date = starts[0], item IN starts |
         CASE WHEN item < min_date THEN item ELSE min_date END
       )
     END AS window_start,
     CASE
       WHEN size(ends) = 0 THEN NULL
       ELSE reduce(max_date = ends[0], item IN ends |
         CASE WHEN item > max_date THEN item ELSE max_date END
       )
     END AS window_end
WITH c,
     amount_total,
     window_start,
     window_end,
     embargo_ids,
     contract_ids,
     loan_ids,
     [x IN embargo_ids + contract_ids + loan_ids WHERE x IS NOT NULL AND x <> ''] AS evidence_refs
WHERE size(embargo_ids) > 0
  AND (size(contract_ids) > 0 OR size(loan_ids) > 0)
  AND size(evidence_refs) > 0
RETURN 'embargoed_receiving' AS pattern_id,
       c.nif AS nif,
       coalesce(c.razon_social, c.nombre, c.name) AS company_name,
       toFloat(size(embargo_ids) + size(contract_ids) + size(loan_ids)) AS risk_signal,
       amount_total AS amount_total,
       window_start AS window_start,
       window_end AS window_end,
       evidence_refs[0..toInteger($pattern_max_evidence_refs)] AS evidence_refs,
       size(evidence_refs) AS evidence_count
