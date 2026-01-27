import { useState } from "react";
import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ConfigProvider, useReadOnlyMode } from "./lib/config";
import ClaimSpace from "@/pages/claim-space";
import AnchorView from "@/pages/anchor-view";
import Constraints from "@/pages/constraints";
import Snapshots from "@/pages/snapshots";
import SnapshotDetail from "@/pages/snapshot-detail";
import Library from "@/pages/library";
import Cases from "@/pages/cases";
import Dashboard from "@/pages/dashboard";
import LanternCore from "@/pages/lantern-core";
import LanternExtract from "@/pages/lantern-extract";
import DossierEditor from "@/pages/dossier-editor";
import DossierReport from "@/pages/dossier-report";
import DossierComparison from "@/pages/dossier-comparison";
import HowItWorks from "@/pages/how-it-works";
import Intake from "@/pages/intake";
import AnchorBrowser from "@/pages/anchor-browser";
import EvidencePacket from "@/pages/evidence-packet";
import Ledger from "@/pages/ledger";
import Sources from "@/pages/sources";
import Review from "@/pages/review";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { Menu, X, BookOpen, Home, FileSearch, GitCompare, FolderOpen, Layers, AlertTriangle, Camera, FileUp, ScrollText, Eye, FileText, Anchor } from "lucide-react";
import { useSearch } from "wouter";

function ReadOnlyNav({ corpusId }: { corpusId: string | null }) {
  if (!corpusId) return null;
  
  return (
    <nav 
      className="fixed top-10 left-0 right-0 z-30 bg-background/95 backdrop-blur border-b border-border py-2 px-4 print:hidden"
      data-testid="readonly-nav"
    >
      <div className="max-w-4xl mx-auto flex items-center gap-4 text-sm">
        <Link href={`/?corpusId=${corpusId}`}>
          <Button variant="ghost" size="sm" className="text-xs">
            <Layers className="w-3 h-3 mr-1" />
            Claim Space
          </Button>
        </Link>
        <Link href={`/sources?corpusId=${corpusId}`}>
          <Button variant="ghost" size="sm" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            Sources
          </Button>
        </Link>
        <Link href={`/anchors/browse?corpusId=${corpusId}`}>
          <Button variant="ghost" size="sm" className="text-xs">
            <Anchor className="w-3 h-3 mr-1" />
            Anchors
          </Button>
        </Link>
        <Link href={`/ledger?corpusId=${corpusId}`}>
          <Button variant="ghost" size="sm" className="text-xs">
            <ScrollText className="w-3 h-3 mr-1" />
            Ledger
          </Button>
        </Link>
        <Link href={`/snapshots?corpusId=${corpusId}`}>
          <Button variant="ghost" size="sm" className="text-xs">
            <Camera className="w-3 h-3 mr-1" />
            Snapshots
          </Button>
        </Link>
      </div>
    </nav>
  );
}

function Router() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isReadOnly } = useReadOnlyMode();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const corpusIdFromQuery = params.get("corpusId");

  return (
    <div className="relative">
      {/* v1.11 Review Mode Banner */}
      {isReadOnly && (
        <div 
          className="fixed top-0 left-0 right-0 z-40 bg-amber-600 text-white text-center py-2 px-4 font-medium print:hidden"
          data-testid="banner-review-mode"
        >
          <Eye className="w-4 h-4 inline-block mr-2" />
          Review Mode (Read-Only)
        </div>
      )}
      
      {/* v1.12 Read-Only Navigation */}
      {isReadOnly && <ReadOnlyNav corpusId={corpusIdFromQuery} />}
      
      {/* Hamburger Menu Button - hidden in read-only mode */}
      {!isReadOnly && (
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="fixed top-4 right-4 z-50 p-2 bg-background/80 backdrop-blur border border-border/50 rounded-lg print:hidden"
          aria-label="Menu"
          data-testid="button-menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {/* Menu Panel - hidden in read-only mode */}
      {menuOpen && !isReadOnly && (
        <div className="fixed top-16 right-4 z-50 bg-background border border-border rounded-lg shadow-lg p-2 min-w-[200px] print:hidden">
          <nav className="flex flex-col gap-1">
            <Link href="/intake" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
                <FileUp className="w-4 h-4 mr-2" />
                Corpus Intake
              </Button>
            </Link>
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
            <Link href="/snapshots" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
                <Camera className="w-4 h-4 mr-2" />
                Snapshot & Export
              </Button>
            </Link>
            <Link href="/ledger" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
                <ScrollText className="w-4 h-4 mr-2" />
                Revision Ledger
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
        <Route path="/review/:corpusId" component={Review} />
        <Route path="/intake" component={Intake} />
        <Route path="/" component={ClaimSpace} />
        <Route path="/sources" component={Sources} />
        <Route path="/anchors/browse" component={AnchorBrowser} />
        <Route path="/packets/:packetId" component={EvidencePacket} />
        <Route path="/ledger" component={Ledger} />
        <Route path="/anchors" component={AnchorView} />
        <Route path="/constraints" component={Constraints} />
        <Route path="/snapshots" component={Snapshots} />
        <Route path="/snapshots/:snapshot_id" component={SnapshotDetail} />
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
      <ConfigProvider>
        <Toaster />
        <Router />
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
