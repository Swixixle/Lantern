// Improved Heuristic Normalization Helpers
const normalizeEntity = (text: string): string => {
  // Strip trailing punctuation and collapse whitespace
  return text.trim().replace(/[.,;:!?]+$/, "").replace(/\s+/g, " ");
};

const normalizeQuote = (text: string): string => {
  return text.trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ");
};

const normalizeCurrency = (text: string): { value: number, unit: string, scale: number } => {
  const clean = text.toLowerCase().replace(/,/g, "");
  let scale = 1;
  if (clean.includes("million") || clean.includes("m")) scale = 1e6;
  if (clean.includes("billion") || clean.includes("b")) scale = 1e9;
  if (clean.includes("trillion") || clean.includes("t")) scale = 1e12;
  if (clean.includes("k")) scale = 1e3;

  const unit = text.includes("$") || text.includes("USD") ? "USD" : 
               text.includes("€") || text.includes("EUR") ? "EUR" :
               text.includes("£") || text.includes("GBP") ? "GBP" :
               text.includes("%") || text.includes("percent") ? "percent" : "unknown";

  const numMatch = clean.match(/[\d.]+/);
  const value = numMatch ? parseFloat(numMatch[0]) * scale : 0;
  
  return { value, unit, scale };
};

// Sentence Segmentation with Provenance
type Sentence = { text: string; start: number; end: number };

const splitSentences = (text: string): Sentence[] => {
  // Matches sentence endings .?! but ignores common abbreviations
  // Negative lookbehind for abbreviations is tricky in JS regex without full support,
  // so we use a simpler split + merge strategy or a complex regex.
  // Using a robust regex for this context:
  // Match period/question/exclamation followed by space or end of string, 
  // but NOT if preceded by Mr|Mrs|Ms|Dr|Inc|Ltd|Jr|Sr|vs|U\.S
  
  // NOTE: JS lookbehind is supported in modern environments (Chrome 62+, Node 10+).
  // Assuming modern environment.
  
  const segments: Sentence[] = [];
  // Regex to find sentence boundaries: (.?!) followed by whitespace or EOF
  // We iterate through matches to get offsets
  
  const boundaryRegex = /(?<!\b(Mr|Mrs|Ms|Dr|Inc|Ltd|Jr|Sr|vs|U\.S|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec))(\.|!|\?)(?=\s|$)/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = boundaryRegex.exec(text)) !== null) {
    const end = match.index + match[0].length; // Include the punctuation
    const segmentText = text.slice(lastIndex, end).trim();
    
    if (segmentText.length > 0) {
      // Find actual start of non-whitespace content for start offset
      const relativeStart = text.slice(lastIndex, end).indexOf(segmentText);
      const absoluteStart = lastIndex + relativeStart;
      
      segments.push({
        text: segmentText,
        start: absoluteStart,
        end: absoluteStart + segmentText.length
      });
    }
    lastIndex = end;
  }
  
  // Add remaining text
  const remaining = text.slice(lastIndex).trim();
  if (remaining.length > 0) {
    const relativeStart = text.slice(lastIndex).indexOf(remaining);
    const absoluteStart = lastIndex + relativeStart;
    segments.push({
      text: remaining,
      start: absoluteStart,
      end: absoluteStart + remaining.length
    });
  }
  
  return segments;
};

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
  
  // Tier A: Hard excludes (Stop entities)
  const stopEntities = new Set([
    "The", "This", "That", "There", "Here", "What", "When", "Where", "Who", "Why", "How", 
    "And", "But", "Or", "If", "So", "Yet", "For", "Nor", 
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", 
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
    "Introduction", "Conclusion", "Court", "Government", "Company", "President", "State", "City", "County"
  ]);

  // Tier B: Positive patterns (Suffixes)
  const orgSuffixes = ["Inc", "LLC", "Ltd", "PLC", "GmbH", "University", "Hospital", "Department", "Ministry", "Committee", "Agency", "Bank", "Corp", "Group", "Foundation", "Association"];
  const locationKeywords = ["City", "County", "River", "Lake", "Ocean", "Mountain", "St", "Ave", "Rd", "Blvd"];
  const personTitles = ["Mr", "Mrs", "Ms", "Dr", "Prof", "Sen", "Rep", "Gov", "Pres"];

  // Patterns
  const entityPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const quotePattern = /["“]([^"”]+)["”]/g;
  const metricPattern = /(\$|€|£|¥)?\s*\d+(?:,\d{3})*(?:\.\d+)?\s*(%|million|billion|trillion|k|m|b)?/gi;
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const explicitDatePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,\s+\d{4})?\b/gi;

  const sentences = splitSentences(text);
  
  sentences.forEach((sent) => {
    const sentence = sent.text;
    const sentenceStart = sent.start;
    const sentenceEnd = sent.end; // Unused but good for debug
    
    if (!sentence) return;

    const provenanceBase = {
      sentence,
      start: sentenceStart,
      end: sentenceStart + sentence.length
    };

    // 1. Entity Extraction
    let match;
    while ((match = entityPattern.exec(sentence)) !== null) {
      const raw = match[0];
      const normalized = normalizeEntity(raw);
      
      if (normalized.length < minEntityLen) continue;
      if (stopEntities.has(normalized)) continue;
      
      let shouldInclude = false;
      let type: "person" | "org" | "location" | "other" = "other";

      // Tier B: Suffix Checks
      if (orgSuffixes.some(s => normalized.endsWith(s) || normalized.includes(" " + s))) {
        shouldInclude = true;
        type = "org";
      } else if (locationKeywords.some(s => normalized.endsWith(s))) {
        shouldInclude = true;
        type = "location";
      } else if (personTitles.some(s => normalized.startsWith(s))) {
        shouldInclude = true;
        type = "person";
      } else if (normalized.includes(" ")) { 
        // Multi-word heuristic
        shouldInclude = true;
        // Simple heuristic for Person vs Other (if 2 words, no numbers/symbols)
        if (normalized.split(" ").length >= 2 && !/\d/.test(normalized)) {
           type = "person"; // Weak guess, but works for "John Smith"
        }
      } else if (options.mode === "broad") {
        shouldInclude = true; // Single capitalized words in broad mode
      }

      // Conservative Mode Override: Must have strong signal (Tier B)
      if (options.mode === "conservative" && !shouldInclude) continue;

      // Dedupe check within this run
      const exists = entities.find(e => e.text === normalized);
      if (exists) continue; 

      if (shouldInclude) {
        entities.push({
          id: `ent_${mockHash(normalized + sentenceStart)}`,
          type,
          text: normalized,
          canonical: normalized,
          confidence: 0.7, 
          provenance: {
            ...provenanceBase,
            start: sentenceStart + match.index,
            end: sentenceStart + match.index + raw.length
          },
          tags: [],
          included: true
        });
      }
    }

    // 2. Quote Extraction
    while ((match = quotePattern.exec(sentence)) !== null) {
      const rawQuote = match[1]; 
      const normalized = normalizeQuote(rawQuote);

      if (normalized.length < minQuoteLen) continue;

      // Attribution Window (Search +/- 120 chars)
      // For now, simpler sentence-level check
      let speaker: string | undefined = undefined;
      const attributionKeywords = ["said", "told", "wrote", "added", "stated", "according to"];
      
      // Check for attribution keywords in the sentence OUTSIDE the quote
      const textOutsideQuote = sentence.replace(match[0], "");
      if (attributionKeywords.some(kw => textOutsideQuote.includes(kw))) {
        // Try to find a nearby entity
        const nearbyEntity = entities.find(e => textOutsideQuote.includes(e.text));
        if (nearbyEntity) {
          speaker = nearbyEntity.text;
        }
      }

      if (options.mode === "conservative" && !speaker) continue; // Require attribution in conservative

      quotes.push({
        id: `qt_${mockHash(normalized + sentenceStart)}`,
        quote: normalized,
        speaker,
        confidence: speaker ? 0.9 : 0.6,
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
      if (!/\d/.test(raw)) continue;
      // Filter out isolated years 
      if (/^\d{4}$/.test(raw.trim()) && (raw.startsWith("19") || raw.startsWith("20"))) continue;

      const { value, unit, scale } = normalizeCurrency(raw);

      if (options.mode === "conservative" && unit === "unknown") continue;

      metrics.push({
        id: `met_${mockHash(raw + sentenceStart)}`,
        value: raw.trim(),
        unit,
        normalized_value: value,
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

    // 4. Timeline Extraction (Explicit Dates)
    while ((match = explicitDatePattern.exec(sentence)) !== null) {
       const dateStr = match[0];
       timeline.push({
        id: `tl_${mockHash(dateStr + sentenceStart)}`,
        date: dateStr,
        event: sentence.length > 50 ? sentence.substring(0, 50) + "..." : sentence,
        confidence: 0.85,
        provenance: {
          ...provenanceBase,
          start: sentenceStart + match.index,
          end: sentenceStart + match.index + dateStr.length
        },
        tags: [],
        included: true
      });
    }

    // Timeline (Years - Fallback)
    while ((match = yearPattern.exec(sentence)) !== null) {
      const year = match[0];
      // Check if this year is already part of an explicit date we caught (crude overlap check)
      const isOverlap = timeline.some(t => t.provenance.sentence === sentence && t.date.includes(year) && t.date !== year);
      
      if (!isOverlap) {
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
  });

  return { entities, quotes, metrics, timeline };
}
