import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { v4 as uuidv4 } from "uuid";
import { 
  PackV1, 
  PackV1Schema, 
  EntityTypeEnum, 
  EdgeTypeEnum, 
  ClaimTypeEnum,
  Entity,
  Evidence,
  Claim
} from "@/lib/schema/pack_v1";
import { persistence, debouncedSave, type StorageStatus } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, 
  FileText, 
  ShieldAlert, 
  Save, 
  Trash2, 
  Plus, 
  ArrowLeft,
  Link as LinkIcon,
  AlertTriangle,
  FolderOpen,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeInfluenceHubs } from "@/lib/heuristics/influenceHubs";
import { computeFundingGravity } from "@/lib/heuristics/fundingGravity";
import { InfluenceHubsFinding, FundingGravityFinding } from "@/lib/heuristics/types";

export default function DossierEditor() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [pack, setPack] = useState<PackV1 | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("idle");
  const [activeTab, setActiveTab] = useState("entities");
  const [influenceResult, setInfluenceResult] = useState<InfluenceHubsFinding | null>(null);
  const [fundingResult, setFundingResult] = useState<FundingGravityFinding | null>(null);

  // Form States (New Item Inputs)
  const [newEntity, setNewEntity] = useState<{name: string, type: string}>({ name: "", type: "person" });
  const [newEdge, setNewEdge] = useState<{from: string, to: string, type: string}>({ from: "", to: "", type: "affiliated_with" });
  const [newEvidence, setNewEvidence] = useState<Partial<Evidence>>({ title: "", sourceType: "News", date: new Date().toISOString().split('T')[0] });
  const [newClaim, setNewClaim] = useState<{text: string, type: string, confidence: number, evidenceIds: Set<string>}>({ 
    text: "", type: "allegation", confidence: 0.8, evidenceIds: new Set() 
  });

  // Load Dossier
  useEffect(() => {
    const load = async () => {
      const lib = await persistence.loadLibrary();
      if (!lib || !id) return;
      
      const found = lib.packs.find(p => "packId" in p && p.packId === id);
      if (found && "packId" in found) { // Type guard
         setPack(found as PackV1);
      } else {
         alert("Dossier not found");
         setLocation("/extract");
      }
    };
    load();
  }, [id, setLocation]);

  // Persist Helper
  const saveDossier = (updatedPack: PackV1) => {
    setPack(updatedPack);
    setStorageStatus("saving");
    
    // We need to load full library to save properly (inefficient but consistent with storage.ts design)
    persistence.loadLibrary().then(lib => {
        if (!lib) return;
        const newPacks = lib.packs.map(p => 
            ("packId" in p && p.packId === updatedPack.packId) ? updatedPack : p
        );
        debouncedSave({ packs: newPacks }, setStorageStatus);
    });
  };

  // --- ENTITY CRUD ---
  const addEntity = () => {
    if (!pack || !newEntity.name) return;
    const entity: Entity = {
        id: uuidv4(),
        type: newEntity.type as any,
        name: newEntity.name,
        aliases: [],
        tags: []
    };
    const updated = { ...pack, entities: [...pack.entities, entity] };
    saveDossier(updated);
    setNewEntity({ name: "", type: "person" });
  };

  const deleteEntity = (eId: string) => {
    if (!pack || !confirm("Delete entity? This may break edges.")) return;
    const updated = { 
        ...pack, 
        entities: pack.entities.filter(e => e.id !== eId),
        // Cleanup connected edges
        edges: pack.edges.filter(edge => edge.fromEntityId !== eId && edge.toEntityId !== eId) 
    };
    saveDossier(updated);
  };

  // --- EDGE CRUD ---
  const addEdge = () => {
    if (!pack || !newEdge.from || !newEdge.to) return;
    const edge = {
        id: uuidv4(),
        fromEntityId: newEdge.from,
        toEntityId: newEdge.to,
        type: newEdge.type as any,
    };
    const updated = { ...pack, edges: [...pack.edges, edge] };
    saveDossier(updated);
    setNewEdge({ ...newEdge, from: "", to: "" });
  };

  const deleteEdge = (edgeId: string) => {
      if (!pack) return;
      const updated = { ...pack, edges: pack.edges.filter(e => e.id !== edgeId) };
      saveDossier(updated);
  };

  // --- EVIDENCE CRUD ---
  const addEvidence = () => {
      if (!pack || !newEvidence.title) return;
      const evidence: Evidence = {
          id: uuidv4(),
          title: newEvidence.title,
          sourceType: newEvidence.sourceType || "Unknown",
          date: newEvidence.date || new Date().toISOString(),
          url: newEvidence.url,
          publisher: newEvidence.publisher,
          excerpt: newEvidence.excerpt
      };
      const updated = { ...pack, evidence: [...pack.evidence, evidence] };
      saveDossier(updated);
      setNewEvidence({ title: "", sourceType: "News", date: new Date().toISOString().split('T')[0] });
  };
  
  const deleteEvidence = (evId: string) => {
      if (!pack) return;
      // Guard: Check if used in claims
      const used = pack.claims.some(c => c.evidenceIds.includes(evId));
      if (used && !confirm("This evidence is cited in claims. Delete anyway?")) return;

      const updated = { ...pack, evidence: pack.evidence.filter(e => e.id !== evId) };
      saveDossier(updated);
  };

  // --- CLAIM CRUD ---
  const addClaim = () => {
      if (!pack || !newClaim.text) return;
      
      // Guardrail: Fact requires evidence
      if (newClaim.type === "fact" && newClaim.evidenceIds.size === 0) {
          return; // Button should be disabled, but double check
      }

      const claim: Claim = {
          id: uuidv4(),
          text: newClaim.text,
          claimType: newClaim.type as any,
          confidence: newClaim.confidence,
          evidenceIds: Array.from(newClaim.evidenceIds),
          counterEvidenceIds: [],
          createdAt: new Date().toISOString()
      };
      
      const updated = { ...pack, claims: [...pack.claims, claim] };
      saveDossier(updated);
      setNewClaim({ text: "", type: "allegation", confidence: 0.8, evidenceIds: new Set() });
  };

  const deleteClaim = (cId: string) => {
      if (!pack) return;
      const updated = { ...pack, claims: pack.claims.filter(c => c.id !== cId) };
      saveDossier(updated);
  };

  const runHeuristics = () => {
      if (!pack) return;
      
      const inf = computeInfluenceHubs(pack);
      setInfluenceResult(inf);

      const fund = computeFundingGravity(pack);
      setFundingResult(fund);
  };


  if (!pack) return <div className="p-12 text-center font-mono">Loading Dossier...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-border pb-6 flex items-end justify-between">
           <div>
             <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono text-blue-500 border-blue-500/50">DOSSIER EDITOR v1</Badge>
                {storageStatus === "saving" && <span className="text-[10px] text-amber-500 font-mono animate-pulse">SAVING...</span>}
                {storageStatus === "saved" && <span className="text-[10px] text-emerald-500 font-mono">SAVED</span>}
             </div>
             <h1 className="text-3xl font-mono font-bold tracking-tight">{pack.subjectName}</h1>
             <p className="text-xs font-mono text-muted-foreground mt-1">ID: {pack.packId}</p>
           </div>
           <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/extract")}>
                 <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
              </Button>
           </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
           <TabsList className="bg-muted/50 border border-border">
              <TabsTrigger value="entities" className="font-mono text-xs uppercase"><Users className="w-3 h-3 mr-2"/> Entities ({pack.entities.length})</TabsTrigger>
              <TabsTrigger value="edges" className="font-mono text-xs uppercase"><LinkIcon className="w-3 h-3 mr-2"/> Edges ({pack.edges.length})</TabsTrigger>
              <TabsTrigger value="evidence" className="font-mono text-xs uppercase"><FileText className="w-3 h-3 mr-2"/> Evidence ({pack.evidence.length})</TabsTrigger>
              <TabsTrigger value="claims" className="font-mono text-xs uppercase"><ShieldAlert className="w-3 h-3 mr-2"/> Claims ({pack.claims.length})</TabsTrigger>
              <TabsTrigger value="heuristics" className="font-mono text-xs uppercase"><Zap className="w-3 h-3 mr-2"/> Heuristics</TabsTrigger>
           </TabsList>

           {/* --- ENTITIES TAB --- */}
           <TabsContent value="entities" className="space-y-6">
              <Card className="border-border bg-card/50">
                 <CardHeader><CardTitle className="text-sm font-mono uppercase">Add Entity</CardTitle></CardHeader>
                 <CardContent className="flex gap-4 items-end">
                    <div className="space-y-2 flex-1">
                       <Label className="text-xs font-mono uppercase">Name</Label>
                       <Input value={newEntity.name} onChange={e => setNewEntity({...newEntity, name: e.target.value})} placeholder="e.g. Acme Corp" />
                    </div>
                    <div className="space-y-2 w-48">
                       <Label className="text-xs font-mono uppercase">Type</Label>
                       <Select value={newEntity.type} onValueChange={v => setNewEntity({...newEntity, type: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                             {EntityTypeEnum.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                    <Button onClick={addEntity}><Plus className="w-4 h-4 mr-2"/> Add</Button>
                 </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {pack.entities.map(e => (
                    <Card key={e.id} className="group hover:border-blue-500/50 transition-colors">
                       <CardContent className="p-4 flex justify-between items-start">
                          <div>
                             <div className="flex items-center gap-2">
                                <span className="font-bold">{e.name}</span>
                                <Badge variant="secondary" className="text-[10px]">{e.type}</Badge>
                             </div>
                             {e.tags.length > 0 && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                   {e.tags.map(t => <Badge key={t} variant="outline" className="text-[9px] opacity-70">{t}</Badge>)}
                                </div>
                             )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteEntity(e.id)}>
                             <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                       </CardContent>
                    </Card>
                 ))}
              </div>
           </TabsContent>

           {/* --- EDGES TAB --- */}
           <TabsContent value="edges" className="space-y-6">
              <Card className="border-border bg-card/50">
                 <CardHeader><CardTitle className="text-sm font-mono uppercase">Add Relationship</CardTitle></CardHeader>
                 <CardContent className="flex gap-4 items-end flex-wrap">
                    <div className="space-y-2 w-64">
                       <Label className="text-xs font-mono uppercase">From</Label>
                       <Select value={newEdge.from} onValueChange={v => setNewEdge({...newEdge, from: v})}>
                          <SelectTrigger><SelectValue placeholder="Select Entity" /></SelectTrigger>
                          <SelectContent>
                             {pack.entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.type})</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                    <div className="space-y-2 w-48">
                       <Label className="text-xs font-mono uppercase">Type</Label>
                       <Select value={newEdge.type} onValueChange={v => setNewEdge({...newEdge, type: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                             {EdgeTypeEnum.options.map(o => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                     <div className="space-y-2 w-64">
                       <Label className="text-xs font-mono uppercase">To</Label>
                       <Select value={newEdge.to} onValueChange={v => setNewEdge({...newEdge, to: v})}>
                          <SelectTrigger><SelectValue placeholder="Select Entity" /></SelectTrigger>
                          <SelectContent>
                             {pack.entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.type})</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                    <Button onClick={addEdge} disabled={!newEdge.from || !newEdge.to}><Plus className="w-4 h-4 mr-2"/> Connect</Button>
                 </CardContent>
              </Card>

              <div className="space-y-2">
                 {pack.edges.map(edge => {
                    const from = pack.entities.find(e => e.id === edge.fromEntityId);
                    const to = pack.entities.find(e => e.id === edge.toEntityId);
                    return (
                        <div key={edge.id} className="flex items-center gap-4 p-3 border rounded bg-card/30 group">
                           <div className="flex-1 flex items-center gap-2 font-mono text-sm">
                              <span className="font-bold">{from?.name || "Unknown"}</span>
                              <Badge variant="outline" className="text-xs text-muted-foreground">{edge.type.replace(/_/g, " ")}</Badge>
                              <span className="font-bold">{to?.name || "Unknown"}</span>
                           </div>
                           <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteEdge(edge.id)}>
                             <Trash2 className="w-3 h-3 text-destructive" />
                           </Button>
                        </div>
                    );
                 })}
              </div>
           </TabsContent>

           {/* --- EVIDENCE TAB --- */}
           <TabsContent value="evidence" className="space-y-6">
              <Card className="border-border bg-card/50">
                 <CardHeader><CardTitle className="text-sm font-mono uppercase">Add Evidence</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase">Title</Label>
                            <Input value={newEvidence.title} onChange={e => setNewEvidence({...newEvidence, title: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                             <Label className="text-xs font-mono uppercase">Type</Label>
                             <Input value={newEvidence.sourceType} onChange={e => setNewEvidence({...newEvidence, sourceType: e.target.value})} placeholder="News, Filing..." />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase">URL</Label>
                            <Input value={newEvidence.url || ""} onChange={e => setNewEvidence({...newEvidence, url: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-mono uppercase">Date</Label>
                            <Input type="date" value={newEvidence.date} onChange={e => setNewEvidence({...newEvidence, date: e.target.value})} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase">Excerpt / Quote</Label>
                        <Textarea value={newEvidence.excerpt || ""} onChange={e => setNewEvidence({...newEvidence, excerpt: e.target.value})} className="h-20" />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={addEvidence} disabled={!newEvidence.title}><Plus className="w-4 h-4 mr-2"/> Add Evidence</Button>
                    </div>
                 </CardContent>
              </Card>

              <div className="grid gap-4">
                 {pack.evidence.map(ev => (
                    <Card key={ev.id} className="group">
                       <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                             <div>
                                <h4 className="font-bold text-sm">{ev.title}</h4>
                                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                   <Badge variant="secondary" className="text-[10px]">{ev.sourceType}</Badge>
                                   <span>{ev.publisher}</span>
                                   <span>{ev.date}</span>
                                </div>
                             </div>
                             <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteEvidence(ev.id)}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                             </Button>
                          </div>
                          {ev.excerpt && <div className="bg-muted p-2 rounded text-xs font-mono italic border-l-2 border-blue-500">"{ev.excerpt}"</div>}
                          {ev.url && <a href={ev.url} target="_blank" className="text-[10px] text-blue-500 hover:underline mt-2 block">{ev.url}</a>}
                       </CardContent>
                    </Card>
                 ))}
              </div>
           </TabsContent>

           {/* --- CLAIMS TAB --- */}
           <TabsContent value="claims" className="space-y-6">
              <Card className="border-border bg-card/50 border-l-4 border-l-blue-500">
                 {/* ... (Existing Claims Tab Content) ... */}
                 <CardHeader><CardTitle className="text-sm font-mono uppercase">Add Claim</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase">Claim Text</Label>
                        <Textarea value={newClaim.text} onChange={e => setNewClaim({...newClaim, text: e.target.value})} placeholder="Assert a fact, allegation, or inference..." />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label className="text-xs font-mono uppercase">Type</Label>
                             <Select value={newClaim.type} onValueChange={v => setNewClaim({...newClaim, type: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                   {ClaimTypeEnum.options.map(o => <SelectItem key={o} value={o}>{o.toUpperCase()}</SelectItem>)}
                                </SelectContent>
                             </Select>
                        </div>
                         <div className="space-y-2">
                             <Label className="text-xs font-mono uppercase">Confidence (0.0 - 1.0)</Label>
                             <Input type="number" step="0.1" min="0" max="1" value={newClaim.confidence} onChange={e => setNewClaim({...newClaim, confidence: parseFloat(e.target.value)})} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-mono uppercase flex justify-between">
                            <span>Supporting Evidence (Required for Facts)</span>
                            <span className={cn("text-[10px]", newClaim.evidenceIds.size > 0 ? "text-emerald-500" : "text-muted-foreground")}>
                                {newClaim.evidenceIds.size} Selected
                            </span>
                        </Label>
                        <ScrollArea className="h-32 border rounded bg-background/50 p-2">
                             {pack.evidence.length === 0 && <p className="text-xs text-muted-foreground p-2">No evidence available. Add evidence first.</p>}
                             {pack.evidence.map(ev => (
                                 <div key={ev.id} className="flex items-start gap-2 mb-2 p-1 hover:bg-muted/50 rounded cursor-pointer" 
                                      onClick={() => {
                                          const next = new Set(newClaim.evidenceIds);
                                          if (next.has(ev.id)) next.delete(ev.id);
                                          else next.add(ev.id);
                                          setNewClaim({...newClaim, evidenceIds: next});
                                      }}>
                                     <Checkbox checked={newClaim.evidenceIds.has(ev.id)} />
                                     <div className="text-xs">
                                         <p className="font-bold line-clamp-1">{ev.title}</p>
                                         <p className="text-[10px] text-muted-foreground">{ev.excerpt?.slice(0, 50)}...</p>
                                     </div>
                                 </div>
                             ))}
                        </ScrollArea>
                    </div>

                    {/* GUARDRAIL ALERT */}
                    {newClaim.type === "fact" && newClaim.evidenceIds.size === 0 && (
                        <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-500/10 p-2 rounded">
                            <ShieldAlert className="w-4 h-4" />
                            GUARDRAIL: Facts require at least one attached evidence item.
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button onClick={addClaim} disabled={!newClaim.text || (newClaim.type === "fact" && newClaim.evidenceIds.size === 0)}>
                            <Plus className="w-4 h-4 mr-2"/> Add Claim
                        </Button>
                    </div>
                 </CardContent>
              </Card>

              <div className="grid gap-4">
                 {pack.claims.map(c => (
                    <Card key={c.id} className="group border-l-4 border-l-transparent hover:border-l-blue-500 transition-all">
                       <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                             <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Badge variant={c.claimType === "fact" ? "default" : "outline"} 
                                           className={cn("text-[10px] uppercase", c.claimType !== "fact" && "text-amber-500 border-amber-500")}>
                                        {c.claimType}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground font-mono">Conf: {c.confidence}</span>
                                </div>
                                <p className="font-medium text-sm">{c.text}</p>
                             </div>
                             <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deleteClaim(c.id)}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                             </Button>
                          </div>
                          
                          {/* Evidence Links */}
                          <div className="mt-3 flex gap-2 flex-wrap">
                             {c.evidenceIds.map(eid => {
                                 const ev = pack.evidence.find(e => e.id === eid);
                                 return ev ? (
                                     <Badge key={eid} variant="secondary" className="text-[9px] max-w-[200px] truncate cursor-help" title={ev.excerpt}>
                                         Ref: {ev.title}
                                     </Badge>
                                 ) : null;
                             })}
                          </div>
                       </CardContent>
                    </Card>
                 ))}
              </div>
           </TabsContent>

           {/* --- HEURISTICS TAB --- */}
           <TabsContent value="heuristics" className="space-y-6">
              <div className="flex justify-between items-center">
                  <div>
                      <h3 className="text-lg font-mono font-bold">Shadow-Caste Heuristics v1</h3>
                      <p className="text-xs text-muted-foreground">Automated analysis of network structure.</p>
                  </div>
                  <Button onClick={runHeuristics} className="bg-purple-600 hover:bg-purple-700 text-white font-mono">
                      <Zap className="w-4 h-4 mr-2" /> Run Analysis
                  </Button>
              </div>

              {influenceResult || fundingResult ? (
                  <div className="space-y-6">
                      {/* Influence Hubs */}
                      {influenceResult && (
                          <Card className="border-purple-500/20 bg-purple-500/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-mono uppercase flex justify-between">
                                    <span>Influence Hubs (Degree Centrality)</span>
                                    <span className="text-xs text-muted-foreground">{new Date(influenceResult.generatedAt).toLocaleTimeString()}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {influenceResult.results.slice(0, 5).map((res, i) => {
                                        const entity = pack.entities.find(e => e.id === res.entityId);
                                        return (
                                            <div key={res.entityId} className="flex items-center gap-4 p-2 bg-background/50 rounded border border-border">
                                                <div className="font-mono font-bold text-lg text-purple-500 w-8 text-center">#{i + 1}</div>
                                                <div className="flex-1">
                                                    <div className="font-bold">{entity?.name || "Unknown Entity"}</div>
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        Total Degree: {res.degree} (In: {res.inDegree}, Out: {res.outDegree})
                                                    </div>
                                                </div>
                                                <div className="text-right text-[10px] text-muted-foreground font-mono">
                                                    {res.supportingEdgeIds.length} Edges Cited
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {influenceResult.results.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">No connected hubs found.</p>
                                    )}
                                </div>
                            </CardContent>
                          </Card>
                      )}

                      {/* Funding Gravity */}
                      {fundingResult && (
                           <Card className="border-emerald-500/20 bg-emerald-500/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-mono uppercase flex justify-between">
                                    <span>Funding Gravity (Financial Flows)</span>
                                    <span className="text-xs text-muted-foreground">{new Date(fundingResult.generatedAt).toLocaleTimeString()}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {fundingResult.concentration ? (
                                    <div className="space-y-4">
                                        {/* Metrics */}
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            <div className="bg-background/50 p-2 rounded border text-center">
                                                <div className="text-[10px] uppercase text-muted-foreground">Total Flows</div>
                                                <div className="font-bold font-mono">{fundingResult.concentration.edgesCount}</div>
                                            </div>
                                            <div className="bg-background/50 p-2 rounded border text-center">
                                                <div className="text-[10px] uppercase text-muted-foreground">Top Funder Share</div>
                                                <div className="font-bold font-mono">{(fundingResult.concentration.topFundersShare * 100).toFixed(0)}%</div>
                                            </div>
                                            <div className="bg-background/50 p-2 rounded border text-center">
                                                <div className="text-[10px] uppercase text-muted-foreground">Top Recipient Share</div>
                                                <div className="font-bold font-mono">{(fundingResult.concentration.topRecipientsShare * 100).toFixed(0)}%</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="text-xs font-bold uppercase mb-2 text-emerald-600">Top Funders</h4>
                                                {fundingResult.funders.slice(0, 3).map((f, i) => {
                                                    const entity = pack.entities.find(e => e.id === f.entityId);
                                                    return (
                                                        <div key={f.entityId} className="text-xs mb-1 flex justify-between border-b border-dashed pb-1">
                                                            <span>{i+1}. {entity?.name}</span>
                                                            <span className="font-mono">{f.outgoingFundingEdges} Out</span>
                                                        </div>
                                                    )
                                                })}
                                                {fundingResult.funders.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold uppercase mb-2 text-blue-600">Top Recipients</h4>
                                                {fundingResult.recipients.slice(0, 3).map((r, i) => {
                                                    const entity = pack.entities.find(e => e.id === r.entityId);
                                                    return (
                                                        <div key={r.entityId} className="text-xs mb-1 flex justify-between border-b border-dashed pb-1">
                                                            <span>{i+1}. {entity?.name}</span>
                                                            <span className="font-mono">{r.incomingFundingEdges} In</span>
                                                        </div>
                                                    )
                                                })}
                                                {fundingResult.recipients.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground text-xs font-mono">
                                        No funding edges found (e.g. funded_by, donated_to).
                                    </div>
                                )}
                            </CardContent>
                           </Card>
                      )}
                  </div>
              ) : (
                  <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground font-mono text-sm">
                      Run heuristics to analyze the dossier structure.
                  </div>
              )}
           </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
