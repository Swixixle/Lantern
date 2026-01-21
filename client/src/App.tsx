import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/dashboard";
import LanternCore from "@/pages/lantern-core";
import LanternExtract from "@/pages/lantern-extract";
import DossierEditor from "@/pages/dossier-editor";
import DossierReport from "@/pages/dossier-report";
import DossierComparison from "@/pages/dossier-comparison";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";

function Router() {
  return (
    <div className="relative">
      {/* Quick Nav for Prototype */}
      <nav className="fixed bottom-4 right-4 z-50 flex gap-2">
        <Link href="/">
          <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur border-amber-500/20 text-xs font-mono">
            Dashboard
          </Button>
        </Link>
        <Link href="/core">
          <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur border-amber-500/20 text-xs font-mono">
            Core
          </Button>
        </Link>
        <Link href="/extract">
          <Button variant="outline" size="sm" className="bg-background/80 backdrop-blur border-cyan-500/20 text-xs font-mono">
            Extract
          </Button>
        </Link>
      </nav>

      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/core" component={LanternCore} />
        <Route path="/extract" component={LanternExtract} />
        <Route path="/dossier/:id" component={DossierEditor} />
        <Route path="/dossier/:id/report" component={DossierReport} />
        <Route path="/compare" component={DossierComparison} />
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
