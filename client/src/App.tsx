import { useState } from "react";
import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import ClaimSpace from "@/pages/claim-space";
import AnchorView from "@/pages/anchor-view";
import Constraints from "@/pages/constraints";
import Library from "@/pages/library";
import Cases from "@/pages/cases";
import Dashboard from "@/pages/dashboard";
import LanternCore from "@/pages/lantern-core";
import LanternExtract from "@/pages/lantern-extract";
import DossierEditor from "@/pages/dossier-editor";
import DossierReport from "@/pages/dossier-report";
import DossierComparison from "@/pages/dossier-comparison";
import HowItWorks from "@/pages/how-it-works";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { Menu, X, BookOpen, Home, FileSearch, GitCompare, FolderOpen, Layers, AlertTriangle } from "lucide-react";

function Router() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative">
      {/* Hamburger Menu Button */}
      <button 
        onClick={() => setMenuOpen(!menuOpen)}
        className="fixed top-4 right-4 z-50 p-2 bg-background/80 backdrop-blur border border-border/50 rounded-lg print:hidden"
        aria-label="Menu"
        data-testid="button-menu"
      >
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Menu Panel */}
      {menuOpen && (
        <div className="fixed top-16 right-4 z-50 bg-background border border-border rounded-lg shadow-lg p-2 min-w-[200px] print:hidden">
          <nav className="flex flex-col gap-1">
            <Link href="/" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
                <Layers className="w-4 h-4 mr-2" />
                Claim Space
              </Button>
            </Link>
            <Link href="/constraints" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Constraints & Friction
              </Button>
            </Link>
            <Link href="/library" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
                <Home className="w-4 h-4 mr-2" />
                Library
              </Button>
            </Link>
            <Link href="/extract" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
                <FileSearch className="w-4 h-4 mr-2" />
                Extract
              </Button>
            </Link>
            <Link href="/compare" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
                <GitCompare className="w-4 h-4 mr-2" />
                Compare
              </Button>
            </Link>
            <Link href="/cases" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
                <FolderOpen className="w-4 h-4 mr-2" />
                Cases
              </Button>
            </Link>
            <div className="border-t border-border my-1" />
            <Link href="/reference" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm text-muted-foreground">
                <BookOpen className="w-4 h-4 mr-2" />
                How Lantern Works
              </Button>
            </Link>
          </nav>
        </div>
      )}

      <Switch>
        <Route path="/" component={ClaimSpace} />
        <Route path="/anchors" component={AnchorView} />
        <Route path="/constraints" component={Constraints} />
        <Route path="/library" component={Library} />
        <Route path="/extract" component={LanternExtract} />
        <Route path="/dossier/:id" component={DossierEditor} />
        <Route path="/dossier/:id/report" component={DossierReport} />
        <Route path="/compare" component={DossierComparison} />
        <Route path="/cases" component={Cases} />
        <Route path="/reference" component={HowItWorks} />
        <Route path="/legacy" component={Dashboard} />
        <Route path="/legacy/core" component={LanternCore} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
