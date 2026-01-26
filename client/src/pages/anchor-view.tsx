import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Calendar, Hash, Layers } from "lucide-react";

export interface Anchor {
  id: string;
  quoted_text: string;
  source_document: string;
  page_section: string;
  timeline_context: string;
}

const MOCK_ANCHORS: Record<string, Anchor> = {
  "anchor-001": {
    id: "anchor-001",
    quoted_text: "This Agreement is entered into as of March 15, 2024, by and between Party A and Party B.",
    source_document: "Master Services Agreement v2.1",
    page_section: "Page 1, Section 1.1",
    timeline_context: "Document dated: March 15, 2024"
  },
  "anchor-002": {
    id: "anchor-002",
    quoted_text: "Both parties hereby acknowledge receipt of this executed agreement.",
    source_document: "Master Services Agreement v2.1",
    page_section: "Page 12, Signature Block",
    timeline_context: "Signatures dated: March 15, 2024"
  },
  "anchor-003": {
    id: "anchor-003",
    quoted_text: "Payment shall be due within thirty (30) days of invoice date.",
    source_document: "Master Services Agreement v2.1",
    page_section: "Page 5, Section 4.2",
    timeline_context: "Document dated: March 15, 2024"
  }
};

function AnchorCard({ anchor }: { anchor: Anchor }) {
  return (
    <Card className="border-l-4 border-l-cyan-500" data-testid={`anchor-${anchor.id}`}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start gap-2">
          <Hash className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <span className="text-xs font-mono text-muted-foreground">{anchor.id}</span>
        </div>
        
        <blockquote className="border-l-2 border-cyan-500/50 pl-3 italic text-sm">
          "{anchor.quoted_text}"
        </blockquote>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3 text-muted-foreground" />
            <span>{anchor.source_document}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{anchor.page_section}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span>{anchor.timeline_context}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnchorView() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const anchorIds = params.get("ids")?.split(",").filter(Boolean) || [];
  const claimId = params.get("claimId");
  const isEmpty = params.get("empty") === "true";

  const anchors = anchorIds
    .map(id => MOCK_ANCHORS[id])
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">LANTERN</h1>
          </div>
          
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Claim Space
            </Button>
          </Link>
          
          <h2 className="text-lg font-semibold">Evidence Anchors</h2>
          {claimId && (
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Claim: {claimId}
            </p>
          )}
        </header>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3 mb-6">
          <p className="text-sm font-medium text-amber-500">
            Any claim not anchored here is not defensible.
          </p>
        </div>

        {isEmpty || anchors.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <p className="text-sm">No anchors available for this claim in the current corpus.</p>
              <p className="text-xs mt-2">This claim cannot be defended without supporting evidence.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {anchors.map((anchor) => (
              <AnchorCard key={anchor.id} anchor={anchor} />
            ))}
          </div>
        )}

        <footer className="mt-12 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>No summaries. No interpretation. Verbatim only.</p>
        </footer>
      </div>
    </div>
  );
}
