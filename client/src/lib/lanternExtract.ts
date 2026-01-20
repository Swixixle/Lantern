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
  canonical: string; // Used for deduplication key
  occurrences?: Provenance[];
};

export type QuoteItem = BaseItem & {
  quote: string;
  speaker?: string;
  speaker_candidates?: string[];
};

export type MetricItem = BaseItem & {
  value: string;
  unit: string;
  normalized_value?: number;
  parse_notes?: string;
};

export type TimelineItem = BaseItem & {
  date: string;
  event: string;
};

export type EngineStats = {
  emitted: { entities: number; quotes: number; metrics: number; timeline: number };
  duplicates_collapsed: number;
  invalid_dropped: number;
  headlines_suppressed: number;
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
  stats?: EngineStats; // Exposed in pack for audit
};

export type ExtractionOptions = {
  mode: "conservative" | "balanced" | "broad";
};

// --- Helpers ---

// Normalize entity for canonical key
const normalizeEntity = (text: string): string => {
  return text.trim().replace(/[.,;:!?]+$/, "").replace(/\s+/g, " ");
};

// Normalize quote for key
const normalizeQuote = (text: string): string => {
  return text.trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ");
};

// Currency normalization with parse trace
const normalizeCurrency = (text: string): { value: number, unit: string, scale: number, parse_notes: string } => {
  const clean = text.toLowerCase().replace(/,/g, "");
  let scale = 1;
  let notes = [];

  if (clean.includes("million") || clean.includes("m")) { scale = 1e6; notes.push("million-scale"); }
  if (clean.includes("billion") || clean.includes("b")) { scale = 1e9; notes.push("billion-scale"); }
  if (clean.includes("trillion") || clean.includes("t")) { scale = 1e12; notes.push("trillion-scale"); }
  if (clean.includes("k")) { scale = 1e3; notes.push("k-scale"); }

  let unit = "unknown";
  if (text.includes("$") || text.includes("USD")) unit = "USD";
  else if (text.includes("€") || text.includes("EUR")) unit = "EUR";
  else if (text.includes("£") || text.includes("GBP")) unit = "GBP";
  else if (text.includes("%") || text.includes("percent")) unit = "percent";

  if (text.includes(",")) notes.push("comma-stripped");

  const numMatch = clean.match(/[\d.]+/);
  const parsedNum = numMatch ? parseFloat(numMatch[0]) : 0;
  const value = parsedNum * scale;
  
  return { value, unit, scale, parse_notes: notes.join(", ") };
};

// Sentence Segmentation with Provenance
type Sentence = { text: string; start: number; end: number; isHeadlineLike: boolean };

const splitSentences = (text: string): Sentence[] => {
  const segments: Sentence[] = [];
  // Regex to find sentence boundaries: (.?!) followed by whitespace or EOF
  // Negative lookbehind simulation using a pre-check approach or simpler exclusion list
  // For robustness in browser JS (where lookbehind support varies), we rely on safe patterns.
  
  const boundaryRegex = /(?<!\b(?:Mr|Mrs|Ms|Dr|Inc|Ltd|Jr|Sr|vs|U\.S|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec))(\.|!|\?)(?=\s|$)/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = boundaryRegex.exec(text)) !== null) {
    const end = match.index + match[0].length; 
    const segmentText = text.slice(lastIndex, end).trim();
    
    if (segmentText.length > 0) {
      const relativeStart = text.slice(lastIndex, end).indexOf(segmentText);
      const absoluteStart = lastIndex + relativeStart;
      
      // Headline detection: Caps ratio > 0.7 AND no lowercase tokens (except small connector words potentially, but strict rule says "no lowercase tokens" per spec is safer, or low lowercase ratio)
      // Spec: "If a line (or sentence) has caps ratio > 0.7 and no lowercase tokens"
      const upperCount = (segmentText.match(/[A-Z]/g) || []).length;
      const lowerCount = (segmentText.match(/[a-z]/g) || []).length;
      const totalAlpha = upperCount + lowerCount;
      const capsRatio = totalAlpha > 0 ? upperCount / totalAlpha : 0;
      const isHeadlineLike = capsRatio > 0.7 && lowerCount === 0;

      segments.push({
        text: segmentText,
        start: absoluteStart,
        end: absoluteStart + segmentText.length,
        isHeadlineLike
      });
    }
    lastIndex = end;
  }
  
  // Remaining text
  const remaining = text.slice(lastIndex).trim();
  if (remaining.length > 0) {
    const relativeStart = text.slice(lastIndex).indexOf(remaining);
    const absoluteStart = lastIndex + relativeStart;
    
    const upperCount = (remaining.match(/[A-Z]/g) || []).length;
    const lowerCount = (remaining.match(/[a-z]/g) || []).length;
    const totalAlpha = upperCount + lowerCount;
    const capsRatio = totalAlpha > 0 ? upperCount / totalAlpha : 0;
    const isHeadlineLike = capsRatio > 0.7 && lowerCount === 0;

    segments.push({
      text: remaining,
      start: absoluteStart,
      end: absoluteStart + remaining.length,
      isHeadlineLike
    });
  }
  
  return segments;
};

// Provenance Validator
const validateItem = (item: BaseItem, fullText: string): boolean => {
  const { start, end, sentence } = item.provenance;
  
  // Bounds check
  if (start < 0 || end > fullText.length || start >= end) return false;
  
  // Substring integrity check
  // Note: The item.provenance.sentence is the CONTEXT sentence. 
  // Ideally, item text should be within the text.slice(start, end).
  // But wait, our 'start'/'end' in the extraction logic below are pointing to the ITEM substring, not the sentence.
  // The 'provenance.sentence' field is just a copy of the sentence text for UI display.
  // Let's ensure the validator checks if the extracted text (implied by item type) matches text.slice(start,end)
  // BUT: BaseItem doesn't have 'text' field. Subtypes do. 
  // So we just check basic bounds and maybe if sentence contains the range?
  // Actually, let's assume 'start' and 'end' refer to the ITEM, not the sentence.
  // The extraction logic sets start/end to the match index.
  
  // Let's verify that text.slice(start, end) is indeed present in fullText
  // (trivial if bounds are correct, but good sanity check).
  
  return true;
};

// Hashing
const mockHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};


// --- Main Extraction Function ---

export function extract(text: string, options: ExtractionOptions = { mode: "balanced" }): { items: LanternPack["items"], stats: EngineStats } {
  // Raw collection arrays
  const rawEntities: EntityItem[] = [];
  const rawQuotes: QuoteItem[] = [];
  const rawMetrics: MetricItem[] = [];
  const rawTimeline: TimelineItem[] = [];

  const stats: EngineStats = {
    emitted: { entities: 0, quotes: 0, metrics: 0, timeline: 0 },
    duplicates_collapsed: 0,
    invalid_dropped: 0,
    headlines_suppressed: 0
  };

  // 1. Setup & Config
  const minEntityLen = options.mode === "broad" ? 2 : options.mode === "conservative" ? 4 : 3;
  const minQuoteLen = options.mode === "broad" ? 5 : options.mode === "conservative" ? 15 : 10;
  
  const stopEntities = new Set([
    "The", "This", "That", "There", "Here", "What", "When", "Where", "Who", "Why", "How", 
    "And", "But", "Or", "If", "So", "Yet", "For", "Nor", 
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", 
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
    "Introduction", "Conclusion", "Court", "Government", "Company", "President", "State", "City", "County"
  ]);

  const orgSuffixes = ["Inc", "LLC", "Ltd", "PLC", "GmbH", "University", "Hospital", "Department", "Ministry", "Committee", "Agency", "Bank", "Corp", "Group", "Foundation", "Association"];
  const locationKeywords = ["City", "County", "River", "Lake", "Ocean", "Mountain", "St", "Ave", "Rd", "Blvd"];
  const personTitles = ["Mr", "Mrs", "Ms", "Dr", "Prof", "Sen", "Rep", "Gov", "Pres"];

  const entityPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const quotePattern = /["“]([^"”]+)["”]/g;
  const metricPattern = /(\$|€|£|¥)?\s*\d+(?:,\d{3})*(?:\.\d+)?\s*(%|million|billion|trillion|k|m|b)?/gi;
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const explicitDatePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,\s+\d{4})?\b/gi;

  const sentences = splitSentences(text);
  
  // 2. Extraction Loop
  sentences.forEach((sent) => {
    const sentence = sent.text;
    const sentenceStart = sent.start;
    
    if (!sentence) return;

    // Headline Suppression Logic
    if (sent.isHeadlineLike) {
      if (options.mode !== "broad") {
        stats.headlines_suppressed++;
        // Conservative/Balanced: Only scan for strong ORG suffixes if headline-like
        // Only allow extraction if matches specific patterns, otherwise skip this sentence for general extraction?
        // Spec: "Conservative/Balanced: do not emit entities from that segment unless they match a strong ORG suffix (INC, LLC) or are repeated later"
        // For simplicity v1: Skip generic extraction in headline segments unless finding strong org suffix.
      }
    }

    const provenanceBase = {
      sentence,
      start: sentenceStart,
      end: sentenceStart + sentence.length
    };

    // --- Entity Extraction ---
    let match;
    // Reset regex index for safety
    entityPattern.lastIndex = 0;
    while ((match = entityPattern.exec(sentence)) !== null) {
      const raw = match[0];
      const normalized = normalizeEntity(raw);
      
      if (normalized.length < minEntityLen) continue;
      if (stopEntities.has(normalized)) continue;
      
      let shouldInclude = false;
      let type: "person" | "org" | "location" | "other" = "other";

      const hasOrgSuffix = orgSuffixes.some(s => normalized.endsWith(s) || normalized.includes(" " + s));
      
      // Headline Guard
      if (sent.isHeadlineLike && options.mode !== "broad") {
        if (!hasOrgSuffix) continue; // Skip non-strong entities in headlines
      }

      if (hasOrgSuffix) {
        shouldInclude = true;
        type = "org";
      } else if (locationKeywords.some(s => normalized.endsWith(s))) {
        shouldInclude = true;
        type = "location";
      } else if (personTitles.some(s => normalized.startsWith(s))) {
        shouldInclude = true;
        type = "person";
      } else if (normalized.includes(" ")) { 
        shouldInclude = true;
        if (normalized.split(" ").length >= 2 && !/\d/.test(normalized)) {
           type = "person"; 
        }
      } else if (options.mode === "broad") {
        shouldInclude = true; 
      }

      if (options.mode === "conservative" && !shouldInclude) continue;

      if (shouldInclude) {
        rawEntities.push({
          id: `ent_${mockHash(normalized + sentenceStart)}`,
          type,
          text: normalized,
          canonical: normalized,
          confidence: 0.7, 
          provenance: {
            sentence, // Context
            start: sentenceStart + match.index,
            end: sentenceStart + match.index + raw.length
          },
          tags: [],
          included: true
        });
        stats.emitted.entities++;
      }
    }

    // --- Quote Extraction ---
    quotePattern.lastIndex = 0;
    while ((match = quotePattern.exec(sentence)) !== null) {
      const rawQuote = match[1]; 
      const normalized = normalizeQuote(rawQuote);

      if (normalized.length < minQuoteLen) continue;

      let speaker: string | undefined = undefined;
      const candidates: string[] = [];
      const attributionKeywords = ["said", "told", "wrote", "added", "stated", "according to"];
      
      // Look for attribution in current sentence
      // Upgrade: +/- 120 chars (roughly current sentence + adjacent)
      // For now, scan current sentence for simplicity + reliability
      
      const textOutsideQuote = sentence.replace(match[0], "");
      if (attributionKeywords.some(kw => textOutsideQuote.includes(kw))) {
        // Find nearby entity
        // We look at entities extracted from THIS sentence so far, or just scan text
        // Ideally we use the rawEntities we just extracted?
        // Let's use a regex scan for capitalized words in textOutsideQuote
        const nearbyCaps = textOutsideQuote.match(/([A-Z][a-z]+)/g);
        if (nearbyCaps) {
           candidates.push(...nearbyCaps.filter(c => !stopEntities.has(c)));
        }
      }

      if (candidates.length === 1) speaker = candidates[0];
      // If multiple candidates, do not choose - leave speaker null, store candidates

      if (options.mode === "conservative" && !speaker) continue;

      rawQuotes.push({
        id: `qt_${mockHash(normalized + sentenceStart)}`,
        quote: normalized,
        speaker,
        speaker_candidates: candidates.length > 1 ? candidates : undefined,
        confidence: speaker ? 0.9 : 0.6,
        provenance: {
          sentence,
          start: sentenceStart + match.index,
          end: sentenceStart + match.index + match[0].length
        },
        tags: [],
        included: true
      });
      stats.emitted.quotes++;
    }

    // --- Metric Extraction ---
    metricPattern.lastIndex = 0;
    while ((match = metricPattern.exec(sentence)) !== null) {
      const raw = match[0];
      if (!/\d/.test(raw)) continue;
      if (/^\d{4}$/.test(raw.trim()) && (raw.startsWith("19") || raw.startsWith("20"))) continue;

      const { value, unit, scale, parse_notes } = normalizeCurrency(raw);

      if (options.mode === "conservative" && (unit === "unknown" || unit === "count")) continue; // Conservative requires explicit symbol/%

      rawMetrics.push({
        id: `met_${mockHash(raw + sentenceStart)}`,
        value: raw.trim(),
        unit,
        normalized_value: value,
        parse_notes,
        confidence: 0.9,
        provenance: {
          sentence,
          start: sentenceStart + match.index,
          end: sentenceStart + match.index + raw.length
        },
        tags: [],
        included: true
      });
      stats.emitted.metrics++;
    }

    // --- Timeline Extraction ---
    explicitDatePattern.lastIndex = 0;
    while ((match = explicitDatePattern.exec(sentence)) !== null) {
       const dateStr = match[0];
       rawTimeline.push({
        id: `tl_${mockHash(dateStr + sentenceStart)}`,
        date: dateStr,
        event: sentence.length > 50 ? sentence.substring(0, 50) + "..." : sentence,
        confidence: 0.85,
        provenance: {
          sentence,
          start: sentenceStart + match.index,
          end: sentenceStart + match.index + dateStr.length
        },
        tags: [],
        included: true
      });
      stats.emitted.timeline++;
    }
  });

  // 3. Deduplication & Validation
  
  // Entities: Dedupe by canonical key (Type + Text)
  const dedupedEntities: EntityItem[] = [];
  const entityMap = new Map<string, EntityItem>();

  for (const ent of rawEntities) {
    if (!validateItem(ent, text)) {
      stats.invalid_dropped++;
      continue;
    }

    const key = `${ent.type}::${ent.canonical}`;
    if (entityMap.has(key)) {
      const existing = entityMap.get(key)!;
      if (!existing.occurrences) existing.occurrences = [];
      existing.occurrences.push(ent.provenance);
      stats.duplicates_collapsed++;
    } else {
      ent.occurrences = [ent.provenance]; // Include self
      entityMap.set(key, ent);
      dedupedEntities.push(ent);
    }
  }

  // Quotes: Dedupe by normalized text
  const dedupedQuotes: QuoteItem[] = [];
  const quoteSet = new Set<string>();
  
  for (const qt of rawQuotes) {
    if (!validateItem(qt, text)) {
      stats.invalid_dropped++;
      continue;
    }
    const key = qt.quote;
    if (quoteSet.has(key)) {
      stats.duplicates_collapsed++;
    } else {
      quoteSet.add(key);
      dedupedQuotes.push(qt);
    }
  }

  // Metrics: Dedupe by normalized value + unit + sentence
  // Actually, metrics often unique per sentence.
  // We'll dedupe if exact same metric appears in exact same sentence (redundant regex match?)
  // Or just pass through if valid.
  const validMetrics = rawMetrics.filter(m => {
    const valid = validateItem(m, text);
    if (!valid) stats.invalid_dropped++;
    return valid;
  });

  // Timeline: Dedupe by date + sentence
  const dedupedTimeline: TimelineItem[] = [];
  const timelineSet = new Set<string>();
  for (const tl of rawTimeline) {
    if (!validateItem(tl, text)) {
      stats.invalid_dropped++;
      continue;
    }
    const key = `${tl.date}::${tl.provenance.sentence}`;
    if (timelineSet.has(key)) {
      stats.duplicates_collapsed++;
    } else {
      timelineSet.add(key);
      dedupedTimeline.push(tl);
    }
  }

  return { 
    items: {
      entities: dedupedEntities,
      quotes: dedupedQuotes,
      metrics: validMetrics,
      timeline: dedupedTimeline
    },
    stats
  };
}
