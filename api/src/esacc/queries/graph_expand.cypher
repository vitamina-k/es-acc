// ES-ACC: Graph expansion using Spanish relationship types
MATCH (center)
WHERE elementId(center) = $entity_id
  AND (center:Person OR center:Company OR center:Contract OR center:Sanction OR center:Grant
       OR center:PublicOffice OR center:PublicOrgan OR center:PoliticalGroup OR center:TaxDebt
       OR center:GazetteEntry OR center:JudicialCase)
OPTIONAL MATCH p=(center)-[:OCUPA_CARGO|PERTENECE_A|ADJUDICATARIA_DE|ADMINISTRADOR_DE|`CONTRATÓ_CON`|INHABILITADA_PARA_CONTRATAR|MENCIONADO_EN_BOE|SANCIONADO_EN_BOE|TIENE_DEUDA_TRIBUTARIA|BENEFICIARIA_DE|CONCEDE|SAME_AS|POSSIBLY_SAME_AS|SOCIO_DE_SNAPSHOT*1..4]-(n)
WHERE length(p) <= $depth
  AND all(x IN nodes(p) WHERE NOT (x:User OR x:Investigation OR x:Annotation OR x:Tag
         OR x:IngestionRun))
WITH center, collect(p) AS paths
WITH center,
     reduce(ns = [center], p IN paths | ns + CASE WHEN p IS NULL THEN [] ELSE nodes(p) END) AS raw_nodes,
     reduce(rs = [], p IN paths | rs + CASE WHEN p IS NULL THEN [] ELSE relationships(p) END) AS raw_rels
UNWIND raw_nodes AS n
WITH center, collect(DISTINCT n) AS nodes, raw_rels
UNWIND CASE WHEN size(raw_rels) = 0 THEN [NULL] ELSE raw_rels END AS r
WITH center, nodes, collect(DISTINCT r) AS rels
RETURN nodes,
       [x IN rels WHERE x IS NOT NULL] AS relationships,
       elementId(center) AS center_id
