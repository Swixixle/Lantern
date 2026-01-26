import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, HelpCircle, Eye, Layers } from "lucide-react";
import { MOCK_CLAIMS, confidenceToBand, type Claim, type ClaimClassification } from "@/lib/schema/claims";

function ClaimCard({ claim }: { claim: Claim }) {
  const [, navigate] = useLocation();
  
  const handleViewEvidence = () => {
    if (claim.anchor_ids.length > 0) {
      navigate(`/anchors?ids=${claim.anchor_ids.join(",")}&claimId=${claim.id}`);
    } else {
      navigate(`/anchors?claimId=${claim.id}&empty=true`);
    }
  };

  return (
    <Card 
      className={`border-l-4 ${
        claim.classification === "DEFENSIBLE" ? "border-l-emerald-500" :
        claim.classification === "RESTRICTED" ? "border-l-red-500" :
        "border-l-amber-500"
      }`}
      data-testid={`claim-card-${claim.id}`}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm mb-2">{claim.text}</p>
            
            {claim.classification === "RESTRICTED" && claim.refusal_reason && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                <span className="font-semibold">Not supported by corpus: </span>
                {claim.refusal_reason}
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <Badge 
              variant="outline" 
              className="text-xs font-mono"
              data-testid={`confidence-${claim.id}`}
            >
              {confidenceToBand(claim.confidence)}
            </Badge>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleViewEvidence}
              className="text-xs"
              data-testid={`view-evidence-${claim.id}`}
            >
              <Eye className="w-3 h-3 mr-1" />
              View Evidence
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimSection({ 
  title, 
  icon, 
  claims, 
  emptyMessage 
}: { 
  title: string; 
  icon: React.ReactNode; 
  claims: Claim[]; 
  emptyMessage: string;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
        {icon}
        {title}
        <Badge variant="secondary" className="ml-2 text-xs">{claims.length}</Badge>
      </h2>
      
      {claims.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            {emptyMessage}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function ClaimSpace() {
  const [claims] = useState<Claim[]>(MOCK_CLAIMS);
  
  const defensible = claims.filter(c => c.classification === "DEFENSIBLE");
  const restricted = claims.filter(c => c.classification === "RESTRICTED");
  const ambiguous = claims.filter(c => c.classification === "AMBIGUOUS");

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">LANTERN</h1>
          </div>
          <p className="text-muted-foreground">Claim Space</p>
        </header>

        <ClaimSection
          title="Defensible Claims"
          icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
          claims={defensible}
          emptyMessage="No defensible claims in this corpus."
        />

        <ClaimSection
          title="Restricted / Unsupported Claims"
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          claims={restricted}
          emptyMessage="No restricted claims identified."
        />

        <ClaimSection
          title="Ambiguous Claims"
          icon={<HelpCircle className="w-5 h-5 text-amber-500" />}
          claims={ambiguous}
          emptyMessage="No ambiguous claims identified."
        />

        <footer className="mt-12 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>Lantern v1.0 — Claim Governance Interface</p>
          <p className="mt-1">No inferred intent. No rankings. No synthesis. No conclusions.</p>
        </footer>
      </div>
    </div>
  );
}
