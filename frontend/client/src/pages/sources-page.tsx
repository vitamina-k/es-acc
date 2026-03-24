import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { MetaResponse } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database, CheckCircle2, Clock, AlertCircle } from "lucide-react";

function formatNumber(n: number): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es-ES");
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  "Identidad empresarial": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Contratos": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Legislativo": "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "Gaceta oficial": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Integridad": "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  "Fiscal": "bg-red-500/10 text-red-600 dark:text-red-400",
  "Subvenciones": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "Sanciones": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Identidad offshore": "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  "Integridad judicial": "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
};

export default function SourcesPage() {
  const { data, isLoading } = useQuery<MetaResponse>({
    queryKey: ["/api/v1/public/meta"],
    queryFn: () => apiRequest("GET", "/api/v1/public/meta").then((r) => r.json()),
  });

  const categories = data
    ? [...new Set(data.sources.map((s) => s.category))]
    : [];

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" data-testid="text-page-title">
          Fuentes de datos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registro completo de las fuentes públicas que alimentan el grafo de VIGILIA
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Total fuentes</p>
            <p className="text-xl font-bold mt-0.5" data-testid="text-total-sources">
              {isLoading ? <Skeleton className="h-7 w-12 inline-block" /> : data?.sources.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Activas</p>
            <p className="text-xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
              {isLoading ? (
                <Skeleton className="h-7 w-12 inline-block" />
              ) : (
                data?.sources.filter((s) => s.status === "ok").length
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Categorías</p>
            <p className="text-xl font-bold mt-0.5">
              {isLoading ? <Skeleton className="h-7 w-12 inline-block" /> : categories.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sources table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">Fuente</TableHead>
                    <TableHead className="text-xs">Categoría</TableHead>
                    <TableHead className="text-xs">Frecuencia</TableHead>
                    <TableHead className="text-xs text-right">Registros</TableHead>
                    <TableHead className="text-xs">Última ejecución</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.sources.map((src) => (
                    <TableRow key={src.id} data-testid={`row-${src.id}`}>
                      <TableCell className="w-10">
                        {src.status === "ok" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : src.status === "pending" ? (
                          <Clock className="w-4 h-4 text-amber-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{src.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{src.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${CATEGORY_COLORS[src.category] || ""}`}
                        >
                          {src.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {src.frequency}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono tabular-nums">
                        {formatNumber(src.record_count)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(src.last_run)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legal disclaimer */}
      <div className="border border-border rounded-lg p-4 bg-card">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Marco legal:</strong> Todos los datos provienen de fuentes públicas
          oficiales, amparados por la CE Art. 105.b, Ley 19/2013 de Transparencia, Ley 9/2017 LCSP,
          y el RGPD (EU 2016/679). VIGILIA no inventa ni interpreta datos — conecta registros oficiales.
          Las conexiones documentadas no constituyen acusaciones.
        </p>
      </div>
    </div>
  );
}
