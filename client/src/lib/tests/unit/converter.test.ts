import { describe, it, expect, beforeEach } from "vitest";
import { createDossierFromExtract } from "../../converters/extract_to_dossier";
import { LanternPack } from "../../lanternExtract";

describe("Converter: Extract -> Dossier", () => {
    const mockExtract: LanternPack = {
        pack_id: "extract-1",
        schema: "lantern.extract.pack.v1",
        hashes: { source_text_sha256: "abc", pack_sha256: "def" },
        engine: { name: "test", version: "1.0" },
        source: {
            title: "Test Article",
            author: "Journalist",
            publisher: "NewsCorp",
            url: "http://example.com",
            published_at: "2023-01-01",
            retrieved_at: "2023-01-02",
            source_type: "News"
        },
        items: {
            entities: [
                { id: "e1", text: "Elon Musk", type: "Person", confidence: 0.9, included: true, provenance: {} as any },
                { id: "e2", text: "Tesla", type: "Organization", confidence: 0.9, included: true, provenance: {} as any },
                { id: "e3", text: "Ignored Entity", type: "Person", confidence: 0.5, included: false, provenance: {} as any }
            ],
            quotes: [
                { id: "q1", quote: "I love cars", speaker: "Elon Musk", confidence: 1.0, included: true, provenance: {} as any }
            ],
            metrics: [
                { id: "m1", value: "50", unit: "billion", metric_kind: "scalar", confidence: 1.0, included: true, provenance: {} as any }
            ],
            timeline: [
                { id: "t1", date: "2020", event: "Founded X", date_type: "explicit", confidence: 1.0, included: true, provenance: {} as any }
            ]
        },
        stats: { duplicates_collapsed: 0, invalid_dropped: 0, headlines_suppressed: 0 }
    };

    it("should create a valid PackV1 dossier", () => {
        const dossier = createDossierFromExtract(mockExtract, { subjectName: "Elon Musk Dossier" });
        
        expect(dossier.schemaVersion).toBe(1);
        expect(dossier.packType).toBe("public_figure");
        expect(dossier.subjectName).toBe("Elon Musk Dossier");
        expect(dossier.entities).toHaveLength(2); // Only included ones
    });

    it("should map entities correctly", () => {
        const dossier = createDossierFromExtract(mockExtract);
        const person = dossier.entities.find(e => e.name === "Elon Musk");
        const org = dossier.entities.find(e => e.name === "Tesla");
        
        expect(person?.type).toBe("person");
        expect(org?.type).toBe("org");
    });

    it("should convert quotes to evidence and claims", () => {
        const dossier = createDossierFromExtract(mockExtract);
        
        // 1 quote -> 1 quote evidence + 1 source doc evidence = 2 evidence total (plus 1 timeline event)
        // Wait, timeline adds 1 evidence too.
        // Total Evidence: 1 (Source Doc) + 1 (Quote) + 1 (Timeline) = 3
        expect(dossier.evidence).toHaveLength(3); 
        
        const quoteEvidence = dossier.evidence.find(e => e.sourceType === "quote");
        expect(quoteEvidence).toBeDefined();
        expect(quoteEvidence?.excerpt).toBe("I love cars");

        const claim = dossier.claims.find(c => c.text.includes("Statement by Elon Musk"));
        expect(claim).toBeDefined();
        expect(claim?.claimType).toBe("fact");
        expect(claim?.evidenceIds).toContain(quoteEvidence?.id);
    });

    it("should convert metrics to claims", () => {
        const dossier = createDossierFromExtract(mockExtract);
        const metricClaim = dossier.claims.find(c => c.text.includes("50 billion"));
        expect(metricClaim).toBeDefined();
        expect(metricClaim?.claimType).toBe("fact");
    });
});
