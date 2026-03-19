import { useState, useMemo, useCallback } from "react";
import { Link } from "wouter";
import {
  Search,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  User,
  AlertTriangle,
  ExternalLink,
  X,
  Filter,
  TrendingDown,
  Scale,
  Info,
  ChevronRight,
  Calendar,
  FileText,
  Landmark,
  CircleDot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  type Deudor,
  DEUDORES,
  searchDeudores,
  getEstadisticas,
  formatDeuda,
  formatDeudaFull,
  getSeveridadBg,
  getMaxSeveridad,
  getTipoSancionLabel,
} from "@/lib/deudores-data";

// ── Types ──

type SortField = "deuda" | "nombre" | "sanciones";
type SortDir = "asc" | "desc";
type TipoFilter = "todas" | "persona_fisica" | "persona_juridica";
type SancionesFilter = "todas" | "con" | "sin";

// ── VIGILIA logo (same as App.tsx) ──

function VigiliaLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="VIGILIA logo"
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
      <line x1="16" y1="2" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="24" x2="16" y2="30" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5" />
      <line x1="24" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// ── Severity helpers ──

function severidadLabel(sev: string): string {
  switch (sev) {
    case "critica": return "Crítica";
    case "alta": return "Alta";
    case "media": return "Media";
    case "baja": return "Baja";
    default: return sev;
  }
}

function severidadOrder(sev: string): number {
  switch (sev) {
    case "critica": return 4;
    case "alta": return 3;
    case "media": return 2;
    case "baja": return 1;
    default: return 0;
  }
}

// ── Stat card for the top bar ──

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: typeof Search;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border">
      <div className={`p-2 rounded-md ${accent ?? "bg-primary/10 text-primary"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider leading-none mb-1">
          {label}
        </p>
        <p className="text-sm font-bold truncate" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Main page ──

export default function DeudoresPage() {
  const [query, setQuery] = useState("");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("todas");
  const [sancionesFilter, setSancionesFilter] = useState<SancionesFilter>("todas");
  const [deudaMinima, setDeudaMinima] = useState<number>(0);
  const [sortField, setSortField] = useState<SortField>("deuda");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedDeudor, setSelectedDeudor] = useState<Deudor | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 50;
  const stats = useMemo(() => getEstadisticas(), []);

  // Search + filter + sort
  const filtered = useMemo(() => {
    let results = searchDeudores(query);

    if (tipoFilter !== "todas") {
      results = results.filter((d) => d.tipo === tipoFilter);
    }
    if (sancionesFilter === "con") {
      results = results.filter((d) => d.sanciones.length > 0);
    } else if (sancionesFilter === "sin") {
      results = results.filter((d) => d.sanciones.length === 0);
    }
    if (deudaMinima > 0) {
      results = results.filter(
        (d) => d.deuda_aeat !== null && d.deuda_aeat >= deudaMinima
      );
    }

    results.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "deuda":
          cmp = (a.deuda_aeat ?? 0) - (b.deuda_aeat ?? 0);
          break;
        case "nombre":
          cmp = a.nombre.localeCompare(b.nombre, "es");
          break;
        case "sanciones":
          cmp = a.sanciones.length - b.sanciones.length;
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return results;
  }, [query, tipoFilter, sancionesFilter, deudaMinima, sortField, sortDir]);

  // Reset page when filters change
  useMemo(() => setPage(0), [query, tipoFilter, sancionesFilter, deudaMinima]);

  const paginated = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page]
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const totalDeudaFiltered = useMemo(
    () => filtered.reduce((sum, d) => sum + (d.deuda_aeat ?? 0), 0),
    [filtered]
  );

  const filtersActive =
    tipoFilter !== "todas" ||
    sancionesFilter !== "todas" ||
    deudaMinima > 0;

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField]
  );

  const clearFilters = useCallback(() => {
    setTipoFilter("todas");
    setSancionesFilter("todas");
    setDeudaMinima(0);
  }, []);

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "desc" ? (
      <ArrowDown className="w-3 h-3 ml-1 text-primary" />
    ) : (
      <ArrowUp className="w-3 h-3 ml-1 text-primary" />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top branding bar ── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-[1440px] mx-auto flex items-center gap-3 px-4 sm:px-6 py-3">
          <Link
            href="/"
            data-testid="link-back-home"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mr-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Inicio</span>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <VigiliaLogo className="w-6 h-6 text-primary" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide">VIGILIA</span>
            <Badge variant="outline" className="text-[10px] h-5 font-mono">
              DEUDORES
            </Badge>
          </div>
          <div className="ml-auto text-[11px] text-muted-foreground hidden md:block">
            Datos públicos · AEAT · CNMC · AEPD · OpenSanctions
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ── Search bar ── */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            data-testid="input-search-deudores"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, NIF, tipo de sanción, organismo..."
            className="w-full h-12 pl-12 pr-4 bg-card border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
          {query && (
            <button
              data-testid="btn-clear-search"
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Entidades"
            value={filtered.length.toLocaleString("es-ES")}
            icon={Building2}
          />
          <StatCard
            label="Deuda total"
            value={formatDeuda(totalDeudaFiltered)}
            icon={TrendingDown}
            accent="bg-red-500/10 text-red-500"
          />
          <StatCard
            label="Con sanciones"
            value={filtered.filter((d) => d.sanciones.length > 0).length}
            icon={Scale}
            accent="bg-orange-500/10 text-orange-500"
          />
          <StatCard
            label="Personas físicas"
            value={filtered.filter((d) => d.tipo === "persona_fisica").length}
            icon={User}
            accent="bg-blue-500/10 text-blue-500"
          />
        </div>

        {/* ── Filters row ── */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="btn-toggle-filters"
            className="gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {filtersActive && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary-foreground" />
            )}
          </Button>

          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              data-testid="btn-clear-filters"
              className="text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="w-3 h-3" />
              Limpiar filtros
            </Button>
          )}

          {/* Sort buttons (always visible) */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground mr-1 hidden sm:inline">
              Ordenar:
            </span>
            {(
              [
                ["deuda", "Deuda"],
                ["nombre", "Nombre"],
                ["sanciones", "Sanciones"],
              ] as [SortField, string][]
            ).map(([field, label]) => (
              <Button
                key={field}
                variant={sortField === field ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleSort(field)}
                data-testid={`btn-sort-${field}`}
                className="h-7 px-2.5 text-xs gap-0.5"
              >
                {label}
                <SortIcon field={field} />
              </Button>
            ))}
          </div>
        </div>

        {/* ── Filter panel (collapsible) ── */}
        {showFilters && (
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Tipo */}
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Tipo de entidad
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["todas", "Todas"],
                        ["persona_juridica", "Persona jurídica"],
                        ["persona_fisica", "Persona física"],
                      ] as [TipoFilter, string][]
                    ).map(([val, label]) => (
                      <Button
                        key={val}
                        variant={tipoFilter === val ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTipoFilter(val)}
                        data-testid={`filter-tipo-${val}`}
                        className="h-7 text-xs"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Sanciones */}
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Sanciones
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["todas", "Todas"],
                        ["con", "Con sanciones"],
                        ["sin", "Sin sanciones"],
                      ] as [SancionesFilter, string][]
                    ).map(([val, label]) => (
                      <Button
                        key={val}
                        variant={sancionesFilter === val ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSancionesFilter(val)}
                        data-testid={`filter-sanciones-${val}`}
                        className="h-7 text-xs"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Deuda mínima */}
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Deuda mínima
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      [0, "Sin mínimo"],
                      [1_000_000, "1 M€"],
                      [10_000_000, "10 M€"],
                      [50_000_000, "50 M€"],
                    ].map(([val, label]) => (
                      <Button
                        key={val as number}
                        variant={deudaMinima === val ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDeudaMinima(val as number)}
                        data-testid={`filter-deuda-${val}`}
                        className="h-7 text-xs"
                      >
                        {label as string}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Results table ── */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%] min-w-[240px]">
                    <button
                      onClick={() => handleSort("nombre")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      data-testid="th-nombre"
                    >
                      Nombre / NIF
                      <SortIcon field="nombre" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead className="w-[140px]">
                    <button
                      onClick={() => handleSort("deuda")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      data-testid="th-deuda"
                    >
                      Deuda AEAT
                      <SortIcon field="deuda" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <button
                      onClick={() => handleSort("sanciones")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      data-testid="th-sanciones"
                    >
                      Sanciones
                      <SortIcon field="sanciones" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[100px]">Riesgo</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Search className="w-8 h-8 opacity-30" />
                        <p className="text-sm">
                          No se encontraron resultados para esta búsqueda.
                        </p>
                        {(query || filtersActive) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setQuery("");
                              clearFilters();
                            }}
                            data-testid="btn-reset-all"
                          >
                            Restablecer búsqueda
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((d) => {
                    const maxSev = getMaxSeveridad(d);
                    return (
                      <TableRow
                        key={d.id}
                        data-testid={`row-deudor-${d.id}`}
                        className="cursor-pointer group"
                        onClick={() => setSelectedDeudor(d)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold ${
                                d.tipo === "persona_fisica"
                                  ? "bg-blue-500/10 text-blue-500"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {d.tipo === "persona_fisica" ? (
                                <User className="w-4 h-4" />
                              ) : (
                                <Building2 className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                {d.nombre}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {d.nif}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {d.tipo === "persona_fisica"
                              ? "P. física"
                              : "P. jurídica"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {d.deuda_aeat !== null ? (
                            <div>
                              <span className="text-sm font-semibold text-red-500 dark:text-red-400">
                                {formatDeuda(d.deuda_aeat)}
                              </span>
                              {d.año_lista && (
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  ({d.año_lista})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {d.sanciones.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                            >
                              {d.sanciones.length}{" "}
                              {d.sanciones.length === 1
                                ? "sanción"
                                : "sanciones"}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold tracking-wider ${getSeveridadBg(maxSev)}`}
                          >
                            {severidadLabel(maxSev)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Mostrando {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, filtered.length)} de{" "}
                {filtered.length.toLocaleString("es-ES")} resultados
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  data-testid="btn-page-prev"
                  className="h-7 text-xs"
                >
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  data-testid="btn-page-next"
                  className="h-7 text-xs"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* ── Info footer ── */}
        <div className="text-center text-[11px] text-muted-foreground pb-4 space-y-1">
          <p>
            Datos extraídos de fuentes públicas oficiales. AEAT lista de
            deudores (art. 95 bis LGT), CNMC resoluciones sancionadoras, AEPD
            resoluciones, Inspección de Trabajo, OpenSanctions.
          </p>
          <p>
            Esta herramienta tiene carácter informativo. No constituye
            asesoramiento jurídico ni acusación formal.
          </p>
        </div>
      </main>

      {/* ── Detail sheet (right panel) ── */}
      <Sheet
        open={selectedDeudor !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDeudor(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 overflow-hidden"
          data-testid="sheet-deudor-detail"
        >
          {selectedDeudor && (
            <DeudorDetail
              deudor={selectedDeudor}
              onClose={() => setSelectedDeudor(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Detail panel content ──

function DeudorDetail({
  deudor: d,
  onClose,
}: {
  deudor: Deudor;
  onClose: () => void;
}) {
  const maxSev = getMaxSeveridad(d);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <SheetHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                d.tipo === "persona_fisica"
                  ? "bg-blue-500/10 text-blue-500"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {d.tipo === "persona_fisica" ? (
                <User className="w-5 h-5" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle
                className="text-base font-bold leading-tight"
                data-testid="detail-nombre"
              >
                {d.nombre}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className="text-xs font-mono text-muted-foreground"
                  data-testid="detail-nif"
                >
                  {d.nif}
                </span>
                <Badge variant="outline" className="text-[10px] h-5">
                  {d.tipo === "persona_fisica"
                    ? "Persona física"
                    : "Persona jurídica"}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] h-5 uppercase font-bold tracking-wider ${getSeveridadBg(maxSev)}`}
                >
                  Riesgo {severidadLabel(maxSev)}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Deuda AEAT card */}
        {d.deuda_aeat !== null && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5" />
                Deuda con Hacienda (AEAT)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p
                className="text-2xl font-bold text-red-500 dark:text-red-400"
                data-testid="detail-deuda-amount"
              >
                {formatDeudaFull(d.deuda_aeat)}
              </p>
              {d.año_lista && (
                <p className="text-xs text-muted-foreground mt-1">
                  Lista publicada en {d.año_lista} · Art. 95 bis Ley General
                  Tributaria
                </p>
              )}
              <div className="mt-3 p-2.5 rounded-md bg-background/50 border border-border">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  La AEAT publica anualmente la lista de deudores con la
                  Hacienda Pública cuya deuda supera los 600.000€ y no ha sido
                  pagada en período voluntario, ni aplazada ni suspendida. La
                  inclusión en esta lista es un dato público accesible por
                  cualquier ciudadano.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sanciones timeline */}
        {d.sanciones.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              Sanciones ({d.sanciones.length})
            </h3>
            <div className="space-y-3">
              {d.sanciones.map((s, i) => (
                <Card key={i} data-testid={`sancion-card-${i}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 flex-shrink-0"
                      >
                        {getTipoSancionLabel(s.tipo)}
                      </Badge>
                      {s.importe !== null && (
                        <span className="text-sm font-bold text-orange-500 flex-shrink-0">
                          {formatDeuda(s.importe)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">
                      {s.descripcion}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Landmark className="w-3 h-3" />
                        {s.organismo}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(s.fecha).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      {s.expediente && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {s.expediente}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Señales de riesgo */}
        {d.señales.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Señales de riesgo ({d.señales.length})
            </h3>
            <div className="space-y-2">
              {[...d.señales]
                .sort(
                  (a, b) =>
                    severidadOrder(b.severidad) - severidadOrder(a.severidad)
                )
                .map((s, i) => (
                  <div
                    key={i}
                    data-testid={`signal-card-${i}`}
                    className="p-3 rounded-lg border border-border bg-card space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <CircleDot
                        className={`w-3 h-3 flex-shrink-0 ${
                          s.severidad === "critica"
                            ? "text-red-500"
                            : s.severidad === "alta"
                              ? "text-orange-500"
                              : s.severidad === "media"
                                ? "text-amber-500"
                                : "text-blue-400"
                        }`}
                      />
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold tracking-wider ${getSeveridadBg(s.severidad)}`}
                      >
                        {severidadLabel(s.severidad)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {s.fuente}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed pl-5">
                      {s.descripcion}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Fuentes */}
        {d.fuentes.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Fuentes
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {d.fuentes.map((f, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {f}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Explainer box */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-primary mb-1">
                  ¿Por qué es esto importante?
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  La transparencia sobre deudores fiscales y entidades
                  sancionadas permite a ciudadanos, periodistas e
                  investigadores evaluar el comportamiento de actores
                  económicos relevantes. Estos datos son públicos por mandato
                  legal (art. 95 bis LGT, resoluciones CNMC, resoluciones
                  AEPD) y su difusión contribuye a la rendición de cuentas y
                  la integridad del mercado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
