MATCH (center)
WHERE elementId(center) = $entity_id
  AND (center:Person OR center:Partner OR center:Company OR center:Contract OR center:Sanction
       OR center:Election OR center:Amendment OR center:Finance OR center:Embargo OR center:Health
       OR center:Education OR center:Convenio OR center:LaborStats OR center:PublicOffice
       OR center:PublicOrgan OR center:TaxDebt OR center:GazetteEntry OR center:PoliticalGroup)
// Recoger equivalentes via SAME_AS (hasta 2 saltos para cadenas de entidad)
OPTIONAL MATCH (center)-[:SAME_AS*1..2]-(other)
  WHERE NOT (other:User OR other:Investigation OR other:Annotation OR other:Tag)
WITH center, collect(DISTINCT other) AS others
WITH center, [center] + others AS equivs
// Expandir conexiones reales desde todos los equivalentes
UNWIND equivs AS eq
OPTIONAL MATCH (eq)-[r]-(connected)
WHERE NOT (connected:User OR connected:Investigation OR connected:Annotation OR connected:Tag)
  AND type(r) <> 'SAME_AS'
  AND (coalesce($include_probable, false) OR type(r) <> 'POSSIBLE_SAME_AS')
WITH center, equivs, r, startNode(r) AS src, endNode(r) AS tgt, connected
WHERE r IS NOT NULL
  AND size([n IN equivs WHERE elementId(n) = elementId(src) OR elementId(n) = elementId(tgt)]) > 0
WITH DISTINCT center, r, src, tgt,
  CASE WHEN size([n IN equivs WHERE elementId(n) = elementId(src)]) > 0 THEN tgt ELSE src END AS connected_node,
  CASE WHEN size([n IN equivs WHERE elementId(n) = elementId(src)]) > 0 THEN labels(tgt) ELSE labels(src) END AS connected_labels
RETURN center AS e,
       r,
       connected_node AS connected,
       labels(center) AS source_labels,
       connected_labels AS target_labels,
       type(r) AS rel_type,
       elementId(src) AS source_id,
       elementId(tgt) AS target_id,
       elementId(r) AS rel_id
