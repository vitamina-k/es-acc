// ES-ACC: Entity lookup by Spanish identifiers (NIF/NIE/CIF)
MATCH (e)
WHERE (e:Person AND (e.nif = $identifier OR e.nie = $identifier OR e.dni = $identifier))
   OR (e:Company AND (e.nif = $identifier OR e.cif = $identifier))
   OR (e:PublicOrgan AND (e.nif = $identifier OR e.cif = $identifier OR e.codigo = $identifier))
RETURN e, labels(e) AS entity_labels, elementId(e) AS entity_id
LIMIT 1
