import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLens } from "@/context/LensContext";

export default function HowItWorks() {
  const { lens } = useLens();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-8 text-muted-foreground" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>

        <header className="mb-12 border-b border-border pb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2" data-testid="heading-title">How Lantern Works</h1>
          <p className="text-muted-foreground text-sm">
            Evidence-first investigative workbench. No source, no assertion.
          </p>
        </header>

        <article className="prose prose-neutral dark:prose-invert prose-sm max-w-none space-y-12">
          
          <section>
            <h2 className="text-lg font-semibold border-b border-border/50 pb-2 mb-4">
              1. What Lantern Is
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground list-none pl-0">
              <li>An evidence-first investigative workbench for journalists, legal teams, and analysts.</li>
              <li>Every assertion must be anchored to a verifiable source. "No source, no assertion."</li>
              <li>Source-bound, audit-ready, and refuses unsupported claims.</li>
              <li>Outputs are defensible, traceable, and reproducible.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold border-b border-border/50 pb-2 mb-4">
              2. What Lantern Is Not
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground list-none pl-0">
              <li>Not a chatbot or conversational interface.</li>
              <li>Not a truth oracle or fact-checking service.</li>
              <li>Not an inference engine. Lantern does not guess, rank, or synthesize conclusions.</li>
              <li>Not an accusation engine. Structural patterns suggest, they do not prove.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold border-b border-border/50 pb-2 mb-4">
              3. Core Objects
            </h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-medium text-foreground">Sources</dt>
                <dd className="text-muted-foreground mt-1">
                  Documents uploaded to a corpus. Each source receives a SHA-256 hash for verification and chain-of-custody tracking.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Claims</dt>
                <dd className="text-muted-foreground mt-1">
                  Recorded assertions extracted from sources. Every claim must link to at least one evidence anchor. Claims without evidence are flagged and isolated.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Entities</dt>
                <dd className="text-muted-foreground mt-1">
                  Named actors or objects: people, organizations, roles, assets, publications, or events referenced in the evidence record.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Case Vault</dt>
                <dd className="text-muted-foreground mt-1">
                  Local-first storage for all case data via IndexedDB. Data stays in your browser. Export and import via JSON packs.
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-lg font-semibold border-b border-border/50 pb-2 mb-4">
              4. The 4-Step Ritual
            </h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="font-bold text-foreground text-lg">1.</span>
                <div>
                  <strong className="text-foreground">Ingest</strong>
                  <p className="mt-1">Upload source documents to a corpus. Each source is hashed for integrity.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-foreground text-lg">2.</span>
                <div>
                  <strong className="text-foreground">Extract</strong>
                  <p className="mt-1">Extract entities, quotes, metrics, and timeline events. Every item is anchored to its source with byte-level provenance.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-foreground text-lg">3.</span>
                <div>
                  <strong className="text-foreground">Curate</strong>
                  <p className="mt-1">Create claims and link them to evidence anchors. Unsupported claims are flagged, not hidden.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-foreground text-lg">4.</span>
                <div>
                  <strong className="text-foreground">Export</strong>
                  <p className="mt-1">Generate Verified Records, Evidence Packets, or Dossier Reports with cryptographic fingerprints.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold border-b border-border/50 pb-2 mb-4">
              5. Claim Classifications
            </h2>
            <div className="space-y-4 text-sm">
              <div className="border-l-4 border-emerald-500 pl-4">
                <h3 className="font-medium text-foreground">
                  {lens === "legal" ? "SUPPORTED" : "VERIFIED"} (Defensible)
                </h3>
                <p className="text-muted-foreground mt-1">
                  Claims backed by at least one evidence anchor from the source record. The evidence trail is verifiable.
                </p>
              </div>
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="font-medium text-foreground">
                  {lens === "legal" ? "UNSUBSTANTIATED" : "UNSOURCED"} (Restricted)
                </h3>
                <p className="text-muted-foreground mt-1">
                  Claims without sufficient evidentiary basis. Lantern refuses to present these as supported. They are isolated and flagged with refusal reasons.
                </p>
              </div>
              <div className="border-l-4 border-amber-500 pl-4">
                <h3 className="font-medium text-foreground">
                  {lens === "legal" ? "IN DISPUTE" : "CONTESTABLE"} (Ambiguous)
                </h3>
                <p className="text-muted-foreground mt-1">
                  Claims with partial or conflicting evidence. Marked UNRESOLVED — not inferred, not dismissed.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold border-b border-border/50 pb-2 mb-4">
              6. Lenses: Newsroom vs Legal
            </h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Lantern supports two semantic lenses — <strong className="text-foreground">Newsroom</strong> and <strong className="text-foreground">Legal</strong>. 
                The underlying data is identical. Only the labels, section titles, and export format change.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">Newsroom Lens</h4>
                  <ul className="space-y-1 text-xs">
                    <li>Claims: Verified / Unsourced / Contestable</li>
                    <li>Unsupported: "Unknown Inventory"</li>
                    <li>Open items: "Question Queue"</li>
                    <li>Export: Editor Review Packet</li>
                  </ul>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">Legal Lens</h4>
                  <ul className="space-y-1 text-xs">
                    <li>Claims: Supported / Unsubstantiated / In Dispute</li>
                    <li>Unsupported: "Unsupported Assertions"</li>
                    <li>Open items: "Required Corroboration"</li>
                    <li>Export: Case Memorandum + Exhibit Index</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs">
                Toggle between lenses using the button in the top-left of the interface. Switching does not refetch or reset data — it only re-renders labels.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold border-b border-border/50 pb-2 mb-4">
              7. Storage: Local Vault
            </h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div>
                <strong className="text-foreground">Local-First Architecture</strong>
                <p className="mt-1">Case data is stored in IndexedDB in your browser. No case data is sent to external servers unless you explicitly use the server-side extraction job queue for large documents.</p>
              </div>
              <div>
                <strong className="text-foreground">Export Packs</strong>
                <p className="mt-1">Export any case as a JSON pack for backup, sharing, or import into another Lantern instance. Round-trip guarantee: import then export yields identical JSON.</p>
              </div>
              <div>
                <strong className="text-foreground">Server-Side Job Queue</strong>
                <p className="mt-1">Documents exceeding 75K characters are processed server-side with PostgreSQL-backed job persistence. Jobs survive page refresh and server restarts.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold border-b border-border/50 pb-2 mb-4">
              8. Export Modes
            </h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div>
                <strong className="text-foreground">Editor Review Packet (Newsroom)</strong>
                <p className="mt-1">Claims ledger, timeline, unknown inventory, question queue, and sources index. Designed for editorial review workflows.</p>
              </div>
              <div>
                <strong className="text-foreground">Case Memorandum + Exhibit Index (Legal)</strong>
                <p className="mt-1">Factual assertions table, chronology, unsupported assertions, required corroboration, and exhibit index. Designed for attorney review.</p>
              </div>
              <div>
                <strong className="text-foreground">Verified Record</strong>
                <p className="mt-1">Single deterministic artifact with SHA-256 integrity fingerprint. Contains all input sources, all claims with exact anchors, conflicts, missing evidence, and time mismatches. For courts, regulators, and audits.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold border-b border-border/50 pb-2 mb-4">
              9. Heuristics (With Limits)
            </h2>
            <div className="space-y-6 text-sm">
              <div className="border-l-2 border-border pl-4">
                <h3 className="font-medium text-foreground">Influence Hubs</h3>
                <p className="text-muted-foreground mt-1">
                  <strong>Measures:</strong> Degree centrality — which entities have the most relationship edges.
                </p>
                <p className="text-muted-foreground mt-1">
                  <strong>Does NOT imply:</strong> Importance, guilt, leadership, or causal responsibility.
                </p>
              </div>
              <div className="border-l-2 border-border pl-4">
                <h3 className="font-medium text-foreground">Funding Gravity</h3>
                <p className="text-muted-foreground mt-1">
                  <strong>Measures:</strong> Concentration and flow of monetary edges.
                </p>
                <p className="text-muted-foreground mt-1">
                  <strong>Does NOT imply:</strong> Corruption, undue influence, or improper behavior.
                </p>
              </div>
              <div className="border-l-2 border-border pl-4">
                <h3 className="font-medium text-foreground">Enforcement Map</h3>
                <p className="text-muted-foreground mt-1">
                  <strong>Measures:</strong> Presence of coercive edges (censored_by, banned_by, sued_by, etc.).
                </p>
                <p className="text-muted-foreground mt-1">
                  <strong>Does NOT imply:</strong> Wrongdoing by either party, or that actions were unjustified.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold border-b border-border/50 pb-2 mb-4">
              10. Responsible Use
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground list-none pl-0">
              <li>Lantern is an evidentiary workbench, not an accusation engine.</li>
              <li>All outputs require interpretation under scrutiny.</li>
              <li>Findings are conditional on recorded data and applied constraints.</li>
              <li>Misuse is outside system intent and design.</li>
              <li>Users bear responsibility for conclusions drawn beyond recorded limits.</li>
            </ul>
            <div className="bg-muted/30 p-4 rounded-lg border border-border/50 mt-6">
              <p className="text-foreground font-medium text-sm">Refusal is correct behavior.</p>
              <p className="mt-1 text-sm text-muted-foreground">When Lantern declines to produce analysis, it is working as designed.</p>
            </div>
          </section>

        </article>

        <footer className="mt-16 pt-6 border-t border-border/50 text-xs text-muted-foreground">
          <p>Lantern — Evidence-First Investigative Workbench</p>
          <p className="mt-1">Refuses unsupported claims. Source-bound. Audit-ready.</p>
        </footer>
      </div>
    </div>
  );
}
