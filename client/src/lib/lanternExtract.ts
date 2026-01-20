export type Provenance = {
  sentence: string;
  start: number;
  end: number;
};

export type BaseItem = {
  id: string;
  confidence: number;
  provenance: Provenance;
  tags: string[];
  included: boolean; // For UI toggling
};

export type EntityItem = BaseItem & {
  type: "person" | "org" | "location" | "other";
  text: string;
  canonical?: string;
};

export type QuoteItem = BaseItem & {
  quote: string;
  speaker?: string;
};

export type MetricItem = BaseItem & {
  value: string;
  unit: string;
  normalized_value?: number;
};

export type TimelineItem = BaseItem & {
  date: string;
  event: string;
};

export type LanternPack = {
  schema: "lantern.extract.pack.v1";
  pack_id: string;
  source: {
    title: string;
    publisher: string;
    author: string;
    url: string;
    published_at: string;
    retrieved_at: string;
    source_type: string;
  };
  hashes: {
    source_text_sha256: string;
    pack_sha256: string;
  };
  items: {
    entities: EntityItem[];
    quotes: QuoteItem[];
    metrics: MetricItem[];
    timeline: TimelineItem[];
  };
};

// Mock extraction logic (since we are frontend-only mockup)
// In a real app, this would use NLP libraries or LLM API
export function mockExtract(text: string): LanternPack["items"] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const entities: EntityItem[] = [];
  const quotes: QuoteItem[] = [];
  const metrics: MetricItem[] = [];
  const timeline: TimelineItem[] = [];

  sentences.forEach((s, i) => {
    const cleanS = s.trim();
    const start = text.indexOf(cleanS);
    const end = start + cleanS.length;
    const provenance = { sentence: cleanS, start, end };
    
    // Mock Entity Extraction (Capitalized words)
    const capitalizedWords = cleanS.match(/[A-Z][a-z]+/g);
    if (capitalizedWords && Math.random() > 0.7) {
      entities.push({
        id: `ent_${crypto.randomUUID().slice(0, 8)}`,
        type: Math.random() > 0.5 ? "person" : "org",
        text: capitalizedWords[0],
        confidence: 0.8 + Math.random() * 0.2,
        provenance,
        tags: [],
        included: true
      });
    }

    // Mock Quote Extraction (Quotation marks)
    if (cleanS.includes('"') || cleanS.includes('“')) {
      quotes.push({
        id: `qt_${crypto.randomUUID().slice(0, 8)}`,
        quote: cleanS.match(/["“]([^"”]+)["”]/)?.[1] || cleanS,
        speaker: "Unknown",
        confidence: 0.9,
        provenance,
        tags: [],
        included: true
      });
    }

    // Mock Metric Extraction (Numbers)
    const numbers = cleanS.match(/\d+(?:,\d{3})*(?:\.\d+)?/);
    if (numbers) {
      metrics.push({
        id: `met_${crypto.randomUUID().slice(0, 8)}`,
        value: numbers[0],
        unit: cleanS.includes("$") ? "USD" : "count",
        confidence: 0.85,
        provenance,
        tags: [],
        included: true
      });
    }

    // Mock Timeline Extraction (Years)
    const years = cleanS.match(/\b(19|20)\d{2}\b/);
    if (years) {
      timeline.push({
        id: `tl_${crypto.randomUUID().slice(0, 8)}`,
        date: years[0],
        event: cleanS.substring(0, 50) + "...",
        confidence: 0.7,
        provenance,
        tags: [],
        included: true
      });
    }
  });

  return { entities, quotes, metrics, timeline };
}
