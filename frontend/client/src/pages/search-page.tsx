import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { SearchResultApi } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Building2,
  User,
  FileText,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

const LABEL_CONFIG: Record<string, { icon: typeof Building2; color: string; bg: string }> = {
  Company: { icon: Building2, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  Person: { icon: User, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  Contract: { icon: FileText, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  Sanction: { icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setDebouncedQuery(query.trim());
    }
  };

  const { data: results, isLoading } = useQuery<SearchResultApi[]>({
    queryKey: ["/api/v1/public/search", debouncedQuery],
    queryFn: () =>
      apiRequest("GET", `/api/v1/public/search?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.json()),
    enabled: debouncedQuery.length >= 2,
  });

  return (
    <div className="p-6 md:p-8 max-w-[900px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-page-title">Buscar entidades</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Busca empresas, personas, contratos y más en el grafo de transparencia
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          data-testid="input-search"
          type="search"
          placeholder="Nombre de empresa, NIF, persona..."
          className="pl-10 h-11 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      {/* Results */}
      <div className="space-y-2">
        {isLoading && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </>
        )}

        {results && results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No se encontraron resultados para "{debouncedQuery}"</p>
          </div>
        )}

        {results?.map((result) => {
          const config = LABEL_CONFIG[result.label] || LABEL_CONFIG.Company;
          const Icon = config.icon;
          const isCompany = result.label === "Company";
          const href = isCompany ? `/graph/${result.id}` : `/graph`;

          return (
            <Link key={result.id} href={href}>
              <Card
                data-testid={`result-${result.id}`}
                className="cursor-pointer hover:border-primary/40 transition-colors group"
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{result.name}</p>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {result.label === "Company" ? "Empresa" : result.label === "Person" ? "Persona" : result.label}
                      </Badge>
                    </div>
                    {result.snippet && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {result.snippet}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      {result.id}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {!debouncedQuery && !isLoading && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/5 flex items-center justify-center">
              <Search className="w-8 h-8 opacity-30" />
            </div>
            <p className="text-sm font-medium">Introduce un término de búsqueda</p>
            <p className="text-xs mt-1">
              Puedes buscar por nombre de empresa, NIF/CIF, nombre de persona o cargo público
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
