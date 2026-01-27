import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AnchorProvenance {
  source_sha256_hex: string;
  source_id: string;
  page_index: number;
  page_ref: string;
  quote_start_char: number;
  quote_end_char: number;
  extractor: {
    name: string;
    version: string;
  };
}

interface AnchorRecord {
  id: string;
  corpus_id: string;
  source_id: string;
  quote: string;
  source_document: string;
  page_ref: string;
  section_ref: string | null;
  timeline_date: string;
  provenance: AnchorProvenance;
}

interface PageProof {
  source_id: string;
  page_index: number;
  page_text_sha256_hex: string;
  page_png_url: string;
}

interface AnchorProofPacket {
  anchor: AnchorRecord;
  page: PageProof;
  repro: {
    page_text_substring: string;
    substring_sha256_hex: string;
  };
}

export default function AnchorProofPage() {
  const [, navigate] = useLocation();
  const [proof, setProof] = useState<AnchorProofPacket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const anchorId = params.get("anchorId");

  useEffect(() => {
    if (!anchorId) {
      setError("Missing anchorId parameter");
      setLoading(false);
      return;
    }

    fetch(`/api/anchors/${anchorId}/proof`)
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => {
            throw new Error(data.message || "Failed to fetch proof");
          });
        }
        return res.json();
      })
      .then(data => {
        setProof(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [anchorId]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-muted-foreground">Loading proof...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Proof Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!proof) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
      </div>

      <h1 className="text-2xl font-bold mb-6">Anchor Extraction Proof</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Anchor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-muted-foreground text-sm">Anchor ID:</span>
              <p className="font-mono text-sm" data-testid="proof-anchor-id">{proof.anchor.id}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Source Document:</span>
              <p data-testid="proof-source-document">{proof.anchor.source_document}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Source SHA256:</span>
              <p className="font-mono text-xs break-all" data-testid="proof-source-sha256">{proof.anchor.provenance.source_sha256_hex}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Page:</span>
              <p data-testid="proof-page-ref">{proof.anchor.page_ref} (page_index: {proof.anchor.provenance.page_index})</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Offsets:</span>
              <p className="font-mono text-sm" data-testid="proof-offsets">
                quote_start_char: {proof.anchor.provenance.quote_start_char}, quote_end_char: {proof.anchor.provenance.quote_end_char}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Extractor:</span>
              <p className="font-mono text-sm" data-testid="proof-extractor">
                {proof.anchor.provenance.extractor.name} v{proof.anchor.provenance.extractor.version}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quote (Verbatim)</CardTitle>
          </CardHeader>
          <CardContent>
            <blockquote className="border-l-4 border-primary pl-4 italic" data-testid="proof-quote">
              "{proof.anchor.quote}"
            </blockquote>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reproduction Proof</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-muted-foreground text-sm">Page Text SHA256:</span>
              <p className="font-mono text-xs break-all" data-testid="proof-page-text-sha256">{proof.page.page_text_sha256_hex}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Substring SHA256:</span>
              <p className="font-mono text-xs break-all" data-testid="proof-substring-sha256">{proof.repro.substring_sha256_hex}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Repro Substring (from page_text[{proof.anchor.provenance.quote_start_char}:{proof.anchor.provenance.quote_end_char}]):</span>
              <p className="bg-muted p-2 rounded text-sm font-mono" data-testid="proof-repro-substring">
                {proof.repro.page_text_substring}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Page Image</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={proof.page.page_png_url} 
              alt={`Page ${proof.anchor.provenance.page_index + 1}`}
              className="max-w-full border rounded"
              data-testid="proof-page-image"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
