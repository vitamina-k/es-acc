import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect, useRef, Component, type ReactNode, type ErrorInfo } from "react";

// ── Global Error Boundary — evita pantalla negra ante crashes de render ──
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[VIGILIA] Render crash:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center bg-[hsl(220,60%,2%)] p-8">
          <div className="border border-[hsl(0,100%,60%,0.4)] p-6 max-w-lg text-center space-y-3">
            <p className="font-mono text-xs text-[hsl(0,100%,60%)] tracking-widest">ERROR DE SISTEMA</p>
            <p className="font-mono text-sm text-foreground">
              {(this.state.error as Error).message || "Error inesperado"}
            </p>
            <button
              className="font-mono text-xs border border-[hsl(145,100%,50%,0.4)] px-4 py-2 text-[hsl(145,100%,50%)] hover:bg-[hsl(145,100%,50%,0.08)] transition-colors"
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            >
              REINTENTAR
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import {
  LayoutDashboard,
  Search,
  Database,
  Shield,
  Menu,
  X,
  Github,
  Eye,
  Zap,
  Heart,
  Radio,
  Terminal,
  AlertTriangle,
} from "lucide-react";
import Dashboard from "@/pages/dashboard";
import SearchPage from "@/pages/search-page";
import CompanyGraph from "@/pages/company-graph";
import SourcesPage from "@/pages/sources-page";
import EdicionPage from "@/pages/edicion";
import DeudoresPage from "@/pages/deudores";
import AvisoLegal from "@/pages/aviso-legal";
import Privacidad from "@/pages/privacidad";
import DonarPage from "@/pages/donar";
import NotFound from "@/pages/not-found";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

// Force dark mode always
if (typeof document !== "undefined") {
  document.documentElement.classList.add("dark");
}

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

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("es-ES", { hour12: false }));
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString("es-ES", { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="neon-green font-mono text-xs tabular-nums cursor-blink">{time}</span>
  );
}

function AppLayout() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Always dark
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const isEdicion = location === "/edicion" || location.startsWith("/edicion/");
  const isDeudores = location === "/deudores" || location.startsWith("/deudores/");

  if (isEdicion) return <EdicionPage />;
  if (isDeudores) return <DeudoresPage />;

  const nav = [
    { href: "/", label: "SALA DE OPS", icon: LayoutDashboard, code: "F1" },
    { href: "/search", label: "BÚSQUEDA", icon: Search, code: "F2" },
    { href: "/graph", label: "EXPLORADOR", icon: Eye, code: "F3" },
    { href: "/sources", label: "FUENTES", icon: Database, code: "F4" },
    { href: "/deudores", label: "DEUDORES", icon: Shield, code: "F5" },
    { href: "/edicion", label: "EDICIÓN", icon: Zap, code: "F6" },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar — desktop ── */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[hsl(145,100%,50%,0.2)] bg-[hsl(220,60%,2%)] text-foreground relative">
        {/* Scanline overlay */}
        <div className="scanlines pointer-events-none absolute inset-0 z-10" />

        {/* Brand */}
        <div className="relative z-20 px-4 py-4 border-b border-[hsl(145,100%,50%,0.2)]">
          <div className="flex items-center gap-3 mb-3">
            <VigiliaLogo className="w-8 h-8 neon-green" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-base neon-green tracking-widest">VIGILIA</span>
                <span className="badge-classified text-[9px] px-1 py-0">ACTIVO</span>
              </div>
              <span className="block font-mono text-[10px] text-muted-foreground tracking-wide">
                PLATAFORMA DE TRANSPARENCIA
              </span>
            </div>
          </div>

          {/* System status bar */}
          <div className="bg-black/40 border border-[hsl(145,100%,50%,0.15)] rounded p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">SISTEMA</span>
              <div className="flex items-center gap-1.5">
                <span className="status-dot-live" />
                <span className="font-mono text-[10px] neon-green">OPERATIVO</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">HORA LOCAL</span>
              <LiveClock />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">ACCESO</span>
              <span className="font-mono text-[10px] text-[hsl(38,100%,60%)]">PÚBLICO</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative z-20 flex-1 px-3 py-4 space-y-0.5">
          <div className="font-mono text-[10px] text-muted-foreground px-3 mb-2 tracking-widest">
            ── MÓDULOS ──────────────────
          </div>
          {nav.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-2.5 px-3 py-2.5 font-mono text-xs tracking-wide transition-all duration-150 border-l-2 ${
                  active
                    ? "border-[hsl(145,100%,50%)] bg-[hsl(145,100%,50%,0.08)] neon-green"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-[hsl(145,100%,50%,0.4)] hover:bg-[hsl(145,100%,50%,0.04)]"
                }`}
              >
                <span className={`text-[10px] ${active ? "neon-green" : "text-muted-foreground"}`}>
                  {active ? "▶" : "›"}
                </span>
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <span className={`text-[9px] font-mono ${active ? "neon-green opacity-60" : "text-muted-foreground opacity-40"}`}>
                  {item.code}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="relative z-20 px-3 py-4 border-t border-[hsl(145,100%,50%,0.2)] space-y-2">
          {/* Donar — misión crítica */}
          <Link
            href="/donar"
            className="flex items-center gap-2.5 px-3 py-2.5 w-full font-mono text-xs tracking-wide border border-[hsl(0,100%,60%,0.5)] text-[hsl(0,100%,70%)] hover:bg-[hsl(0,100%,60%,0.1)] hover:border-[hsl(0,100%,60%,0.8)] transition-all duration-150"
          >
            <span className="text-[10px]">▲</span>
            <Heart className="w-3.5 h-3.5 shrink-0" />
            <span>APOYAR MISIÓN</span>
          </Link>

          <a
            href="https://github.com/vitamina-k/es-acc"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 font-mono text-[11px] text-muted-foreground hover:text-foreground hover:bg-[hsl(145,100%,50%,0.04)] transition-colors w-full"
          >
            <Github className="w-3.5 h-3.5" />
            <span>CÓDIGO ABIERTO</span>
          </a>

          {/* Legal + attribution */}
          <div className="flex gap-3 px-3 pt-1">
            <Link href="/aviso-legal" className="font-mono text-[9px] text-muted-foreground hover:neon-green hover:text-[hsl(145,100%,50%)] transition-colors">
              AVISO LEGAL
            </Link>
            <span className="font-mono text-[9px] text-muted-foreground">·</span>
            <Link href="/privacidad" className="font-mono text-[9px] text-muted-foreground hover:text-[hsl(145,100%,50%)] transition-colors">
              PRIVACIDAD
            </Link>
          </div>
          <div className="px-3">
            <PerplexityAttribution />
          </div>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-[hsl(220,60%,2%)] border-b border-[hsl(145,100%,50%,0.3)]">
        <div className="flex items-center gap-2">
          <VigiliaLogo className="w-6 h-6 neon-green" />
          <span className="font-mono font-bold text-sm neon-green tracking-widest">VIGILIA</span>
          <span className="status-dot-live ml-1" />
        </div>
        <div className="flex items-center gap-2">
          <LiveClock />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="btn-mobile-menu"
            className="p-2 border border-[hsl(145,100%,50%,0.3)] hover:border-[hsl(145,100%,50%)] hover:bg-[hsl(145,100%,50%,0.08)] transition-all"
          >
            {mobileOpen ? <X className="w-4 h-4 neon-green" /> : <Menu className="w-4 h-4 neon-green" />}
          </button>
        </div>
      </div>

      {/* ── Mobile nav overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[hsl(220,60%,2%)] pt-16">
          <div className="scanlines pointer-events-none absolute inset-0" />
          <nav className="relative z-10 px-4 py-4 space-y-1">
            <div className="font-mono text-[10px] text-muted-foreground px-2 mb-3 tracking-widest">
              ── MÓDULOS DISPONIBLES ──
            </div>
            {nav.map((item) => {
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 font-mono text-sm border-l-2 transition-all ${
                    active
                      ? "border-[hsl(145,100%,50%)] bg-[hsl(145,100%,50%,0.08)] neon-green"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-4 border-t border-[hsl(145,100%,50%,0.2)]">
              <Link
                href="/donar"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 font-mono text-sm border border-[hsl(0,100%,60%,0.5)] text-[hsl(0,100%,70%)]"
              >
                <Heart className="w-4 h-4" />
                APOYAR MISIÓN
              </Link>
            </div>
          </nav>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14 bg-background">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/search" component={SearchPage} />
          <Route path="/graph/drill/:drillId" component={CompanyGraph} />
          <Route path="/graph/:nif" component={CompanyGraph} />
          <Route path="/graph" component={CompanyGraph} />
          <Route path="/sources" component={SourcesPage} />
          <Route path="/donar" component={DonarPage} />
          <Route path="/aviso-legal" component={AvisoLegal} />
          <Route path="/privacidad" component={Privacidad} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router hook={useHashLocation}>
          <ErrorBoundary>
            <AppLayout />
          </ErrorBoundary>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
