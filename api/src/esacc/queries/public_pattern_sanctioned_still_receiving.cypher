MATCH (c:Company)
WHERE elementId(c) = $company_id
   OR c.nif = $company_identifier
   OR c.nif = $company_identifier_formatted
CALL {
  WITH c
  MATCH (c)-[:INHABILITADA_PARA_CONTRATAR]->(s:Sanction)
  WHERE coalesce(s.fecha_inicio, s.date_start) IS NOT NULL
    AND trim(coalesce(s.fecha_inicio, s.date_start)) <> ''
  RETURN collect(DISTINCT {
    sanction_id: s.sanction_id,
    date_start: coalesce(s.fecha_inicio, s.date_start),
    date_end: coalesce(s.fecha_fin, s.date_end)
  }) AS sanctions
}
WITH c, sanctions
WHERE size(sanctions) > 0
MATCH (c)-[:ADJUDICATARIA_DE]->(ct:Contract)
WHERE coalesce(ct.fecha_adjudicacion, ct.date, "") IS NOT NULL
  AND trim(coalesce(ct.fecha_adjudicacion, ct.date, "")) <> ''
  AND any(s IN sanctions WHERE
    coalesce(ct.fecha_adjudicacion, ct.date, "") >= coalesce(s.fecha_inicio, s.date_start)
    AND (coalesce(s.fecha_fin, s.date_end) IS NULL OR trim(coalesce(coalesce(s.fecha_fin, s.date_end), '')) = '' OR coalesce(ct.fecha_adjudicacion, ct.date, "") <= coalesce(s.fecha_fin, s.date_end))
  )
WITH c,
     [s IN sanctions WHERE s.sanction_id IS NOT NULL AND s.sanction_id <> '' | s.sanction_id] AS sanction_ids,
     collect(DISTINCT ct.contract_id) AS contract_ids,
     sum(coalesce(coalesce(ct.importe_adjudicacion, ct.value, 0), 0.0)) AS amount_total,
     min(coalesce(ct.fecha_adjudicacion, ct.date, "")) AS window_start,
     max(coalesce(ct.fecha_adjudicacion, ct.date, "")) AS window_end
WITH c,
     sanction_ids,
     [x IN contract_ids WHERE x IS NOT NULL AND x <> ''] AS contract_ids,
     amount_total,
     window_start,
     window_end,
     [x IN sanction_ids + contract_ids WHERE x IS NOT NULL AND x <> ''] AS evidence_refs
WHERE size(sanction_ids) > 0
  AND size(contract_ids) > 0
  AND size(evidence_refs) > 0
RETURN 'sanctioned_still_receiving' AS pattern_id,
       c.nif AS nif,
       coalesce(c.razon_social, c.nombre, c.name) AS company_name,
       toFloat(size(sanction_ids) + size(contract_ids)) AS risk_signal,
       amount_total AS amount_total,
       window_start AS window_start,
       window_end AS window_end,
       evidence_refs[0..toInteger($pattern_max_evidence_refs)] AS evidence_refs,
       size(evidence_refs) AS evidence_count
