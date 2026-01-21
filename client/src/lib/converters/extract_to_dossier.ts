import { z } from "zod";
import { 
  PackV1Schema, 
  PackV1, 
  EntityTypeEnum, 
  Entity, 
  Evidence, 
  Claim 
} from "../schema/pack_v1";
import { LanternPack, EntityItem, QuoteItem, TimelineItem } from "../lanternExtract";

/**
 * Creates a curated PackV1 (Dossier) from a raw LanternPack (Extract).
 * This is a conversion process, not a migration, preserving the original extract.
 */
export function createDossierFromExtract(
  extract: LanternPack, 
  opts: { 
    subjectName?: string; 
    packType?: "public_figure" | "topic_ecosystem" 
  } = {}
): PackV1 {
  
  // 1. Metadata
  const packId = crypto.randomUUID(); // New ID for the dossier
  const created = new Date().toISOString();
  
  const dossier: PackV1 = {
    packId,
    packType: opts.packType || (opts.subjectName ? "public_figure" : "topic_ecosystem"),
    schemaVersion: 1,
    subjectName: opts.subjectName || extract.source.title || "Untitled Subject",
    timestamps: { created, updated: created },
    entities: [],
    edges: [],
    evidence: [],
    claims: []
  };

  // 2. Convert Entities
  // Mapping Table: Extract Types -> Dossier Types
  const mapEntityType = (t: string): z.infer<typeof EntityTypeEnum> => {
    const norm = t.toLowerCase();
    if (norm === "person") return "person";
    if (norm === "organization") return "org";
    if (norm === "location") return "asset"; // Treat locations as assets for now
    if (norm === "event") return "event";
    if (norm === "product") return "asset";
    return "org"; // Default fallback
  };

  const entityMap = new Map<string, string>(); // Extract ID -> Dossier ID

  extract.items.entities.forEach((e: EntityItem) => {
    if (!e.included) return;
    
    // Generate stable ID for dossier entity to allow merging duplicates later if needed
    // But for now, just map 1:1 using new UUIDs to decouple
    const newId = crypto.randomUUID();
    entityMap.set(e.id, newId);

    dossier.entities.push({
      id: newId,
      type: mapEntityType(e.type),
      name: e.text,
      aliases: [],
      tags: ["imported_from_extract"]
    });
  });

  // 3. Convert Evidence (Source Document)
  // Create a master evidence item for the source text itself
  const sourceEvidenceId = crypto.randomUUID();
  dossier.evidence.push({
    id: sourceEvidenceId,
    sourceType: extract.source.source_type || "News",
    publisher: extract.source.publisher,
    title: extract.source.title,
    url: extract.source.url,
    date: extract.source.published_at || created,
    excerpt: "Full source text extract.",
    notes: `Original Extract ID: ${extract.pack_id}`
  });

  // 4. Convert Quotes -> Evidence + "Existence" Claims
  extract.items.quotes.forEach((q: QuoteItem) => {
    if (!q.included) return;

    const evidenceId = crypto.randomUUID();
    
    // Quote as Evidence
    dossier.evidence.push({
      id: evidenceId,
      sourceType: "quote",
      publisher: q.speaker || "Unknown Speaker",
      title: `Quote: "${q.quote.slice(0, 50)}..."`,
      date: extract.source.published_at || created,
      excerpt: q.quote,
      notes: q.speaker ? `Attributed to ${q.speaker}` : "Unattributed"
    });

    // "Existence of Statement" Claim (Safe Default)
    // We do NOT assert the content is true, only that the speaker said it.
    const claimId = crypto.randomUUID();
    dossier.claims.push({
      id: claimId,
      text: `Statement by ${q.speaker || "Unknown"}: "${q.quote}"`,
      claimType: "fact", // Fact: "They said this"
      confidence: 1.0,
      evidenceIds: [evidenceId, sourceEvidenceId], // Link to quote + source doc
      counterEvidenceIds: [],
      createdAt: created
    });
  });

  // 5. Convert Timeline -> Evidence (Events)
  extract.items.timeline.forEach((t: TimelineItem) => {
    if (!t.included) return;

    const evidenceId = crypto.randomUUID();
    dossier.evidence.push({
      id: evidenceId,
      sourceType: "timeline_event",
      title: `Event: ${t.event} (${t.date})`,
      date: created, // We don't have a reliable ISO date from timeline yet, just string
      excerpt: t.event,
      notes: `Extracted date string: ${t.date}`
    });
  });

  // 6. Metrics -> Claims (Fact)
  // Metrics are usually factual claims about numbers
  extract.items.metrics.forEach((m: any) => {
     if (!m.included) return;
     
     const claimId = crypto.randomUUID();
     dossier.claims.push({
        id: claimId,
        text: `Metric: ${m.value} ${m.unit} (${m.metric_kind})`,
        claimType: "fact",
        confidence: m.confidence || 0.8,
        evidenceIds: [sourceEvidenceId],
        counterEvidenceIds: [],
        createdAt: created
     });
  });

  return dossier;
}
