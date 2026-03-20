MATCH (p:Person)
WHERE p.pep = true
OPTIONAL MATCH (p)-[:PERTENECE_A]->(g:PoliticalGroup)
WITH p, g
RETURN
  elementId(p) AS id,
  coalesce(p.name, p.nombre, '') AS name,
  coalesce(p.partido, '') AS partido,
  coalesce(p.cargo_especial, '') AS cargo,
  coalesce(p.circunscripcion, '') AS circunscripcion,
  coalesce(p.activo, true) AS activo,
  coalesce(p.legislatura, 0) AS legislatura,
  coalesce(p.fuente, '') AS fuente,
  coalesce(g.nombre, '') AS grupo_parlamentario
ORDER BY name
SKIP $skip
LIMIT $limit
