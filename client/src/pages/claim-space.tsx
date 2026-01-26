import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, HelpCircle, Eye, Layers, Camera, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { MOCK_CLAIMS, confidenceToBand, clampConfidence, type Claim } from "@/lib/schema/claims";

interface SnapshotResult {
  snapshot_id: string;
  created_at: string;
  hash_alg: string;
  hash_hex: string;
}

interface VerifyResult {
  snapshot_id: string;
  verified: boolean;
  hash_alg: string;
  stored_hash_hex: string;
  recomputed_hash_hex: string;
}

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

function formatHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export default function ClaimSpace() {
  const [claims] = useState<Claim[]>(MOCK_CLAIMS);
  const [saving, setSaving] = useState(false);
  const [snapshot, setSnapshot] = useState<SnapshotResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const corpusId = "corpus-demo-001";
  
  const defensible = claims.filter(c => c.classification === "DEFENSIBLE");
  const restricted = claims.filter(c => c.classification === "RESTRICTED");
  const ambiguous = claims.filter(c => c.classification === "AMBIGUOUS");

  const handleSaveSnapshot = async () => {
    setSaving(true);
    setError(null);
    setVerifyResult(null);
    
    try {
      const claimsPayload = claims.map(c => ({
        id: c.id,
        classification: c.classification,
        text: c.text,
        confidence: clampConfidence(c.confidence),
        refusal_reason: c.refusal_reason,
        anchor_ids: c.anchor_ids
      }));
      
      const response = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corpus_id: corpusId,
          claims: claimsPayload
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save snapshot");
      }
      
      const result: SnapshotResult = await response.json();
      setSnapshot(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifySnapshot = async () => {
    if (!snapshot) return;
    
    setVerifying(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/snapshots/${snapshot.snapshot_id}/verify`);
      
      if (!response.ok) {
        throw new Error("Failed to verify snapshot");
      }
      
      const result: VerifyResult = await response.json();
      setVerifyResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">LANTERN</h1>
            </div>
            
            <Button 
              onClick={handleSaveSnapshot}
              disabled={saving || claims.length === 0}
              className="bg-cyan-600 hover:bg-cyan-500"
              data-testid="button-save-snapshot"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              Save Snapshot
            </Button>
          </div>
          <p className="text-muted-foreground">Claim Space</p>
        </header>

        {error && (
          <Card className="mb-6 border-red-500/30">
            <CardContent className="py-3 text-sm text-red-400">
              {error}
            </CardContent>
          </Card>
        )}

        {snapshot && (
          <Card className="mb-6 border-cyan-500/30 bg-cyan-500/5" data-testid="snapshot-result">
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-cyan-400">Snapshot Created</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    ID: {snapshot.snapshot_id}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    Hash ({snapshot.hash_alg}): {formatHash(snapshot.hash_hex)}
                  </p>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleVerifySnapshot}
                  disabled={verifying}
                  data-testid="button-verify-snapshot"
                >
                  {verifying ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3 h-3 mr-1" />
                  )}
                  Verify
                </Button>
              </div>
              
              {verifyResult && (
                <div className={`mt-3 p-2 rounded text-xs ${
                  verifyResult.verified 
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" 
                    : "bg-red-500/10 border border-red-500/30 text-red-400"
                }`}>
                  {verifyResult.verified ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Verified: Hash matches stored value
                    </span>
                  ) : (
                    <span>
                      Verification Failed: Hashes do not match
                      <br />
                      Stored: {formatHash(verifyResult.stored_hash_hex)}
                      <br />
                      Computed: {formatHash(verifyResult.recomputed_hash_hex)}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
