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
  included: boolean;
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
  engine: {
    name: string;
    version: string;
  };
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

export type ExtractionOptions = {
  mode: "conservative" | "balanced" | "broad";
};

// Heuristic Normalization Helpers
const normalizeEntity = (text: string): string => {
  return text.trim().replace(/\s+/g, " ");
};

const normalizeQuote = (text: string): string => {
  return text.trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ");
};

// Simple hashing for mock purposes (in production use subtle crypto)
const mockHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// Heuristic Extraction Engine
export function extract(text: string, options: ExtractionOptions = { mode: "balanced" }): LanternPack["items"] {
  const entities: EntityItem[] = [];
  const quotes: QuoteItem[] = [];
  const metrics: MetricItem[] = [];
  const timeline: TimelineItem[] = [];

  // Configuration based on mode
  const minEntityLen = options.mode === "broad" ? 2 : options.mode === "conservative" ? 4 : 3;
  const minQuoteLen = options.mode === "broad" ? 5 : options.mode === "conservative" ? 15 : 10;
  
  // Stop words for entities
  const stopEntities = new Set(["The", "This", "That", "There", "Here", "What", "When", "Where", "Who", "Why", "How", "And", "But", "Or", "If", "So", "Yet", "For", "Nor", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);

  // Regex Patterns
  const entityPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const quotePattern = /["“]([^"”]+)["”]/g;
  const metricPattern = /(\$|€|£|¥)?\s*\d+(?:,\d{3})*(?:\.\d+)?\s*(%|million|billion|trillion|k|m|b)?/gi;
  const yearPattern = /\b(19|20)\d{2}\b/g;

  // Split text into sentences for context
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  let sentenceMatch;
  
  while ((sentenceMatch = sentenceRegex.exec(text)) !== null) {
    const sentence = sentenceMatch[0].trim();
    const sentenceStart = sentenceMatch.index;
    const sentenceEnd = sentenceStart + sentence.length;
    
    if (!sentence) continue;

    const provenanceBase = {
      sentence,
      start: sentenceStart,
      end: sentenceEnd
    };

    // 1. Entity Extraction
    let match;
    while ((match = entityPattern.exec(sentence)) !== null) {
      const raw = match[0];
      const normalized = normalizeEntity(raw);
      
      if (normalized.length < minEntityLen) continue;
      if (stopEntities.has(normalized)) continue;
      
      // Conservative: require multi-word or known suffix (mock)
      if (options.mode === "conservative" && !normalized.includes(" ")) {
        const knownSuffixes = ["Inc", "LLC", "Ltd", "Corp", "University", "Department"];
        if (!knownSuffixes.some(s => normalized.endsWith(s))) continue;
      }

      // Dedupe check within this run
      const exists = entities.find(e => e.text === normalized);
      if (exists) continue; // Simple first-seen dedupe

      entities.push({
        id: `ent_${mockHash(normalized + sentenceStart)}`,
        type: "other", // Detection logic mock
        text: normalized,
        canonical: normalized,
        confidence: 0.7, // Mock confidence
        provenance: {
          ...provenanceBase,
          start: sentenceStart + match.index,
          end: sentenceStart + match.index + raw.length
        },
        tags: [],
        included: true
      });
    }

    // 2. Quote Extraction
    while ((match = quotePattern.exec(sentence)) !== null) {
      const rawQuote = match[1]; // Inner group
      const normalized = normalizeQuote(rawQuote);

      if (normalized.length < minQuoteLen) continue;

      // Speaker inference (mock: check previous/next words for Proper Nouns)
      // Real NLP would parse dependency tree
      const speaker = "Unknown";

      quotes.push({
        id: `qt_${mockHash(normalized + sentenceStart)}`,
        quote: normalized,
        speaker,
        confidence: 0.8,
        provenance: {
          ...provenanceBase,
          start: sentenceStart + match.index,
          end: sentenceStart + match.index + match[0].length
        },
        tags: [],
        included: true
      });
    }

    // 3. Metric Extraction
    while ((match = metricPattern.exec(sentence)) !== null) {
      const raw = match[0];
      // Basic validation: must contain a digit
      if (!/\d/.test(raw)) continue;
      
      // Filter out isolated years (handled by timeline)
      if (/^\d{4}$/.test(raw.trim()) && (raw.startsWith("19") || raw.startsWith("20"))) continue;

      metrics.push({
        id: `met_${mockHash(raw + sentenceStart)}`,
        value: raw.trim(),
        unit: match[2] || (match[1] ? "currency" : "count"),
        confidence: 0.9,
        provenance: {
          ...provenanceBase,
          start: sentenceStart + match.index,
          end: sentenceStart + match.index + raw.length
        },
        tags: [],
        included: true
      });
    }

    // 4. Timeline Extraction
    while ((match = yearPattern.exec(sentence)) !== null) {
      const year = match[0];
      
      timeline.push({
        id: `tl_${mockHash(year + sentenceStart)}`,
        date: year,
        event: sentence.length > 50 ? sentence.substring(0, 50) + "..." : sentence,
        confidence: 0.75,
        provenance: {
          ...provenanceBase,
          start: sentenceStart + match.index,
          end: sentenceStart + match.index + year.length
        },
        tags: [],
        included: true
      });
    }
  }

  return { entities, quotes, metrics, timeline };
}
