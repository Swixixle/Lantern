import { useState, useRef } from "react";
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
  Activity
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { extract, LanternPack, ExtractionOptions, EngineStats } from "@/lib/lanternExtract";
import { cn } from "@/lib/utils";

export default function LanternExtract() {
  const [step, setStep] = useState<"input" | "extract" | "export">("input");
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
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleExtract = () => {
    const { items, stats } = extract(sourceText, extractOptions);
    const newPack: LanternPack = {
      schema: "lantern.extract.pack.v1",
      pack_id: `lex_${crypto.randomUUID().slice(0, 8)}`,
      engine: { name: "heuristic", version: "0.1.2" },
      source: {
        ...metadata,
        retrieved_at: new Date().toISOString()
      },
      hashes: {
        source_text_sha256: "mock_sha256_" + crypto.randomUUID().slice(0, 6),
        pack_sha256: "mock_sha256_" + crypto.randomUUID().slice(0, 6)
      },
      items,
      stats // Store stats in pack for UI access
    };
    setPack(newPack);
    setStep("extract");
  };

  const toggleItem = (type: keyof LanternPack["items"], id: string) => {
    if (!pack) return;
    setPack({
      ...pack,
      items: {
        ...pack.items,
        [type]: pack.items[type].map((item: any) => 
          item.id === id ? { ...item, included: !item.included } : item
        )
      }
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
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, {
      scale: 2,
      backgroundColor: "#ffffff", 
      logging: false,
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [canvas.width, canvas.height]
    });
    
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`lantern-pack-${pack?.pack_id || 'export'}.pdf`);
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
  };

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
          <Button variant="ghost" size="sm" onClick={reset} className="font-mono text-xs uppercase text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3 h-3 mr-2" /> Reset
          </Button>
        </header>

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
                    <TabsContent value="entities" className="mt-0 space-y-4">
                      {pack.items.entities.map((item) => (
                        <ExtractionCard 
                          key={item.id} 
                          item={item} 
                          onToggle={() => toggleItem("entities", item.id)}
                          icon={<Users className="w-4 h-4 text-cyan-500" />}
                          title={item.text}
                          subtitle={item.type}
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
                          subtitle={item.speaker || "Unknown Speaker"}
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
                          subtitle={item.parse_notes ? `Normalized: ${item.normalized_value?.toLocaleString()}` : "Extracted Metric"}
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
                        />
                      ))}
                    </TabsContent>
                  </ScrollArea>
                </div>
              </Tabs>
            </div>

            <div className="lg:col-span-1 border-l border-border pl-8 flex flex-col h-full">
              <div className="space-y-6 flex-1">
                {/* Engine Stats Panel */}
                {pack.stats && (
                  <div className="space-y-2 p-3 bg-muted/20 border border-muted rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                       <Activity className="w-3 h-3 text-cyan-500" />
                       <h3 className="font-mono text-xs uppercase font-bold text-foreground">Engine Stats</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px] font-mono text-muted-foreground">
                      <span>Ver:</span> <span className="text-foreground">{pack.engine.version}</span>
                      <span>Mode:</span> <span className="text-foreground capitalize">{extractOptions.mode}</span>
                      <span>Dedupe:</span> <span className="text-emerald-500">{pack.stats.duplicates_collapsed}</span>
                      <span>Invalid:</span> <span className="text-red-500">{pack.stats.invalid_dropped}</span>
                      <span>Headlines:</span> <span className="text-amber-500">{pack.stats.headlines_suppressed}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-sm uppercase font-bold text-muted-foreground">Pack Summary</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span>Entities</span>
                      <span className="font-bold">{pack.items.entities.filter(i => i.included).length}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span>Quotes</span>
                      <span className="font-bold">{pack.items.quotes.filter(i => i.included).length}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span>Metrics</span>
                      <span className="font-bold">{pack.items.metrics.filter(i => i.included).length}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted/30 rounded">
                      <span>Timeline</span>
                      <span className="font-bold">{pack.items.timeline.filter(i => i.included).length}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <Button onClick={() => setStep("export")} className="w-full font-mono uppercase bg-cyan-500 text-black hover:bg-cyan-400">
                    Review & Export <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="ghost" onClick={reset} className="w-full font-mono uppercase text-xs">
                    Discard Pack
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: EXPORT */}
        {step === "export" && pack && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="order-2 lg:order-1 space-y-6">
              <Card className="border-border bg-card/50">
                <CardHeader>
                  <CardTitle className="font-mono text-lg">Download Pack</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={downloadJSON} variant="outline" className="w-full justify-start font-mono h-12">
                    <FileJson className="w-4 h-4 mr-3 text-emerald-500" /> 
                    Extraction Pack (JSON)
                  </Button>
                  <Button onClick={downloadPDF} variant="outline" className="w-full justify-start font-mono h-12">
                    <FileText className="w-4 h-4 mr-3 text-red-500" /> 
                    Visual Binder (PDF)
                  </Button>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => setStep("extract")} variant="ghost" className="w-full font-mono uppercase text-xs">
                    Back to Curation
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* PDF PREVIEW (Hidden from view mostly, used for generation, but we show it here for effect) */}
            <div className="order-1 lg:order-2 flex justify-center bg-zinc-100 p-8 rounded-lg overflow-hidden border border-zinc-200">
              <div 
                ref={pdfRef}
                className="w-[595px] min-h-[842px] bg-white text-black p-12 shadow-xl flex flex-col relative" // A4 Dimensions approx
              >
                {/* Cover Page */}
                <div className="border-b-4 border-black pb-8 mb-8">
                  <h1 className="font-sans text-4xl font-bold tracking-tight mb-2">LANTERN<span className="text-cyan-600">_EXTRACT</span></h1>
                  <p className="font-mono text-sm text-zinc-500 uppercase tracking-widest">Visual Extraction Pack</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-12">
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] uppercase text-zinc-400">Pack ID</p>
                    <p className="font-mono text-sm font-bold">{pack.pack_id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] uppercase text-zinc-400">Engine</p>
                    <p className="font-mono text-sm">{pack.engine.name} v{pack.engine.version}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="font-mono text-[10px] uppercase text-zinc-400">Source Title</p>
                    <p className="font-serif text-xl leading-tight">{pack.source.title || "Untitled Source"}</p>
                  </div>
                </div>

                {/* Content Preview (First few items) */}
                <div className="space-y-6 flex-1">
                  <SectionHeader title="Entities" count={pack.items.entities.filter(i => i.included).length} color="border-cyan-600" />
                  <div className="space-y-4">
                    {pack.items.entities.filter(i => i.included).slice(0, 3).map(item => (
                      <div key={item.id} className="border-l-2 border-zinc-200 pl-3">
                        <p className="font-bold text-sm">{item.text}</p>
                        <p className="text-xs text-zinc-500 font-mono mt-1 truncate">Ofs: {item.provenance.start}-{item.provenance.end}</p>
                      </div>
                    ))}
                    {pack.items.entities.filter(i => i.included).length > 3 && (
                      <p className="text-xs text-zinc-400 italic">...and {pack.items.entities.filter(i => i.included).length - 3} more</p>
                    )}
                  </div>

                  <div className="pt-4">
                    <SectionHeader title="Quotes" count={pack.items.quotes.filter(i => i.included).length} color="border-amber-600" />
                    <div className="space-y-4">
                      {pack.items.quotes.filter(i => i.included).slice(0, 2).map(item => (
                        <div key={item.id} className="border-l-2 border-zinc-200 pl-3">
                          <p className="font-serif italic text-sm">"{item.quote}"</p>
                          <p className="text-xs text-zinc-500 font-mono mt-1">— {item.speaker || "Unknown"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-200 pt-4 mt-auto">
                   <p className="font-mono text-[8px] text-zinc-400 text-center uppercase">Lantern Extraction System v1.2 • Verified Output</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExtractionCard({ item, onToggle, icon, title, subtitle }: { item: any, onToggle: () => void, icon: any, title: string, subtitle: string }) {
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
              <p className="text-xs text-muted-foreground mt-1 font-mono uppercase">{subtitle}</p>
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
