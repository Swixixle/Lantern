import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileJson, 
  FileText, 
  RefreshCw, 
  ChevronRight, 
  Users, 
  Quote, 
  Hash, 
  CalendarClock,
  Sliders,
  Activity,
  Save,
  FolderOpen,
  Filter,
  Check,
  Copy,
  GitCompare,
  Play,
  AlertTriangle,
  ArrowRight,
  Download,
  Upload,
  Trash2
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { extract, computePackId, diffPacks, scoreExtraction, LanternPack, ExtractionOptions, PackDiff, QualityReport } from "@/lib/lanternExtract";
import { storage, debouncedSave, type StorageStatus } from "@/lib/storage";
import { cn } from "@/lib/utils";
import fixtures from "@/fixtures/metric_and_attribution_edge_cases.json";

// ... (Persistence Mock REMOVED) - storage.ts is now authoritative

export default function LanternExtract() {
  const [step, setStep] = useState<"input" | "extract" | "export" | "quality">("input");
  const [showSaved, setShowSaved] = useState(false);
  const [savedPacks, setSavedPacks] = useState<LanternPack[]>([]);
  const [filterSourceHash, setFilterSourceHash] = useState<string | null>(null);
  
  // Storage State
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("idle");
  const [selectedPackIds, setSelectedPackIds] = useState<Set<string>>(new Set());

  // Diff View State
  const [diffMode, setDiffMode] = useState(false);
  const [diffPackId, setDiffPackId] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<PackDiff | null>(null);
  
  // ... (Quality State same as before)
  const [qualityReports, setQualityReports] = useState<QualityReport[]>([]);
  const [runningTests, setRunningTests] = useState(false);
  const [modeValidation, setModeValidation] = useState<{ pass: boolean; warnings: string[] } | null>(null);
  const [determinismStatus, setDeterminismStatus] = useState<"pending" | "pass" | "fail">("pending");
  const [provenanceStatus, setProvenanceStatus] = useState<"pending" | "pass" | "fail">("pending");

  const [sourceText, setSourceText] = useState("");
  const [metadata, setMetadata] = useState({
    title: "",
    author: "",
    publisher: "",
    url: "",
    published_at: "",
    source_type: "News"
  });
  
  const [extractOptions, setExtractOptions] = useState<ExtractionOptions>({ mode: "balanced" });
  const [pack, setPack] = useState<LanternPack | null>(null);
  
  // Init Load
  useEffect(() => {
    const load = async () => {
        const lib = await storage.loadLibrary();
        setSavedPacks(lib.packs);
    };
    load();
  }, []);

  // ... (handleExtract same)
  const handleExtract = () => {
    const { items, stats, stable_source_hash } = extract(sourceText, extractOptions);
    
    const initialPackWithoutId: Omit<LanternPack, 'pack_id' | 'hashes'> = {
        schema: "lantern.extract.pack.v1",
        engine: { name: "heuristic", version: "0.1.5" },
        source: { ...metadata, retrieved_at: new Date().toISOString() },
        items,
        stats
    };

    const packId = computePackId(initialPackWithoutId, stable_source_hash);
    const newPack: LanternPack = {
      ...initialPackWithoutId,
      pack_id: packId,
      hashes: { source_text_sha256: stable_source_hash, pack_sha256: packId }
    };
    
    setPack(newPack);
    setStep("extract");
  };

  const handleSave = async () => {
    if (pack) {
      setStorageStatus("saving");
      const existing = savedPacks.find(p => p.pack_id === pack.pack_id);
      
      try {
          // Optimistic Update
          const newSaved = existing 
            ? savedPacks.map(p => p.pack_id === pack.pack_id ? pack : p)
            : [...savedPacks, pack];
            
          setSavedPacks(newSaved);
          
          await storage.savePack(pack);
          setStorageStatus("saved");
          setTimeout(() => setStorageStatus("idle"), 2000);

          if (existing) {
             alert(`Pack updated (Snapshot ${pack.pack_id.slice(0, 8)})`);
          } else {
             alert(`New Snapshot Saved (ID: ${pack.pack_id.slice(0, 8)})`);
          }
      } catch (e) {
          console.error(e);
          setStorageStatus("error");
          alert("Failed to save to disk.");
      }
    }
  };

  const handleLoadPack = (loadedPack: LanternPack) => {
    setPack(loadedPack);
    setMetadata(loadedPack.source);
    setSourceText("[Source text not stored in pack v1]");
    setStep("extract");
    setShowSaved(false);
    setDiffMode(false);
    setDiffResult(null);
  };
  
  // Multi-Select Logic
  const toggleSelectPack = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newSet = new Set(selectedPackIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedPackIds(newSet);
  };

  const handleExportSelected = () => {
      const packsToExport = savedPacks.filter(p => selectedPackIds.has(p.pack_id));
      if (packsToExport.length === 0) return alert("Select packs to export.");
      
      const blob = new Blob([JSON.stringify(packsToExport, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lantern_selection_${packsToExport.length}_packs.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  // --- M2: Schema-Aware Import ---
  const handleImportLibrary = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedPacks = JSON.parse(content);
        
        if (!Array.isArray(importedPacks)) throw new Error("Invalid format: Expected array");
        
        // Report Counters
        let added = 0;
        let skipped = 0;
        let updated = 0;
        const errors = [];

        // Current State Map
        const packMap = new Map(savedPacks.map(p => [p.pack_id, p]));
        
        for (const p of importedPacks) {
            // Minimal Schema Check
            if (!p.pack_id || !p.items) {
                errors.push(`Invalid Item: ${JSON.stringify(p).slice(0, 50)}...`);
                continue;
            }
            
            if (packMap.has(p.pack_id)) {
                // Conflict: For now, we SKIP unless explicit overwrite (MVP: Skip)
                // Future: Add toggle.
                skipped++;
            } else {
                packMap.set(p.pack_id, p);
                added++;
            }
        }
        
        const merged = Array.from(packMap.values());
        
        // Persist
        setStorageStatus("saving");
        await storage.saveLibrary(merged);
        setSavedPacks(merged);
        setStorageStatus("saved");
        setTimeout(() => setStorageStatus("idle"), 2000);
        
        alert(`Import Report:\nAdded: ${added}\nSkipped (Duplicate): ${skipped}\nErrors: ${errors.length}`);
        
      } catch (err) {
        alert("Failed to import: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleClearLibrary = async () => {
    if (confirm("Are you sure? This will delete all saved packs from IndexedDB.")) {
        await storage.clearLibrary();
        setSavedPacks([]);
    }
  };

  // ... (Rest of existing logic: handleCompare, runQualityTests, toggleItem, downloadJSON)

  // Compare Logic
  const handleCompare = (targetPack: LanternPack) => {
    if (!pack) return;
    const diff = diffPacks(pack, targetPack); // Compare current (A) vs loaded (B)
    setDiffResult(diff);
    setDiffMode(true);
    setDiffPackId(targetPack.pack_id);
  };

  // Quality Runner
  const runQualityTests = () => {
    setRunningTests(true);
    setDeterminismStatus("pending");
    setProvenanceStatus("pending");
    
    const reports: QualityReport[] = [];
    const modeWarnings: string[] = [];
    let determinismFail = false;
    let provenanceFail = false;

    // Helper to get stats for a mode
    const getModeStats = (mode: ExtractionOptions["mode"]) => {
        let totalCount = 0;
        fixtures.forEach((fixture: any) => {
             const { items } = extract(fixture.text, { mode });
             const totalItems = items.entities.length + items.quotes.length + items.metrics.length;
             totalCount += totalItems;
        });
        return { totalCount };
    };

    // Cross-Mode Validation
    const consStats = getModeStats("conservative");
    const broadStats = getModeStats("broad");

    if (consStats.totalCount > broadStats.totalCount) {
        modeWarnings.push(`Conservative emitted MORE items (${consStats.totalCount}) than Broad (${broadStats.totalCount}) (Suspicious)`);
    }
    setModeValidation({ pass: modeWarnings.length === 0, warnings: modeWarnings });


    // Main Test Run (Balanced Mode default)
    fixtures.forEach((fixture: any) => {
      // 1. Provenance Integrity Check
      const result = extract(fixture.text, { mode: "balanced" });
      if (result.stats.invalid_dropped > 0) {
          provenanceFail = true;
      }

      // 2. Determinism Check (Run 5x)
      const baseHash = computePackId({
          schema: "lantern.extract.pack.v1",
          engine: { name: "heuristic", version: "0.1.5" },
          source: { title: "Test", author: "Test", publisher: "Test", url: "", published_at: "", source_type: "News", retrieved_at: "TIME_IGNORED" },
          items: result.items,
          stats: result.stats
      }, result.stable_source_hash);

      for(let i=0; i<4; i++) {
          const rerun = extract(fixture.text, { mode: "balanced" });
          const rerunHash = computePackId({
              schema: "lantern.extract.pack.v1",
              engine: { name: "heuristic", version: "0.1.5" },
              source: { title: "Test", author: "Test", publisher: "Test", url: "", published_at: "", source_type: "News", retrieved_at: "TIME_IGNORED" },
              items: rerun.items,
              stats: rerun.stats
          }, rerun.stable_source_hash);
          
          if (rerunHash !== baseHash) determinismFail = true;
      }

      // 3. Scoring
      const { items } = result;
      const failures: string[] = [];

      // Helper: normalize string for fuzzy check
      // MUST MATCH QUALITY CONTRACT
      const norm = (s: any) => String(s).trim().replace(/\s+/g, " ").replace(/[–—]/g, "-").replace(/,/g, "").toLowerCase();

      // Metrics Score (Strict-ish)
      let metricScore = { metrics: { precision: 1, recall: 1, f1: 1 }, matches: 0, expected: 0, actual: 0, false_positives: 0, false_negatives: 0 };
      if (fixture.expected_metrics) {
        metricScore = scoreExtraction(items.metrics, fixture.expected_metrics, (actual, expected) => {
          // STRICT KIND check
          if (actual.metric_kind !== expected.metric_kind) return false;
          // STRICT UNIT check
          if (norm(actual.unit) !== norm(expected.unit)) return false;

          // Flexible Value Match
          if (expected.metric_kind === "range") {
             return actual.range_low === expected.range_low && 
                    actual.range_high === expected.range_high;
          }
          return norm(actual.value).includes(norm(expected.value.split(" ")[0]));
        });
      }

      // Quotes Score
      let quoteScore = { metrics: { precision: 1, recall: 1, f1: 1 }, matches: 0, expected: 0, actual: 0, false_positives: 0, false_negatives: 0 };
      if (fixture.expected_quotes) {
        quoteScore = scoreExtraction(items.quotes, fixture.expected_quotes, (actual, expected) => {
          const quoteMatch = norm(actual.quote).includes(norm(expected.quote));
          if (!quoteMatch) return false;
          if (expected.speaker && norm(actual.speaker) !== norm(expected.speaker)) return false;
          return true;
        });
      }

      // Entity Score
      let entityScore = { metrics: { precision: 1, recall: 1, f1: 1 }, matches: 0, expected: 0, actual: 0, false_positives: 0, false_negatives: 0 };
      if (fixture.expected_entities) {
        entityScore = scoreExtraction(items.entities, fixture.expected_entities, (actual, expected) => {
          return norm(actual.text) === norm(expected.text) && actual.type === expected.type;
        });
      }

      // Aggregate Score
      const scores = [];
      if (fixture.expected_metrics) scores.push(metricScore.metrics.f1);
      if (fixture.expected_quotes) scores.push(quoteScore.metrics.f1);
      if (fixture.expected_entities) scores.push(entityScore.metrics.f1);
      
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 1;

      reports.push({
        fixture_id: fixture.id,
        score: avgScore,
        metrics: {
          precision: (metricScore.metrics.precision + quoteScore.metrics.precision + entityScore.metrics.precision) / 3, // rough avg
          recall: (metricScore.metrics.recall + quoteScore.metrics.recall + entityScore.metrics.recall) / 3,
          f1: avgScore
        },
        details: {
          expected: (fixture.expected_metrics?.length || 0) + (fixture.expected_quotes?.length || 0) + (fixture.expected_entities?.length || 0),
          actual: items.metrics.length + items.quotes.length + items.entities.length,
          matches: metricScore.matches + quoteScore.matches + entityScore.matches,
          false_positives: metricScore.false_positives + quoteScore.false_positives + entityScore.false_positives,
          false_negatives: metricScore.false_negatives + quoteScore.false_negatives + entityScore.false_negatives
        },
        failures
      });
    });

    setQualityReports(reports);
    setDeterminismStatus(determinismFail ? "fail" : "pass");
    setProvenanceStatus(provenanceFail ? "fail" : "pass");
    setRunningTests(false);
  };

  // ... (toggleItem, downloadJSON, downloadPDF, reset - existing)
  const toggleItem = (type: keyof LanternPack["items"], id: string) => {
    if (!pack) return;
    
    const updatedItems = {
        ...pack.items,
        [type]: pack.items[type].map((item: any) => 
          item.id === id ? { ...item, included: !item.included } : item
        )
    };
    
    const packForHash: Omit<LanternPack, 'pack_id' | 'hashes'> = {
        ...pack,
        items: updatedItems
    };
    
    const newPackId = computePackId(packForHash, pack.hashes.source_text_sha256);

    setPack({
      ...pack,
      pack_id: newPackId,
      hashes: {
        ...pack.hashes,
        pack_sha256: newPackId
      },
      items: updatedItems
    });
  };

  const downloadJSON = () => {
    if (!pack) return;
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lantern-pack-${pack.pack_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadPDF = async () => {
    if (!pack) return;
    alert("PDF generation triggered (mock)");
  };

  const reset = () => {
    setStep("input");
    setSourceText("");
    setMetadata({
      title: "",
      author: "",
      publisher: "",
      url: "",
      published_at: "",
      source_type: "News"
    });
    setPack(null);
    setDiffMode(false);
    setDiffResult(null);
  };

  // Filtered Packs for Library
  const displayedPacks = filterSourceHash 
    ? savedPacks.filter(p => p.hashes.source_text_sha256 === filterSourceHash)
    : savedPacks;

  // Render Saved Packs List (Library)
  if (showSaved) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 md:p-12 font-sans">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="border-b border-border pb-6 flex items-end justify-between">
            <div>
               <h1 className="text-2xl font-mono font-bold">Saved Packs</h1>
               <div className="flex items-center gap-2 mt-1">
                 <p className="text-xs font-mono text-muted-foreground">{storage.getBackendName()} v1</p>
                 {storageStatus === "saving" && <span className="text-[10px] text-amber-500 font-mono animate-pulse">SAVING...</span>}
                 {storageStatus === "saved" && <span className="text-[10px] text-emerald-500 font-mono">ALL CHANGES SAVED</span>}
                 {storageStatus === "error" && <span className="text-[10px] text-red-500 font-mono">STORAGE ERROR</span>}
               </div>
            </div>
            <Button variant="ghost" onClick={() => setShowSaved(false)}>Back to Editor</Button>
          </header>

          <div className="flex items-center gap-4 bg-muted/20 p-2 rounded-md">
            <Button 
                variant={filterSourceHash ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setFilterSourceHash(null)}
                className="text-xs font-mono"
            >
                All Sources
            </Button>
             {filterSourceHash && (
                 <Badge variant="outline" className="font-mono text-xs">
                    Source: {filterSourceHash.slice(0, 8)}...
                    <Button variant="ghost" size="icon" className="h-3 w-3 ml-2 p-0" onClick={() => setFilterSourceHash(null)}>×</Button>
                 </Badge>
             )}
          </div>

          <div className="flex gap-2 justify-end border-b border-border pb-4">
             <div className="relative">
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportLibrary}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="sm" className="font-mono text-xs">
                   <Upload className="w-3 h-3 mr-2" /> Import JSON
                </Button>
             </div>
             {selectedPackIds.size > 0 ? (
                 <Button variant="default" size="sm" onClick={handleExportSelected} className="font-mono text-xs bg-cyan-500 text-black hover:bg-cyan-400">
                    <Download className="w-3 h-3 mr-2" /> Export Selected ({selectedPackIds.size})
                 </Button>
             ) : (
                 <Button variant="outline" size="sm" disabled className="font-mono text-xs opacity-50">
                    <Download className="w-3 h-3 mr-2" /> Select to Export
                 </Button>
             )}
             <Button variant="destructive" size="sm" onClick={handleClearLibrary} className="font-mono text-xs">
                <Trash2 className="w-3 h-3 mr-2" /> Clear All
             </Button>
          </div>

          <div className="grid gap-4">
            {displayedPacks.length === 0 && <p className="text-muted-foreground font-mono">No packs found.</p>}
            {displayedPacks.map(p => (
              <Card key={p.pack_id} className="hover:border-cyan-500 transition-colors group">
                <CardContent className="p-4 flex justify-between items-center cursor-default">
                  <div className="flex items-center gap-2 mr-2">
                     <Checkbox 
                        checked={selectedPackIds.has(p.pack_id)}
                        onCheckedChange={(c) => {
                            const newSet = new Set(selectedPackIds);
                            if (c) newSet.add(p.pack_id);
                            else newSet.delete(p.pack_id);
                            setSelectedPackIds(newSet);
                        }}
                        onClick={(e) => e.stopPropagation()}
                     />
                  </div>
                  <div className="flex-1 cursor-pointer" onClick={() => handleLoadPack(p)}>
                    <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold font-mono text-sm">{p.source.title || "Untitled Source"}</p>
                        <Badge variant="secondary" className="text-[10px] font-mono opacity-50">{p.engine.name} v{p.engine.version}</Badge>
                        {pack && pack.pack_id !== p.pack_id && pack.hashes.source_text_sha256 === p.hashes.source_text_sha256 && (
                           <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-500">Diff Candidate</Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                        <span className="flex items-center gap-1"><Hash className="w-3 h-3"/> {p.pack_id.slice(0, 8)}</span>
                        <span>{new Date(p.source.retrieved_at).toLocaleDateString()}</span>
                        <span className="text-cyan-500/70 hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); setFilterSourceHash(p.hashes.source_text_sha256); }}>
                             Src: {p.hashes.source_text_sha256.slice(0, 6)}
                        </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                      {pack && pack.hashes.source_text_sha256 === p.hashes.source_text_sha256 && pack.pack_id !== p.pack_id && (
                        <Button variant="outline" size="sm" className="h-8 text-xs font-mono" onClick={() => handleCompare(p)}>
                           <GitCompare className="w-3 h-3 mr-2" /> Diff
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleLoadPack(p)}>
                         <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-cyan-500" />
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Quality Dashboard
  if (step === "quality") {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 md:p-12 font-sans">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="border-b border-border pb-6 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-mono font-bold">Quality Dashboard</h1>
              <p className="text-xs font-mono text-muted-foreground mt-1">Engine v0.1.5 • 5 Fixtures</p>
            </div>
            <div className="flex gap-2">
               <Button onClick={runQualityTests} disabled={runningTests} className="font-mono bg-cyan-500 text-black hover:bg-cyan-400">
                 <Play className="w-4 h-4 mr-2" /> {runningTests ? "Running..." : "Run Full Quality Suite"}
               </Button>
               <Button variant="ghost" onClick={() => setStep("input")}>Close</Button>
            </div>
          </header>

          {/* Hard Gates Panel */}
          {qualityReports.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className={cn("p-3 rounded border text-center", determinismStatus === "pass" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20")}>
                    <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Determinism (5x Run)</p>
                    <div className="flex items-center justify-center gap-2 font-bold font-mono">
                        {determinismStatus === "pass" ? <Check className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                        {determinismStatus.toUpperCase()}
                    </div>
                </div>
                <div className={cn("p-3 rounded border text-center", provenanceStatus === "pass" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20")}>
                    <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Provenance Integrity</p>
                    <div className="flex items-center justify-center gap-2 font-bold font-mono">
                        {provenanceStatus === "pass" ? <Check className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                        {provenanceStatus.toUpperCase()}
                    </div>
                </div>
                <div className={cn("p-3 rounded border text-center", modeValidation?.pass ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20")}>
                    <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Cross-Mode Logic</p>
                    <div className="flex items-center justify-center gap-2 font-bold font-mono">
                        {modeValidation?.pass ? <Check className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                        {modeValidation?.pass ? "PASS" : "WARN"}
                    </div>
                </div>
            </div>
          )}

          <div className="grid gap-4">
            {qualityReports.length === 0 && !runningTests && <p className="text-muted-foreground font-mono">No tests run yet.</p>}
            
            {qualityReports.map(report => (
              <Card key={report.fixture_id} className="border-border bg-card/50">
                <CardHeader className="py-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-mono">{report.fixture_id}</CardTitle>
                    <Badge variant={report.score === 1 ? "default" : report.score > 0.8 ? "secondary" : "destructive"} className="font-mono">
                      F1: {report.metrics.f1.toFixed(2)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-3 text-xs font-mono grid grid-cols-4 gap-4">
                   <div className="flex flex-col">
                     <span className="text-muted-foreground uppercase text-[10px]">Precision</span>
                     <span className="font-bold text-lg">{report.metrics.precision.toFixed(2)}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-muted-foreground uppercase text-[10px]">Recall</span>
                     <span className="font-bold text-lg">{report.metrics.recall.toFixed(2)}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-muted-foreground uppercase text-[10px]">Matches</span>
                     <span className="text-emerald-500 font-bold">{report.details.matches} / {report.details.expected}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-muted-foreground uppercase text-[10px]">False Pos/Neg</span>
                     <div className="flex gap-2">
                       <span className="text-amber-500">+{report.details.false_positives}</span>
                       <span className="text-red-500">-{report.details.false_negatives}</span>
                     </div>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 font-sans selection:bg-cyan-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="border-b border-border pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-mono font-bold tracking-tight">LANTERN<span className="text-cyan-500">_EXTRACT</span></h1>
            <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest mt-2">
              Structured Knowledge Extraction Engine
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep("quality")} className="font-mono text-xs uppercase">
              <Activity className="w-3 h-3 mr-2" /> Quality
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSaved(true)} className="font-mono text-xs uppercase">
              <FolderOpen className="w-3 h-3 mr-2" /> Library
            </Button>
            <Button variant="ghost" size="sm" onClick={reset} className="font-mono text-xs uppercase text-muted-foreground hover:text-foreground">
              <RefreshCw className="w-3 h-3 mr-2" /> Reset
            </Button>
          </div>
        </header>

        {/* ... (Progress, Input, Extract Views - largely unchanged except Diff alerts) */}
        
        {/* DIFF ALERT */}
        {diffMode && diffResult && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-md mb-6 animate-in slide-in-from-top-2">
             <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                   <GitCompare className="w-4 h-4 text-amber-500" />
                   <h3 className="text-sm font-bold font-mono text-amber-500 uppercase">Comparison Mode</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setDiffMode(false); setDiffResult(null); }} className="h-6 text-[10px]">Exit Compare</Button>
             </div>
             <div className="grid grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-background/50 p-2 rounded border border-emerald-500/30">
                   <p className="text-emerald-500 font-bold mb-1">+{diffResult.stats.added_count} Added</p>
                   {diffResult.added.slice(0,3).map((d, i) => (
                      <div key={i} className="truncate opacity-70">
                         {d.type === 'entities' ? d.item.text : d.type === 'quotes' ? d.item.quote.slice(0,20) : 'Item'}
                      </div>
                   ))}
                </div>
                <div className="bg-background/50 p-2 rounded border border-red-500/30">
                   <p className="text-red-500 font-bold mb-1">-{diffResult.stats.removed_count} Removed</p>
                   {diffResult.removed.slice(0,3).map((d, i) => (
                      <div key={i} className="truncate opacity-70">
                         {d.type === 'entities' ? d.item.text : d.type === 'quotes' ? d.item.quote.slice(0,20) : 'Item'}
                      </div>
                   ))}
                </div>
                <div className="bg-background/50 p-2 rounded border border-blue-500/30">
                   <p className="text-blue-500 font-bold mb-1">~{diffResult.stats.changed_count} Changed</p>
                   {diffResult.changed.slice(0,3).map((d, i) => (
                      <div key={i} className="truncate opacity-70 flex items-center gap-1">
                         <span>{d.type === 'entities' ? d.from.text : 'Item'}</span>
                         <ArrowRight className="w-2 h-2" />
                         <span>{d.type === 'entities' ? d.to.text : 'Item'}</span>
                      </div>
                   ))}
                </div>
                <div className="bg-background/50 p-2 rounded border border-muted">
                   <p className="text-muted-foreground font-bold mb-1">{diffResult.stats.common_count} Unchanged</p>
                </div>
             </div>
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center gap-4 text-sm font-mono uppercase text-muted-foreground">
          <span className={step === "input" ? "text-foreground font-bold" : ""}>1. Source</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === "extract" ? "text-foreground font-bold" : ""}>2. Extraction</span>
          <ChevronRight className="w-4 h-4" />
          <span className={step === "export" ? "text-foreground font-bold" : ""}>3. Pack Export</span>
        </div>

        {/* STEP 1: INPUT */}
        {step === "input" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2">
            <Card className="lg:col-span-2 border-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-mono text-lg">Source Text</CardTitle>
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-muted-foreground" />
                  <Select 
                    value={extractOptions.mode} 
                    onValueChange={(val: any) => setExtractOptions({...extractOptions, mode: val})}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs font-mono uppercase">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="broad">Broad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea 
                  placeholder="Paste article text here..." 
                  className="min-h-[400px] font-mono text-sm bg-background/50 resize-y"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                />
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50 backdrop-blur-sm h-fit">
              <CardHeader>
                <CardTitle className="font-mono text-lg">Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase">Title</Label>
                  <Input value={metadata.title} onChange={(e) => setMetadata({...metadata, title: e.target.value})} className="bg-background/50 font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase">Author</Label>
                  <Input value={metadata.author} onChange={(e) => setMetadata({...metadata, author: e.target.value})} className="bg-background/50 font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase">Publisher</Label>
                  <Input value={metadata.publisher} onChange={(e) => setMetadata({...metadata, publisher: e.target.value})} className="bg-background/50 font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs uppercase">Source Type</Label>
                  <select 
                    className="w-full h-10 rounded-md border border-input bg-background/50 px-3 py-2 text-sm font-mono"
                    value={metadata.source_type}
                    onChange={(e) => setMetadata({...metadata, source_type: e.target.value})}
                  >
                    <option>News</option>
                    <option>Blog</option>
                    <option>Academic</option>
                    <option>Government</option>
                    <option>Social</option>
                  </select>
                </div>
                <Button 
                  disabled={!sourceText} 
                  onClick={handleExtract}
                  className="w-full mt-4 font-mono uppercase bg-cyan-500 text-black hover:bg-cyan-400"
                >
                  Run Extraction
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 2: EXTRACT */}
        {step === "extract" && pack && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-250px)] animate-in fade-in slide-in-from-bottom-2">
            <div className="lg:col-span-3 h-full flex flex-col">
              <Tabs defaultValue="entities" className="h-full flex flex-col">
                <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 mb-4 gap-6">
                  <TabsTrigger value="entities" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:shadow-none rounded-none px-0 pb-2 font-mono uppercase text-xs gap-2">
                    <Users className="w-4 h-4" /> Entities <Badge variant="secondary" className="ml-1 text-[10px]">{pack.items.entities.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="quotes" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:shadow-none rounded-none px-0 pb-2 font-mono uppercase text-xs gap-2">
                    <Quote className="w-4 h-4" /> Quotes <Badge variant="secondary" className="ml-1 text-[10px]">{pack.items.quotes.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="metrics" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:shadow-none rounded-none px-0 pb-2 font-mono uppercase text-xs gap-2">
                    <Hash className="w-4 h-4" /> Metrics <Badge variant="secondary" className="ml-1 text-[10px]">{pack.items.metrics.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-cyan-500 data-[state=active]:shadow-none rounded-none px-0 pb-2 font-mono uppercase text-xs gap-2">
                    <CalendarClock className="w-4 h-4" /> Timeline <Badge variant="secondary" className="ml-1 text-[10px]">{pack.items.timeline.length}</Badge>
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden relative">
                  <ScrollArea className="h-full pr-4">
                    {/* Simplified Content Rendering */}
                    <TabsContent value="entities" className="mt-0 space-y-4">
                      {pack.items.entities.map((item) => (
                        <ExtractionCard 
                          key={item.id} 
                          item={item} 
                          onToggle={() => toggleItem("entities", item.id)}
                          icon={<Users className="w-4 h-4 text-cyan-500" />}
                          title={item.text}
                          subtitle={item.type}
                          meta={<Badge variant="outline" className="text-[9px] font-mono border-cyan-500/20 text-cyan-500">{item.canonical_family_id?.slice(0,6)}</Badge>}
                        />
                      ))}
                    </TabsContent>
                    <TabsContent value="quotes" className="mt-0 space-y-4">
                      {pack.items.quotes.map((item) => (
                        <ExtractionCard 
                          key={item.id} 
                          item={item} 
                          onToggle={() => toggleItem("quotes", item.id)}
                          icon={<Quote className="w-4 h-4 text-amber-500" />}
                          title={`"${item.quote}"`}
                          subtitle={item.speaker || (item.speaker_candidates ? `Candidates: ${item.speaker_candidates.join(", ")}` : "Unknown Speaker")}
                        />
                      ))}
                    </TabsContent>
                    <TabsContent value="metrics" className="mt-0 space-y-4">
                      {pack.items.metrics.map((item) => (
                        <ExtractionCard 
                          key={item.id} 
                          item={item} 
                          onToggle={() => toggleItem("metrics", item.id)}
                          icon={<Hash className="w-4 h-4 text-emerald-500" />}
                          title={`${item.value} ${item.unit}`}
                          subtitle={item.metric_kind === "range" ? `Range: ${item.range_low} - ${item.range_high}` : item.parse_notes || "Extracted Metric"}
                          meta={
                            <div className="flex gap-1">
                              {item.qualifier && <Badge variant="outline" className="text-[9px] border-emerald-500/20 text-emerald-500">{item.qualifier}</Badge>}
                              {item.metric_kind !== "scalar" && <Badge variant="outline" className="text-[9px] border-blue-500/20 text-blue-500">{item.metric_kind}</Badge>}
                            </div>
                          }
                        />
                      ))}
                    </TabsContent>
                    <TabsContent value="timeline" className="mt-0 space-y-4">
                      {pack.items.timeline.map((item) => (
                        <ExtractionCard 
                          key={item.id} 
                          item={item} 
                          onToggle={() => toggleItem("timeline", item.id)}
                          icon={<CalendarClock className="w-4 h-4 text-purple-500" />}
                          title={item.date}
                          subtitle={item.event}
                          meta={<Badge variant="outline" className="text-[9px] border-purple-500/20 text-purple-500">{item.confidence > 0.8 ? "HIGH" : "MED"}</Badge>}
                        />
                      ))}
                    </TabsContent>
                  </ScrollArea>
                </div>
              </Tabs>
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-6">
              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="font-mono text-sm uppercase">Pack Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-muted p-2 rounded">
                      <div className="text-xl font-bold font-mono">{pack.items.entities.length + pack.items.quotes.length + pack.items.metrics.length}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">Items</div>
                    </div>
                    <div className="bg-muted p-2 rounded">
                      <div className="text-xl font-bold font-mono">{Object.values(pack.stats).reduce((a,b) => (typeof b === 'number' ? a+b : a), 0)}%</div>
                      <div className="text-[10px] uppercase text-muted-foreground">Conf</div>
                    </div>
                  </div>
                  
                  <Button onClick={handleSave} className="w-full font-mono uppercase bg-emerald-500 text-black hover:bg-emerald-400">
                    <Save className="w-4 h-4 mr-2" /> Save Snapshot
                  </Button>
                  <Button onClick={downloadJSON} variant="outline" className="w-full font-mono uppercase text-xs">
                    <Download className="w-3 h-3 mr-2" /> Export JSON
                  </Button>
                  <Button onClick={downloadPDF} variant="outline" className="w-full font-mono uppercase text-xs">
                    <FileText className="w-3 h-3 mr-2" /> Export PDF
                  </Button>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => setStep("extract")} variant="ghost" className="w-full font-mono uppercase text-xs">
                    Back to Curation
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* PDF PREVIEW */}
            {/* (Omitted for brevity, kept structure from previous step) */}
            <div className="order-1 lg:order-2 flex justify-center bg-zinc-100 p-8 rounded-lg overflow-hidden border border-zinc-200">
              <div 
                className="w-[595px] min-h-[842px] bg-white text-black p-12 shadow-xl flex flex-col relative" 
              >
                <div className="border-b-4 border-black pb-8 mb-8">
                  <h1 className="font-sans text-4xl font-bold tracking-tight mb-2">LANTERN<span className="text-cyan-600">_EXTRACT</span></h1>
                  <p className="font-mono text-sm text-zinc-500 uppercase tracking-widest">Visual Extraction Pack</p>
                </div>
                {/* Content Preview Placeholders */}
                <div className="text-center text-muted-foreground mt-20 font-mono italic">Preview Active</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ... (ExtractionCard and SectionHeader unchanged)
function ExtractionCard({ item, onToggle, icon, title, subtitle, meta }: { item: any, onToggle: () => void, icon: any, title: string, subtitle: string, meta?: any }) {
  return (
    <div className={cn(
      "p-4 border rounded-md transition-all",
      item.included 
        ? "bg-card border-border hover:border-cyan-500/50" 
        : "bg-muted/30 border-muted opacity-60 hover:opacity-100"
    )}>
      <div className="flex items-start gap-4">
        <div className="mt-1">{icon}</div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm leading-tight">{title}</p>
              <div className="flex items-center gap-2 mt-1">
                 <p className="text-xs text-muted-foreground font-mono uppercase">{subtitle}</p>
                 {meta}
              </div>
            </div>
            <Switch checked={item.included} onCheckedChange={onToggle} />
          </div>
          
          <div className="bg-muted/50 p-2 rounded text-[10px] text-muted-foreground font-mono leading-relaxed break-words">
            <span className="text-cyan-500 opacity-50 mr-2">OFS {item.provenance.start}-{item.provenance.end}:</span>
            "{item.provenance.sentence}"
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, count, color }: { title: string, count: number, color: string }) {
  if (count === 0) return null;
  return (
    <div className={`flex items-center gap-2 border-b ${color} pb-1 mb-3`}>
      <h3 className="font-mono text-xs uppercase font-bold text-black">{title}</h3>
      <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-600">{count}</span>
    </div>
  );
}
