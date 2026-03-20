CREATE (t:Tip {
  tip_id: $tip_id,
  description: $description,
  source_hint: $source_hint,
  contact: $contact,
  entities_mentioned: $entities_mentioned,
  status: 'pending',
  created_at: $created_at
})
RETURN t.tip_id AS tip_id
