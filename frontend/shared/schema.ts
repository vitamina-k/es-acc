import { pgTable, text, serial, integer, real, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Note: VIGILIA uses Neo4j as primary DB. These schemas are for the
// API response types shared between frontend and backend.
// The backend proxies Neo4j data — no Postgres in this project.

// We still define types here for shared use across frontend/backend.

export const searchResults = pgTable("search_results", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  name: text("name").notNull(),
  snippet: text("snippet"),
  score: real("score").default(0),
});

export const insertSearchResultSchema = createInsertSchema(searchResults).omit({ id: true });
export type InsertSearchResult = z.infer<typeof insertSearchResultSchema>;
export type SearchResult = typeof searchResults.$inferSelect;

// Shared TypeScript types for API responses (mirror api/models.py)

export interface SourceStatus {
  id: string;
  name: string;
  category: string;
  frequency: string;
  last_run: string | null;
  record_count: number;
  status: string;
}

export interface MetaResponse {
  total_nodes: number;
  total_relationships: number;
  node_counts: Record<string, number>;
  sources: SourceStatus[];
}

export interface HealthResponse {
  status: string;
  neo4j: string;
  timestamp: string;
}

export interface CompanyNode {
  nif: string;
  name: string;
  status: string | null;
  province: string | null;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface SubgraphResponse {
  center: CompanyNode;
  nodes: Array<Record<string, unknown>>;
  edges: GraphEdge[];
  total_nodes: number;
  total_edges: number;
}

export interface RiskSignal {
  signal_type: string;
  severity: string;
  description: string;
  source: string;
  entity_id: string | null;
}

export interface PatternResponse {
  nif: string;
  company_name: string | null;
  risk_signals: RiskSignal[];
  risk_score: number;
  connections_summary: Record<string, number>;
}

export interface SearchResultApi {
  id: string;
  label: string;
  name: string;
  snippet: string | null;
  score: number;
}
