import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { PackV1 } from "@/lib/schema/pack_v1";
import { persistence } from "@/lib/storage";
import { computeInfluenceHubs } from "@/lib/heuristics/influenceHubs";
import { computeFundingGravity } from "@/lib/heuristics/fundingGravity";
import { computeEnforcementMap } from "@/lib/heuristics/enforcementMap";
import { InfluenceHubsFinding, FundingGravityFinding, EnforcementMapFinding } from "@/lib/heuristics/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer, Download, Share2 } from "lucide-react";

export default function DossierReport() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [pack, setPack] = useState<PackV1 | null>(null);
  
  // Computed Findings
  const [influence, setInfluence] = useState<InfluenceHubsFinding | null>(null);
  const [funding, setFunding] = useState<FundingGravityFinding | null>(null);
  const [enforcement, setEnforcement] = useState<EnforcementMapFinding | null>(null);

  useEffect(() => {
    const load = async () => {
      const lib = await persistence.loadLibrary();
      if (!lib || !id) return;
      const found = lib.packs.find(p => "packId" in p && p.packId === id) as PackV1;
      
      if (found) {
          setPack(found);
          // Auto-compute heuristics for report
          setInfluence(computeInfluenceHubs(found));
          setFunding(computeFundingGravity(found));
          setEnforcement(computeEnforcementMap(found));
      } else {
          alert("Dossier not found");
          setLocation("/extract");
      }
    };
    load();
  }, [id, setLocation]);

  if (!pack) return <div className="p-12 text-center font-mono">Generating Report...</div>;

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-white text-black p-8 md:p-16 font-serif selection:bg-yellow-200">
      <div className="max-w-4xl mx-auto space-y-12 print:space-y-8">
        
        {/* Navigation (Hidden in Print) */}
        <div className="flex justify-between items-center print:hidden mb-8 border-b pb-4">
             <Button variant="ghost" size="sm" onClick={() => setLocation(`/dossier/${id}`)}>
                 <ArrowLeft className="w-4 h-4 mr-2" /> Back to Editor
             </Button>
             <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={handlePrint}>
                     <Printer className="w-4 h-4 mr-2" /> Print PDF
                 </Button>
             </div>
        </div>

        {/* Header */}
        <header className="text-center border-b-4 border-black pb-8">
            <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-widest mb-4">{pack.subjectName}</h1>
            <div className="flex justify-center gap-8 text-sm font-mono uppercase tracking-widest text-gray-600">
                <span>Dossier ID: {pack.packId.slice(0, 8)}</span>
                <span>Date: {new Date().toLocaleDateString()}</span>
                <span>Entities: {pack.entities.length}</span>
            </div>
        </header>

        {/* 1. Executive Summary */}
        <section>
            <h2 className="text-2xl font-bold uppercase border-b-2 border-black mb-4 flex justify-between items-baseline">
                <span>01. Executive Summary</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 border border-black bg-gray-50">
                    <div className="text-3xl font-bold">{pack.claims.filter(c => c.claimType === "fact").length}</div>
                    <div className="text-xs font-mono uppercase">Verified Facts</div>
                </div>
                <div className="p-4 border border-black bg-gray-50">
                    <div className="text-3xl font-bold">{pack.claims.filter(c => c.claimType === "allegation").length}</div>
                    <div className="text-xs font-mono uppercase">Allegations</div>
                </div>
                <div className="p-4 border border-black bg-gray-50">
                    <div className="text-3xl font-bold">{pack.evidence.length}</div>
                    <div className="text-xs font-mono uppercase">Evidence Items</div>
                </div>
                 <div className="p-4 border border-black bg-gray-50">
                    <div className="text-3xl font-bold">{pack.edges.length}</div>
                    <div className="text-xs font-mono uppercase">Relationships</div>
                </div>
            </div>
            <p className="font-serif italic text-lg text-gray-700 leading-relaxed">
                This dossier compiles intelligence regarding <strong>{pack.subjectName}</strong>, identifying key structural influence, financial flows, and enforcement actions. 
                Analysis generated via Lantern Shadow-Caste heuristics (v1).
            </p>
        </section>

        {/* 2. Structural Analysis (Influence) */}
        {influence && influence.results.length > 0 && (
            <section className="break-inside-avoid">
                <h2 className="text-xl font-bold uppercase border-b border-gray-400 mb-4 text-purple-900">
                    02. Structural Influence (Hubs)
                </h2>
                <div className="space-y-4">
                    {influence.results.slice(0, 5).map((res, i) => {
                        const entity = pack.entities.find(e => e.id === res.entityId);
                        return (
                            <div key={res.entityId} className="flex items-baseline justify-between border-b border-dotted border-gray-300 pb-2">
                                <div className="flex gap-4">
                                    <span className="font-mono font-bold text-gray-400">#{i+1}</span>
                                    <span className="font-bold text-lg">{entity?.name}</span>
                                </div>
                                <div className="text-sm font-mono">
                                    <span className="mr-4">Degree: {res.degree}</span>
                                    <span className="text-gray-500">({res.supportingEdgeIds.length} citations)</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
        )}

        {/* 3. Financial Analysis (Funding) */}
        {funding && funding.concentration && (
            <section className="break-inside-avoid">
                <h2 className="text-xl font-bold uppercase border-b border-gray-400 mb-4 text-emerald-900">
                    03. Financial Flows (Gravity)
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-mono text-sm uppercase font-bold mb-2 text-gray-500">Top Funders</h3>
                         {funding.funders.slice(0, 5).map((f, i) => {
                            const entity = pack.entities.find(e => e.id === f.entityId);
                            return (
                                <div key={f.entityId} className="flex justify-between border-b border-gray-100 py-1">
                                    <span>{i+1}. {entity?.name}</span>
                                    <span className="font-mono font-bold">{f.outgoingFundingEdges} Out</span>
                                </div>
                            )
                        })}
                    </div>
                    <div>
                        <h3 className="font-mono text-sm uppercase font-bold mb-2 text-gray-500">Top Recipients</h3>
                         {funding.recipients.slice(0, 5).map((r, i) => {
                            const entity = pack.entities.find(e => e.id === r.entityId);
                            return (
                                <div key={r.entityId} className="flex justify-between border-b border-gray-100 py-1">
                                    <span>{i+1}. {entity?.name}</span>
                                    <span className="font-mono font-bold">{r.incomingFundingEdges} In</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 text-sm font-mono text-emerald-800">
                    <strong>Concentration:</strong> The top funder controls {(funding.concentration.topFundersShare * 100).toFixed(1)}% of all mapped flows.
                </div>
            </section>
        )}

        {/* 4. Gatekeeping Analysis (Enforcement) */}
        {enforcement && enforcement.enforcers.length > 0 && (
            <section className="break-inside-avoid">
                 <h2 className="text-xl font-bold uppercase border-b border-gray-400 mb-4 text-red-900">
                    04. Gatekeeping & Enforcement
                </h2>
                <div className="grid md:grid-cols-2 gap-8 mb-4">
                    <div>
                         <h3 className="font-mono text-sm uppercase font-bold mb-2 text-red-700">Enforcers (Active)</h3>
                         {enforcement.enforcers.slice(0, 5).map((e, i) => {
                            const entity = pack.entities.find(ent => ent.id === e.entityId);
                            return (
                                <div key={e.entityId} className="flex justify-between border-b border-gray-100 py-1">
                                    <span className="font-bold">{entity?.name}</span>
                                    <span className="font-mono text-red-600">{e.enforcementActions} Actions</span>
                                </div>
                            )
                        })}
                    </div>
                     <div>
                         <h3 className="font-mono text-sm uppercase font-bold mb-2 text-orange-700">Targets (Passive)</h3>
                         {enforcement.targets.slice(0, 5).map((t, i) => {
                            const entity = pack.entities.find(ent => ent.id === t.entityId);
                            return (
                                <div key={t.entityId} className="flex justify-between border-b border-gray-100 py-1">
                                    <span className="font-bold">{entity?.name}</span>
                                    <span className="font-mono text-orange-600">{t.targetedActions} In</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(enforcement.breakdownByType).map(([type, count]) => (
                        <span key={type} className="px-2 py-1 bg-red-100 text-red-800 text-xs font-mono uppercase rounded border border-red-200">
                            {type.replace("_by", "")}: {count}
                        </span>
                    ))}
                </div>
            </section>
        )}

        {/* 5. Appendix: Claims & Evidence */}
        <section className="break-before-page">
             <h2 className="text-2xl font-bold uppercase border-b-2 border-black mb-6">
                Appendix: Verified Claims
            </h2>
            <div className="space-y-6">
                {pack.claims.map((claim, i) => (
                    <div key={claim.id} className="p-4 border-l-4 border-gray-300 pl-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono font-bold text-gray-400">C-{i+1}</span>
                            <Badge variant={claim.claimType === "fact" ? "default" : "outline"} className="uppercase text-[10px] rounded-none">
                                {claim.claimType}
                            </Badge>
                            <span className="text-xs font-mono text-gray-500">Confidence: {claim.confidence}</span>
                        </div>
                        <p className="text-lg mb-3">{claim.text}</p>
                        
                        {claim.evidenceIds.length > 0 && (
                            <div className="bg-gray-50 p-3 text-sm border border-gray-200">
                                <h4 className="font-mono text-xs uppercase font-bold text-gray-500 mb-2">Supporting Evidence</h4>
                                <ul className="space-y-2">
                                    {claim.evidenceIds.map(eid => {
                                        const ev = pack.evidence.find(e => e.id === eid);
                                        return ev ? (
                                            <li key={eid} className="flex gap-2 text-xs">
                                                <span className="font-bold">[{ev.sourceType}]</span>
                                                <a href={ev.url} target="_blank" className="underline hover:text-blue-600 truncate max-w-md">
                                                    {ev.title}
                                                </a>
                                                <span className="text-gray-500">({ev.date})</span>
                                            </li>
                                        ) : null;
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>

        {/* Footer */}
        <footer className="text-center border-t pt-8 text-xs font-mono text-gray-400 uppercase tracking-widest">
            Generated by Lantern Protocol • {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
