import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Search,
  Database,
  Shield,
  Moon,
  Sun,
  Menu,
  X,
  Github,
  Eye,
  Zap,
  Heart,
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

function AppLayout() {
  const [location] = useLocation();
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const isEdicion = location === "/edicion" || location.startsWith("/edicion/");
  const isDeudores = location === "/deudores" || location.startsWith("/deudores/");
  const isLegal = location === "/aviso-legal" || location === "/privacidad";

  // Standalone pages — render without main sidebar
  if (isEdicion) return <EdicionPage />;
  if (isDeudores) return <DeudoresPage />;

  const nav = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/search", label: "Buscar", icon: Search },
    { href: "/graph", label: "Explorador", icon: Eye },
    { href: "/sources", label: "Fuentes", icon: Database },
    { href: "/deudores", label: "Deudores", icon: Shield },
    { href: "/edicion", label: "Edición", icon: Zap },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
          <VigiliaLogo className="w-7 h-7 text-primary" />
          <div>
            <span className="font-bold text-sm tracking-wide">VIGILIA</span>
            <span className="block text-[11px] text-muted-foreground leading-tight">
              Transparencia + IA
            </span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          {/* Donar — destacado */}
          <Link
            href="/donar"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-red-500 hover:bg-red-500/10 w-full transition-colors"
          >
            <Heart className="w-4 h-4" />
            Apoyar el proyecto
          </Link>
          <button
            data-testid="btn-toggle-theme"
            onClick={() => setDark(!dark)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full transition-colors"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {dark ? "Modo claro" : "Modo oscuro"}
          </button>
          <a
            href="https://github.com/vitamina-k/es-acc"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full transition-colors"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>
          {/* Footer legal */}
          <div className="flex gap-3 px-3 pt-1">
            <Link href="/aviso-legal" className="text-[10px] text-muted-foreground hover:underline">Aviso legal</Link>
            <Link href="/privacidad" className="text-[10px] text-muted-foreground hover:underline">Privacidad</Link>
          </div>
          <PerplexityAttribution />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background border-b border-border">
        <div className="flex items-center gap-2">
          <VigiliaLogo className="w-6 h-6 text-primary" />
          <span className="font-bold text-sm">VIGILIA</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDark(!dark)} data-testid="btn-mobile-theme" className="p-2 rounded-md hover:bg-muted/50">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} data-testid="btn-mobile-menu" className="p-2 rounded-md hover:bg-muted/50">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 pt-16">
          <nav className="px-4 py-4 space-y-1">
            {nav.map((item) => {
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto md:pt-0 pt-14">
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
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <AppLayout />
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
