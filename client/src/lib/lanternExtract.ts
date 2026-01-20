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
  canonical: string; 
  canonical_family_id?: string;
  occurrences?: Provenance[];
};

export type QuoteItem = BaseItem & {
  quote: string;
  speaker?: string;
  speaker_candidates?: string[];
};

export type MetricItem = BaseItem & {
  value: string;
  raw_value_text: string;
  unit: string;
  metric_kind: "scalar" | "range" | "ratio" | "rate";
  parsed_number?: number;
  scale?: number;
  normalized_value?: number;
  range_low?: number;
  range_high?: number;
  qualifier?: string;
  parse_notes?: string;
};

export type TimelineItem = BaseItem & {
  date: string;
  raw_date_text: string;
  date_type: "explicit" | "partial" | "relative" | "year-only";
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
  pack_id: string; // The canonical ID of THIS curated artifact
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
    source_text_sha256: string; // Stable Source ID
    pack_sha256: string; // Hash of the canonical content
  };
  items: {
    entities: EntityItem[];
    quotes: QuoteItem[];
    metrics: MetricItem[];
    timeline: TimelineItem[];
  };
  stats?: EngineStats;
};

export type ExtractionOptions = {
  mode: "conservative" | "balanced" | "broad";
};

// --- Helpers ---

// Normalize entity for canonical key
const normalizeEntity = (text: string): string => {
  return text.trim().replace(/[.,;:!?]+$/, "").replace(/\s+/g, " ");
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

// Generate Family ID from root token + casing profile (v0.1.4 upgrade)
const generateFamilyId = (text: string, type: string): string => {
  const normalized = normalizeEntity(text);
  // Root token logic: skip common stopwords
  const words = normalized.split(" ").filter(w => !["The", "A", "An"].includes(w));
  const root = words.length > 0 ? words[0] : normalized;
  
  // Casing profile: is it ALLCAPS?
  const isAllCaps = root === root.toUpperCase() && root.length > 1;
  const casingKey = isAllCaps ? "UPPER" : "Mixed";
  
  // Family ID combines: Root + Type + Casing
  return mockHash(`${root.toLowerCase()}|${type}|${casingKey}`);
};

// Normalize quote
const normalizeQuote = (text: string): string => {
  return text.trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ");
};

// Improved Metric Normalization (Ranges, Ratios, Rates)
const normalizeMetric = (text: string): { 
  parsed_number?: number, 
  scale: number, 
  unit: string, 
  qualifier: string, 
  parse_notes: string,
  metric_kind: "scalar" | "range" | "ratio" | "rate",
  range_low?: number,
  range_high?: number
} => {
  const clean = text.toLowerCase().replace(/,/g, "");
  let scale = 1;
  let notes: string[] = [];
  let metric_kind: "scalar" | "range" | "ratio" | "rate" = "scalar";

  // Scale detection
  if (clean.includes("million") || clean.includes("m")) { scale = 1e6; notes.push("million-scale"); }
  else if (clean.includes("billion") || clean.includes("b")) { scale = 1e9; notes.push("billion-scale"); }
  else if (clean.includes("trillion") || clean.includes("t")) { scale = 1e12; notes.push("trillion-scale"); }
  else if (clean.includes("k")) { scale = 1e3; notes.push("k-scale"); }

  // Unit detection
  let unit = "unknown";
  if (text.includes("$") || text.includes("USD")) unit = "USD";
  else if (text.includes("€") || text.includes("EUR")) unit = "EUR";
  else if (text.includes("£") || text.includes("GBP")) unit = "GBP";
  else if (text.includes("%") || text.includes("percent")) unit = "percent";
  
  // Rate detection
  if (clean.includes("per") || clean.includes("/")) {
    metric_kind = "rate";
    notes.push("rate-detected");
  }

  // Qualifier detection
  let qualifier = "";
  if (clean.includes("about") || clean.includes("around") || clean.includes("roughly") || clean.includes("approx")) {
    qualifier = "approximate";
    notes.push("qualifier-detected");
  }

  // Range detection ("5-10", "between 5 and 10")
  const rangeMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:-|to|and)\s*(\d+(?:\.\d+)?)/);
  let parsed_number: number | undefined;
  let range_low: number | undefined;
  let range_high: number | undefined;

  if (rangeMatch && !unit.includes("percent") && !clean.includes("/")) { // Basic range guard
     metric_kind = "range";
     range_low = parseFloat(rangeMatch[1]) * scale;
     range_high = parseFloat(rangeMatch[2]) * scale;
     notes.push("range-detected");
  } else {
    const numMatch = clean.match(/[\d.]+/);
    if (numMatch) {
      parsed_number = parseFloat(numMatch[0]);
    }
  }
  
  if (text.includes(",")) notes.push("comma-stripped");

  return { 
    parsed_number, 
    scale, 
    unit, 
    qualifier, 
    parse_notes: notes.join(", "),
    metric_kind,
    range_low,
    range_high
  };
};

// Sentence Segmentation
type Sentence = { text: string; start: number; end: number; isHeadlineLike: boolean };

const splitSentences = (text: string): Sentence[] => {
  const segments: Sentence[] = [];
  const boundaryRegex = /(?<!\b(?:Mr|Mrs|Ms|Dr|Inc|Ltd|Jr|Sr|vs|U\.S|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec))(\.|!|\?)(?=\s|$)/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = boundaryRegex.exec(text)) !== null) {
    const end = match.index + match[0].length; 
    const segmentText = text.slice(lastIndex, end).trim();
    
    if (segmentText.length > 0) {
      const relativeStart = text.slice(lastIndex, end).indexOf(segmentText);
      const absoluteStart = lastIndex + relativeStart;
      
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

// Provenance Validator with Span Integrity Check
const validateItem = (item: BaseItem, fullText: string, exactExpectedText?: string): boolean => {
  const { start, end } = item.provenance;
  if (start < 0 || end > fullText.length || start >= end) return false;
  
  // Span integrity check: verify extracted text matches source text exactly
  if (exactExpectedText) {
    const extractedSpan = fullText.slice(start, end);
    // Allow minor whitespace diffs? No, strict.
    if (extractedSpan !== exactExpectedText) {
      return false; 
    }
  }
  
  return true;
};


// --- PACK IDENTITY LOGIC ---

// Compute Stable Pack ID (Source + Content + Curation)
export const computePackId = (pack: Omit<LanternPack, 'pack_id' | 'hashes'>, sourceTextSha256: string): string => {
  // Canonicalize items by ID and inclusion status
  const signature = {
    source: sourceTextSha256,
    engine: pack.engine,
    items: {
      entities: pack.items.entities.map(i => ({ id: i.id, included: i.included, tags: i.tags.sort() })),
      quotes: pack.items.quotes.map(i => ({ id: i.id, included: i.included })),
      metrics: pack.items.metrics.map(i => ({ id: i.id, included: i.included })),
      timeline: pack.items.timeline.map(i => ({ id: i.id, included: i.included }))
    }
  };
  
  // Deterministic stringify (JSON.stringify is acceptable for simple ordered objects or we use a stable sort)
  // Since we map arrays in order (assuming engine emits deterministic order), this should be stable.
  const signatureStr = JSON.stringify(signature);
  const hash = mockHash(signatureStr);
  return `lex_${hash.slice(0, 16)}`;
};


// --- Main Extraction Function ---

export function extract(text: string, options: ExtractionOptions = { mode: "balanced" }): { items: LanternPack["items"], stats: EngineStats, stable_source_hash: string } {
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
  const metricPattern = /(\$|€|£|¥)?\s*\d+(?:,\d{3})*(?:\.\d+)?\s*(?:-|to)?\s*\d*(?:,\d{3})*(?:\.\d+)?\s*(%|million|billion|trillion|k|m|b|per\s+\w+)?/gi; // Expanded for ranges/rates
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const explicitDatePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,\s+\d{4})?\b/gi;

  const sentences = splitSentences(text);
  
  sentences.forEach((sent, sentIndex) => {
    const sentence = sent.text;
    const sentenceStart = sent.start;
    
    if (!sentence) return;

    if (sent.isHeadlineLike) {
      if (options.mode !== "broad") {
        stats.headlines_suppressed++;
      }
    }

    const provenanceBase = {
      sentence,
      start: sentenceStart,
      end: sentenceStart + sentence.length
    };

    // --- Entity Extraction ---
    let match;
    entityPattern.lastIndex = 0;
    while ((match = entityPattern.exec(sentence)) !== null) {
      const raw = match[0];
      const normalized = normalizeEntity(raw);
      
      if (normalized.length < minEntityLen) continue;
      if (stopEntities.has(normalized)) continue;
      
      let shouldInclude = false;
      let type: "person" | "org" | "location" | "other" = "other";

      const hasOrgSuffix = orgSuffixes.some(s => normalized.endsWith(s) || normalized.includes(" " + s));
      
      if (sent.isHeadlineLike && options.mode !== "broad") {
        if (!hasOrgSuffix) continue; 
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
          canonical_family_id: generateFamilyId(normalized, type),
          confidence: 0.7, 
          provenance: {
            sentence, 
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
      
      // v0.1.4: Forward Scan (Broad mode or normal?)
      // Look in Previous + Current + Next sentence (forward scanning)
      const prevSentence = sentIndex > 0 ? sentences[sentIndex - 1].text : "";
      const nextSentence = sentIndex < sentences.length - 1 ? sentences[sentIndex + 1].text : "";
      
      // Forward Scan Guardrails:
      // 1. Only scan one sentence forward (done, nextSentence)
      // 2. Only if next sentence has speech verb AND explicit entity
      
      let searchContext = prevSentence + " " + sentence; // Default context

      const nextSentenceHasVerb = attributionKeywords.some(kw => nextSentence.includes(kw));
      if (nextSentenceHasVerb) {
         // Check for entity presence in next sentence
         // Simple heuristic: Does it have a Capitalized Word that is likely a name?
         // We can reuse our entity regex or simplified check
         const nextSentenceEntities = nextSentence.match(/([A-Z][a-z]+)/g);
         // Filter stop words
         const validNextEntities = nextSentenceEntities?.filter(e => !stopEntities.has(e) && e.length > 2) || [];
         
         if (validNextEntities.length > 0) {
            // Safe to include next sentence in search context
            searchContext += " " + nextSentence;
         }
      }
      
      if (attributionKeywords.some(kw => searchContext.includes(kw))) {
        const nearbyCaps = searchContext.match(/([A-Z][a-z]+)/g);
        if (nearbyCaps) {
           candidates.push(...nearbyCaps.filter(c => !stopEntities.has(c)));
        }
      }

      const uniqueCandidates = [...new Set(candidates)];
      if (uniqueCandidates.length === 1) speaker = uniqueCandidates[0];

      if (options.mode === "conservative" && !speaker) continue;

      rawQuotes.push({
        id: `qt_${mockHash(normalized + sentenceStart)}`,
        quote: normalized,
        speaker,
        speaker_candidates: uniqueCandidates.length > 1 ? uniqueCandidates : undefined,
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

      const { parsed_number, scale, unit, qualifier, parse_notes, metric_kind, range_low, range_high } = normalizeMetric(raw);

      const normalized_value = (parsed_number && !isNaN(parsed_number)) ? parsed_number * scale : undefined;

      if (options.mode === "conservative" && (unit === "unknown" || unit === "count")) continue;

      rawMetrics.push({
        id: `met_${mockHash(raw + sentenceStart)}`,
        value: raw.trim(),
        raw_value_text: raw.trim(),
        unit,
        parsed_number,
        scale,
        normalized_value,
        metric_kind,
        range_low,
        range_high,
        qualifier,
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
        raw_date_text: dateStr,
        date_type: "explicit",
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

    // Timeline (Years - Fallback)
    yearPattern.lastIndex = 0;
    while ((match = yearPattern.exec(sentence)) !== null) {
      const year = match[0];
      const isOverlap = rawTimeline.some(t => t.provenance.sentence === sentence && t.date.includes(year) && t.date !== year);
      
      if (!isOverlap) {
        rawTimeline.push({
          id: `tl_${mockHash(year + sentenceStart)}`,
          date: year,
          raw_date_text: year,
          date_type: "year-only",
          event: sentence.length > 50 ? sentence.substring(0, 50) + "..." : sentence,
          confidence: 0.75,
          provenance: {
            sentence,
            start: sentenceStart + match.index,
            end: sentenceStart + match.index + year.length
          },
          tags: [],
          included: true
        });
        stats.emitted.timeline++;
      }
    }
  });

  // 3. Deduplication & Validation
  
  // Entities: Dedupe by canonical key
  const dedupedEntities: EntityItem[] = [];
  const entityMap = new Map<string, EntityItem>();

  for (const ent of rawEntities) {
    // Validate Item with Span Integrity check implied by provenance
    // (Here we just check bounds, but in extraction we took raw directly from match)
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
      ent.occurrences = [ent.provenance]; 
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

  // Metrics: Validation with Span Integrity
  const validMetrics = rawMetrics.filter(m => {
    // Check if the extracted text matches source exactly
    const valid = validateItem(m, text, m.raw_value_text);
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

  // Compute Source Hash (Stable ID for source text)
  const sourceHash = "sha256_" + mockHash(text);

  return { 
    items: {
      entities: dedupedEntities,
      quotes: dedupedQuotes,
      metrics: validMetrics,
      timeline: dedupedTimeline
    },
    stats,
    stable_source_hash: sourceHash
  };
}
